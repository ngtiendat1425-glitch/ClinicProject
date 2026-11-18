import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge, Button, Card, colors, EmptyState, Icon, Notice, PageHeader, Screen } from '../components/ui';
import { formatDate, serviceLabels } from '../data/clinic';
import { useCatalog } from '../state/CatalogProvider';
import { useClinic } from '../state/ClinicProvider';

export default function HistoryScreen() {
  const { appointments } = useClinic();
  const { getDoctor } = useCatalog();
  const completed = appointments.filter((item) => item.status === 'completed').sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  return (
    <Screen>
      <PageHeader title="Lịch sử khám" subtitle="Theo dõi hành trình chăm sóc sức khỏe" back />
      <Card style={styles.summary}>
        <View style={styles.summaryIcon}><Icon name="document-text-outline" size={26} color={colors.teal} /></View>
        <View style={styles.flex}><Text style={styles.summaryTitle}>{completed.length} buổi khám đã hoàn thành</Text><Text style={styles.summaryCopy}>Kết quả và hướng dẫn sau buổi khám</Text></View>
      </Card>
      {completed.length ? completed.map((appointment) => {
        const doctor = getDoctor(appointment.doctorId);
        if (!doctor) return null;
        return (
          <Pressable key={appointment.id} accessibilityRole="button" accessibilityLabel={`Xem kết quả khám ngày ${formatDate(appointment.date)}`} onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: appointment.id } })}>
            <Card style={styles.encounter}>
              <View style={styles.top}><Text style={styles.date}>{formatDate(appointment.date)}</Text><Badge status={appointment.status} /></View>
              <View style={styles.doctor}><Avatar doctor={doctor} size={48} /><View style={styles.flex}><Text style={styles.doctorName}>{doctor.name}</Text><Text style={styles.specialty}>{doctor.specialty} · {serviceLabels[appointment.service]}</Text></View></View>
              {appointment.result ? <View style={styles.result}><Text style={styles.resultLabel}>KẾT QUẢ BUỔI KHÁM</Text><Text style={styles.resultText} numberOfLines={3}>{appointment.result.summary}</Text></View> : null}
              <View style={styles.detailRow}><Text style={styles.detail}>Xem kết quả và hướng dẫn</Text><Icon name="arrow-forward-outline" size={17} color={colors.teal} /></View>
            </Card>
          </Pressable>
        );
      }) : <EmptyState title="Chưa có kết quả khám" message="Kết quả được hiển thị sau khi bác sĩ hoàn thành buổi khám của bạn." icon="document-text-outline" action={<Button title="Xem lịch hẹn" onPress={() => router.push('/appointments')} />} />}
      <Notice>Kết quả hiển thị trong bản demo là dữ liệu giả lập.</Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: {
    backgroundColor: colors.mint,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22
  },
  summaryIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  summaryCopy: { color: colors.muted, fontSize: 11, marginTop: 5, lineHeight: 17 },
  encounter: { marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 18 },
  date: { color: colors.ink, fontSize: 12, fontWeight: '700', flex: 1 },
  doctor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doctorName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  specialty: { color: colors.muted, fontSize: 11, marginTop: 5, lineHeight: 17 },
  result: { backgroundColor: colors.canvas, borderRadius: 12, padding: 13, marginTop: 17 },
  resultLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7, color: colors.muted },
  resultText: { color: colors.ink, fontSize: 12, lineHeight: 21, marginTop: 7 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingTop: 8 },
  detail: { color: colors.teal, fontSize: 12, fontWeight: '700' },
});
