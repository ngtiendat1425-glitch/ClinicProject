import AsyncStorage from '@react-native-async-storage/async-storage';
import { bytesToHex } from '@noble/hashes/utils.js';
import { getRandomBytesAsync } from 'expo-crypto';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import type { ActionResult } from '../data/types';
import {
  AUTH_SESSION_KEY, demoAccount, readAuthSnapshot, writeAuthAccounts, writeAuthSession,
} from './storage';
import type { AuthAccount, LoginInput, RegistrationInput, StoredAuthAccount } from './types';
import { apiConfigured } from '../services/api';
import { AuthContext } from './context';
import { RemoteAuthProvider } from './RemoteAuthProvider';
import {
  derivePasswordHash, findAccountByIdentifier, normalizeRegistration, PASSWORD_ITERATIONS,
  publicAccount, registrationPatient, SALT_BYTES, validateLogin, validateRegistration, verifyPassword,
} from './validation';

export { useAuth } from './context';

const NOT_READY = 'Dữ liệu tài khoản đang được tải. Vui lòng thử lại.';
const ALREADY_BUSY = 'Thao tác đang được xử lý. Vui lòng chờ.';
const SESSION_UNAVAILABLE = 'Không thể cập nhật phiên đã lưu. Bạn có thể tiếp tục trải nghiệm dữ liệu mẫu.';

export function AuthProvider({ children }: { children: ReactNode }) {
  return apiConfigured ? <RemoteAuthProvider>{children}</RemoteAuthProvider> : <LocalAuthProvider>{children}</LocalAuthProvider>;
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const accountsRef = useRef<StoredAuthAccount[]>([]);
  const readyRef = useRef(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const writableRef = useRef({ accounts: false, session: false });
  const writesRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueWrite = useCallback((operation: () => Promise<void>) => {
    const next = writesRef.current.then(operation);
    writesRef.current = next.catch(() => undefined);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    async function hydrate() {
      try {
        const snapshot = await readAuthSnapshot(AsyncStorage);
        if (!active) return;
        accountsRef.current = snapshot.accounts;
        writableRef.current = { accounts: snapshot.canWriteAccounts, session: snapshot.canWriteSession };
        setAccount(snapshot.account);
        setStorageError(snapshot.storageError);
      } catch {
        if (!active) return;
        writableRef.current = { accounts: false, session: false };
        setStorageError('Không đọc được dữ liệu tài khoản trên thiết bị. Bạn có thể trải nghiệm dữ liệu mẫu trong phiên này.');
      }
      if (active) {
        readyRef.current = true;
        setReady(true);
      }
    }
    void hydrate();
    return () => { active = false; mountedRef.current = false; };
  }, []);

  const begin = useCallback((): string | null => {
    if (!readyRef.current) return NOT_READY;
    if (busyRef.current) return ALREADY_BUSY;
    busyRef.current = true;
    setBusy(true);
    return null;
  }, []);

  const finish = useCallback(() => {
    busyRef.current = false;
    if (mountedRef.current) setBusy(false);
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<ActionResult> => {
    const error = begin();
    if (error) return { ok: false, error };
    try {
      const invalid = validateLogin(input);
      if (invalid) return { ok: false, error: invalid };
      if (!writableRef.current.accounts || !writableRef.current.session) return { ok: false, error: SESSION_UNAVAILABLE };
      const stored = findAccountByIdentifier(accountsRef.current, input.identifier);
      if (!stored || !await verifyPassword(input.password, stored)) return { ok: false, error: 'Số điện thoại, email hoặc mật khẩu chưa đúng.' };
      await enqueueWrite(() => writeAuthSession(AsyncStorage, stored.id));
      if (mountedRef.current) {
        setAccount(publicAccount(stored));
        setStorageError(null);
      }
      return { ok: true, id: stored.id };
    } catch {
      if (mountedRef.current) setStorageError('Chưa lưu được phiên đăng nhập trên thiết bị. Vui lòng thử lại.');
      return { ok: false, error: 'Không thể hoàn tất đăng nhập. Vui lòng thử lại.' };
    } finally { finish(); }
  }, [begin, enqueueWrite, finish]);

  const register = useCallback(async (input: RegistrationInput): Promise<ActionResult> => {
    const error = begin();
    if (error) return { ok: false, error };
    let accountSaved = false;
    try {
      const clean = normalizeRegistration(input);
      const invalid = validateRegistration(clean, accountsRef.current);
      if (invalid) return { ok: false, error: invalid };
      if (!writableRef.current.accounts || !writableRef.current.session) return { ok: false, error: SESSION_UNAVAILABLE };
      if (accountsRef.current.length >= 500) return { ok: false, error: 'Thiết bị đã đạt giới hạn tài khoản của bản demo.' };
      const salt = await getRandomBytesAsync(SALT_BYTES);
      const saltHex = bytesToHex(salt);
      const passwordHashHex = await derivePasswordHash(clean.password, saltHex);
      salt.fill(0);
      const stored: StoredAuthAccount = {
        id: `acct-${saltHex}`, patient: registrationPatient(clean), createdAt: new Date().toISOString(),
        saltHex, passwordHashHex, iterations: PASSWORD_ITERATIONS,
      };
      const next = [...accountsRef.current, stored];
      await enqueueWrite(() => writeAuthAccounts(AsyncStorage, next));
      accountsRef.current = next;
      accountSaved = true;
      await enqueueWrite(() => writeAuthSession(AsyncStorage, stored.id));
      if (mountedRef.current) {
        setAccount(publicAccount(stored));
        setStorageError(null);
      }
      return { ok: true, id: stored.id };
    } catch {
      const message = accountSaved
        ? 'Tài khoản đã được tạo nhưng chưa lưu được phiên. Vui lòng đăng nhập lại.'
        : 'Chưa tạo được tài khoản trên thiết bị. Vui lòng thử lại.';
      if (mountedRef.current) setStorageError(message);
      return { ok: false, error: message };
    } finally { finish(); }
  }, [begin, enqueueWrite, finish]);

  const enterDemo = useCallback(async (): Promise<ActionResult> => {
    const error = begin();
    if (error) return { ok: false, error };
    try {
      if (writableRef.current.session) await enqueueWrite(() => writeAuthSession(AsyncStorage, 'demo'));
      if (mountedRef.current) setAccount(demoAccount());
      return { ok: true, id: 'demo' };
    } catch {
      // Demo remains usable without replacing an unreadable or failed session.
      if (mountedRef.current) {
        setStorageError('Đang trải nghiệm dữ liệu mẫu trong phiên này. Chưa lưu được phiên trên thiết bị.');
        setAccount(demoAccount());
      }
      return { ok: true, id: 'demo' };
    } finally { finish(); }
  }, [begin, enqueueWrite, finish]);

  const logout = useCallback(async () => {
    const error = begin();
    if (error) return;
    try {
      if (writableRef.current.session) await enqueueWrite(() => AsyncStorage.removeItem(AUTH_SESSION_KEY));
      if (mountedRef.current) setAccount(null);
    } catch {
      if (mountedRef.current) {
        setAccount(null);
        setStorageError('Đã đăng xuất trong phiên này nhưng chưa xóa được phiên đã lưu. Vui lòng thử lại trước khi đóng ứng dụng.');
      }
    } finally { finish(); }
  }, [begin, enqueueWrite, finish]);

  return <AuthContext.Provider value={{ ready, busy, storageError, account, isDemo: account?.id === 'demo', login, register, enterDemo, logout }}>
    {children}
  </AuthContext.Provider>;
}

