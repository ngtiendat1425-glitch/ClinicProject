import type { Appointment, ClinicNotification, ClinicState, Patient } from '../data/types';
import { getDoctor, statusLabels } from '../data/catalog';
import { isValidDate } from '../data/date';
import { validatePatient } from '../data/booking';

export const STORAGE_KEY = '@an-tam/patient-demo/v1';

export function clinicStorageKey(accountId: string) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(accountId)) throw new Error('Mã tài khoản không hợp lệ.');
  return `${STORAGE_KEY}:${accountId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isTimestamp(value: unknown): value is string {
  return isString(value) && Number.isFinite(Date.parse(value));
}

function isAppointment(value: unknown): value is Appointment {
  if (!isRecord(value)) return false;
  const fields = ['id', 'doctorId', 'service', 'date', 'time', 'reason', 'status', 'createdAt'];
  if (!fields.every((key) => isString(value[key]))) return false;
  if (!getDoctor(value.doctorId as string) || !isValidDate(value.date as string)) return false;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time as string)) return false;
  if (!['in-person', 'online'].includes(value.service as string)) return false;
  if (!Object.hasOwn(statusLabels, value.status as string)) return false;
  if (typeof value.durationMinutes !== 'number' || !Number.isFinite(value.durationMinutes) || value.durationMinutes <= 0 || value.durationMinutes > 120) return false;
  if (typeof value.fee !== 'number' || !Number.isFinite(value.fee) || value.fee < 0) return false;
  if (!isTimestamp(value.createdAt)) return false;
  if (value.status === 'pending' && !isTimestamp(value.holdExpiresAt)) return false;
  if (value.cancelReason !== undefined && !isString(value.cancelReason)) return false;
  if (value.cancelledAt !== undefined && !isTimestamp(value.cancelledAt)) return false;
  if (value.healthCheckPurpose !== undefined && (value.doctorId !== '20' || !['employment', 'study', 'driving', 'other'].includes(value.healthCheckPurpose as string))) return false;
  if (value.insurance !== undefined) {
    const card = value.insurance;
    if (!isRecord(card) || !['cardId', 'number', 'holderName', 'registrationPlace', 'validFrom', 'validTo'].every(key => isString(card[key]))) return false;
    if (card.verification !== 'unverified' || !/^(?:\d{10}|[A-Z]{2}\d{13})$/.test(card.number as string)) return false;
    if (!isValidDate(card.validFrom as string) || !isValidDate(card.validTo as string) || (card.validFrom as string) > (card.validTo as string)) return false;
  }
  if (value.result !== undefined) {
    const result = value.result;
    if (!isRecord(result) || !isString(result.summary) || !isString(result.advice)) return false;
    if (result.followUp !== undefined && !isString(result.followUp)) return false;
  }
  return true;
}

function isNotification(value: unknown): value is ClinicNotification {
  if (!isRecord(value)) return false;
  if (!['id', 'title', 'body'].every((key) => isString(value[key]))) return false;
  if (!isTimestamp(value.createdAt) || typeof value.read !== 'boolean') return false;
  return value.appointmentId === undefined || isString(value.appointmentId);
}

export function isClinicState(value: unknown): value is ClinicState {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.patient)) return false;
  if (!Array.isArray(value.appointments) || !Array.isArray(value.notifications)) return false;
  if (value.appointments.length > 10000 || value.notifications.length > 20000) return false;
  const patient = value.patient;
  const patientFields = ['name', 'phone', 'email', 'birthDate', 'gender', 'address', 'allergies'];
  if (!patientFields.every((key) => isString(patient[key]))) return false;
  if (validatePatient(patient as Patient) !== null) return false;
  if (!value.appointments.every(isAppointment) || !value.notifications.every(isNotification)) return false;
  const appointmentIds = new Set(value.appointments.map((item) => item.id));
  const notificationIds = new Set(value.notifications.map((item) => item.id));
  if (appointmentIds.size !== value.appointments.length || notificationIds.size !== value.notifications.length) return false;
  return value.notifications.every((item) => item.appointmentId === undefined || appointmentIds.has(item.appointmentId));
}
