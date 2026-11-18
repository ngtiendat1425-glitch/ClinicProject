import { router } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, colors, Icon, Notice, PageHeader, Screen } from '../../components/ui';
import { appointmentStart } from '../../data/clinic';
import { useNow } from '../../hooks/useNow';
import { useClinic } from '../../state/ClinicProvider';
import { useAuth } from '../../auth/AuthProvider';
import { useRecords } from '../../records/RecordsProvider';
import { apiConfigured } from '../../services/api';

export default function ProfileScreen() {
  const { patient, appointments, notifications, storageError } = useClinic();
  const { logout, busy, isDemo } = useAuth();
  const { insurance, certificates } = useRecords();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const now = useNow();
  const upcomingCount = appointments.filter((item) => (item.status === 'confirmed' || item.status === 'pending') && appointmentStart(item) > now).length;
  const completedCount = appointments.filter((item) => item.status === 'completed').length;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const initials = patient.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('');

  return (
    <Screen>
      <PageHeader title="Cá nhân" subtitle="Thông tin của bạn, luôn trong tầm tay" />
      <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa hồ sơ cá nhân" onPress={() => router.push('/profile-edit')}>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
          <View style={styles.flex}>
            <Text style={styles.name}>{patient.name}</Text>
            <Text style={styles.phone}>{patient.phone}</Text>
            <View style={styles.patientBadge}><Icon name="person-outline" size={12} color={colors.teal} /><Text style={styles.patientLabel}>Hồ sơ bệnh nhân</Text></View>
          </View>
          <Icon name="create-outline" size={21} color={colors.teal} />
        </Card>
      </Pressable>

      <Card style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{upcomingCount.toString().padStart(2, '0')}</Text><Text style={styles.statLabel}>Lịch sắp tới</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.stat}><Text style={styles.statValue}>{completedCount.toString().padStart(2, '0')}</Text><Text style={styles.statLabel}>Đã hoàn thành</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.stat}><Text style={styles.statValue}>{unreadCount.toString().padStart(2, '0')}</Text><Text style={styles.statLabel}>Thông báo mới</Text></View>
      </Card>

      <Text style={styles.sectionTitle}>Hồ sơ & chăm sóc</Text>
      <Card style={styles.menu}>
        <MenuItem icon="person-outline" title="Thông tin cá nhân" subtitle="Liên hệ, ngày sinh và thông tin sức khỏe" onPress={() => router.push('/profile-edit')} />
        <MenuItem icon="shield-checkmark-outline" title="Bảo hiểm y tế" subtitle={insurance ? 'Đã lưu thông tin thẻ · Chưa xác minh' : 'Thêm thông tin thẻ để gửi cùng lịch hẹn'} onPress={() => router.push('/insurance')} />
        <MenuItem icon="folder-open-outline" title="Giấy khám sức khỏe" subtitle={`${certificates.length} giấy tờ đã lưu · Quản lý yêu cầu khám`} onPress={() => router.push('/health-certificates')} />
        <MenuItem icon="document-text-outline" title="Lịch sử khám" subtitle="Xem kết quả và hướng dẫn sau khám" onPress={() => router.push('/history')} />
        <MenuItem icon="notifications-outline" title="Thông báo" subtitle={unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc tất cả thông báo'} onPress={() => router.push('/notifications')} count={unreadCount} last />
      </Card>

      <Text style={styles.sectionTitle}>Luôn sẵn sàng hỗ trợ</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/support')}>
        <Card style={styles.support}>
          <View style={styles.menuIcon}><Icon name="chatbubble-ellipses-outline" size={22} color={colors.teal} /></View>
          <View style={styles.flex}><Text style={styles.menuTitle}>Hỗ trợ từ phòng khám</Text><Text style={styles.menuSubtitle}>Hướng dẫn đặt và quản lý lịch hẹn</Text></View>
          <Icon name="chevron-forward" size={18} color={colors.muted} />
        </Card>
      </Pressable>
      {storageError ? <Notice tone="error">{storageError}</Notice> : null}
      {apiConfigured && !isDemo ? <Notice>Hồ sơ và lịch hẹn được quản lý bởi máy chủ. Thông tin BHYT và giấy tờ bạn khai báo cần được cơ sở khám xác minh.</Notice>
        : <Notice>Đây là chế độ trải nghiệm dùng dữ liệu giả lập. Hồ sơ và thao tác được tách riêng theo tài khoản trên thiết bị này.</Notice>}
      {confirmLogout ? <Card><Text style={styles.menuTitle}>Đăng xuất khỏi tài khoản?</Text>
        <Text style={styles.menuSubtitle}>Hồ sơ đã lưu được giữ lại cho lần đăng nhập sau.</Text>
        <Button title="Xác nhận đăng xuất" variant="danger" loading={busy} onPress={() => void logout()} />
        <Button title="Tiếp tục sử dụng" variant="secondary" disabled={busy} onPress={() => setConfirmLogout(false)} />
      </Card> : <Button title="Đăng xuất" icon="log-out-outline" variant="danger" onPress={() => setConfirmLogout(true)} />}
      <Text style={styles.version}>an tâm · Chăm sóc từ những điều nhỏ nhất</Text>
    </Screen>
  );
}

type MenuProps = {
  icon: ComponentProps<typeof Icon>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  count?: number;
  last?: boolean;
};

function MenuItem({ icon, title, subtitle, onPress, count, last }: MenuProps) {
  return (
    <Pressable accessibilityRole="button" style={[styles.menuRow, !last && styles.menuBorder]} onPress={onPress}>
      <View style={styles.menuIcon}><Icon name={icon} size={21} color={colors.teal} /></View>
      <View style={styles.flex}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuSubtitle}>{subtitle}</Text></View>
      {count ? <View style={styles.countBadge}><Text style={styles.count}>{count}</Text></View> : null}
      <Icon name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 22 },
  avatar: { width: 64, height: 64, backgroundColor: '#DBEDE7', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 22, fontWeight: '800', color: colors.teal },
  name: { fontSize: 17, fontWeight: '800', color: colors.ink },
  phone: { color: colors.muted, fontSize: 13, marginTop: 6 },
  patientBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  patientLabel: { color: colors.teal, fontSize: 12, fontWeight: '600' },
  stats: { flexDirection: 'row', marginTop: 14, paddingHorizontal: 4, paddingVertical: 20 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 5 },
  statDivider: { width: 1, backgroundColor: colors.line },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 28, marginBottom: 12 },
  menu: { paddingVertical: 0 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17, minHeight: 78 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  menuIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  menuSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  countBadge: { minWidth: 23, height: 23, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  count: { color: colors.white, fontSize: 12, fontWeight: '800' },
  support: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  version: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 20, marginBottom: 8 },
});
