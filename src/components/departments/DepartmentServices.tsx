import { StyleSheet, Text, View } from 'react-native';
import { Card, colors, Icon } from '../ui';

export function DepartmentServices({ services }: { services: string[] }) {
  return <Card>
    <Text accessibilityRole="header" style={s.title}>Dịch vụ tại khoa</Text>
    {services.map(service => <View key={service} style={s.row}>
      <Icon name="checkmark-circle-outline" size={20} />
      <Text style={s.copy}>{service}</Text>
    </View>)}
    <Text style={s.note}>Danh sách dịch vụ minh họa, có thể điều chỉnh theo phạm vi của phòng khám.</Text>
  </Card>;
}

const s = StyleSheet.create({
  title: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 3 },
  copy: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 22 },
  note: { fontSize: 12, lineHeight: 19, color: colors.muted },
});
