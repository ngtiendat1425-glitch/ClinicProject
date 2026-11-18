import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, Field, Notice } from '../ui';
import { formatDate, type Appointment } from '../../data/clinic';
import { useClinic } from '../../state/ClinicProvider';

export function CancellationPanel({ appointment, doctorName, onCancelled }: {
  appointment: Appointment; doctorName: string; onCancelled: () => void;
}) {
  const { cancelAppointment } = useClinic();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function keepAppointment() { setOpen(false); setConfirming(false); setError(''); }

  function prepare() {
    if (reason.trim().length < 5) { setError('Vui lòng nhập lý do hủy ít nhất 5 ký tự.'); return; }
    setError(''); setConfirming(true);
  }

  async function cancel() {
    if (saving) return;
    setSaving(true);
    const result = await cancelAppointment(appointment.id, reason.trim());
    setSaving(false);
    if (!result.ok) { setError(result.error); setConfirming(false); return; }
    keepAppointment(); onCancelled();
  }

  if (!open) return <Button title="Hủy lịch hẹn" variant="danger" onPress={() => setOpen(true)} />;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{confirming ? 'Xác nhận hủy lịch hẹn?' : 'Lý do hủy lịch hẹn'}</Text>
      {confirming ? (
        <>
          <Text style={styles.copy}>Bạn sẽ hủy lịch với {doctorName} lúc {appointment.time}, {formatDate(appointment.date)}. Khung giờ sẽ được giải phóng.</Text>
          <Text style={styles.reason}>{reason.trim()}</Text>
          <View style={styles.actions}>
            <Button title="Xác nhận hủy lịch" variant="danger" onPress={() => void cancel()} loading={saving} />
            <Button title="Giữ lịch hẹn" variant="secondary" onPress={keepAppointment} />
          </View>
        </>
      ) : (
        <>
          <Field label="Lý do *" placeholder="Ví dụ: Tôi cần thay đổi thời gian khám…" value={reason}
            onChangeText={(text) => { setReason(text); setError(''); }} multiline numberOfLines={3}
            maxLength={500} textAlignVertical="top" />
          <View style={styles.actions}>
            <Button title="Tiếp tục hủy" variant="danger" onPress={prepare} />
            <Button title="Giữ lịch hẹn" variant="secondary" onPress={keepAppointment} />
          </View>
        </>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: '#EECFCB' }, title: { fontSize: 16, fontWeight: '800', color: colors.ink },
  copy: { color: colors.ink, fontSize: 14, lineHeight: 23 },
  reason: { fontSize: 14, color: colors.ink, lineHeight: 23, fontWeight: '600' },
  actions: { gap: 10, marginTop: 4 },
});
