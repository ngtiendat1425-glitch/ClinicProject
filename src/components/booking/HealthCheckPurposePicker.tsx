import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HealthCheckPurpose } from '../../data/clinic';
import { colors, Icon } from '../ui';

export const healthCheckPurposes: Record<HealthCheckPurpose, string> = {
  employment: 'Đi làm / tuyển dụng', study: 'Đi học', driving: 'Hồ sơ lái xe', other: 'Mục đích khác',
};
export function HealthCheckPurposePicker({ value, onChange }: { value: HealthCheckPurpose; onChange: (value: HealthCheckPurpose) => void }) {
  return <View style={s.container}><Text style={s.title}>Mục đích khám sức khỏe</Text>
    {(Object.entries(healthCheckPurposes) as [HealthCheckPurpose, string][]).map(([key, label]) => <Pressable key={key}
      accessibilityRole="radio" aria-checked={value === key} accessibilityState={{ checked: value === key }}
      onPress={() => onChange(key)} style={[s.option, value === key && s.selected]}>
      <Icon name={value === key ? 'radio-button-on' : 'radio-button-off'} size={21} /><Text style={s.label}>{label}</Text>
    </Pressable>)}
    <Text style={s.hint}>Đây là yêu cầu đặt khám. Giấy khám chỉ được cấp bởi cơ sở đủ điều kiện sau khi hoàn tất quy trình chuyên môn.</Text>
  </View>;
}
const s = StyleSheet.create({ container: { gap: 9 }, title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  option: { borderRadius: 13, padding: 13, minHeight: 48, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', gap: 10 },
  selected: { borderColor: colors.teal, backgroundColor: colors.mint }, label: { color: colors.ink, fontSize: 14 }, hint: { fontSize: 12, lineHeight: 20, color: colors.muted },
});
