import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AttachmentPreview } from '../components/records/AttachmentField';
import { InsuranceEditor } from '../components/records/InsuranceEditor';
import { RecordRow, UnverifiedBadge } from '../components/records/RecordFields';
import { Button, Card, colors, EmptyState, Notice, PageHeader, Screen } from '../components/ui';
import { formatDate } from '../data/date';
import { useNow } from '../hooks/useNow';
import { useRecords } from '../records/RecordsProvider';
import { insuranceDateStatus } from '../records/validation';

export default function InsuranceScreen() {
  const { ready, insurance, storageError, removeInsurance, isRemote } = useRecords();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const now = useNow();
  async function remove() {
    setBusy(true);
    const result = await removeInsurance();
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    setDeleting(false); setMessage('Đã xóa thông tin BHYT khỏi hồ sơ.');
  }
  return <Screen>
    <PageHeader title={editing ? 'Thông tin BHYT' : 'Thẻ BHYT của tôi'} subtitle="Lưu thông tin thẻ để chuẩn bị khi đặt khám" back />
    <Notice>Thông tin do bạn khai báo, chưa xác thực với BHXH. Phòng khám cần kiểm tra thẻ và điều kiện sử dụng khi tiếp nhận.</Notice>
    {storageError ? <Notice tone="error">{storageError}</Notice> : null}
    {!ready ? <Text style={styles.copy}>Đang tải hồ sơ BHYT…</Text> : editing ? (
      <InsuranceEditor card={insurance} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setMessage('Đã cập nhật thông tin BHYT.'); }} />
    ) : insurance ? <>
      {message ? <Notice>{message}</Notice> : null}
      <Card style={styles.card}>
        <Text style={styles.kicker}>THÔNG TIN THẺ DO BẠN KHAI BÁO</Text><UnverifiedBadge />
        <Text style={styles.number}>{insurance.number}</Text><Text style={styles.holder}>{insurance.holderName}</Text>
        <Text style={styles.dateStatus}>{insuranceDateStatus(insurance, now)}</Text>
      </Card>
      <Card>
        <RecordRow label="Ngày sinh" value={formatDate(insurance.birthDate)} />
        <RecordRow label="Nơi đăng ký khám ban đầu" value={insurance.registrationPlace} />
        <RecordRow label="Có giá trị từ" value={formatDate(insurance.validFrom)} />
        <RecordRow label="Có giá trị đến" value={formatDate(insurance.validTo)} />
      </Card>
      {insurance.attachment ? <AttachmentPreview attachment={insurance.attachment} /> : null}
      <Button title="Chỉnh sửa thông tin" icon="create-outline" onPress={() => { setEditing(true); setDeleting(false); setMessage(''); setError(''); }} />
      {!deleting ? <Button title="Xóa thẻ đã lưu" variant="danger" onPress={() => setDeleting(true)} /> : <Card>
        <Text style={styles.holder}>Xóa thông tin BHYT đã lưu?</Text><Text style={styles.copy}>Thẻ và tệp đính kèm trong hồ sơ sẽ bị xóa. Thông tin đã khai báo trong các lịch hẹn cũ được giữ nguyên.</Text>
        <Button title="Xác nhận xóa thẻ" variant="danger" onPress={() => { void remove(); }} loading={busy} />
        <Button title="Giữ lại thẻ" variant="secondary" onPress={() => setDeleting(false)} disabled={busy} />
      </Card>}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </> : <>
      {message ? <Notice>{message}</Notice> : null}
      <EmptyState icon="card-outline" title="Chưa lưu thẻ BHYT" message="Thêm thông tin trên thẻ và bản chụp để thuận tiện khi chuẩn bị hồ sơ khám."
        action={<Button title="Thêm thẻ BHYT" icon="add-outline" onPress={() => { setEditing(true); setMessage(''); }} />} />
    </>}
    <Text style={styles.copy}>{isRemote ? 'Hồ sơ và tệp đính kèm được lưu trên máy chủ của phòng khám theo tài khoản đã đăng nhập.' : 'Hồ sơ được lưu cục bộ theo tài khoản trên thiết bị này.'}</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.mint }, kicker: { fontSize: 11, letterSpacing: 0.7, color: colors.teal, fontWeight: '800' },
  number: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: 0.7 }, holder: { color: colors.ink, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  dateStatus: { color: colors.teal, fontSize: 13, lineHeight: 20 }, copy: { color: colors.muted, fontSize: 14, lineHeight: 22 },
});
