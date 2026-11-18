import type { ClinicState, Patient } from './types';
import { dateKey, DAY_MS, weekday } from './date';

function nextWorkDate(offset: number, now: number) {
  const today = dateKey(new Date(now));
  let value = Date.parse(`${today}T12:00:00+07:00`) + offset * DAY_MS;
  while (weekday(dateKey(new Date(value))) === 0) value += DAY_MS;
  return dateKey(new Date(value));
}

/** Registered accounts start with their own profile and no fictional encounters. */
export function createPatientState(patient: Patient): ClinicState {
  return { version: 1, patient: { ...patient }, appointments: [], notifications: [] };
}

export function createDemoState(now = Date.now()): ClinicState {
  const createdAt = new Date(now).toISOString();
  return {
    version: 1,
    patient: {
      name: 'Nguyễn Tiến Đạt', phone: '0901234567', email: 'dat@example.com',
      birthDate: '2005-01-15', gender: 'Nam', address: 'Thái Nguyên', allergies: 'Chưa khai báo',
    },
    appointments: [
      {
        id: 'demo-upcoming', doctorId: '1', service: 'in-person', date: nextWorkDate(1, now),
        time: '09:30', durationMinutes: 30, fee: 250000, reason: 'Kiểm tra sức khỏe định kỳ (dữ liệu minh họa).',
        status: 'confirmed', createdAt,
      },
      {
        id: 'demo-online', doctorId: '3', service: 'online', date: nextWorkDate(2, now),
        time: '14:00', durationMinutes: 20, fee: 176000, reason: 'Trao đổi về chăm sóc da (dữ liệu minh họa).',
        status: 'confirmed', createdAt,
      },
      {
        id: 'demo-completed', doctorId: '4', service: 'in-person',
        date: nextWorkDate(-7, now), time: '10:00', durationMinutes: 30, fee: 200000,
        reason: 'Kiểm tra sức khỏe tổng quát (dữ liệu minh họa).', status: 'completed',
        createdAt: new Date(now - 8 * DAY_MS).toISOString(),
        result: {
          summary: 'Đây là kết quả minh họa cho chức năng xem lịch sử khám, không phải hồ sơ y tế thật.',
          advice: 'Trong sản phẩm được kết nối, nội dung nhận định và hướng dẫn sẽ do bác sĩ phụ trách nhập và chia sẻ sau buổi khám.',
          followUp: 'Bác sĩ sẽ ghi thời gian tái khám tại đây nếu cần.',
        },
      },
    ],
    notifications: [
      { id: 'demo-notice-1', title: 'Lịch khám đã được xác nhận', body: 'Lịch hẹn minh họa với BS. Nguyễn Minh Anh đã sẵn sàng. Xem chi tiết để chuẩn bị trước khi đến.', createdAt, read: false, appointmentId: 'demo-upcoming' },
      { id: 'demo-notice-2', title: 'Hồ sơ sức khỏe của bạn', body: 'Bạn có thể xem kết quả buổi khám minh họa và cập nhật thông tin cá nhân trong mục Hồ sơ.', createdAt, read: true, appointmentId: 'demo-completed' },
    ],
  };
}

