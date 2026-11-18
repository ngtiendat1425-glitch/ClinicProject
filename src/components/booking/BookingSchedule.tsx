import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, Icon } from '../ui';
import { formatDate, serviceLabels, type Doctor, type ServiceType } from '../../data/clinic';

type Day = { date: string; label: string; day: string };

export function ServicePicker({ doctor, value, onChange }: {
  doctor: Doctor; value: ServiceType; onChange: (value: ServiceType) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>1. Hình thức khám</Text>
      <View style={styles.serviceRow}>
        {(['in-person', 'online'] as const).filter(service => service !== 'online' || doctor.supportsOnline !== false).map((service) => (
          <Pressable key={service} accessibilityRole="radio"
            accessibilityState={{ checked: value === service }} aria-checked={value === service} onPress={() => onChange(service)}
            style={[styles.serviceCard, value === service && styles.serviceSelected]}>
            <Icon name={service === 'online' ? 'videocam-outline' : 'medkit-outline'} size={24}
              color={value === service ? colors.teal : colors.muted} />
            <Text style={[styles.serviceName, value === service && styles.teal]}>{serviceLabels[service]}</Text>
            <Text style={styles.meta}>{service === 'online' ? '20 phút' : `${doctor.durationMinutes} phút`}</Text>
            {value === service && <View style={styles.selectedMark}>
              <Icon name="checkmark-circle" size={19} color={colors.teal} />
            </View>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function BookingSchedule({ days, date, time, slots, onDateChange, onTimeChange }: {
  days: Day[]; date: string; time: string; slots: string[];
  onDateChange: (date: string) => void; onTimeChange: (time: string) => void;
}) {
  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>2. Ngày khám</Text><Text style={styles.meta}>Giờ Việt Nam</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {days.map((item) => {
            const selected = item.date === date;
            return (
              <Pressable key={item.date} accessibilityRole="radio" accessibilityLabel={formatDate(item.date)}
                accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => onDateChange(item.date)}
                style={[styles.day, selected && styles.daySelected]}>
                <Text style={[styles.dayLabel, selected && styles.white]}>{item.label}</Text>
                <Text style={[styles.dayNumber, selected && styles.white]}>{item.date.slice(8)}</Text>
                <Text style={[styles.dayLabel, selected && styles.white]}>Tháng {item.date.slice(5, 7)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>3. Khung giờ trống</Text><Text style={styles.meta}>{slots.length} khung giờ</Text>
        </View>
        {slots.length ? (
          <View style={styles.timeGrid}>
            {slots.map((slot) => (
              <Pressable key={slot} accessibilityRole="radio" accessibilityState={{ checked: time === slot }} aria-checked={time === slot}
                accessibilityLabel={`Khám lúc ${slot}`} onPress={() => onTimeChange(slot)}
                style={[styles.time, time === slot && styles.daySelected]}>
                <Text style={[styles.timeLabel, time === slot && styles.white]}>{slot}</Text>
              </Pressable>
            ))}
          </View>
        ) : <Card><Text style={styles.emptySlots}>Ngày này đã hết khung giờ phù hợp. Bạn có thể chọn ngày khác.</Text></Card>}
        <Text style={styles.hint}>Các giờ đã qua hoặc trùng với lịch hẹn của bạn được ẩn.</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 }, sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18 },
  serviceRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  serviceCard: { flex: 1, padding: 16, minHeight: 126, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, gap: 3 },
  serviceSelected: { borderColor: colors.teal, backgroundColor: colors.mint },
  serviceName: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 7 }, teal: { color: colors.teal },
  selectedMark: { position: 'absolute', top: 12, right: 11 },
  dayRow: { gap: 9, paddingBottom: 2 },
  day: { minWidth: 76, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 4 },
  daySelected: { backgroundColor: colors.teal, borderColor: colors.teal },
  dayLabel: { fontSize: 12, color: colors.muted }, dayNumber: { fontSize: 22, color: colors.ink, fontWeight: '800' }, white: { color: colors.white },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  time: { width: '30%', flexGrow: 1, maxWidth: '32%', minHeight: 46, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 12 },
  timeLabel: { fontSize: 14, color: colors.ink, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 11 },
  emptySlots: { color: colors.ink, fontSize: 14, lineHeight: 22 },
});
