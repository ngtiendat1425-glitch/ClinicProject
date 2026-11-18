import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

import { validatePatient } from '../data/booking';
import { dateKey, isValidDate } from '../data/date';
import type { Patient } from '../data/types';
import type { AuthAccount, LoginInput, RegistrationInput, StoredAuthAccount } from './types';

export const PASSWORD_ITERATIONS = 100000;
export const SALT_BYTES = 16;
export const HASH_BYTES = 32;
export const ACCOUNT_ID_PATTERN = /^acct-[a-f0-9]{32}$/;

export function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s.()\-]/g, '');
  return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeRegistration(input: RegistrationInput): RegistrationInput {
  return {
    ...input,
    name: input.name.trim().replace(/\s+/g, ' '),
    phone: normalizePhone(input.phone),
    email: normalizeEmail(input.email),
    birthDate: input.birthDate.trim(),
  };
}

export function registrationPatient(input: RegistrationInput): Patient {
  const clean = normalizeRegistration(input);
  return {
    name: clean.name, phone: clean.phone, email: clean.email, birthDate: clean.birthDate,
    gender: 'Chưa cung cấp', address: '', allergies: '',
  };
}

export function duplicateIdentity(
  patient: Pick<Patient, 'phone' | 'email'>,
  accounts: readonly Pick<AuthAccount, 'patient'>[],
) {
  const phone = normalizePhone(patient.phone);
  const email = normalizeEmail(patient.email);
  if (accounts.some((account) => normalizePhone(account.patient.phone) === phone)) return 'Số điện thoại này đã được đăng ký trên thiết bị.';
  if (email && accounts.some((account) => normalizeEmail(account.patient.email) === email)) return 'Email này đã được đăng ký trên thiết bị.';
  return null;
}

export function validateRegistration(
  input: RegistrationInput,
  accounts: readonly Pick<AuthAccount, 'patient'>[] = [],
  now = Date.now(),
) {
  const clean = normalizeRegistration(input);
  if (clean.name.length < 2 || clean.name.length > 80) return 'Họ tên cần từ 2 đến 80 ký tự.';
  if (!/^0\d{9}$/.test(clean.phone)) return 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.';
  if (clean.email.length > 254 || (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email))) return 'Địa chỉ email chưa hợp lệ.';
  if (!isValidDate(clean.birthDate) || clean.birthDate > dateKey(new Date(now)) || clean.birthDate < '1900-01-01') return 'Ngày sinh cần theo định dạng YYYY-MM-DD, từ năm 1900 và không ở tương lai.';
  if (clean.password.length < 8 || clean.password.length > 128 || !clean.password.trim()) return 'Mật khẩu cần từ 8 đến 128 ký tự.';
  if (clean.password !== clean.confirmPassword) return 'Mật khẩu xác nhận chưa khớp.';
  if (clean.acceptedTerms !== true) return 'Vui lòng xác nhận điều kiện sử dụng bản demo trước khi tạo tài khoản.';
  return duplicateIdentity(clean, accounts);
}

export function validateLogin(input: LoginInput) {
  const identifier = input.identifier.trim();
  const isPhone = /^0\d{9}$/.test(normalizePhone(identifier));
  const isEmail = identifier.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  if (!isPhone && !isEmail) return 'Vui lòng nhập số điện thoại hoặc email đã đăng ký.';
  if (input.password.length < 8 || input.password.length > 128) return 'Mật khẩu cần từ 8 đến 128 ký tự.';
  return null;
}

export function findAccountByIdentifier(accounts: readonly StoredAuthAccount[], identifier: string) {
  const phone = normalizePhone(identifier);
  const email = normalizeEmail(identifier);
  return accounts.find((account) => account.patient.phone === phone || (Boolean(account.patient.email) && account.patient.email === email));
}

export function isAuthPatient(value: unknown): value is Patient {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const patient = value as Record<string, unknown>;
  const fields = ['name', 'phone', 'email', 'birthDate', 'gender', 'address', 'allergies'];
  if (Object.keys(patient).length !== fields.length || !fields.every((field) => typeof patient[field] === 'string')) return false;
  const typed = patient as Patient;
  if (typed.name !== typed.name.trim() || typed.phone !== normalizePhone(typed.phone) || typed.email !== normalizeEmail(typed.email)) return false;
  if (typed.email.length > 254) return false;
  return validatePatient(typed) === null;
}

export async function derivePasswordHash(password: string, saltHex: string) {
  if (!/^[a-f0-9]{32}$/.test(saltHex)) throw new Error('Invalid password salt.');
  const derived = await pbkdf2Async(sha256, password, hexToBytes(saltHex), {
    c: PASSWORD_ITERATIONS, dkLen: HASH_BYTES, asyncTick: 10,
  });
  const result = bytesToHex(derived);
  derived.fill(0);
  return result;
}

export async function verifyPassword(password: string, account: StoredAuthAccount) {
  if (password.length < 8 || password.length > 128) return false;
  const candidate = await derivePasswordHash(password, account.saltHex);
  // Both encodings have a validated fixed length. Avoid an early character exit.
  let different = candidate.length ^ account.passwordHashHex.length;
  for (let index = 0; index < candidate.length; index += 1) {
    different |= candidate.charCodeAt(index) ^ account.passwordHashHex.charCodeAt(index);
  }
  return different === 0;
}

export function publicAccount(account: StoredAuthAccount): AuthAccount {
  return { id: account.id, patient: { ...account.patient }, createdAt: account.createdAt };
}
