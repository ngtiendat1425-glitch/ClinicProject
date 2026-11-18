import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, Icon } from '../ui';

export function HeroCard() {
  return <View style={s.card}>
    <View style={s.copy}>
      <Text style={s.kicker}>AN TÂM MỖI NGÀY</Text>
      <Text style={s.title}>Một lịch hẹn,{ '\n' }thêm an tâm.</Text>
      <Text style={s.description}>Chọn bác sĩ và thời gian{ '\n' }phù hợp với bạn.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/doctors')} style={s.button}>
        <Text style={s.buttonText}>Đặt lịch ngay</Text><Icon name="arrow-forward" size={17} />
      </Pressable>
    </View>
    <View pointerEvents="none" style={s.art}>
      <View style={s.circle}><View style={s.crossH} /><View style={s.crossV} /></View>
      <View style={s.spark}><Icon name="sparkles" size={26} color="#F3D5A0" /></View>
      <View style={s.leaf}><Icon name="leaf-outline" size={53} color="#A4D7C9" /></View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: colors.teal, borderRadius: 25, overflow: 'hidden', minHeight: 234, padding: 23, justifyContent: 'center' },
  copy: { zIndex: 1 }, kicker: { color: '#C0E3D5', fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  title: { color: colors.white, fontSize: 28, lineHeight: 35, marginTop: 10, fontWeight: '800', letterSpacing: -.7 },
  description: { fontSize: 13, lineHeight: 21, color: '#D0EBE1', marginTop: 9 },
  button: { minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#E8F5EC',
    alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 15, marginTop: 16 },
  buttonText: { color: colors.teal, fontSize: 13, fontWeight: '700' },
  art: { position: 'absolute', width: 155, height: 200, right: -20, top: 28, opacity: .8 },
  circle: { width: 145, height: 145, borderRadius: 80, backgroundColor: '#29978D', borderWidth: 1, borderColor: '#69B9AA',
    alignItems: 'center', justifyContent: 'center', marginTop: 19 },
  crossH: { backgroundColor: '#C9ECE1', width: 76, height: 24, borderRadius: 7, transform: [{ rotate: '-12deg' }] },
  crossV: { position: 'absolute', backgroundColor: '#C9ECE1', width: 24, height: 76, borderRadius: 7, transform: [{ rotate: '-12deg' }] },
  spark: { position: 'absolute', right: 14, top: 0 }, leaf: { position: 'absolute', left: -8, bottom: 0, transform: [{ rotate: '-30deg' }] },
});
