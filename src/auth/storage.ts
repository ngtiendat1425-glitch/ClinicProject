import { createDemoState } from '../data/seed';
import type { AuthAccount, AuthAccountsStore, AuthSession, StoredAuthAccount } from './types';
import { ACCOUNT_ID_PATTERN, duplicateIdentity, isAuthPatient, PASSWORD_ITERATIONS, publicAccount } from './validation';

export const AUTH_ACCOUNTS_KEY = '@an-tam/auth/accounts/v1';
export const AUTH_SESSION_KEY = '@an-tam/auth/session/v1';

export type AuthStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type AuthSnapshot = {
  accounts: StoredAuthAccount[];
  account: AuthAccount | null;
  canWriteAccounts: boolean;
  canWriteSession: boolean;
  storageError: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isStoredAuthAccount(value: unknown): value is StoredAuthAccount {
  if (!isRecord(value)) return false;
  const fields = ['id', 'patient', 'createdAt', 'saltHex', 'passwordHashHex', 'iterations'];
  if (Object.keys(value).length !== fields.length || !fields.every((field) => Object.hasOwn(value, field))) return false;
  if (typeof value.id !== 'string' || !ACCOUNT_ID_PATTERN.test(value.id)) return false;
  if (!isAuthPatient(value.patient)) return false;
  if (typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) return false;
  if (typeof value.saltHex !== 'string' || !/^[a-f0-9]{32}$/.test(value.saltHex)) return false;
  if (typeof value.passwordHashHex !== 'string' || !/^[a-f0-9]{64}$/.test(value.passwordHashHex)) return false;
  return value.iterations === PASSWORD_ITERATIONS;
}

export function isAuthAccountsStore(value: unknown): value is AuthAccountsStore {
  if (!isRecord(value) || value.version !== 1 || Object.keys(value).length !== 2 || !Array.isArray(value.accounts)) return false;
  if (value.accounts.length > 500 || !value.accounts.every(isStoredAuthAccount)) return false;
  const ids = new Set<string>();
  const previous: StoredAuthAccount[] = [];
  for (const account of value.accounts) {
    if (ids.has(account.id) || duplicateIdentity(account.patient, previous)) return false;
    ids.add(account.id);
    previous.push(account);
  }
  return true;
}

export function isAuthSession(value: unknown): value is AuthSession {
  return isRecord(value) && value.version === 1 && Object.keys(value).length === 2 && typeof value.accountId === 'string'
    && (value.accountId === 'demo' || ACCOUNT_ID_PATTERN.test(value.accountId));
}

export function demoAccount(): AuthAccount {
  return { id: 'demo', patient: createDemoState().patient, createdAt: new Date().toISOString() };
}

function parse(value: string | null): unknown {
  if (value === null) return null;
  try { return JSON.parse(value); } catch { return undefined; }
}

export function parseAuthSnapshot(accountsRaw: string | null, sessionRaw: string | null): AuthSnapshot {
  const parsedAccounts = parse(accountsRaw);
  const parsedSession = parse(sessionRaw);
  const canWriteAccounts = accountsRaw === null || isAuthAccountsStore(parsedAccounts);
  let canWriteSession = sessionRaw === null || isAuthSession(parsedSession);
  const accounts = isAuthAccountsStore(parsedAccounts) ? parsedAccounts.accounts : [];
  const issues: string[] = [];
  let account: AuthAccount | null = null;
  if (!canWriteAccounts) issues.push('Dữ liệu tài khoản đã lưu không hợp lệ và được giữ nguyên để khôi phục.');
  if (!canWriteSession) issues.push('Phiên đăng nhập đã lưu không hợp lệ và được giữ nguyên.');
  if (isAuthSession(parsedSession)) {
    if (parsedSession.accountId === 'demo') account = demoAccount();
    else {
      const stored = accounts.find((item) => item.id === parsedSession.accountId);
      if (stored) account = publicAccount(stored);
      else {
        canWriteSession = false;
        issues.push('Không thể khôi phục tài khoản của phiên đã lưu. Bạn có thể tiếp tục trải nghiệm dữ liệu mẫu.');
      }
    }
  }
  return { accounts, account, canWriteAccounts, canWriteSession, storageError: issues.join(' ') || null };
}

export async function readAuthSnapshot(storage: AuthStorageAdapter) {
  const [accountsRaw, sessionRaw] = await Promise.all([
    storage.getItem(AUTH_ACCOUNTS_KEY), storage.getItem(AUTH_SESSION_KEY),
  ]);
  return parseAuthSnapshot(accountsRaw, sessionRaw);
}

export async function writeAuthAccounts(storage: AuthStorageAdapter, accounts: StoredAuthAccount[]) {
  const store: AuthAccountsStore = { version: 1, accounts };
  if (!isAuthAccountsStore(store)) throw new Error('Invalid account store.');
  await storage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(store));
}

export async function writeAuthSession(storage: AuthStorageAdapter, accountId: string) {
  const session: AuthSession = { version: 1, accountId };
  if (!isAuthSession(session)) throw new Error('Invalid account session.');
  await storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}
