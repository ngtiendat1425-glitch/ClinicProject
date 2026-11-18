import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DoctorCard } from '../../components/DoctorCard';
import { HeroCard } from '../../components/home/HeroCard';
import { PatientServices } from '../../components/home/PatientServices';
import { SearchBox } from '../../components/SearchBox';
import { Card, colors, EmptyState, Icon, type IconName, Screen } from '../../components/ui';
import { appointmentStart, formatDate, normalizeSearch } from '../../data/clinic';
import { useCatalog } from '../../state/CatalogProvider';
import { useClinic } from '../../state/ClinicProvider';
import { useNow } from '../../hooks/useNow';
import { useAuth } from '../../auth/AuthProvider';
import { apiConfigured } from '../../services/api';

export default function HomeScreen() {
  const { patient, appointments, notifications } = useClinic();
  const { departments, doctors, getDoctor } = useCatalog();
  const { isDemo } = useAuth();
  const [query, setQuery] = useState('');
  const now = useNow();
  const unread = notifications.filter(item => !item.read).length;
  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status) && appointmentStart(a) > now)
    .sort((a, b) => appointmentStart(a) - appointmentStart(b))[0];
  const upcomingDoctor = upcoming ? getDoctor(upcoming.doctorId) : null;
  const shown = doctors.filter(d => normalizeSearch(`${d.name} ${d.specialty}`).includes(normalizeSearch(query))).slice(0, 3);
  const firstName = patient.name.trim().split(/\s+/).slice(-2).join(' ');
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)));
  const goToSearch = () => router.push({ pathname: '/doctors', params: { q: query } });
  return <Screen>
    <View style={s.top}>
      <View style={s.brand}><View style={s.mark}><Icon name="add" color={colors.white} size={25} /></View><Text style={s.brandText}>an tâm<Text style={s.brandDot}>.</Text></Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Thông báo, ${unread} chưa đọc`}
        style={s.bell} onPress={() => router.push('/notifications')}>
        <Icon name="notifications-outline" color={colors.ink} />
        {unread > 0 && <View style={s.dot} />}
      </Pressable>
    </View>
    <View><Text style={s.greeting}>Chào {hour < 12 ? 'buổi sáng' : hour < 18 ? 'buổi chiều' : 'buổi tối'},</Text>
      <Text style={s.name}>{firstName} <Text style={s.sun}>✦</Text></Text>
      <Text style={s.intro}>Chăm sóc sức khỏe bắt đầu từ một lịch hẹn.</Text></View>
    <SearchBox value={query} onChange={setQuery} onSubmit={goToSearch} />
    {!query && <HeroCard />}
    {!!upcoming && !!upcomingDoctor && !query && <Pressable accessibilityRole="button" accessibilityLabel="Xem lịch hẹn sắp tới"
      onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: upcoming.id } })}>
      <Card style={s.upcoming}><View style={s.calendar}><Icon name="calendar-outline" /></View>
        <View style={s.flex}><Text style={s.upcomingLabel}>LỊCH HẸN SẮP TỚI</Text><Text style={s.upcomingTitle}>{upcomingDoctor.name}</Text>
          <Text style={s.upcomingTime}>{upcoming.time} · {formatDate(upcoming.date)}</Text></View><Icon name="chevron-forward" size={18} /></Card>
    </Pressable>}
    {!query && <>
      <View style={s.section}><Text style={s.sectionTitle}>Bạn cần khám gì?</Text><Pressable accessibilityRole="button" style={s.linkArea}
        onPress={() => router.push('/departments')}><Text style={s.link}>Tất cả {departments.length} ›</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.specialties}>
        {departments.filter(item => item.kind === 'clinical').slice(0, 6).map(department => <Pressable key={department.id} accessibilityRole="button"
          onPress={() => router.push({ pathname: '/departments/[id]', params: { id: department.id } })} style={s.specialty}>
          <View style={[s.specialtyIcon, { backgroundColor: department.color }]}><Icon name={department.icon as IconName} size={25} /></View>
          <Text style={s.specialtyName}>{department.name}</Text><Text style={s.specialtyCount}>{department.doctorIds.length} bác sĩ</Text>
        </Pressable>)}
      </ScrollView>
      <Text style={s.sectionTitle}>Hồ sơ & dịch vụ</Text>
      <PatientServices />
    </>}
    <View style={s.section}><View style={s.sectionCopy}><Text style={s.sectionTitle}>{query ? 'Kết quả tìm kiếm' : 'Bác sĩ đồng hành'}</Text>
      <Text style={s.hint}>{query ? 'Tìm theo tên và chuyên khoa' : 'Tìm người phù hợp với nhu cầu của bạn'}</Text></View>
      <Pressable accessibilityRole="button" onPress={goToSearch} style={s.linkArea}><Text style={s.link}>Xem tất cả ›</Text></Pressable></View>
    {shown.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} />)}
    {!shown.length && <EmptyState title="Chưa tìm thấy bác sĩ" message="Thử tên hoặc chuyên khoa khác. Bạn có thể tìm kiếm không dấu." icon="search-outline" />}
    <View style={s.demo}><Icon name={apiConfigured && !isDemo ? 'cloud-done-outline' : 'flask-outline'} size={14} color={colors.muted} />
      <Text style={s.demoText}>{apiConfigured && !isDemo ? 'Đã kết nối máy chủ' : 'Bản trải nghiệm · Dữ liệu minh họa'}</Text></View>
  </Screen>;
}
const s = StyleSheet.create({
  flex: { flex: 1 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, mark: { width: 33, height: 33, borderRadius: 11, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: colors.ink, fontWeight: '800', fontSize: 23, letterSpacing: -.8 }, brandDot: { color: colors.teal },
  bell: { height: 46, width: 46, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 5, right: 12, top: 9, backgroundColor: '#E78D77', borderWidth: 1, borderColor: colors.white },
  greeting: { color: colors.muted, fontSize: 15 }, name: { fontSize: 30, fontWeight: '800', color: colors.ink, marginTop: 3, letterSpacing: -.8 },
  sun: { color: colors.orange, fontSize: 24 }, intro: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  upcoming: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.mint, borderColor: '#D6EAE0', padding: 14 },
  calendar: { width: 43, height: 48, backgroundColor: colors.white, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  upcomingLabel: { fontSize: 10, letterSpacing: 1, color: colors.teal, fontWeight: '700' }, upcomingTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 5 },
  upcomingTime: { fontSize: 12, color: colors.muted, marginTop: 5, lineHeight: 18 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4, marginTop: 5 },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.ink, letterSpacing: -.4 }, hint: { fontSize: 12, color: colors.muted, marginTop: 5 },
  linkArea: { minHeight: 44, justifyContent: 'center', paddingLeft: 8 }, link: { color: colors.teal, fontSize: 12, fontWeight: '700' },
  specialties: { gap: 11, paddingBottom: 3 }, specialty: { width: 118, padding: 13, backgroundColor: colors.white, borderRadius: 19, borderWidth: 1, borderColor: colors.line },
  specialtyIcon: { height: 43, width: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  specialtyName: { color: colors.ink, fontSize: 12, fontWeight: '700' }, specialtyCount: { color: colors.muted, fontSize: 12, marginTop: 6 },
  demo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 }, demoText: { color: colors.muted, fontSize: 12 },
});
