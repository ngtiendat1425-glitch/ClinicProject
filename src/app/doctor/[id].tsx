import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card, colors, EmptyState, Icon, PageHeader, Screen } from '../../components/ui';
import { bookingDays, formatMoney, getAvailableTimes } from '../../data/clinic';
import { useCatalog } from '../../state/CatalogProvider';
import { useClinic } from '../../state/ClinicProvider';
import { useNow } from '../../hooks/useNow';

export default function DoctorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDoctor, isRemote } = useCatalog();
  const doctor = getDoctor(id);
  const { appointments } = useClinic();
  const now = useNow();
  if (!doctor) return <Screen><PageHeader title="Hồ sơ bác sĩ" back /><EmptyState title="Không tìm thấy bác sĩ"
    message="Vui lòng chọn bác sĩ trong danh sách hiện có." action={<Button title="Tìm bác sĩ" onPress={() => router.replace('/doctors')} />} /></Screen>;
  const days = bookingDays(4);
  const available = days.filter(day => getAvailableTimes(doctor.id, day.date, 'in-person', appointments, now).length > 0);
  return <Screen>
    <PageHeader title="Hồ sơ bác sĩ" back />
    <Card style={s.profile}>
      <Avatar doctor={doctor} size={90} />
      <Text style={s.name}>{doctor.title} {doctor.name}</Text><Text style={s.specialty}>{doctor.specialty}</Text>
      <View style={s.stats}>
        <View style={s.stat}><Icon name="ribbon-outline" /><Text style={s.value}>{doctor.experience} năm</Text><Text style={s.caption}>Kinh nghiệm</Text></View>
        <View style={s.divider} />
        <View style={s.stat}><Icon name="star" color={colors.orange} /><Text style={s.value}>{doctor.rating}/5</Text><Text style={s.caption}>{doctor.reviewCount} đánh giá mẫu</Text></View>
      </View>
    </Card>
    <Card><Text style={s.heading}>Về bác sĩ</Text><Text style={s.copy}>{doctor.bio}</Text>
      <View style={s.infoLine}><Icon name="language-outline" size={19} /><Text style={s.copy}>{doctor.languages.join(', ')}</Text></View>
    </Card>
    <Card><Text style={s.heading}>Chuyên môn & đào tạo</Text>{doctor.education.map(item => <View key={item} style={s.infoLine}>
      <Icon name="checkmark-circle-outline" size={19} /><Text style={[s.copy, s.flex]}>{item}</Text></View>)}</Card>
    <Text style={s.heading}>Chọn dịch vụ</Text>
    <Card><View style={s.serviceRow}><View style={s.serviceIcon}><Icon name="medical-outline" /></View><View style={s.flex}>
      <Text style={s.serviceTitle}>Khám tại phòng khám</Text><Text style={s.copy}>{doctor.durationMinutes} phút · Khám trực tiếp</Text></View></View>
      <Text style={s.price}>{formatMoney(doctor.fee)} <Text style={s.caption}>/ lượt khám</Text></Text>
      <Button title="Đặt lịch khám" icon="calendar-outline" onPress={() => router.push({ pathname: '/book/[id]', params: { id: doctor.id } })} />
    </Card>
    {doctor.supportsOnline !== false && <Card><View style={s.serviceRow}><View style={s.serviceIcon}><Icon name="videocam-outline" /></View><View style={s.flex}>
      <Text style={s.serviceTitle}>Tư vấn trực tuyến</Text><Text style={s.copy}>20 phút · Trao đổi theo lịch hẹn</Text></View></View>
      <Text style={s.price}>{formatMoney(Math.round(doctor.fee * .8))} <Text style={s.caption}>/ buổi tư vấn</Text></Text>
      <Button title="Đặt lịch tư vấn" variant="secondary" icon="videocam-outline" onPress={() => router.push({ pathname: '/book/[id]', params: { id: doctor.id, service: 'online' } })} />
    </Card>}
    {!isRemote && <Card><Text style={s.heading}>Lịch trống gần nhất</Text>
      {available.length ? available.map(day => <View key={day.date} style={s.day}><Text style={s.dayTitle}>{day.label}, {day.day}</Text>
        <Text style={s.dayTimes}>{getAvailableTimes(doctor.id, day.date, 'in-person', appointments).slice(0, 4).join('  ·  ')}</Text></View>)
        : <Text style={s.copy}>Các ngày gần nhất đã kín lịch. Bạn có thể chọn ngày khác khi đặt khám.</Text>}
    </Card>}
    {!isRemote && <Text style={s.disclaimer}>Hồ sơ bác sĩ, đánh giá và mức phí là dữ liệu minh họa cho đồ án.</Text>}
  </Screen>;
}
const s = StyleSheet.create({
  flex: { flex: 1 }, profile: { alignItems: 'center', paddingTop: 26 }, name: { color: colors.ink, fontSize: 23, fontWeight: '800', textAlign: 'center' },
  specialty: { fontSize: 15, fontWeight: '600', color: colors.teal }, stats: { flexDirection: 'row', width: '100%', paddingTop: 14, gap: 16, paddingBottom: 4 },
  stat: { flex: 1, alignItems: 'center', gap: 6 }, divider: { width: 1, backgroundColor: colors.line }, value: { fontSize: 16, color: colors.ink, fontWeight: '700' },
  caption: { fontSize: 12, color: colors.muted, fontWeight: '400' }, heading: { fontSize: 17, color: colors.ink, fontWeight: '700' },
  copy: { fontSize: 14, lineHeight: 23, color: colors.muted }, infoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, serviceIcon: { padding: 12, borderRadius: 15, backgroundColor: colors.mint },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: colors.ink }, price: { fontSize: 22, fontWeight: '700', color: colors.teal },
  day: { paddingVertical: 8, gap: 6 }, dayTitle: { fontSize: 14, color: colors.ink, fontWeight: '600' }, dayTimes: { fontSize: 13, color: colors.teal },
  disclaimer: { fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});
