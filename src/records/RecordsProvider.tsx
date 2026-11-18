import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import type { ActionResult } from '../data/types';
import { apiConfigured, apiRequest } from '../services/api';
import { deleteAttachment, uploadAttachment } from './attachments';
import { emptyRecords, isRecordsState, recordsStorageKey } from './storage';
import type { CertificateInput, HealthCertificate, InsuranceCard, InsuranceInput, RecordsContextValue, RecordsState, StoredAttachment } from './types';
import { normalizeInsuranceNumber, validateCertificate, validateInsurance } from './validation';

const RecordsContext = createContext<RecordsContextValue | null>(null);

export function RecordsProvider({ accountId, enabled, isDemo, children }: {
  accountId: string; enabled: boolean; isDemo: boolean; children: ReactNode;
}) {
  const isRemote = apiConfigured && !isDemo;
  return <RecordsStore key={`${accountId}:${enabled}:${isRemote}`} accountId={accountId} enabled={enabled} isRemote={isRemote}>{children}</RecordsStore>;
}

function RecordsStore({ accountId, enabled, isRemote, children }: { accountId: string; enabled: boolean; isRemote: boolean; children: ReactNode }) {
  const [state, setState] = useState<RecordsState>(emptyRecords);
  const current = useRef(state);
  const [ready, setReady] = useState(!enabled);
  const [storageError, setStorageError] = useState<string | null>(null);
  const hydrated = useRef(false);
  const mounted = useRef(false);
  const busy = useRef(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const controller = new AbortController();
    async function load() {
      if (!enabled) return;
      try {
        let saved: unknown;
        if (isRemote) {
          const [insurance, certificates] = await Promise.all([
            apiRequest<InsuranceCard | null>('/insurance', { signal: controller.signal }),
            apiRequest<HealthCertificate[]>('/certificates', { signal: controller.signal }),
          ]);
          saved = { version: 1, insurance, certificates };
        } else {
          const raw = await AsyncStorage.getItem(recordsStorageKey(accountId));
          saved = raw ? JSON.parse(raw) : emptyRecords();
        }
        if (!isRecordsState(saved)) throw new Error('Dữ liệu hồ sơ không hợp lệ.');
        if (active) { current.current = saved; setState(saved); hydrated.current = true; }
      } catch (cause) {
        if (active) setStorageError(isRemote
          ? `Không tải được hồ sơ. ${cause instanceof Error ? cause.message : 'Vui lòng mở lại trang sau khi kiểm tra kết nối.'}`
          : 'Không đọc được hồ sơ đã lưu. Dữ liệu cũ được giữ lại; các thao tác lưu đang tạm khóa.');
      } finally { if (active) setReady(true); }
    }
    void load();
    return () => { active = false; mounted.current = false; controller.abort(); };
  }, [accountId, enabled, isRemote]);

  function unavailable(): ActionResult | null {
    if (!enabled) return { ok: false, error: 'Vui lòng đăng nhập để quản lý hồ sơ.' };
    if (!ready || !hydrated.current) return { ok: false, error: 'Hồ sơ chưa sẵn sàng để lưu. Vui lòng tải lại ứng dụng.' };
    if (busy.current) return { ok: false, error: 'Đang lưu hồ sơ. Vui lòng chờ thao tác hoàn tất.' };
    return null;
  }

  async function persist(next: RecordsState, oldAttachment?: StoredAttachment): Promise<ActionResult> {
    // Local writes are serialized and state is published only after storage succeeds.
    if (!isRemote) {
      const operation = writes.current.then(() => AsyncStorage.setItem(recordsStorageKey(accountId), JSON.stringify(next)));
      writes.current = operation.catch(() => undefined);
      try { await operation; }
      catch {
        const error = 'Chưa lưu được hồ sơ vào thiết bị, có thể bộ nhớ đã đầy. Thông tin trước đó được giữ nguyên; hãy thử lại.';
        if (mounted.current) setStorageError(error);
        return { ok: false, error };
      }
    }
    current.current = next;
    if (mounted.current) { setState(next); setStorageError(null); }
    if (oldAttachment && !oldAttachment.uri.startsWith('/files/')) await deleteAttachment(oldAttachment).catch(() => undefined);
    return { ok: true };
  }

  async function mutation(operation: () => Promise<ActionResult>): Promise<ActionResult> {
    const blocked = unavailable(); if (blocked) return blocked;
    busy.current = true;
    try { return await operation(); }
    catch (cause) { return { ok: false, error: cause instanceof Error ? cause.message : 'Không lưu được hồ sơ. Vui lòng thử lại.' }; }
    finally { busy.current = false; }
  }

  async function saveInsurance(input: InsuranceInput): Promise<ActionResult> {
    const error = validateInsurance(input); if (error) return { ok: false, error };
    return mutation(async () => {
      const previous = current.current.insurance;
      const normalized = { ...input, number: normalizeInsuranceNumber(input.number), holderName: input.holderName.trim(), registrationPlace: input.registrationPlace.trim() };
      const payload = isRemote && normalized.attachment ? { ...normalized, attachment: await uploadAttachment(normalized.attachment) } : normalized;
      const insurance = isRemote ? await apiRequest<InsuranceCard>('/insurance', { method: 'PUT', body: payload })
        : { ...payload, id: previous?.id ?? Crypto.randomUUID(), updatedAt: new Date().toISOString() };
      if (!isRecordsState({ ...current.current, insurance })) throw new Error('Máy chủ trả về thông tin BHYT không hợp lệ.');
      const cleanup = previous?.attachment?.id !== insurance.attachment?.id ? previous?.attachment : undefined;
      const result = await persist({ ...current.current, insurance }, cleanup);
      if (result.ok && isRemote && input.attachment && !input.attachment.uri.startsWith('/files/')) await deleteAttachment(input.attachment).catch(() => undefined);
      return result.ok ? { ok: true, id: insurance.id } : result;
    });
  }

  async function removeInsurance(): Promise<ActionResult> {
    return mutation(async () => {
      if (!current.current.insurance) return { ok: false, error: 'Chưa có thẻ BHYT để xóa.' };
      if (isRemote) await apiRequest('/insurance', { method: 'DELETE' });
      return persist({ ...current.current, insurance: null }, current.current.insurance.attachment);
    });
  }

  async function addCertificate(input: CertificateInput): Promise<ActionResult> {
    const error = validateCertificate(input); if (error) return { ok: false, error };
    return mutation(async () => {
      if (current.current.certificates.length >= 30) return { ok: false, error: 'Đã đạt giới hạn 30 giấy khám sức khỏe.' };
      const normalized = { ...input, title: input.title.trim(), issuer: input.issuer.trim(), notes: input.notes.trim(), validUntil: input.validUntil || undefined };
      const payload = isRemote && normalized.attachment ? { ...normalized, attachment: await uploadAttachment(normalized.attachment) } : normalized;
      const certificate = isRemote ? await apiRequest<HealthCertificate>('/certificates', { method: 'POST', body: payload })
        : { ...payload, id: Crypto.randomUUID(), status: 'unverified' as const, createdAt: new Date().toISOString() };
      const next = { ...current.current, certificates: [certificate, ...current.current.certificates] };
      if (!isRecordsState(next)) throw new Error('Máy chủ trả về thông tin giấy khám không hợp lệ.');
      const result = await persist(next);
      if (result.ok && isRemote && input.attachment) await deleteAttachment(input.attachment).catch(() => undefined);
      return result.ok ? { ok: true, id: certificate.id } : result;
    });
  }

  async function removeCertificate(id: string): Promise<ActionResult> {
    return mutation(async () => {
      const certificate = current.current.certificates.find(item => item.id === id);
      if (!certificate) return { ok: false, error: 'Không tìm thấy giấy khám sức khỏe.' };
      if (isRemote) await apiRequest(`/certificates/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return persist({ ...current.current, certificates: current.current.certificates.filter(item => item.id !== id) }, certificate.attachment);
    });
  }

  return <RecordsContext.Provider value={{ ...state, isRemote, ready, storageError, saveInsurance, removeInsurance, addCertificate, removeCertificate }}>{children}</RecordsContext.Provider>;
}

export function useRecords() {
  const records = useContext(RecordsContext);
  if (!records) throw new Error('useRecords cần nằm trong RecordsProvider.');
  return records;
}
