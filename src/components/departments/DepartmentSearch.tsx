import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, Icon } from '../ui';

export function DepartmentSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={s.box}>
      <Icon name="search-outline" size={21} />
      <TextInput accessibilityLabel="Tìm khoa hoặc dịch vụ" value={value} onChangeText={onChange}
        style={s.input} placeholder="Tìm khoa hoặc dịch vụ…" placeholderTextColor={colors.muted}
        returnKeyType="search" autoCorrect={false} />
      {!!value && <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm khoa"
        onPress={() => onChange('')} style={s.clear}><Icon name="close-circle" size={20} color={colors.muted} /></Pressable>}
    </View>
  );
}

const s = StyleSheet.create({
  box: { minHeight: 54, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center',
    paddingLeft: 15, paddingRight: 5, borderWidth: 1, borderColor: colors.line, gap: 10 },
  input: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 15, color: colors.ink },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
