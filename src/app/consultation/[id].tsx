import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PreparationChecklist } from '../../components/consultation/PreparationChecklist';
import { Avatar, Button, Card, colors, EmptyState, Icon, Notice, PageHeader, Screen } from '../../components/ui';
import { appointmentStart, formatDate } from '../../data/clinic';
import { useCatalog } from '../../state/CatalogProvider';
import { useNow } from '../../hooks/useNow';
import { useClinic } from '../../state/ClinicProvider';

export default function ConsultationScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const { appointments } = useClinic();
  const { getDoctor } = useCatalog();
  const now = useNow();
  const appointmentId = Array.isArray(id) ? id[0] : id;
  const appointment = appointments.find((item) => item.id === appointmentId);
  const doctor = appointment ? getDoctor(appointment.doctorId) : undefined;

  if (!appointment || !doctor || appointment.service !== 'online') {
    return <Screen><PageHeader title="Tư vấn trực tuyến" back /><EmptyState title="Không tìm thấy phiên tư vấn" message="Phiên tư vấn chỉ dành cho lịch hẹn trực tuyến của bạn." icon="videocam-outline" action={<Button title="Xem lịch hẹn" onPress={() => router.replace('/appointments')} />} /></Screen>;
  }

  if (appointment.status !== 'confirmed') {
    return <Screen><PageHeader title="Tư vấn trực tuyến" back /><EmptyState title={appointment.status === 'pending' ? 'Lịch hẹn đang chờ xác nhận' : 'Phiên tư vấn chưa khả dụng'} message="Bạn cần một lịch hẹn trực tuyến đã được phòng khám xác nhận để chuẩn bị tham gia phiên tư vấn." icon="time-outline" action={<Button title="Xem chi tiết lịch hẹn" onPress={() => router.replace({ pathname: '/appointment/[id]', params: { id: appointment.id } })} />} /></Screen>;
  }

  const start = appointmentStart(appointment);
  const end = start + appointment.durationMinutes * 60_000;
  const opens = start - 15 * 60_000;
  const windowLabel = now > end ? 'Đã qua thời gian tư vấn' : now >= opens ? 'Đang trong thời gian chuẩn bị' : 'Chưa đến giờ hẹn';
  const endTime = new Date(end).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });

  return (
    <Screen>
      <PageHeader title="Tư vấn trực tuyến" subtitle="Chuẩn bị sẵn sàng cho buổi hẹn của bạn" back />
      <Card style={styles.hero}>
        <View style={styles.videoIcon}><Icon name="videocam-outline" size={34} color={colors.teal} /></View>
        <Text style={styles.window}>{windowLabel}</Text>
        <Text style={styles.heroTitle}>Một cuộc hẹn, thêm an tâm</Text>
        <Text style={styles.heroCopy}>Khung giờ dự kiến để tham gia là từ 15 phút trước giờ hẹn đến khi kết thúc buổi tư vấn. Hiện ứng dụng hỗ trợ xem lịch và chuẩn bị trước cuộc hẹn.</Text>
        <View style={styles.timePill}><Icon name="calendar-outline" size={16} color={colors.teal} /><Text style={styles.timeLabel}>{formatDate(appointment.date)}</Text></View>
        <Text style={styles.time}>{appointment.time} – {endTime} · {appointment.durationMinutes} phút</Text>
      </Card>
      <Card style={styles.doctor}>
        <Avatar doctor={doctor} size={52} />
        <View style={styles.flex}><Text style={styles.doctorName}>{doctor.name}</Text><Text style={styles.specialty}>{doctor.specialty}</Text></View>
        <Icon name="videocam-outline" size={23} color={colors.teal} />
      </Card>

      <PreparationChecklist />
      <Notice>Video chưa được kết nối. Màn hình này giúp bạn xem lịch tư vấn và chuẩn bị trước buổi hẹn; hiện chưa thể gọi video với bác sĩ.</Notice>
      <View style={styles.actions}><Button title="Xem chi tiết lịch hẹn" variant="secondary" icon="calendar-outline" onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: appointment.id } })} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', backgroundColor: colors.mint, paddingVertical: 27, marginBottom: 15 },
  videoIcon: { width: 74, height: 74, borderRadius: 25, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  window: { color: colors.teal, fontSize: 12, fontWeight: '800', marginBottom: 9 },
  heroTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  heroCopy: { color: colors.muted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 9, paddingHorizontal: 5 },
  timePill: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 20 },
  timeLabel: { color: colors.teal, fontSize: 12, fontWeight: '700' },
  time: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 9 },
  doctor: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  doctorName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  specialty: { color: colors.muted, fontSize: 12, marginTop: 5 },
  actions: { marginTop: 14, marginBottom: 12 },
});
