import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppointmentInformation, EncounterResult } from '../../components/appointments/AppointmentInformation';
import { CancellationPanel } from '../../components/appointments/CancellationPanel';
import { Avatar, Badge, Button, Card, colors, EmptyState, Icon, Notice, PageHeader, Screen } from '../../components/ui';
import { appointmentStart, formatDate } from '../../data/clinic';
import { useCatalog } from '../../state/CatalogProvider';
import { useNow } from '../../hooks/useNow';
import { useClinic } from '../../state/ClinicProvider';

export default function AppointmentDetailScreen() {
  const params = useLocalSearchParams<{ id: string; success?: string }>();
  const { appointments, patient } = useClinic();
  const { getDoctor, isRemote } = useCatalog();
  const appointment = appointments.find((item) => item.id === params.id);
  const doctor = appointment ? getDoctor(appointment.doctorId) : undefined;
  const [cancelled, setCancelled] = useState(false);
  const now = useNow();

  if (!appointment || !doctor) {
    return <Screen><PageHeader title="Chi tiết lịch hẹn" back />
      <EmptyState icon="calendar-outline" title="Không tìm thấy lịch hẹn"
        message="Lịch hẹn không tồn tại trong tài khoản này hoặc đường dẫn không hợp lệ."
        action={<Button title="Xem lịch hẹn" onPress={() => router.replace('/appointments')} />} />
    </Screen>;
  }

  const canCancel = ['pending', 'confirmed'].includes(appointment.status) && appointmentStart(appointment) > now;

  return (
    <Screen>
      <PageHeader title="Chi tiết lịch hẹn" subtitle={`Mã lịch hẹn · ${appointment.id.slice(-8).toUpperCase()}`} back />
      {params.success === '1' && appointment.status === 'pending' &&
        <Notice>Đã gửi yêu cầu đặt lịch. Bạn có thể theo dõi trạng thái tại đây. Chỗ được giữ trong 30 phút để chờ xác nhận.</Notice>}
      {cancelled && <Notice>Đã hủy lịch hẹn và giải phóng khung giờ. Lý do hủy được lưu trong chi tiết bên dưới.</Notice>}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeading}><Text style={styles.eyebrow}>TRẠNG THÁI LỊCH HẸN</Text><Badge status={appointment.status} /></View>
        <Text style={styles.date}>{formatDate(appointment.date)}</Text>
        <Text style={styles.time}>{appointment.time}<Text style={styles.duration}>  ·  {appointment.durationMinutes} phút</Text></Text>
        {appointment.status === 'pending' && appointment.holdExpiresAt ? (
          <View style={styles.holdInfo}><Icon name="time-outline" size={16} /><Text style={styles.holdCopy}>
            Giữ chỗ đến {new Date(appointment.holdExpiresAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })} · chờ xác nhận
          </Text></View>
        ) : null}
      </Card>
      <Card>
        <View style={styles.doctorRow}>
          <Avatar doctor={doctor} size={58} />
          <View style={styles.flex}>
            <Text style={styles.doctorName}>{doctor.title} {doctor.name}</Text>
            <Text style={styles.specialty}>{doctor.specialty}</Text><Text style={styles.meta}>{doctor.experience} năm kinh nghiệm</Text>
          </View>
        </View>
        <Button title="Xem hồ sơ bác sĩ" variant="secondary"
          onPress={() => router.push({ pathname: '/doctor/[id]', params: { id: doctor.id } })} />
      </Card>
      <AppointmentInformation appointment={appointment} patientName={patient.name} />
      {appointment.result ? <EncounterResult result={appointment.result} demo={!isRemote} /> : null}
      {appointment.service === 'online' && appointment.status === 'confirmed' ? (
        <View>
          <Button title="Chuẩn bị tư vấn trực tuyến" icon="videocam-outline"
            onPress={() => router.push({ pathname: '/consultation/[id]', params: { id: appointment.id } })} />
          <Text style={styles.caption}>Video chưa được kết nối trong bản trải nghiệm.</Text>
        </View>
      ) : null}
      {appointment.status === 'pending' && <Notice>{isRemote ? 'Lịch hẹn đang chờ phòng khám xác nhận. Yêu cầu sẽ hết hạn khi kết thúc thời gian giữ chỗ.' : 'Lịch hẹn chưa được xác nhận. Bản trải nghiệm không tự xác nhận thay cho phòng khám; yêu cầu sẽ hết hạn khi kết thúc thời gian giữ chỗ.'}</Notice>}
      {appointment.status === 'expired' && <Notice>Yêu cầu đã hết thời gian giữ chỗ. Bạn có thể chọn lại khung giờ và gửi yêu cầu mới.</Notice>}
      {canCancel && <CancellationPanel appointment={appointment} doctorName={doctor.name} onCancelled={() => setCancelled(true)} />}
      {['cancelled', 'expired', 'completed'].includes(appointment.status) &&
        <Button title="Đặt lịch mới với bác sĩ" icon="calendar-outline"
          onPress={() => router.push({ pathname: '/book/[id]', params: { id: doctor.id, service: appointment.service } })} />}
      <Text style={styles.footerNote}>{isRemote ? 'Thông tin lịch hẹn được quản lý trong tài khoản của bạn.' : 'Thông tin được lưu trong bản trải nghiệm trên thiết bị này.'}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, statusCard: { backgroundColor: colors.mint },
  statusHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  eyebrow: { color: colors.teal, fontWeight: '800', letterSpacing: 0.8, fontSize: 11 },
  date: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 8 },
  time: { color: colors.teal, fontSize: 33, fontWeight: '800' }, duration: { fontSize: 14, fontWeight: '500', color: colors.muted },
  holdInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 }, holdCopy: { color: colors.teal, fontSize: 12, flex: 1, lineHeight: 18 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, doctorName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  specialty: { fontSize: 13, color: colors.teal, fontWeight: '600', marginTop: 4 }, meta: { fontSize: 12, color: colors.muted, marginTop: 5, lineHeight: 18 },
  caption: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 19, marginTop: 10 },
  footerNote: { fontSize: 12, lineHeight: 19, textAlign: 'center', color: colors.muted },
});
