import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AttachmentPreview } from '../../components/records/AttachmentField';
import { RecordRow, UnverifiedBadge } from '../../components/records/RecordFields';
import { Button, Card, colors, EmptyState, Notice, PageHeader, Screen } from '../../components/ui';
import { dateKey, formatDate } from '../../data/date';
import { useNow } from '../../hooks/useNow';
import { useRecords } from '../../records/RecordsProvider';
import { purposeLabels } from '../../records/types';

export default function HealthCertificateDetailScreen() {
  const params = useLocalSearchParams<{ id: string; success?: string }>();
  const { certificates, ready, storageError, removeCertificate } = useRecords();
  const certificate = certificates.find(item => item.id === params.id);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const now = useNow();
  async function remove() {
    if (!certificate || busy) return;
    setBusy(true);
    const result = await removeCertificate(certificate.id);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    router.replace('/health-certificates');
  }
  if (!ready) return <Screen><PageHeader title="Giấy khám sức khỏe" back /><Text style={styles.copy}>Đang tải hồ sơ…</Text></Screen>;
  if (!certificate) return <Screen><PageHeader title="Giấy khám sức khỏe" back />
    {storageError ? <Notice tone="error">{storageError}</Notice> : null}
    <EmptyState icon="document-text-outline" title="Không tìm thấy giấy khám" message="Giấy này không nằm trong hồ sơ tài khoản hiện tại hoặc đã bị xóa."
      action={<Button title="Xem giấy đã lưu" onPress={() => router.replace('/health-certificates')} />} />
  </Screen>;
  return <Screen>
    <PageHeader title="Chi tiết giấy khám" subtitle="Bản chụp do bạn cung cấp" back />
    {params.success === '1' ? <Notice>Đã lưu giấy khám vào hồ sơ. Giấy đang ở trạng thái chưa xác thực.</Notice> : null}
    {storageError ? <Notice tone="error">{storageError}</Notice> : null}
    <Card style={styles.header}>
      <UnverifiedBadge /><Text style={styles.title}>{certificate.title}</Text>
      <Text style={styles.copy}>{purposeLabels[certificate.purpose]}</Text>
      {certificate.validUntil ? <Text style={styles.dateStatus}>{certificate.validUntil < dateKey(new Date(now)) ? 'Đã quá ngày hết hạn bạn khai báo' : 'Chưa quá ngày hết hạn bạn khai báo'}</Text> : null}
    </Card>
    <Card>
      <RecordRow label="Cơ sở khám / cấp giấy" value={certificate.issuer} />
      <RecordRow label="Ngày khám" value={formatDate(certificate.examDate)} />
      {certificate.validUntil ? <RecordRow label="Ngày hết hạn ghi trên giấy" value={formatDate(certificate.validUntil)} /> : null}
      {certificate.notes ? <RecordRow label="Ghi chú của bạn" value={certificate.notes} /> : null}
    </Card>
    {certificate.attachment ? <AttachmentPreview attachment={certificate.attachment} /> : null}
    <Notice>Chưa có xác nhận của cơ sở cấp giấy trên ứng dụng. Bản tải lên không thay thế giấy gốc khi nơi tiếp nhận yêu cầu.</Notice>
    <Button title="Đặt lịch khám sức khỏe" icon="calendar-outline" variant="secondary"
      onPress={() => router.push({ pathname: '/book/[id]', params: { id: '20', purpose: certificate.purpose } })} />
    {!deleting ? <Button title="Xóa giấy đã lưu" variant="danger" onPress={() => setDeleting(true)} /> : <Card>
      <Text style={styles.confirmTitle}>Xóa giấy khám khỏi hồ sơ?</Text><Text style={styles.copy}>Thông tin và tệp đính kèm của giấy này sẽ bị xóa khỏi hồ sơ. Thao tác này không hủy lịch hẹn khám sức khỏe.</Text>
      <Button title="Xác nhận xóa giấy" variant="danger" loading={busy} onPress={() => { void remove(); }} />
      <Button title="Giữ lại giấy" variant="secondary" disabled={busy} onPress={() => setDeleting(false)} />
    </Card>}
    {error ? <Notice tone="error">{error}</Notice> : null}
  </Screen>;
}
const styles = StyleSheet.create({
  header: { backgroundColor: colors.mint }, title: { color: colors.ink, fontSize: 23, fontWeight: '800', lineHeight: 31 },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 22 }, dateStatus: { color: colors.teal, fontSize: 13, lineHeight: 21 },
  confirmTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', lineHeight: 24 },
});
