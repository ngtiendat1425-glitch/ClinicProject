import { dateKey, isValidDate } from '../data/date';
import type { CertificateInput, InsuranceInput, StoredAttachment } from './types';
import { purposeLabels } from './types';

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
export const ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const ATTACHMENT_DIRECTORY = 'an-tam-records';
const EXTENSIONS: Record<string, string[]> = { 'application/pdf': ['pdf'], 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'] };

export function normalizeInsuranceNumber(value: string) { return value.replace(/\s+/g, '').toUpperCase(); }

/** Format only: no verification against BHXH and no entitlement calculation. */
export function validInsuranceNumber(value: string) { return /^(?:\d{10}|[A-Z]{2}\d{13})$/.test(normalizeInsuranceNumber(value)); }

export function validateAttachmentMetadata(attachment: Pick<StoredAttachment, 'name' | 'mimeType' | 'size'>) {
  if (!attachment || typeof attachment.name !== 'string' || !attachment.name.trim() || attachment.name.length > 180 || /[\\/\u0000-\u001f]/.test(attachment.name)) return 'Tên tệp không hợp lệ.';
  if (!ATTACHMENT_MIME_TYPES.includes(attachment.mimeType)) return 'Chỉ chấp nhận PDF, JPEG hoặc PNG.';
  if (!Number.isInteger(attachment.size) || attachment.size <= 0 || attachment.size > MAX_ATTACHMENT_BYTES) return 'Tệp cần có dung lượng lớn hơn 0 và không quá 3 MB.';
  const extension = attachment.name.split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSIONS[attachment.mimeType].includes(extension)) return 'Phần mở rộng của tệp không khớp định dạng PDF, JPEG hoặc PNG.';
  return null;
}

export function fileHeaderMatches(bytes: Uint8Array, mimeType: string) {
  if (mimeType === 'application/pdf') return bytes.length >= 5 && [37, 80, 68, 70, 45].every((byte, index) => bytes[index] === byte);
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mimeType === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  return false;
}

export function isStoredAttachment(value: unknown): value is StoredAttachment {
  if (typeof value !== 'object' || !value || Array.isArray(value)) return false;
  const file = value as StoredAttachment;
  if (validateAttachmentMetadata(file) !== null || typeof file.id !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(file.id) || typeof file.uri !== 'string') return false;
  if (file.dataBase64 !== undefined) {
    if (typeof file.dataBase64 !== 'string' || file.dataBase64.length > 4 * Math.ceil(MAX_ATTACHMENT_BYTES / 3) || file.dataBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.dataBase64)) return false;
    const decodedSize = file.dataBase64.length * 3 / 4 - (file.dataBase64.endsWith('==') ? 2 : file.dataBase64.endsWith('=') ? 1 : 0);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const header: number[] = []; let buffer = 0; let bits = 0;
    for (const char of file.dataBase64.slice(0, 12).replace(/=/g, '')) {
      buffer = (buffer << 6) | alphabet.indexOf(char); bits += 6;
      if (bits >= 8) { bits -= 8; header.push((buffer >> bits) & 255); }
    }
    return decodedSize === file.size && file.uri === `records-web:${file.id}` && fileHeaderMatches(Uint8Array.from(header), file.mimeType);
  }
  if (file.uri === `/files/${file.id}`) return true;
  // Only application-owned persistent files are valid; cache/content/http paths are rejected.
  if (!file.uri.startsWith('file:///') || /(?:^|[/%])\.\.(?:[/%]|$)|%2e|%2f|%5c|%00|\\|[?#]/i.test(file.uri)) return false;
  const name = file.uri.slice(file.uri.lastIndexOf('/') + 1);
  return file.uri.includes(`/${ATTACHMENT_DIRECTORY}/`) && new RegExp(`^${file.id}\\.(pdf|jpeg|jpg|png)$`).test(name);
}

export function validateInsurance(input: InsuranceInput, now = Date.now()) {
  if (!input || typeof input.number !== 'string' || !validInsuranceNumber(input.number)) return 'Nhập mã BHYT gồm 10 chữ số hoặc mã cũ gồm 2 chữ cái và 13 chữ số.';
  if (typeof input.holderName !== 'string' || input.holderName.trim().length < 2 || input.holderName.trim().length > 100) return 'Họ tên trên thẻ cần từ 2 đến 100 ký tự.';
  const today = dateKey(new Date(now));
  if (!isValidDate(input.birthDate) || input.birthDate > today) return 'Ngày sinh không hợp lệ. Dùng định dạng YYYY-MM-DD và không nhập ngày tương lai.';
  if (typeof input.registrationPlace !== 'string' || input.registrationPlace.trim().length < 3 || input.registrationPlace.trim().length > 200) return 'Nơi đăng ký khám ban đầu cần từ 3 đến 200 ký tự.';
  if (!isValidDate(input.validFrom) || !isValidDate(input.validTo)) return 'Ngày giá trị sử dụng cần đúng định dạng YYYY-MM-DD.';
  if (input.validFrom > input.validTo || input.validFrom < input.birthDate) return 'Khoảng thời gian sử dụng thẻ không hợp lệ.';
  if (input.attachment !== undefined && !isStoredAttachment(input.attachment)) return 'Tệp đính kèm không hợp lệ. Vui lòng chọn lại PDF hoặc ảnh tối đa 3 MB.';
  return null;
}

export function validateCertificate(input: CertificateInput, now = Date.now()) {
  if (!input || typeof input.title !== 'string' || input.title.trim().length < 3 || input.title.trim().length > 120) return 'Tên giấy khám sức khỏe cần từ 3 đến 120 ký tự.';
  if (!Object.hasOwn(purposeLabels, input.purpose)) return 'Vui lòng chọn mục đích sử dụng.';
  if (typeof input.issuer !== 'string' || input.issuer.trim().length < 3 || input.issuer.trim().length > 200) return 'Tên cơ sở khám cần từ 3 đến 200 ký tự.';
  if (!isValidDate(input.examDate) || input.examDate > dateKey(new Date(now))) return 'Ngày khám cần đúng định dạng YYYY-MM-DD và không ở tương lai.';
  if (input.validUntil !== undefined && input.validUntil !== '' && (!isValidDate(input.validUntil) || input.validUntil < input.examDate)) return 'Ngày hết hạn cần hợp lệ và từ ngày khám trở đi.';
  if (typeof input.notes !== 'string' || input.notes.length > 1000) return 'Ghi chú không quá 1000 ký tự.';
  if (!input.attachment || !isStoredAttachment(input.attachment)) return 'Vui lòng đính kèm bản chụp hoặc PDF của giấy khám sức khỏe (tối đa 3 MB).';
  return null;
}

export function insuranceDateStatus(card: Pick<InsuranceInput, 'validFrom' | 'validTo'>, now: number) {
  const today = dateKey(new Date(now));
  if (today < card.validFrom) return 'Chưa đến ngày sử dụng đã khai báo';
  if (today > card.validTo) return 'Đã quá ngày sử dụng đã khai báo';
  return 'Trong khoảng ngày sử dụng đã khai báo';
}
