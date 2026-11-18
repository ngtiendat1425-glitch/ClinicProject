import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { validatePatient } from '../data/booking';
import type { ActionResult, Patient } from '../data/types';
import { API_BASE_URL, ApiError, apiConfigurationError, apiRequest, getAccessToken, isDemoEnabled, onUnauthorized, setAccessToken } from '../services/api';
import { AuthContext } from './context';
import { demoAccount } from './storage';
import type { AuthAccount, LoginInput, RegistrationInput } from './types';
import { normalizeEmail, normalizePhone, normalizeRegistration, validateLogin, validateRegistration } from './validation';

const TOKEN_KEY = `an-tam.api-token.v1.${bytesToHex(sha256(utf8ToBytes(API_BASE_URL))).slice(0, 24)}`;
const nativeStorage = Platform.OS !== 'web';
const tokenPattern = /^[A-Za-z0-9._~+/=-]{24,2048}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serverAccount(value: unknown): AuthAccount | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || !uuidPattern.test(candidate.id)) return null;
  if (typeof candidate.createdAt !== 'string' || !Number.isFinite(Date.parse(candidate.createdAt))) return null;
  if (!candidate.patient || typeof candidate.patient !== 'object') return null;
  const patient = candidate.patient as Record<string, unknown>;
  const fields = ['name', 'phone', 'email', 'birthDate', 'gender', 'address', 'allergies'] as const;
  if (!fields.every((key) => typeof patient[key] === 'string')) return null;
  const clean = Object.fromEntries(fields.map((key) => [key, patient[key]])) as Patient;
  if (validatePatient(clean)) return null;
  return { id: candidate.id, patient: clean, createdAt: candidate.createdAt };
}

function sessionResponse(value: unknown): { token: string; account: AuthAccount } {
  if (!value || typeof value !== 'object') throw new Error('Phản hồi đăng nhập không hợp lệ.');
  const candidate = value as Record<string, unknown>;
  const account = serverAccount(candidate.account);
  if (typeof candidate.token !== 'string' || !tokenPattern.test(candidate.token) || !account) throw new Error('Phản hồi đăng nhập không hợp lệ.');
  return { token: candidate.token, account };
}

function failureMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function RemoteAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const readyRef = useRef(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const epochRef = useRef(0);
  const writesRef = useRef<Promise<void>>(Promise.resolve());

  const storageWrite = useCallback((operation: () => Promise<void>) => {
    const next = writesRef.current.then(operation);
    writesRef.current = next.catch(() => undefined);
    return next;
  }, []);

  const deleteStoredToken = useCallback(() => storageWrite(async () => {
    if (nativeStorage) await SecureStore.deleteItemAsync(TOKEN_KEY);
  }), [storageWrite]);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    const unsubscribe = onUnauthorized(() => {
      epochRef.current += 1;
      if (mountedRef.current) {
        setAccount(null);
        setStorageError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      void deleteStoredToken().catch(() => {
        if (mountedRef.current) setStorageError('Phiên đã hết hạn nhưng chưa xóa được trên thiết bị. Vui lòng đăng nhập lại.');
      });
    });
    async function restore() {
      const epoch = epochRef.current;
      try {
        if (apiConfigurationError) throw new ApiError(apiConfigurationError, 0);
        const saved = nativeStorage ? await SecureStore.getItemAsync(TOKEN_KEY) : getAccessToken();
        if (!active) return;
        if (saved) {
          if (!tokenPattern.test(saved)) throw new Error('Invalid stored session.');
          setAccessToken(saved);
          const result = await apiRequest<unknown>('/auth/me');
          const restored = serverAccount(result);
          if (!restored) throw new Error('Invalid account response.');
          if (active && epoch === epochRef.current) setAccount(restored);
        } else setAccessToken(null);
      } catch (error) {
        if (!active) return;
        setAccessToken(null);
        setAccount(null);
        setStorageError(failureMessage(error, 'Không khôi phục được phiên đăng nhập. Vui lòng đăng nhập lại.'));
      } finally {
        if (active) { readyRef.current = true; setReady(true); }
      }
    }
    void restore();
    return () => { active = false; mountedRef.current = false; unsubscribe(); };
  }, [deleteStoredToken]);

  const begin = useCallback(() => {
    if (!readyRef.current) return 'Đang khôi phục phiên đăng nhập. Vui lòng chờ.';
    if (busyRef.current) return 'Thao tác đang được xử lý. Vui lòng chờ.';
    busyRef.current = true;
    setBusy(true);
    return null;
  }, []);

  const finish = useCallback(() => {
    busyRef.current = false;
    if (mountedRef.current) setBusy(false);
  }, []);

  const acceptSession = useCallback(async (response: unknown, epoch: number) => {
    const session = sessionResponse(response);
    await storageWrite(async () => {
      if (nativeStorage) await SecureStore.setItemAsync(TOKEN_KEY, session.token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    });
    if (epoch !== epochRef.current || !mountedRef.current) throw new Error('Session changed.');
    setAccessToken(session.token);
    setAccount(session.account);
    setStorageError(null);
    return { ok: true, id: session.account.id } as const;
  }, [storageWrite]);

  const login = useCallback(async (input: LoginInput): Promise<ActionResult> => {
    const startError = begin();
    if (startError) return { ok: false, error: startError };
    try {
      const invalid = validateLogin(input);
      if (invalid) return { ok: false, error: invalid };
      const epoch = ++epochRef.current;
      const identifier = input.identifier.includes('@') ? normalizeEmail(input.identifier) : normalizePhone(input.identifier);
      const response = await apiRequest<unknown>('/auth/login', { method: 'POST', auth: false, body: { identifier, password: input.password } });
      return await acceptSession(response, epoch);
    } catch (error) {
      return { ok: false, error: failureMessage(error, 'Không hoàn tất được đăng nhập. Vui lòng thử lại.') };
    } finally { finish(); }
  }, [acceptSession, begin, finish]);

  const register = useCallback(async (input: RegistrationInput): Promise<ActionResult> => {
    const startError = begin();
    if (startError) return { ok: false, error: startError };
    try {
      const clean = normalizeRegistration(input);
      const invalid = validateRegistration(clean);
      if (invalid) return { ok: false, error: invalid };
      if (utf8ToBytes(clean.password).length > 72) return { ok: false, error: 'Mật khẩu quá dài cho hệ thống. Vui lòng rút ngắn mật khẩu, đặc biệt khi có chữ có dấu.' };
      const epoch = ++epochRef.current;
      const response = await apiRequest<unknown>('/auth/register', { method: 'POST', auth: false, body: clean });
      return await acceptSession(response, epoch);
    } catch (error) {
      return { ok: false, error: failureMessage(error, 'Không hoàn tất được đăng ký. Nếu đã tạo tài khoản, bạn có thể thử đăng nhập.') };
    } finally { finish(); }
  }, [acceptSession, begin, finish]);

  const enterDemo = useCallback(async (): Promise<ActionResult> => {
    if (!isDemoEnabled) return { ok: false, error: 'Chế độ trải nghiệm chưa được bật cho hệ thống này.' };
    const startError = begin();
    if (startError) return { ok: false, error: startError };
    try {
      epochRef.current += 1;
      await deleteStoredToken();
      setAccessToken(null);
      if (mountedRef.current) { setAccount(demoAccount()); setStorageError(null); }
      return { ok: true, id: 'demo' };
    } catch {
      return { ok: false, error: 'Chưa xóa được phiên đã lưu. Vui lòng thử lại.' };
    } finally { finish(); }
  }, [begin, deleteStoredToken, finish]);

  const logout = useCallback(async () => {
    if (begin()) return;
    let message: string | null = null;
    epochRef.current += 1;
    try {
      if (getAccessToken()) await apiRequest<void>('/auth/logout', { method: 'POST' });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) message = 'Đã đăng xuất trên thiết bị. Chưa xác nhận được việc kết thúc phiên trên máy chủ.';
    } finally {
      setAccessToken(null);
      try { await deleteStoredToken(); }
      catch { message = 'Đã đăng xuất nhưng chưa xóa được phiên trên thiết bị. Vui lòng đăng nhập lại để thay thế phiên đã lưu.'; }
      if (mountedRef.current) { setAccount(null); setStorageError(message); }
      finish();
    }
  }, [begin, deleteStoredToken, finish]);

  return <AuthContext.Provider value={{ ready, busy, storageError, account, isDemo: account?.id === 'demo', login, register, enterDemo, logout }}>
    {children}
  </AuthContext.Provider>;
}
