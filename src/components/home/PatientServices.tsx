import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, Icon, type IconName } from '../ui';

const services: { title: string; description: string; icon: IconName; path: '/health-certificates' | '/insurance' | '/book/[id]'; color: string }[] = [
  { title: 'Giấy khám sức khỏe', description: 'Lưu giấy tờ & đặt lịch khám', icon: 'document-text-outline', path: '/health-certificates', color: '#EAF0FF' },
  { title: 'Bảo hiểm y tế', description: 'Quản lý thông tin thẻ BHYT', icon: 'shield-checkmark-outline', path: '/insurance', color: '#E8F5F1' },
  { title: 'Khám sức khỏe', description: 'Đăng ký buổi khám trực tiếp', icon: 'fitness-outline', path: '/book/[id]', color: '#FFF0DD' },
];

export function PatientServices() {
  return <View style={s.services}>{services.map(service => <Pressable key={service.path} accessibilityRole="button"
    onPress={() => service.path === '/book/[id]' ? router.push({ pathname: service.path, params: { id: '20' } }) : router.push(service.path)}
    style={s.service}>
    <View style={[s.icon, { backgroundColor: service.color }]}><Icon name={service.icon} size={24} /></View>
    <View style={s.copy}><Text style={s.title}>{service.title}</Text><Text style={s.description}>{service.description}</Text></View>
    <Icon name="chevron-forward" size={17} color={colors.muted} />
  </Pressable>)}</View>;
}
const s = StyleSheet.create({
  services: { gap: 10 }, service: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, minHeight: 78,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 19 },
  icon: { height: 44, width: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 }, title: { fontSize: 14, fontWeight: '700', color: colors.ink },
  description: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
});
