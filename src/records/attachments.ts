import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { API_BASE_URL, apiConfigurationError, apiRequest, getAccessToken, reportUnauthorized } from '../services/api';
import type { StoredAttachment } from './types';
import { ATTACHMENT_DIRECTORY, ATTACHMENT_MIME_TYPES, fileHeaderMatches, isStoredAttachment, validateAttachmentMetadata } from './validation';

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp vừa chọn.'));
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Dữ liệu tệp không hợp lệ.'));
    reader.readAsDataURL(file);
  });
}

export async function pickAttachment(): Promise<StoredAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ATTACHMENT_MIME_TYPES, multiple: false, copyToCacheDirectory: true, base64: false });
  if (result.canceled) return null;
  const selected = result.assets[0];
  if (!selected) throw new Error('Chưa có tệp được chọn.');
  const name = selected.name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f]/g, '') ?? '';
  const extension = name.split('.').pop()?.toLowerCase();
  const inferred = extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : ['jpg', 'jpeg'].includes(extension ?? '') ? 'image/jpeg' : '';
  const mimeType = selected.mimeType && selected.mimeType !== 'application/octet-stream' ? selected.mimeType : inferred;
  const crypto = await import('expo-crypto');
  const id = crypto.randomUUID();

  if (Platform.OS === 'web') {
    const file = selected.file;
    if (!file) throw new Error('Trình duyệt không trả về tệp. Vui lòng chọn lại.');
    const metadata = { name, mimeType, size: file.size };
    const error = validateAttachmentMetadata(metadata);
    if (error) throw new Error(error);
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (!fileHeaderMatches(bytes, mimeType)) throw new Error('Nội dung tệp không khớp định dạng đã chọn.');
    const dataURL = await readAsDataURL(file);
    const dataBase64 = dataURL.slice(dataURL.indexOf(',') + 1);
    return { id, ...metadata, uri: `records-web:${id}`, dataBase64 };
  }

  const { File, Directory, Paths } = await import('expo-file-system');
  const source = new File(selected.uri);
  const metadata = { name, mimeType, size: source.size };
  const error = validateAttachmentMetadata(metadata);
  if (error) throw new Error(error);
  const bytes = await source.bytes();
  if (!fileHeaderMatches(bytes, mimeType)) throw new Error('Nội dung tệp không khớp định dạng đã chọn.');
  const directory = new Directory(Paths.document, ATTACHMENT_DIRECTORY);
  await directory.create({ idempotent: true, intermediates: true });
  const target = new File(directory, `${id}.${extension}`);
  await source.copy(target);
  return { id, ...metadata, uri: target.uri };
}

async function ownedNativeFile(attachment: StoredAttachment) {
  if (!isStoredAttachment(attachment) || attachment.dataBase64 !== undefined) throw new Error('Tệp lưu trữ không hợp lệ.');
  const { File, Directory, Paths } = await import('expo-file-system');
  const directory = new Directory(Paths.document, ATTACHMENT_DIRECTORY);
  const file = new File(attachment.uri);
  const root = `${directory.uri.replace(/\/$/, '')}/`;
  if (file.parentDirectory.uri.replace(/\/$/, '') !== directory.uri.replace(/\/$/, '') || !file.uri.startsWith(root) || !file.name.startsWith(`${attachment.id}.`)) throw new Error('Không thể truy cập tệp ngoài thư mục hồ sơ.');
  return file;
}

/** On native this opens the system share sheet; web downloads the actual stored file. */
export async function openAttachment(attachment: StoredAttachment) {
  if (!isStoredAttachment(attachment)) throw new Error('Tệp lưu trữ không hợp lệ.');
  if (attachment.uri.startsWith('/files/')) {
    const bytes = await downloadProtectedAttachment(attachment);
    if (Platform.OS === 'web') { downloadBlob(bytes, attachment); return; }
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.cache, `${attachment.id}.${attachment.name.split('.').pop()?.toLowerCase()}`);
    await file.create({ overwrite: true }); await file.write(bytes);
    const Sharing = await import('expo-sharing');
    if (!await Sharing.isAvailableAsync()) throw new Error('Thiết bị chưa hỗ trợ mở bảng chia sẻ tệp.');
    await Sharing.shareAsync(file.uri, { mimeType: attachment.mimeType, dialogTitle: attachment.name });
    return;
  }
  if (Platform.OS === 'web') {
    if (!attachment.dataBase64) throw new Error('Không còn dữ liệu của tệp. Vui lòng đính kèm lại.');
    const content = atob(attachment.dataBase64);
    const bytes = Uint8Array.from(content, char => char.charCodeAt(0));
    downloadBlob(bytes, attachment);
    return;
  }
  const file = await ownedNativeFile(attachment);
  if (!file.exists) throw new Error('Tệp không còn trên thiết bị. Vui lòng đính kèm lại.');
  const Sharing = await import('expo-sharing');
  if (!await Sharing.isAvailableAsync()) throw new Error('Thiết bị chưa hỗ trợ mở bảng chia sẻ tệp.');
  await Sharing.shareAsync(file.uri, { mimeType: attachment.mimeType, dialogTitle: attachment.name });
}

export async function deleteAttachment(attachment: StoredAttachment) {
  if (attachment.uri.startsWith('/files/')) return; // Linked server files are managed by their owning record.
  if (Platform.OS === 'web') return;
  const file = await ownedNativeFile(attachment);
  if (file.exists) await file.delete();
}

function downloadBlob(bytes: Uint8Array<ArrayBuffer>, attachment: StoredAttachment) {
  const blob = new Blob([bytes], { type: attachment.mimeType });
  const uri = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = uri; link.download = attachment.name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(uri), 1000);
}

export async function uploadAttachment(attachment: StoredAttachment): Promise<StoredAttachment> {
  if (!isStoredAttachment(attachment)) throw new Error('Tệp lưu trữ không hợp lệ.');
  if (attachment.uri.startsWith('/files/')) return attachment;
  let dataBase64 = attachment.dataBase64;
  if (!dataBase64) {
    const file = await ownedNativeFile(attachment);
    if (!file.exists) throw new Error('Tệp không còn trên thiết bị. Vui lòng chọn lại.');
    dataBase64 = await file.base64();
  }
  const uploaded = await apiRequest<StoredAttachment>('/attachments', {
    method: 'POST', body: { name: attachment.name, mimeType: attachment.mimeType, dataBase64 },
  });
  if (!isStoredAttachment(uploaded) || uploaded.uri !== `/files/${uploaded.id}`) throw new Error('Máy chủ không trả về tệp hợp lệ.');
  return uploaded;
}

async function downloadProtectedAttachment(attachment: StoredAttachment) {
  if (apiConfigurationError) throw new Error(apiConfigurationError);
  const token = getAccessToken();
  if (!token || !API_BASE_URL || attachment.uri !== `/files/${attachment.id}`) throw new Error('Vui lòng đăng nhập lại để mở tệp.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${attachment.uri}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, credentials: 'omit', cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 401) reportUnauthorized(token);
      throw new Error(response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Không tải được tệp hoặc bạn không có quyền truy cập.');
    }
    if (getAccessToken() !== token) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại tệp từ hồ sơ hiện tại.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (getAccessToken() !== token) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại tệp từ hồ sơ hiện tại.');
    if (bytes.byteLength !== attachment.size || !fileHeaderMatches(bytes, attachment.mimeType)) throw new Error('Dữ liệu tệp tải về không hợp lệ.');
    return bytes;
  } finally { clearTimeout(timeout); }
}
