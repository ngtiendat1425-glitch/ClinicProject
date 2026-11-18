import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Doctor, type ServiceType, formatMoney, serviceDuration, serviceFee } from '../data/clinic';
import { Avatar, Button, Card, colors, Icon } from './ui';

export function DoctorCard({ doctor, availability, service = 'in-person', date }: {
  doctor: Doctor; availability?: string; service?: ServiceType; date?: string;
}) {
  return <Card>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem hồ sơ ${doctor.name}`}
      onPress={() => router.push({ pathname: '/doctor/[id]', params: { id: doctor.id } })} style={s.row}>
      <Avatar doctor={doctor} />
      <View style={s.info}>
        <Text style={s.name}>{doctor.title} {doctor.name}</Text>
        <Text style={s.specialty}>{doctor.specialty}</Text>
        <Text style={s.meta}>{doctor.experience} năm kinh nghiệm</Text>
      </View>
      <View style={s.rating}><Icon name="star" size={12} color="#AD792F" /><Text style={s.ratingText}>{doctor.rating}</Text></View>
    </Pressable>
    <View style={s.rule} />
    <View style={s.footer}>
      <View style={s.info}>
        <Text style={s.fee}>{formatMoney(serviceFee(doctor, service))} <Text style={s.meta}>/ lượt</Text></Text>
        <Text style={s.availability}>{availability ?? `${serviceDuration(doctor, service)} phút · ${service === 'online' ? 'Trực tuyến' : 'Tại phòng khám'}`}</Text>
      </View>
      <Button title="Đặt lịch" onPress={() => router.push({ pathname: '/book/[id]', params: { id: doctor.id, service, ...(date ? { date } : {}) } })} />
    </View>
  </Card>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  info: { flex: 1 }, name: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: colors.ink },
  specialty: { color: colors.teal, fontSize: 13, marginTop: 4, fontWeight: '600' },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: '400' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: 7, borderRadius: 9, backgroundColor: '#FFF5E5', alignSelf: 'flex-start' },
  ratingText: { color: '#92611E', fontSize: 12, fontWeight: '700' }, rule: { height: 1, backgroundColor: colors.line },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fee: { color: colors.ink, fontWeight: '700', fontSize: 14 }, availability: { fontSize: 12, lineHeight: 18, marginTop: 5, color: colors.muted },
});
