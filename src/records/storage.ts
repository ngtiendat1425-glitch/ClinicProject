import type { HealthCertificate, InsuranceCard, RecordsState } from './types';
import { validateCertificate, validateInsurance } from './validation';

export function recordsStorageKey(accountId: string) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(accountId)) throw new Error('Mã tài khoản không hợp lệ.');
  return `@an-tam/records/v1:${accountId}`;
}

function validId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value); }
function timestamp(value: unknown) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }

export function isRecordsState(value: unknown): value is RecordsState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as RecordsState;
  if (state.version !== 1 || !Array.isArray(state.certificates) || state.certificates.length > 30) return false;
  if (state.insurance !== null) {
    const card = state.insurance as InsuranceCard;
    if (!card || !validId(card.id) || !timestamp(card.updatedAt) || validateInsurance(card) !== null) return false;
  }
  if (!state.certificates.every((item: HealthCertificate) => item && validId(item.id) && timestamp(item.createdAt) && item.status === 'unverified' && validateCertificate(item) === null)) return false;
  const ids = new Set(state.certificates.map(item => item.id));
  if (ids.size !== state.certificates.length) return false;
  const attachments = [state.insurance?.attachment, ...state.certificates.map(item => item.attachment)].filter(Boolean);
  return new Set(attachments.map(item => item!.id)).size === attachments.length;
}

export function emptyRecords(): RecordsState { return { version: 1, insurance: null, certificates: [] }; }
