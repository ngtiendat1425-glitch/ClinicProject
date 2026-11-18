import type { Appointment, BookingInput, Doctor, Patient, ServiceType } from './types';
import { getDoctor } from './catalog';
import { appointmentStart, dateKey, DAY_MS, isValidDate, weekday } from './date';

export const HOLD_MINUTES = 30;

export function serviceDuration(doctor: Doctor, service: ServiceType) {
  return service === 'online' ? 20 : doctor.durationMinutes;
}

export function serviceFee(doctor: Doctor, service: ServiceType) {
  return service === 'online' ? Math.round(doctor.fee * 0.8) : doctor.fee;
}

export function isActiveAppointment(appointment: Appointment, now = Date.now()) {
  return appointment.status === 'confirmed' || (
    appointment.status === 'pending' && Boolean(appointment.holdExpiresAt) &&
    Date.parse(appointment.holdExpiresAt!) > now
  );
}

function clinicTimes(date: string, durationMinutes: number) {
  if (!isValidDate(date) || weekday(date) === 0) return [];
  const slots: string[] = [];
  for (const [shiftStart, shiftEnd] of [[8 * 60 + 30, 11 * 60 + 30], [13 * 60 + 30, 16 * 60 + 30]]) {
    for (let minutes = shiftStart; minutes + durationMinutes <= shiftEnd; minutes += 30) {
      slots.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function getAvailableTimes(
  doctorId: string,
  date: string,
  service: ServiceType,
  appointments: Appointment[],
  now = Date.now(),
) {
  const doctor = getDoctor(doctorId);
  if (!doctor || !['in-person', 'online'].includes(service)) return [];
  if (service === 'online' && doctor.supportsOnline === false) return [];
  const duration = serviceDuration(doctor, service);
  return clinicTimes(date, duration).filter((time) => {
    const start = appointmentStart({ date, time });
    if (start <= now) return false;
    const end = start + duration * 60_000;
    // This demo has one patient. Any active appointment blocks their time,
    // including appointments with a different doctor.
    return !appointments.some((appointment) => {
      if (!isActiveAppointment(appointment, now)) return false;
      const otherStart = appointmentStart(appointment);
      return start < otherStart + appointment.durationMinutes * 60_000 && end > otherStart;
    });
  });
}

export function validateBooking(input: BookingInput, appointments: Appointment[], now = Date.now()) {
  const doctor = getDoctor(input.doctorId);
  if (!doctor) return 'Không tìm thấy bác sĩ. Vui lòng chọn lại.';
  if (!['in-person', 'online'].includes(input.service)) return 'Vui lòng chọn hình thức khám.';
  if (input.service === 'online' && doctor.supportsOnline === false) return 'Dịch vụ này được thực hiện trực tiếp tại phòng khám.';
  if (!isValidDate(input.date)) return 'Vui lòng chọn ngày khám hợp lệ.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return 'Vui lòng chọn giờ khám.';
  const start = appointmentStart(input);
  if (start <= now) return 'Thời gian này đã qua. Vui lòng chọn khung giờ khác.';
  if (start > now + 90 * DAY_MS) return 'Bạn có thể đặt lịch trong vòng 90 ngày tới.';
  if (!clinicTimes(input.date, serviceDuration(doctor, input.service)).includes(input.time)) {
    return 'Khung giờ nằm ngoài ca làm việc của phòng khám.';
  }
  if (input.reason.trim().length < 5) return 'Vui lòng mô tả lý do khám ít nhất 5 ký tự.';
  if (input.reason.trim().length > 1000) return 'Lý do khám không quá 1.000 ký tự.';
  if (input.healthCheckPurpose && (doctor.id !== '20' || !['employment', 'study', 'driving', 'other'].includes(input.healthCheckPurpose))) {
    return 'Mục đích khám sức khỏe chỉ áp dụng cho lịch khám sức khỏe.';
  }
  if (input.insurance) {
    const insurance = input.insurance;
    if (!insurance.cardId || !/^(?:\d{10}|[A-Z]{2}\d{13})$/.test(insurance.number) ||
      !insurance.holderName.trim() || !insurance.registrationPlace.trim() || insurance.verification !== 'unverified' ||
      !isValidDate(insurance.validFrom) || !isValidDate(insurance.validTo) || insurance.validFrom > insurance.validTo) {
      return 'Thông tin BHYT đính kèm chưa đầy đủ. Vui lòng cập nhật lại thẻ.';
    }
    if (input.date < insurance.validFrom || input.date > insurance.validTo) {
      return 'Ngày khám nằm ngoài thời hạn BHYT bạn đã khai báo. Cập nhật thẻ hoặc đặt lịch không đính kèm BHYT.';
    }
  }
  if (!getAvailableTimes(input.doctorId, input.date, input.service, appointments, now).includes(input.time)) {
    return 'Bạn đã có lịch trong khoảng thời gian này. Vui lòng chọn giờ khác.';
  }
  return null;
}

export function validateCancellation(appointment: Appointment | undefined, reason: string, now = Date.now()) {
  if (!appointment) return 'Không tìm thấy lịch hẹn.';
  if (!isActiveAppointment(appointment, now)) return 'Lịch hẹn này không thể hủy.';
  if (appointmentStart(appointment) <= now) return 'Đã đến giờ khám. Vui lòng liên hệ phòng khám để được hỗ trợ.';
  if (reason.trim().length < 5) return 'Vui lòng nhập lý do hủy ít nhất 5 ký tự.';
  if (reason.trim().length > 500) return 'Lý do hủy không quá 500 ký tự.';
  return null;
}

export function validatePatient(patient: Patient, now = Date.now()) {
  if (patient.name.trim().length < 2 || patient.name.trim().length > 80) return 'Họ tên cần từ 2 đến 80 ký tự.';
  if (!/^(?:0\d{9}|\+84\d{9})$/.test(patient.phone.replace(/[\s.-]/g, ''))) return 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.';
  if (patient.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email.trim())) return 'Địa chỉ email chưa hợp lệ.';
  if (!isValidDate(patient.birthDate) || patient.birthDate > dateKey(new Date(now)) || patient.birthDate < '1900-01-01') return 'Ngày sinh cần theo định dạng YYYY-MM-DD và không ở tương lai.';
  if (!['Nam', 'Nữ', 'Khác', 'Chưa cung cấp'].includes(patient.gender)) return 'Vui lòng chọn giới tính hợp lệ.';
  if (patient.address.trim().length > 300) return 'Địa chỉ không quá 300 ký tự.';
  if (patient.allergies.trim().length > 500) return 'Thông tin dị ứng không quá 500 ký tự.';
  return null;
}

export function expirePendingAppointments(appointments: Appointment[], now = Date.now()) {
  let changed = false;
  const next = appointments.map((appointment): Appointment => {
    if (appointment.status === 'pending' && (!appointment.holdExpiresAt || Date.parse(appointment.holdExpiresAt) <= now)) {
      changed = true;
      return { ...appointment, status: 'expired' };
    }
    return appointment;
  });
  return changed ? next : appointments;
}

