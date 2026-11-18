import type { Appointment } from './types';

const VN_OFFSET = 7 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export function dateKey(date: Date) {
  return new Date(date.getTime() + VN_OFFSET).toISOString().slice(0, 10);
}

export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00+07:00`);
  return Number.isFinite(parsed.getTime()) && dateKey(parsed) === value;
}

export function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function bookingDays(count = 14) {
  const today = dateKey(new Date());
  const first = Date.parse(`${today}T12:00:00+07:00`);
  const days: { date: string; label: string; day: string }[] = [];
  for (let offset = 0; days.length < Math.min(Math.max(count, 0), 90); offset += 1) {
    const date = dateKey(new Date(first + offset * DAY_MS));
    if (weekday(date) === 0) continue;
    days.push({
      date,
      label: offset === 0 ? 'Hôm nay' : offset === 1 ? 'Ngày mai' : WEEKDAYS[weekday(date)],
      day: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
    });
  }
  return days;
}

export function formatDate(date: string) {
  if (!isValidDate(date)) return 'Ngày không hợp lệ';
  return `${WEEKDAYS[weekday(date)]}, ${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

export function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

export function appointmentStart(appointment: Pick<Appointment, 'date' | 'time'>) {
  return Date.parse(`${appointment.date}T${appointment.time}:00+07:00`);
}

