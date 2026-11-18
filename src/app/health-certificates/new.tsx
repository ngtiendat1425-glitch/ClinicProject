import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AttachmentField, useAttachmentDraft } from '../../components/records/AttachmentField';
import { PurposePicker } from '../../components/records/RecordFields';
import { Button, colors, Field, Notice, PageHeader, Screen } from '../../components/ui';
import { dateKey } from '../../data/date';
import { useNow } from '../../hooks/useNow';
import { useRecords } from '../../records/RecordsProvider';
import { purposeLabels, type CertificatePurpose } from '../../records/types';

export default function NewHealthCertificateScreen() {
  const params = useLocalSearchParams<{ purpose?: string }>();
  const initialPurpose = Object.hasOwn(purposeLabels, params.purpose ?? '') ? params.purpose as CertificatePurpose : 'employment';
  const { addCertificate, ready, storageError } = useRecords();
  const now = useNow();
  const [title, setTitle] = useState('Giấy khám sức khỏe');
  const [purpose, setPurpose] = useState<CertificatePurpose>(initialPurpose);
  const [issuer, setIssuer] = useState('');
  const [examDate, setExamDate] = useState(dateKey(new Date(now)));
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const draft = useAttachmentDraft();
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    draft.beginSave();
    const result = await addCertificate({ title, purpose, issuer, examDate, validUntil: validUntil || undefined, notes, attachment: draft.attachment });
    draft.finishSave(result.ok);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    if (result.id) router.replace({ pathname: '/health-certificates/[id]', params: { id: result.id, success: '1' } });
    else router.replace('/health-certificates');
  }
  return <Screen>
    <PageHeader title="Thêm giấy khám" subtitle="Tải bản chụp hoặc PDF giấy đã được cấp" back />
    <Notice>Chỉ lưu bản giấy bạn đã có. Thông tin và tệp tải lên chưa được phòng khám xác thực.</Notice>
    {storageError ? <Notice tone="error">{storageError}</Notice> : null}
    <Field label="Tên giấy khám *" value={title} onChangeText={setTitle} maxLength={120} placeholder="Ví dụ: Giấy khám sức khỏe xin việc" />
    <PurposePicker value={purpose} onChange={setPurpose} />
    <Field label="Cơ sở khám / cấp giấy *" value={issuer} onChangeText={setIssuer} maxLength={200} placeholder="Tên cơ sở ghi trên giấy" />
    <Field label="Ngày khám * (YYYY-MM-DD)" value={examDate} onChangeText={setExamDate} maxLength={10} autoCorrect={false} placeholder="2026-11-17" />
    <Field label="Ngày hết hạn ghi trên giấy (YYYY-MM-DD)" value={validUntil} onChangeText={setValidUntil} maxLength={10} autoCorrect={false} placeholder="Để trống nếu giấy không ghi" />
    <Text style={styles.hint}>Ứng dụng không tự suy ra thời hạn giấy. Chỉ nhập ngày được ghi trên giấy của bạn.</Text>
    <AttachmentField value={draft.attachment} onChange={draft.change} required />
    <Field label="Ghi chú (tùy chọn)" value={notes} onChangeText={setNotes} maxLength={1000} multiline numberOfLines={3} placeholder="Thông tin giúp bạn tìm lại giấy…" />
    {error ? <Notice tone="error">{error}</Notice> : null}
    <Button title="Lưu giấy khám" icon="save-outline" onPress={() => { void save(); }} loading={busy} disabled={!ready} />
    <Button title="Đặt lịch khám sức khỏe" icon="calendar-outline" variant="secondary" disabled={busy}
      onPress={() => router.push({ pathname: '/book/[id]', params: { id: '20', purpose } })} />
  </Screen>;
}
const styles = StyleSheet.create({ hint: { color: colors.muted, fontSize: 12, lineHeight: 19 } });
