import { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { deleteAttachment, openAttachment, pickAttachment } from '../../records/attachments';
import type { StoredAttachment } from '../../records/types';
import { useRecords } from '../../records/RecordsProvider';
import { Button, Card, colors, Icon, Notice } from '../ui';

/** Staged copies are cleaned up when a form is abandoned; saved files are retained. */
export function useAttachmentDraft(initial?: StoredAttachment) {
  const [attachment, setAttachment] = useState(initial);
  const staged = useRef<StoredAttachment[]>([]);
  const retained = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const stagedFiles = staged.current;
    const savingFiles = retained.current;
    return () => {
      mounted.current = false;
      for (const file of stagedFiles) if (!savingFiles.has(file.id)) void deleteAttachment(file).catch(() => undefined);
    };
  }, []);
  function change(file?: StoredAttachment) {
    if (file && file.id !== initial?.id) staged.current.push(file);
    setAttachment(file);
  }
  function beginSave() { if (attachment) retained.current.add(attachment.id); }
  function finishSave(saved: boolean) {
    if (!attachment) return;
    if (saved) {
      const index = staged.current.findIndex(file => file.id === attachment.id);
      if (index >= 0) staged.current.splice(index, 1);
    } else if (!mounted.current && staged.current.some(file => file.id === attachment.id)) {
      void deleteAttachment(attachment).catch(() => undefined);
    }
    retained.current.delete(attachment.id);
  }
  return { attachment, change, beginSave, finishSave };
}

export function AttachmentField({ value, onChange, required = false }: {
  value?: StoredAttachment; onChange: (file?: StoredAttachment) => void; required?: boolean;
}) {
  const { isRemote } = useRecords();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function pick() {
    setError(''); setBusy(true);
    try { const file = await pickAttachment(); if (file) onChange(file); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không chọn được tệp. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <View style={styles.section}>
    <Text style={styles.label}>Bản chụp / tệp PDF {required ? '*' : '(tùy chọn)'}</Text>
    {value ? <AttachmentPreview attachment={value} /> : null}
    <Button title={value ? 'Chọn tệp thay thế' : 'Chọn PDF hoặc ảnh'} variant="secondary" icon="attach-outline" loading={busy} onPress={() => { void pick(); }} />
    {value && <Button title="Bỏ tệp đính kèm" variant="secondary" onPress={() => onChange(undefined)} />}
    <Text style={styles.hint}>PDF, JPEG hoặc PNG · tối đa 3 MB. {isRemote ? 'Tệp được tải lên máy chủ khi bạn lưu hồ sơ.' : 'Tệp được lưu trên thiết bị / trình duyệt này.'}</Text>
    {error ? <Notice tone="error">{error}</Notice> : null}
  </View>;
}

export function AttachmentPreview({ attachment }: { attachment: StoredAttachment }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true); setError('');
    try { await openAttachment(attachment); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không mở được tệp.'); }
    finally { setBusy(false); }
  }
  const imageUri = attachment.dataBase64 ? `data:${attachment.mimeType};base64,${attachment.dataBase64}` : attachment.uri;
  return <Card>
    <View style={styles.row}><Icon name={attachment.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} />
      <View style={styles.flex}><Text style={styles.fileName}>{attachment.name}</Text><Text style={styles.hint}>{(attachment.size / 1024).toFixed(0)} KB · {attachment.mimeType === 'application/pdf' ? 'PDF' : 'Ảnh'}</Text></View>
    </View>
    {attachment.mimeType.startsWith('image/') && !attachment.uri.startsWith('/files/') && <Image accessibilityLabel={`Bản chụp ${attachment.name}`} source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />}
    <Button title={Platform.OS === 'web' ? 'Tải tệp về' : 'Mở / chia sẻ tệp'} icon={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} variant="secondary" loading={busy} onPress={() => { void open(); }} />
    {error ? <Notice tone="error">{error}</Notice> : null}
  </Card>;
}

const styles = StyleSheet.create({
  section: { gap: 12 }, label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 19 }, row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  flex: { flex: 1, minWidth: 0 }, fileName: { color: colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  preview: { width: '100%', height: 190, borderRadius: 12, backgroundColor: colors.canvas },
});
