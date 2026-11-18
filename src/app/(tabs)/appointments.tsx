import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppointmentCard } from '../../components/appointments/AppointmentCard';
import { Button, Card, colors, EmptyState, Icon, PageHeader, Screen } from '../../components/ui';
import { appointmentStart } from '../../data/clinic';
import { useNow } from '../../hooks/useNow';
import { useClinic } from '../../state/ClinicProvider';

type Filter = 'upcoming' | 'completed' | 'closed';

export default function AppointmentsScreen() {
  const { appointments } = useClinic();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const now = useNow();
  const upcoming = appointments.filter((item) => ['pending', 'confirmed'].includes(item.status) && appointmentStart(item) + item.durationMinutes * 60000 > now);
  const completed = appointments.filter((item) => item.status === 'completed');
  const closed = appointments.filter((item) => item.status === 'cancelled' || item.status === 'expired' || (['pending', 'confirmed'].includes(item.status) && appointmentStart(item) + item.durationMinutes * 60000 <= now));
  const list = [...(filter === 'upcoming' ? upcoming : filter === 'completed' ? completed : closed)].sort((a, b) => filter === 'upcoming' ? appointmentStart(a) - appointmentStart(b) : appointmentStart(b) - appointmentStart(a));
  const filters: { value: Filter; label: string; count: number }[] = [{ value: 'upcoming', label: 'Sắp tới', count: upcoming.length }, { value: 'completed', label: 'Đã khám', count: completed.length }, { value: 'closed', label: 'Lịch khác', count: closed.length }];

  return (
    <Screen>
      <PageHeader title="Lịch hẹn của bạn" subtitle="Sắp xếp thời gian, an tâm thăm khám" />
      <Card style={styles.summary}>
        <View style={styles.summaryIcon}><Icon name="calendar-outline" size={26} color={colors.teal} /></View>
        <View style={styles.flex}><Text style={styles.summaryTitle}>{upcoming.length ? `Bạn có ${upcoming.length} lịch hẹn sắp tới` : 'Chủ động chăm sóc sức khỏe'}</Text><Text style={styles.summaryCopy}>{upcoming.length ? 'Theo dõi trạng thái và chuẩn bị trước buổi khám.' : 'Chọn bác sĩ và thời gian phù hợp với bạn.'}</Text></View>
      </Card>
      <View accessibilityRole="tablist" style={styles.filters}>{filters.map((item) => <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: filter === item.value }} aria-selected={filter === item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterSelected]}><Text style={[styles.filterText, filter === item.value && styles.filterTextSelected]}>{item.label} ({item.count})</Text></Pressable>)}</View>
      {!list.length ? <EmptyState icon="calendar-clear-outline" title={filter === 'upcoming' ? 'Chưa có lịch hẹn sắp tới' : filter === 'completed' ? 'Chưa có lịch sử khám' : 'Chưa có lịch hẹn khác'} message={filter === 'upcoming' ? 'Tìm bác sĩ phù hợp và chọn khung giờ thuận tiện để bắt đầu.' : 'Các lịch hẹn tương ứng sẽ xuất hiện ở đây.'} action={filter === 'upcoming' ? <Button title="Tìm bác sĩ" icon="search-outline" onPress={() => router.push('/doctors')} /> : undefined} /> : list.map((item) => <AppointmentCard key={item.id} appointment={item} />)}
      <Pressable accessibilityRole="button" onPress={() => router.push('/support')} style={styles.help}><Icon name="help-circle-outline" size={23} color={colors.teal} /><View style={styles.flex}><Text style={styles.helpTitle}>Cần hỗ trợ về lịch hẹn?</Text><Text style={styles.helpCopy}>Xem hướng dẫn đặt, hủy và tư vấn trực tuyến</Text></View><Icon name="chevron-forward" size={18} color={colors.muted} /></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, summary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.mint, marginBottom: 24 }, summaryIcon: { width: 49, height: 49, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, summaryTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' }, summaryCopy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  filters: { flexDirection: 'row', gap: 6, marginBottom: 18, backgroundColor: '#EAF0ED', padding: 4, borderRadius: 15 }, filter: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 4 }, filterSelected: { backgroundColor: colors.white }, filterText: { fontSize: 12, color: colors.muted, fontWeight: '600' }, filterTextSelected: { color: colors.teal, fontWeight: '800' },
  help: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 19, paddingHorizontal: 2, marginTop: 8 }, helpTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' }, helpCopy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
});
