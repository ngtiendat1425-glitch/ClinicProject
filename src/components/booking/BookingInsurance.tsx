import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRecords } from '../../records/RecordsProvider';
import { Button, Card, colors, Icon, Notice } from '../ui';

export function BookingInsurance({ selected, onChange }: { selected: boolean; onChange: (value: boolean) => void }) {
  const { insurance } = useRecords();
  return <Card>
    <View style={s.heading}><Icon name="shield-checkmark-outline" /><Text style={s.title}>Bảo hiểm y tế</Text></View>
    {insurance ? <>
      <Text style={s.holder}>{insurance.holderName}</Text><Text style={s.meta}>Mã thẻ •••• {insurance.number.slice(-4)} · Chưa xác minh</Text>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} aria-checked={selected}
        accessibilityLabel="Đính kèm thông tin BHYT với lịch khám" onPress={() => onChange(!selected)} style={s.choice}>
        <Icon name={selected ? 'checkbox' : 'square-outline'} /><Text style={s.choiceText}>Gửi thông tin thẻ cùng yêu cầu đặt lịch</Text>
      </Pressable>
    </> : <><Text style={s.meta}>Bạn có thể khai báo thẻ trước khi đặt khám.</Text>
      <Button title="Thêm thông tin BHYT" variant="secondary" onPress={() => router.push('/insurance')} /></>}
    {selected && <Notice>Thông tin thẻ cần được phòng khám kiểm tra. Phí hiển thị chưa trừ BHYT và không xác nhận quyền lợi thanh toán.</Notice>}
  </Card>;
}
const s = StyleSheet.create({
  heading: { flexDirection: 'row', gap: 8, alignItems: 'center' }, title: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  holder: { fontSize: 14, fontWeight: '600', color: colors.ink }, meta: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  choice: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 48 }, choiceText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 21 },
});
