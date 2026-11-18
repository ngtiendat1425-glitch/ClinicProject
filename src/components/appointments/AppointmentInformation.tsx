import { StyleSheet, Text, View } from 'react-native';
import { Card, colors, Icon } from '../ui';
import { formatMoney, serviceLabels, type Appointment } from '../../data/clinic';
import { healthCheckPurposes } from '../booking/HealthCheckPurposePicker';

export function AppointmentInformation({ appointment, patientName }: { appointment: Appointment; patientName: string }) {
  return (
    <Card>
      <Text style={styles.title}>Thông tin buổi khám</Text>
      <DetailRow label="Người khám" value={patientName} />
      <DetailRow label="Hình thức" value={serviceLabels[appointment.service]} />
      <DetailRow label="Địa điểm" value={appointment.service === 'online' ? 'Tư vấn trực tuyến theo lịch hẹn' : 'Phòng khám An Tâm'} />
      <DetailRow label="Phí dịch vụ" value={formatMoney(appointment.fee)} />
      <DetailRow label="Thời lượng" value={`${appointment.durationMinutes} phút`} />
      {appointment.healthCheckPurpose && <DetailRow label="Mục đích khám sức khỏe" value={healthCheckPurposes[appointment.healthCheckPurpose]} />}
      {appointment.insurance && <View style={styles.reasonBlock}>
        <Text style={styles.title}>BHYT đính kèm</Text>
        <Text style={styles.reason}>{appointment.insurance.holderName} · •••• {appointment.insurance.number.slice(-4)}</Text>
        <Text style={styles.meta}>{appointment.insurance.registrationPlace}</Text>
        <Text style={styles.meta}>Chưa xác minh. Phí hiển thị chưa trừ BHYT.</Text>
      </View>}
      <View style={styles.reasonBlock}><Text style={styles.label}>Lý do khám</Text><Text style={styles.reason}>{appointment.reason}</Text></View>
      {appointment.cancelReason ? (
        <View style={styles.reasonBlock}>
          <Text style={styles.label}>Lý do hủy</Text><Text style={styles.reason}>{appointment.cancelReason}</Text>
          {appointment.cancelledAt ? <Text style={styles.meta}>Đã hủy lúc {new Date(appointment.cancelledAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</Text> : null}
        </View>
      ) : null}
    </Card>
  );
}

export function EncounterResult({ result, demo = true }: { result: NonNullable<Appointment['result']>; demo?: boolean }) {
  return (
    <Card>
      <View style={styles.resultHeading}><Icon name="document-text-outline" size={22} /><Text style={styles.title}>Kết quả buổi khám</Text></View>
      <Text style={styles.label}>Nội dung buổi khám</Text><Text style={styles.reason}>{result.summary}</Text>
      <Text style={styles.label}>Hướng dẫn của bác sĩ</Text><Text style={styles.reason}>{result.advice}</Text>
      {result.followUp ? <><Text style={styles.label}>Hẹn tái khám</Text><Text style={styles.reason}>{result.followUp}</Text></> : null}
      {demo && <Text style={styles.disclaimer}>Kết quả minh họa cho bản trải nghiệm, không phải tư vấn y tế.</Text>}
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 },
  label: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  value: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink, lineHeight: 20, textAlign: 'right' },
  reasonBlock: { paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  reason: { fontSize: 14, color: colors.ink, lineHeight: 23 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 5, lineHeight: 18 },
  resultHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclaimer: { fontSize: 12, color: colors.muted, marginTop: 8, fontStyle: 'italic', lineHeight: 19 },
});
