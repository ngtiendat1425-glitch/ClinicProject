import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DoctorCard } from '../../components/DoctorCard';
import { SearchBox } from '../../components/SearchBox';
import { Button, colors, EmptyState, Notice, PageHeader, Screen } from '../../components/ui';
import { bookingDays, normalizeSearch, type ServiceType } from '../../data/clinic';
import { useCatalog } from '../../state/CatalogProvider';
import { useDoctorAvailability } from '../../hooks/useDoctorAvailability';
import { useClinic } from '../../state/ClinicProvider';
import { useNow } from '../../hooks/useNow';

export default function DoctorsScreen() {
  const params = useLocalSearchParams<{ q?: string; specialty?: string; service?: string }>();
  return <DoctorSearch key={`${params.q ?? ''}:${params.specialty ?? ''}:${params.service ?? ''}`} params={params} />;
}

function DoctorSearch({ params }: { params: { q?: string; specialty?: string; service?: string } }) {
  const now = useNow();
  const { doctors, departments, isRemote } = useCatalog();
  const specialties = ['Tất cả', ...departments.filter(item => item.kind === 'clinical').map(item => item.name)];
  const [query, setQuery] = useState(params.q ?? '');
  const [specialty, setSpecialty] = useState(specialties.includes(params.specialty ?? '') ? params.specialty! : 'Tất cả');
  const [service, setService] = useState<ServiceType>(params.service === 'online' ? 'online' : 'in-person');
  const days = bookingDays(7);
  const [date, setDate] = useState('');
  const { appointments } = useClinic();
  const availability = useDoctorAvailability(doctors, date, service, appointments, now, isRemote);
  const results = doctors.filter(doctor =>
    (service !== 'online' || doctor.supportsOnline !== false) &&
    (specialty === 'Tất cả' || doctor.specialty === specialty) &&
    normalizeSearch(`${doctor.name} ${doctor.specialty}`).includes(normalizeSearch(query)) &&
    (!date || availability.loading || (availability.counts[doctor.id] ?? 0) > 0));
  function clearFilters() { setQuery(''); setSpecialty('Tất cả'); setDate(''); }
  return <Screen>
    <PageHeader title="Tìm bác sĩ" subtitle="Một lựa chọn phù hợp. Một lịch hẹn an tâm." />
    <SearchBox value={query} onChange={setQuery} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {specialties.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: specialty === item }} aria-pressed={specialty === item}
        onPress={() => setSpecialty(item)} style={[s.chip, specialty === item && s.selected]}>
        <Text style={[s.chipText, specialty === item && s.selectedText]}>{item}</Text></Pressable>)}
    </ScrollView>
    <View style={s.row}>{(['in-person', 'online'] as const).map(item => <Pressable key={item} accessibilityRole="button"
      accessibilityState={{ selected: service === item }} aria-pressed={service === item} onPress={() => setService(item)} style={[s.mode, service === item && s.modeSelected]}>
      <Text style={[s.chipText, service === item && { color: colors.teal }]}>{item === 'online' ? 'Tư vấn trực tuyến' : 'Khám trực tiếp'}</Text>
    </Pressable>)}</View>
    <View><Text style={s.filterLabel}>Ngày có lịch trống</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: !date }} aria-pressed={!date} onPress={() => setDate('')} style={[s.chip, !date && s.selected]}>
        <Text style={[s.chipText, !date && s.selectedText]}>Mọi ngày</Text></Pressable>
      {days.map(day => <Pressable key={day.date} accessibilityRole="button" accessibilityState={{ selected: date === day.date }} aria-pressed={date === day.date}
        onPress={() => setDate(day.date)} style={[s.chip, date === day.date && s.selected]}>
        <Text style={[s.chipText, date === day.date && s.selectedText]}>{day.label} · {day.day}</Text></Pressable>)}
    </ScrollView></View>
    {availability.loading && <Notice>Đang tìm bác sĩ còn lịch trong ngày đã chọn…</Notice>}
    {availability.error && <Notice tone="error">{availability.error}</Notice>}
    <View style={s.resultHeader}><Text style={s.count}>{results.length} bác sĩ phù hợp</Text>
      {(query || specialty !== 'Tất cả' || date) && <Pressable accessibilityRole="button" onPress={clearFilters} style={s.clear}><Text style={s.clearText}>Bỏ bộ lọc</Text></Pressable>}</View>
    {results.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} service={service} date={date}
      availability={date ? availability.loading ? 'Đang kiểm tra lịch…' : `Còn ${availability.counts[doctor.id] ?? 0} khung giờ` : undefined} />)}
    {!results.length && !availability.loading && <EmptyState title="Chưa có bác sĩ phù hợp" message="Thử một ngày khác, chọn chuyên khoa khác hoặc tìm tên không dấu."
      icon="search-outline" action={<Button title="Xem tất cả bác sĩ" variant="secondary" onPress={clearFilters} />} />}
    <Pressable accessibilityRole="button" onPress={() => router.push('/support')} style={s.support}>
      <Text style={s.supportText}>Cần hỗ trợ chọn dịch vụ? Xem hướng dẫn ›</Text></Pressable>
  </Screen>;
}
const s = StyleSheet.create({
  chips: { gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 15,
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line
  }, selected: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, selectedText: { color: colors.white },
  row: { flexDirection: 'row', gap: 9 }, mode: {
    flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line
  }, modeSelected: { backgroundColor: colors.mint, borderColor: '#98C7B9' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  count: { fontSize: 15, fontWeight: '700', color: colors.ink }, clear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  clearText: { fontSize: 13, color: colors.teal }, support: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  supportText: { fontSize: 13, color: colors.teal, textAlign: 'center', lineHeight: 20 },
});
