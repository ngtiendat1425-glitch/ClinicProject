# An Tâm Clinic

Ứng dụng bệnh nhân bằng Expo SDK 58 / React Native và backend Spring Boot. Mã giao diện, nghiệp vụ, trạng thái và API được chia theo từng module; không dồn chức năng vào App.tsx.

## Chạy ứng dụng

Dùng Node 24 LTS. Trên máy Windows hiện tại:

```powershell
nvm use 24.14.0
node --version
npm ci
```

Nvm-windows trên máy này không tự chuyển Node theo .nvmrc. Node 20 không tương thích SDK 58.

### Kết nối backend

Mở terminal thứ nhất trong thư mục backend, dùng Java 21 trở lên:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Máy chủ phát triển dùng H2 lưu trên đĩa; cấu hình MySQL nằm trong profile prod. Xem [backend/README.md](backend/README.md) về cấu hình, API và kiểm thử.

Trong thư mục gốc, sao chép .env.example thành .env.local. Địa chỉ mặc định cho phát triển:

```dotenv
EXPO_PUBLIC_API_URL=http://127.0.0.1:8080/api/v1
EXPO_PUBLIC_ENABLE_DEMO=false
```

Với Android qua giả lập hoặc thiết bị ADB:

```powershell
adb reverse tcp:8080 tcp:8080
npm run android -- --localhost
```

Để mở giao diện web, chạy npm run web. Sau khi thay đổi biến môi trường, khởi động lại Metro. Địa chỉ API công khai ngoài các địa chỉ phát triển cục bộ phải dùng HTTPS. Không đặt mật khẩu hoặc khóa tích hợp vào biến EXPO_PUBLIC_*.

### Trải nghiệm không có máy chủ

Để EXPO_PUBLIC_API_URL trống, khởi động lại Metro rồi chạy npm start. Màn hình đăng nhập cho phép đăng ký tài khoản cục bộ hoặc chọn “Tiếp tục trải nghiệm”. Hồ sơ demo có dữ liệu mẫu; tài khoản mới bắt đầu trống, không nhận lịch hẹn hay giấy tờ của người khác. Đây là chế độ dùng thông tin giả lập.

Khi đã cấu hình API, lỗi kết nối không làm ứng dụng tự chuyển sang dữ liệu demo. Tài khoản API sử dụng phiên do máy chủ cấp; token trên Android/iOS được lưu bằng SecureStore, bản web giữ trong bộ nhớ và yêu cầu đăng nhập lại sau khi tải lại trang.

## Chức năng

- Đăng ký, đăng nhập, đăng xuất; chặn truy cập màn hình bệnh nhân khi chưa đăng nhập.
- Danh mục 22 khoa/bộ phận: 20 chuyên khoa khám, xét nghiệm và chẩn đoán hình ảnh. Danh mục API được lấy từ máy chủ; dữ liệu khởi tạo là minh họa và cần thay bằng danh mục được bệnh viện duyệt.
- Tìm bác sĩ không dấu, lọc khoa, hình thức và ngày còn lịch. Các dịch vụ chỉ khám trực tiếp không hiển thị lựa chọn tư vấn trực tuyến.
- Đặt lịch qua bước xem lại, ghi lý do và mục đích khám sức khỏe; API kiểm tra khung giờ và trùng lịch. Chờ xác nhận giữ chỗ tối đa 30 phút; hủy lịch yêu cầu lý do và xác nhận.
- Khai báo thẻ BHYT, đính kèm bản chụp/PDF và gửi thông tin thẻ cùng lịch khám. Thông tin luôn ở trạng thái chưa xác minh; phí chưa tự trừ quyền lợi BHYT.
- Đặt lịch khám sức khỏe; lưu giấy đã có dưới dạng PDF/JPEG/PNG tối đa 3 MB; xem/tải/chia sẻ hoặc xóa với xác nhận. Giấy tải lên chưa được cơ sở xác minh. Ứng dụng không tự cấp giấy hoặc tạo chữ ký/con dấu.
- Hồ sơ cá nhân, thông báo, lịch sử khám và kết quả được chia sẻ. Video hiện có màn hình chuẩn bị; cuộc gọi chưa được tích hợp.

## Cấu trúc

```text
src/
  app/                    Màn hình Expo Router và layout
    (auth)/               Đăng ký, đăng nhập
    (tabs)/               Trang chủ, bác sĩ, lịch hẹn, cá nhân
    departments/          Danh sách và chi tiết khoa
    doctor/, book/        Hồ sơ bác sĩ và quy trình đặt lịch
    appointment/          Chi tiết, hủy lịch, kết quả
    health-certificates/  Danh sách, thêm, chi tiết giấy khám
    insurance.tsx         Hồ sơ BHYT
  auth/                   Tài khoản demo, phiên API, kiểm tra dữ liệu
  records/                BHYT, giấy khám, lưu trữ, tệp đính kèm
  services/api.ts         HTTP client, Bearer token, timeout, xử lý lỗi
  state/                  Danh mục và dữ liệu bệnh nhân theo chế độ
  data/                   Kiểu dữ liệu, danh mục mẫu, ngày giờ, nghiệp vụ
  components/             Giao diện chia theo từng chức năng
  hooks/                  Đồng hồ và truy vấn lịch trống
backend/                  Spring Boot, SQL migration, cấu hình, kiểm thử API
tests/                    Kiểm thử TypeScript/JavaScript
scripts/                  Kiểm thử tương tác bằng Chrome headless
docs/                     Tài liệu tích hợp và bản giao diện cũ để đối chiếu
```

Màn hình gọi provider/hook; chế độ API gọi máy chủ, chế độ demo dùng kho riêng theo tài khoản. Hồ sơ API không được ghi sang AsyncStorage demo. Tệp trên máy chủ được mở qua endpoint có xác thực, không dùng URL công khai.

## Kiểm tra

```powershell
npx expo lint
npx tsc --noEmit
npm test
npx expo install --check
npx expo export --platform web
npx expo export --platform android --output-dir .tmp/android-export
node scripts/smoke-web.cjs
node scripts/smoke-patient-modules.cjs
```

Các smoke test trên dùng bản export web ở chế độ demo, Node 24 và Google Chrome; CHROME_PATH cho phép chọn vị trí Chrome. Ảnh kiểm tra nằm trong .tmp/ và không đưa vào Git. Kiểm thử API chạy riêng theo hướng dẫn backend. Chưa thay thế kiểm thử thiết bị thật hoặc nghiệm thu bệnh viện.

## Xử lý môi trường Windows

Nếu ADB timeout, kiểm tra adb devices -l. Trạng thái offline cần khởi động lại ADB; nếu giả lập vẫn treo, dùng Android Studio → Device Manager → Cold Boot Now rồi đợi Android khởi động đầy đủ. Không cần Wipe Data. Thông báo Expo tự cập nhật include trong tsconfig.json là thông tin cấu hình, không phải lỗi.

Expo Go phải tương thích SDK 58. Trên máy này đã cài bản 58.0.5. Nếu cài streaming lỗi kiểm tra chữ ký dù apksigner verify xác minh APK hợp lệ, cài lại cùng APK bằng adb install --no-streaming. Xem các công cụ Android SDK đã cài trước khi chọn đường dẫn apksigner/adb.

Cài thư viện bằng npx expo install <package>. Không chỉnh sửa thư mục native ios/ hoặc android/ bằng tay.

## Phạm vi dùng thực tế

API tài khoản và dữ liệu nội bộ do dự án xây dựng, không cần tìm một dịch vụ đặt lịch bên ngoài. Kết nối HIS/EMR/LIS/PACS hoặc BHYT chính thức cần tài liệu và quyền truy cập do bệnh viện/đơn vị có thẩm quyền cung cấp. Tham khảo [phạm vi tích hợp bệnh viện](docs/hospital-integration.md) để thấy rõ chức năng hiện có và các công việc trước vận hành thật. Backend nền tảng này chưa thay thế HIS/EMR, chưa cung cấp nghiệp vụ nhân viên hoặc cấp giấy điện tử có chữ ký số.
