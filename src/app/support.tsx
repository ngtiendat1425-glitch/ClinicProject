import { StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/context';
import { Card, colors, Notice, PageHeader, Screen } from '../components/ui';
import { apiConfigured } from '../services/api';

export default function SupportScreen() {
  const { isDemo } = useAuth();
  const remote = apiConfigured && !isDemo;
  const answers = [
  ['Đặt lịch như thế nào?', 'Chọn bác sĩ, hình thức khám, ngày và khung giờ còn trống. Nhập lý do khám, kiểm tra lại thông tin rồi gửi yêu cầu. Bạn có thể theo dõi yêu cầu trong mục Lịch hẹn.'],
  ['Khi nào lịch được xác nhận?', `Lịch mới ở trạng thái Chờ xác nhận và giữ chỗ trong 30 phút. ${remote ? 'Yêu cầu được lưu trên máy chủ. Quy trình tiếp nhận và xác nhận của nhân viên cần được triển khai tại cơ sở y tế.' : 'Bản trải nghiệm có sẵn một số lịch đã xác nhận để bạn xem các chức năng.'} Khi hết thời hạn chờ, chỗ tự được giải phóng.`],
  ['Tôi có thể hủy lịch không?', 'Mở chi tiết lịch hẹn sắp tới, chọn Hủy lịch hẹn, nhập lý do và xác nhận. Lịch đã hoàn thành hoặc đã đến giờ khám không thể hủy bằng thao tác này.'],
  ['Tư vấn video hoạt động ra sao?', 'Bạn có thể đặt lịch trực tuyến và xem hướng dẫn chuẩn bị. Cuộc gọi video chưa được kết nối; tính năng gọi cần nhà cung cấp video và quy trình tiếp nhận của bác sĩ.'],
  ['Tôi xem kết quả khám ở đâu?', `Vào Cá nhân → Lịch sử khám và chọn buổi khám đã hoàn thành. Chỉ các nội dung kết quả được chia sẻ mới xuất hiện ở đây.${remote ? '' : ' Dữ liệu có sẵn là minh họa.'}`],
  ['BHYT đã được xác minh chưa?', 'Thông tin thẻ và tệp đính kèm giúp chuẩn bị hồ sơ. Việc nhập thẻ chưa xác nhận quyền lợi BHYT và không tự giảm phí khám. Cơ sở y tế cần kiểm tra trên hệ thống được cấp quyền.'],
  ['Giấy khám sức khỏe có giá trị sử dụng không?', 'Ứng dụng lưu bản giấy do bạn tải lên và đánh dấu Chưa xác minh. Giấy phải được cơ sở đủ điều kiện cấp và xác nhận theo quy trình của cơ sở đó.'],
  ['Dữ liệu được lưu ở đâu?', remote
    ? 'Hồ sơ được gửi đến máy chủ đã cấu hình qua tài khoản của bạn. Khi đăng xuất, dữ liệu phiên được xóa khỏi bộ nhớ ứng dụng. Trên trình duyệt, tải lại trang sẽ yêu cầu đăng nhập lại.'
    : 'Thông tin trải nghiệm được lưu cục bộ trên thiết bị hoặc trình duyệt hiện tại và tách theo từng tài khoản. Dữ liệu sẽ mất nếu xóa dữ liệu ứng dụng. Hãy dùng thông tin giả lập trong chế độ này.'],
];
  return <Screen><PageHeader title="Hướng dẫn sử dụng" subtitle="Giải đáp cho lần đặt lịch đầu tiên" back />
    {answers.map(([title, answer]) => <Card key={title}><Text style={s.title}>{title}</Text><Text style={s.copy}>{answer}</Text></Card>)}
    <Notice>{remote ? 'Kết nối máy chủ đã được cấu hình. Việc triển khai tại cơ sở y tế cần hoàn tất các quy trình tiếp nhận, xác minh và vận hành.' : 'Đây là chế độ trải nghiệm. Các yêu cầu đặt lịch chưa được gửi đến một phòng khám thực tế.'}</Notice>
  </Screen>;
}
const s = StyleSheet.create({ title: { color: colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 23 }, copy: { color: colors.muted, fontSize: 14, lineHeight: 23 } });
