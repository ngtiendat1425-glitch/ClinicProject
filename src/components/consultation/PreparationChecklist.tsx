import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, colors, Icon } from '../ui';

const preparationItems = [
  { title: 'Chọn nơi yên tĩnh', description: 'Đủ ánh sáng và hạn chế tiếng ồn xung quanh.' },
  { title: 'Kiểm tra kết nối', description: 'Sử dụng mạng ổn định và sạc đủ pin thiết bị.' },
  { title: 'Chuẩn bị thông tin', description: 'Ghi lại lý do tư vấn và các tài liệu liên quan.' },
];

export function PreparationChecklist() {
  const [checked, setChecked] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setChecked((current) => current.includes(index)
      ? current.filter((value) => value !== index)
      : [...current, index]);
  };

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trước buổi tư vấn</Text>
        <Text style={styles.progress}>{checked.length}/{preparationItems.length} sẵn sàng</Text>
      </View>
      <Card style={styles.checklist}>
        {preparationItems.map((item, index) => {
          const selected = checked.includes(index);
          return (
            <Pressable
              key={item.title}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => toggleItem(index)}
              style={[styles.checkItem, index < preparationItems.length - 1 && styles.checkBorder]}
            >
              <Icon
                name={selected ? 'checkbox' : 'square-outline'}
                size={25}
                color={selected ? colors.teal : '#A5B8B3'}
              />
              <View style={styles.flex}>
                <Text style={styles.checkTitle}>{item.title}</Text>
                <Text style={styles.checkDescription}>{item.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 13 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  progress: { color: colors.teal, fontSize: 12, fontWeight: '700' },
  checklist: { paddingVertical: 0 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  checkBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  checkTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  checkDescription: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
});
