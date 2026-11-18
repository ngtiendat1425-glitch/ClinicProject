import { StyleSheet, Text, View } from 'react-native';
import { Card, colors, Notice } from '../ui';
import { formatDate, serviceLabels, type ServiceType } from '../../data/clinic';
import { useCatalog } from '../../state/CatalogProvider';

export function BookingReview({ patientName, service, date, time, duration, reason }: {
  patientName: string; service: ServiceType; date: string; time: string; duration: number; reason: string;
}) {
  const { isRemote } = useCatalog();
  return (
    <>
      <Card>
        <Text style={styles.title}>Thông tin lịch hẹn</Text>
        <SummaryRow label="Người khám" value={patientName} />
        <SummaryRow label="Hình thức" value={serviceLabels[service]} />
        <SummaryRow label="Ngày khám" value={formatDate(date)} />
        <SummaryRow label="Giờ khám" value={`${time} · ${duration} phút`} />
        <SummaryRow label="Địa điểm" value={service === 'online' ? 'Tư vấn trực tuyến' : 'Phòng khám An Tâm'} />
        <View style={styles.reasonBlock}>
          <Text style={styles.label}>Lý do khám</Text><Text style={styles.reason}>{reason.trim()}</Text>
        </View>
      </Card>
      <Notice>{isRemote ? 'Yêu cầu được gửi đến phòng khám để xác nhận. Chỗ được giữ tối đa 30 phút trong khi chờ xử lý.' : 'Yêu cầu đặt lịch sẽ ở trạng thái chờ xác nhận và giữ chỗ trong 30 phút. Bản trải nghiệm lưu lịch hẹn trên thiết bị này.'}</Notice>
      {service === 'online' && <Notice>Video chưa được kết nối trong bản trải nghiệm. Bạn có thể xem lịch và chuẩn bị cho buổi tư vấn.</Notice>}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '800', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginTop: 5 },
  label: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  value: { fontSize: 13, fontWeight: '600', color: colors.ink, flex: 1, textAlign: 'right', lineHeight: 20 },
  reasonBlock: { marginTop: 5, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  reason: { color: colors.ink, fontSize: 14, lineHeight: 22, marginTop: 5 },
});
