import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Card, colors, Icon } from '../ui';
import { formatDate, serviceLabels, type Appointment } from '../../data/clinic';
import { useCatalog } from '../../state/CatalogProvider';

export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const { getDoctor } = useCatalog();
  const doctor = getDoctor(appointment.doctorId);
  if (!doctor) return null;
  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={`Lịch khám ${doctor.name}, ${formatDate(appointment.date)} lúc ${appointment.time}`}
      onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: appointment.id } })}>
      <Card style={styles.appointment}>
        <View style={styles.cardTop}>
          <View style={styles.dateLine}><Icon name="calendar-outline" size={17} /><Text style={styles.date}>{formatDate(appointment.date)}</Text></View>
          <Badge status={appointment.status} />
        </View>
        <View style={styles.doctorRow}>
          <Avatar doctor={doctor} size={50} />
          <View style={styles.flex}><Text style={styles.doctorName}>{doctor.title} {doctor.name}</Text><Text style={styles.specialty}>{doctor.specialty}</Text></View>
          <Icon name="chevron-forward" size={19} color={colors.muted} />
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.metaRow}><Icon name="time-outline" size={16} color={colors.muted} /><Text style={styles.meta}>{appointment.time} · {appointment.durationMinutes} phút</Text></View>
          <View style={styles.metaRow}><Icon name={appointment.service === 'online' ? 'videocam-outline' : 'location-outline'} size={16} color={colors.muted} /><Text style={styles.meta}>{serviceLabels[appointment.service]}</Text></View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, appointment: { marginBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 9 },
  dateLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, date: { fontSize: 12, color: colors.ink, fontWeight: '700' },
  doctorRow: { flexDirection: 'row', gap: 11, alignItems: 'center', paddingVertical: 8 },
  doctorName: { color: colors.ink, fontSize: 15, fontWeight: '800' }, specialty: { color: colors.teal, fontSize: 12, marginTop: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.line },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, meta: { fontSize: 12, color: colors.muted },
});
