import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DepartmentCard } from '../../components/departments/DepartmentCard';
import { DepartmentSearch } from '../../components/departments/DepartmentSearch';
import { Button, Card, colors, EmptyState, Icon, PageHeader, Screen } from '../../components/ui';
import { normalizeSearch } from '../../data/catalog';
import { useCatalog } from '../../state/CatalogProvider';

const filters = [
  { id: 'all', label: 'Tất cả khoa' },
  { id: 'clinical', label: 'Khám & tư vấn' },
  { id: 'support', label: 'Cận lâm sàng' },
] as const;

export default function DepartmentsScreen() {
  const { departments, ready, error, reload, isRemote } = useCatalog();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const normalizedQuery = normalizeSearch(query);
  const results = departments.filter(department =>
    (filter === 'all' || department.kind === filter) &&
    normalizeSearch(`${department.name} ${department.description} ${department.services.join(' ')}`).includes(normalizedQuery));
  const clinicalCount = departments.filter(department => department.kind === 'clinical').length;
  function clearFilters() { setQuery(''); setFilter('all'); }

  if (!ready || error) return <Screen>
    <PageHeader title="Khoa & dịch vụ" subtitle="Danh mục của phòng khám" back />
    {!ready ? <Text style={s.copy}>Đang tải danh mục khoa…</Text> : <EmptyState icon="cloud-offline-outline"
      title="Chưa tải được danh mục" message={error!} action={<Button title="Thử lại" onPress={reload} />} />}
  </Screen>;

  return <Screen>
    <PageHeader title="Khoa & dịch vụ" subtitle="Tìm chuyên khoa phù hợp và xem cách đặt lịch." back />
    <Card style={s.summary}>
      <View style={s.summaryIcon}><Icon name="grid-outline" size={29} /></View>
      <View style={s.flex}>
        <Text style={s.summaryTitle}>{departments.length} khoa trong danh mục{isRemote ? '' : ' demo'}</Text>
        <Text style={s.copy}>{clinicalCount} khoa khám, tư vấn · {departments.length - clinicalCount} khoa cận lâm sàng</Text>
      </View>
    </Card>
    <DepartmentSearch value={query} onChange={setQuery} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {filters.map(item => <Pressable key={item.id} accessibilityRole="button"
        accessibilityState={{ selected: filter === item.id }} aria-pressed={filter === item.id}
        onPress={() => setFilter(item.id)} style={[s.chip, filter === item.id && s.selected]}>
        <Text style={[s.chipText, filter === item.id && s.selectedText]}>{item.label}</Text>
      </Pressable>)}
    </ScrollView>
    <View style={s.resultHeader}>
      <Text accessibilityLiveRegion="polite" style={s.count}>{results.length} khoa phù hợp</Text>
      {!!(query || filter !== 'all') && <Pressable accessibilityRole="button" onPress={clearFilters} style={s.clear}>
        <Text style={s.clearText}>Bỏ bộ lọc</Text>
      </Pressable>}
    </View>
    {results.map(department => <DepartmentCard key={department.id} department={department} />)}
    {!results.length && <EmptyState title="Chưa tìm thấy khoa phù hợp"
      message="Bạn có thể tìm tên khoa không dấu hoặc thử một dịch vụ khác." icon="search-outline"
      action={<Button title="Xem tất cả khoa" variant="secondary" onPress={clearFilters} />} />}
    <Text style={s.disclaimer}>{isRemote ? 'Danh mục khoa, bác sĩ và dịch vụ được cập nhật từ máy chủ phòng khám.' : 'Danh mục khoa, bác sĩ và dịch vụ là dữ liệu minh họa cho đồ án.'}</Text>
  </Screen>;
}

const s = StyleSheet.create({
  flex: { flex: 1 }, summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.mint },
  summaryIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, lineHeight: 23, marginBottom: 5 },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 20 }, chips: { gap: 8 },
  chip: { minHeight: 46, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 14,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  selected: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, selectedText: { color: colors.white },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  count: { fontSize: 15, fontWeight: '700', color: colors.ink }, clear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  clearText: { fontSize: 13, color: colors.teal }, disclaimer: { fontSize: 12, lineHeight: 20, textAlign: 'center', color: colors.muted },
});
