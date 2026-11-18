import { Pressable, StyleSheet, Text, View } from 'react-native';
import { purposeLabels, type CertificatePurpose } from '../../records/types';
import { colors, Icon } from '../ui';

export function RecordRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

export function UnverifiedBadge() {
  return <View style={styles.badge}><Icon name="information-circle-outline" size={16} color="#8C601E" /><Text style={styles.badgeText}>Chưa xác thực</Text></View>;
}

export function PurposePicker({ value, onChange }: { value: CertificatePurpose; onChange: (value: CertificatePurpose) => void }) {
  return <View style={styles.purposeSection}><Text style={styles.fieldLabel}>Mục đích sử dụng *</Text><View style={styles.purposes}>
    {(Object.keys(purposeLabels) as CertificatePurpose[]).map(purpose => <Pressable key={purpose}
      accessibilityRole="radio" accessibilityState={{ selected: value === purpose }}
      onPress={() => onChange(purpose)} style={[styles.purpose, value === purpose && styles.selected]}>
      <Text style={[styles.purposeText, value === purpose && styles.selectedText]}>{purposeLabels[purpose]}</Text>
    </Pressable>)}
  </View></View>;
}

const styles = StyleSheet.create({
  row: { gap: 4, paddingVertical: 5 }, label: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  value: { color: colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 22 },
  badge: { flexDirection: 'row', gap: 5, alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFF3DE', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  badgeText: { color: '#8C601E', fontSize: 12, fontWeight: '700' }, purposeSection: { gap: 10 },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' }, purposes: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  purpose: { minHeight: 46, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  selected: { backgroundColor: colors.teal, borderColor: colors.teal }, purposeText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, selectedText: { color: colors.white },
});
