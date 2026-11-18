import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, colors, EmptyState, Icon, PageHeader, Screen } from '../components/ui';
import { useClinic } from '../state/ClinicProvider';

export default function NotificationsScreen() {
  const { notifications, markNotificationRead, markAllRead } = useClinic();
  const unreadCount = notifications.filter((item) => !item.read).length;
  const sorted = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Screen>
      <PageHeader title="Thông báo" subtitle={unreadCount ? `${unreadCount} cập nhật đang chờ bạn đọc` : 'Bạn đã đọc tất cả cập nhật'} back />
      {notifications.length > 0 ? (
        <>
          <View style={styles.toolbar}><Text style={styles.total}>{notifications.length} thông báo</Text><Pressable accessibilityRole="button" disabled={unreadCount === 0} onPress={markAllRead} style={styles.readAll}><Icon name="checkmark-done-outline" size={18} color={unreadCount ? colors.teal : colors.muted} /><Text style={[styles.readAllText, unreadCount === 0 && styles.muted]}>Đọc tất cả</Text></Pressable></View>
          {sorted.map((notification) => (
            <Pressable key={notification.id} accessibilityRole="button" accessibilityLabel={`${notification.read ? '' : 'Chưa đọc. '}${notification.title}`} onPress={() => {
              markNotificationRead(notification.id);
              if (notification.appointmentId) router.push({ pathname: '/appointment/[id]', params: { id: notification.appointmentId } });
            }}>
              <Card style={[styles.notification, !notification.read && styles.unread]}>
                <View style={[styles.icon, !notification.read && styles.iconUnread]}><Icon name={notification.appointmentId ? 'calendar-outline' : 'notifications-outline'} size={21} color={colors.teal} /></View>
                <View style={styles.flex}>
                  <View style={styles.titleRow}><Text style={styles.title}>{notification.title}</Text>{!notification.read ? <View style={styles.dot} /> : null}</View>
                  <Text style={styles.body}>{notification.body}</Text>
                  <Text style={styles.time}>{new Date(notification.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                  {notification.appointmentId ? <Text style={styles.link}>Xem lịch hẹn <Icon name="arrow-forward-outline" size={12} color={colors.teal} /></Text> : null}
                </View>
              </Card>
            </Pressable>
          ))}
        </>
      ) : <EmptyState title="Chưa có thông báo" message="Các cập nhật về lịch hẹn sẽ hiển thị tại đây." icon="notifications-outline" action={<Button title="Tìm bác sĩ" onPress={() => router.push('/doctors')} />} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  total: { color: colors.muted, fontSize: 12 },
  readAll: { minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center', paddingLeft: 10 },
  readAllText: { color: colors.teal, fontSize: 12, fontWeight: '700' },
  muted: { color: colors.muted },
  notification: { flexDirection: 'row', gap: 12, marginBottom: 12, paddingVertical: 18 },
  unread: { backgroundColor: '#F0F8F5', borderColor: '#CDE6DD' },
  icon: { height: 42, width: 42, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  iconUnread: { backgroundColor: '#DCEFE6' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal },
  body: { color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 6 },
  time: { color: colors.muted, fontSize: 12, marginTop: 9 },
  link: { color: colors.teal, fontSize: 12, fontWeight: '700', marginTop: 11 },
});
