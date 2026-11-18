# Nền tảng tích hợp bệnh viện

Ứng dụng có hai chế độ được chọn bằng cấu hình. Khi `EXPO_PUBLIC_API_URL` có giá trị, tài khoản và hồ sơ được xử lý qua backend Spring Boot; lỗi mạng không làm ứng dụng chuyển sang tài khoản demo. Khi URL trống, các chức năng dùng dữ liệu trên thiết bị để thử nghiệm. Không dùng chế độ lưu cục bộ này cho hồ sơ bệnh nhân thật.

## API được lấy từ đâu?

API tài khoản, khoa, bác sĩ, lịch hẹn, thông báo, BHYT khai báo và giấy tờ cá nhân được triển khai trong thư mục `backend/` của dự án. Ứng dụng gọi các endpoint dưới `/api/v1`; địa chỉ máy chủ được cấu hình trong môi trường triển khai, không gắn cố định vào mã màn hình. Xem `backend/README.md` để chạy máy chủ và các hợp đồng API.

Đối với hệ thống đã có HIS/EMR/LIS/PACS, bệnh viện cần cung cấp tài liệu, tài khoản môi trường thử nghiệm và phạm vi truy cập. Lớp tích hợp phải nằm ở backend; không đặt khóa dịch vụ bệnh viện trong biến `EXPO_PUBLIC_*` vì những giá trị này được đóng gói vào ứng dụng.

Kết nối giám định BHYT chính thức cần thông tin truy cập được đơn vị có thẩm quyền cấp. Phiên bản này chỉ tiếp nhận thông tin thẻ do người dùng khai báo và đính kèm với lịch hẹn, không gửi hồ sơ giám định hoặc quyết định quyền lợi. Không sử dụng việc đọc mã thẻ để tự suy ra số tiền bảo hiểm thanh toán.

## Giấy khám sức khỏe

Người dùng có thể đặt lịch khám sức khỏe và lưu bản chụp/PDF của giấy đã có. Trạng thái của giấy tải lên là **chưa xác minh**. Ứng dụng không tự sinh chữ ký, con dấu hoặc kết luận chuyên môn. Cấp giấy điện tử thực tế cần quy trình bác sĩ duyệt, xác nhận của cơ sở, chữ ký số và cơ chế kiểm chứng do bệnh viện thống nhất.

## Ranh giới dữ liệu

Chế độ API xác thực phiên ở máy chủ, kiểm tra quyền sở hữu từng hồ sơ và tệp. Token được giữ trong SecureStore trên Android/iOS; bản web giữ trong bộ nhớ và yêu cầu đăng nhập lại sau khi tải lại trang. Hồ sơ API không được sao chép vào kho demo AsyncStorage. Tệp được xem/tải thông qua endpoint có xác thực, không phải URL công khai.

Danh mục 22 khoa/bộ phận và bác sĩ khởi tạo là dữ liệu minh họa cấu hình được; trước khi sử dụng cần thay bằng danh mục đã được bệnh viện duyệt. H2 là cơ sở dữ liệu phát triển. Hồ sơ triển khai MySQL không đồng nghĩa đã hoàn tất kiểm định hoặc sẵn sàng vận hành bệnh viện.

## Công việc cần hoàn tất trước vận hành thật

Các hạng mục còn lại gồm môi trường thử nghiệm của bệnh viện; quy trình xác minh danh tính và quản lý tài khoản nhân viên; phân quyền bác sĩ/lễ tân/quản trị theo nhiệm vụ; luồng duyệt giấy khám; tích hợp HIS và BHYT được cấp quyền; ghi nhận nhật ký truy cập dữ liệu; quản lý thời hạn lưu trữ; mã hóa và quét mã độc cho tệp; sao lưu và diễn tập khôi phục; kiểm thử bảo mật, tải và nghiệm thu nghiệp vụ. Phạm vi hiện tại là ứng dụng bệnh nhân và backend nền tảng, chưa thay thế HIS/EMR của bệnh viện.

## Tài liệu đối chiếu

- [BHXH Việt Nam: mẫu thẻ mới dùng mã số 10 chữ số](https://baohiemxahoi.gov.vn/tintuc/Pages/cai-cach-thu-tuc-hanh-chinh.aspx?CateID=0&ItemID=15882).
- [BHXH Việt Nam: cấu trúc mã thẻ cũ](https://baohiemxahoi.gov.vn/chuyen-trang-bhxh-bhyt/tu-van-hoi-dap/Pages/default.aspx?ItemID=15654).
- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) và [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).
