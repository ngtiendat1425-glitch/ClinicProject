import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Department } from '../../data/departments';
import { colors, Icon, type IconName } from '../ui';
import { useCatalog } from '../../state/CatalogProvider';

export function DepartmentCard({ department }: { department: Department }) {
  const { isRemote } = useCatalog();
  const isSupport = department.kind === 'support';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem khoa ${department.name}`}
      onPress={() => router.push({ pathname: '/departments/[id]', params: { id: department.id } })}
      style={({ pressed }) => [s.card, pressed && s.pressed]}>
      <View style={[s.icon, { backgroundColor: department.color }]}>
        <Icon name={department.icon as IconName} size={26} />
      </View>
      <View style={s.content}>
        <Text style={s.name}>{department.name}</Text>
        <Text style={s.description} numberOfLines={2}>{department.description}</Text>
        <View style={s.tags}>
          <Text style={s.tag}>{isSupport ? 'Cận lâm sàng · Theo chỉ định' : `${department.doctorIds.length} bác sĩ${isRemote ? '' : ' minh họa'}`}</Text>
          {!isSupport && <Text style={s.mode}>{department.supportsOnline ? 'Có tư vấn trực tuyến' : 'Khám trực tiếp'}</Text>}
        </View>
      </View>
      <Icon name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { minHeight: 120, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20 },
  pressed: { opacity: .75 }, icon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0, gap: 6 }, name: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 20, color: colors.muted }, tags: { gap: 4, marginTop: 2 },
  tag: { fontSize: 12, lineHeight: 18, color: colors.teal, fontWeight: '600' },
  mode: { fontSize: 12, lineHeight: 18, color: colors.muted },
});
