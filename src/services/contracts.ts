import { isValidDate } from '../data/date';
import { statusLabels } from '../data/catalog';
import type { Appointment, ClinicNotification } from '../data/types';

const fail = () => { throw new Error('Dữ liệu lịch hẹn từ máy chủ không hợp lệ. Vui lòng thử tải lại.'); };
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown, max = 10000): value is string { return typeof value === 'string' && value.length <= max; }
function id(value: unknown): value is string { return text(value, 100) && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value); }
function timestamp(value: unknown): value is string { return text(value, 50) && Number.isFinite(Date.parse(value)); }

export function parseAppointment(value: unknown): Appointment {
  if (!record(value) || !id(value.id) || !id(value.doctorId) || !text(value.date, 10) || !isValidDate(value.date)
    || !text(value.time, 5) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) || !text(value.reason, 1000)
    || !text(value.status, 30) || !Object.hasOwn(statusLabels, value.status)
    || !['in-person', 'online'].includes(value.service as string) || !timestamp(value.createdAt)
    || typeof value.fee !== 'number' || !Number.isFinite(value.fee) || value.fee < 0
    || typeof value.durationMinutes !== 'number' || !Number.isInteger(value.durationMinutes) || value.durationMinutes <= 0 || value.durationMinutes > 240) return fail();
  if (value.holdExpiresAt !== undefined && !timestamp(value.holdExpiresAt)) return fail();
  if (value.status === 'pending' && !timestamp(value.holdExpiresAt)) return fail();
  if (value.cancelReason !== undefined && !text(value.cancelReason, 500)) return fail();
  if (value.cancelledAt !== undefined && !timestamp(value.cancelledAt)) return fail();
  if (value.healthCheckPurpose !== undefined && !['employment', 'study', 'driving', 'other'].includes(value.healthCheckPurpose as string)) return fail();
  if (value.insurance !== undefined) {
    const card = value.insurance;
    if (!record(card) || !id(card.cardId) || !text(card.number, 15) || !/^(?:\d{10}|[A-Z]{2}\d{13})$/.test(card.number)
      || !text(card.holderName, 100) || !text(card.registrationPlace, 200) || card.verification !== 'unverified'
      || !text(card.validFrom, 10) || !isValidDate(card.validFrom) || !text(card.validTo, 10) || !isValidDate(card.validTo)) return fail();
  }
  if (value.result !== undefined && (!record(value.result) || !text(value.result.summary) || !text(value.result.advice)
    || (value.result.followUp !== undefined && !text(value.result.followUp)))) return fail();
  return value as Appointment;
}

export function parsePatientCollections(appointments: unknown, notifications: unknown) {
  if (!Array.isArray(appointments) || appointments.length > 10000 || !Array.isArray(notifications) || notifications.length > 20000) return fail();
  const parsed = appointments.map(parseAppointment);
  if (new Set(parsed.map(item => item.id)).size !== parsed.length) return fail();
  for (const value of notifications) {
    if (!record(value) || !id(value.id) || !text(value.title, 500) || !text(value.body) || !timestamp(value.createdAt)
      || typeof value.read !== 'boolean' || (value.appointmentId !== undefined && !id(value.appointmentId))) return fail();
  }
  if (new Set(notifications.map(item => item.id)).size !== notifications.length) return fail();
  return { appointments: parsed, notifications: notifications as ClinicNotification[] };
}
