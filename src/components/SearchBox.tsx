import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, Icon } from './ui';

export function SearchBox({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit?: () => void }) {
  return <View style={s.box}>
    <Icon name="search-outline" size={21} />
    <TextInput style={s.input} value={value} onChangeText={onChange} onSubmitEditing={onSubmit}
      accessibilityLabel="Tìm tên bác sĩ hoặc chuyên khoa" placeholder="Tìm bác sĩ, chuyên khoa…"
      placeholderTextColor={colors.muted} returnKeyType="search" autoCorrect={false} />
    {!!value && <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm"
      hitSlop={6} onPress={() => onChange('')} style={s.action}><Icon name="close-circle" color={colors.muted} size={20} /></Pressable>}
    {!!onSubmit && <Pressable accessibilityRole="button" accessibilityLabel="Tìm bác sĩ"
      onPress={onSubmit} style={s.action}><Icon name="arrow-forward" size={20} /></Pressable>}
  </View>;
}
const s = StyleSheet.create({
  box: { minHeight: 54, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center',
    paddingLeft: 15, paddingRight: 5, borderWidth: 1, borderColor: colors.line, gap: 10 },
  input: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 15, color: colors.ink },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
