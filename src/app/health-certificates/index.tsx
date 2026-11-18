import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';
import { UnverifiedBadge } from '../../components/records/RecordFields';
import { Button, Card, colors, EmptyState, Icon, Notice, PageHeader, Screen } from '../../components/ui';
import { appointmentStart } from '../../data/date';
import { useRecords } from '../../records/RecordsProvider';
import { purposeLabels } from '../../records/types';
import { useClinic } from '../../state/ClinicProvider';

export default function HealthCertificatesScreen() {
  const { certificates, ready, storageError, isRemote } = useRecords();
  const { appointments } = useClinic();
  const requests = appointments.filter(item => item.doctorId === '20')
    .sort((a, b) => appointmentStart(b) - appointmentStart(a)).slice(0, 3);
  return <Screen>
    <PageHeader title="Giấy khám sức khỏe" subtitle="Quản lý bản chụp giấy khám bạn đã có" back />
    <Notice>Giấy do bạn tải lên được đánh dấu chưa xác thực. Ứng dụng không tự cấp giấy, ký hoặc xác nhận giá trị pháp lý.</Notice>
    {storageError ? <Notice tone="error">{storageError}</Notice> : null}
    <Button title="Thêm giấy khám đã có" icon="add-outline" onPress={() => router.push('/health-certificates/new')} disabled={!ready} />
    <Button title="Đặt lịch khám sức khỏe" variant="secondary" icon="calendar-outline"
      onPress={() => router.push({ pathname: '/book/[id]', params: { id: '20', purpose: 'employment' } })} />
    <View style={styles.sectionHeading}><Text style={styles.heading}>Giấy đã lưu</Text><Text style={styles.count}>{certificates.length} giấy</Text></View>
    {!ready ? <Text style={styles.copy}>Đang tải hồ sơ…</Text> : !certificates.length ? (
      <EmptyState icon="document-text-outline" title="Chưa có giấy khám sức khỏe"
        message="Bạn có thể tải bản chụp hoặc PDF giấy đã được cơ sở khám cấp, hoặc đặt lịch khám sức khỏe để chuẩn bị hồ sơ." />
    ) : certificates.map(certificate => <Pressable key={certificate.id} accessibilityRole="button" accessibilityLabel={`Xem ${certificate.title}`}
      onPress={() => router.push({ pathname: '/health-certificates/[id]', params: { id: certificate.id } })}>
      <Card>
        <View style={styles.row}><View style={styles.documentIcon}><Icon name="document-text-outline" size={26} /></View>
          <View style={styles.flex}><Text style={styles.title}>{certificate.title}</Text><Text style={styles.copy}>{purposeLabels[certificate.purpose]}</Text></View>
          <Icon name="chevron-forward" size={18} color={colors.muted} />
        </View>
        <Text style={styles.issuer}>{certificate.issuer}</Text><Text style={styles.copy}>Ngày khám: {certificate.examDate.split('-').reverse().join('/')}</Text>
        <UnverifiedBadge />
      </Card>
    </Pressable>)}
    {requests.length > 0 && <>
      <Text style={styles.heading}>Lịch khám sức khỏe của bạn</Text>
      <Text style={styles.copy}>Các lịch hẹn này là yêu cầu khám. Giấy được cấp tại cơ sở khám theo quy trình của cơ sở.</Text>
      {requests.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} />)}
    </>}
    <Text style={styles.footer}>{isRemote ? 'Giấy và tệp đính kèm được lưu theo tài khoản trên máy chủ.' : 'Bản lưu nằm trên thiết bị / trình duyệt này theo tài khoản của bạn.'}</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { color: colors.ink, fontSize: 18, fontWeight: '800' }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 8 },
  count: { fontSize: 13, color: colors.muted }, row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  documentIcon: { height: 49, width: 49, backgroundColor: colors.mint, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 }, title: { color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 21 }, issuer: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  footer: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center' },
});
