import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { ActionResult, Appointment, BookingInput, ClinicNotification, Patient } from '../data/clinic';
import { apiRequest } from '../services/api';
import { parseAppointment, parsePatientCollections } from '../services/contracts';
import { ClinicContext } from './ClinicProvider';

const errorText = (error: unknown) => error instanceof Error ? error.message : 'Chưa thể kết nối máy chủ. Vui lòng thử lại.';

/** API-backed patient data is kept in memory and never copied into the demo store. */
export function RemoteClinicProvider({ initialPatient, children }: { initialPatient: Patient; children: ReactNode }) {
  const [patient, setPatient] = useState(initialPatient);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<ClinicNotification[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setError] = useState<string | null>(null);
  const active = useRef(true);
  const busy = useRef(false);
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const [bookings, notices] = await Promise.all([
        apiRequest<Appointment[]>('/appointments'), apiRequest<ClinicNotification[]>('/notifications'),
      ]);
      const data = parsePatientCollections(bookings, notices);
      if (active.current && request === sequence.current) { setAppointments(data.appointments); setNotifications(data.notifications); setError(null); }
    } catch (error) { if (active.current && request === sequence.current) setError(errorText(error)); }
    finally { if (active.current && request === sequence.current) setReady(true); }
  }, []);
  useEffect(() => {
    active.current = true;
    void Promise.resolve().then(refresh);
    const timer = setInterval(() => void refresh(), 30_000);
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') void refresh(); });
    return () => { active.current = false; clearInterval(timer); subscription.remove(); };
  }, [refresh]);

  const bookAppointment = useCallback(async (input: BookingInput): Promise<ActionResult> => {
    if (busy.current) return { ok: false, error: 'Yêu cầu trước đang được xử lý.' };
    busy.current = true;
    try {
      const appointment = parseAppointment(await apiRequest<unknown>('/appointments', { method: 'POST', body: input }));
      if (active.current) setAppointments(current => [appointment, ...current.filter(item => item.id !== appointment.id)]);
      void refresh();
      return { ok: true, id: appointment.id };
    } catch (error) { return { ok: false, error: errorText(error) }; }
    finally { busy.current = false; }
  }, [refresh]);

  const cancelAppointment = useCallback(async (id: string, reason: string): Promise<ActionResult> => {
    if (busy.current) return { ok: false, error: 'Yêu cầu trước đang được xử lý.' };
    busy.current = true;
    try {
      const appointment = parseAppointment(await apiRequest<unknown>(`/appointments/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: { reason } }));
      if (active.current) setAppointments(current => current.map(item => item.id === id ? appointment : item));
      void refresh();
      return { ok: true, id };
    } catch (error) { return { ok: false, error: errorText(error) }; }
    finally { busy.current = false; }
  }, [refresh]);

  const updatePatient = useCallback(async (input: Patient): Promise<ActionResult> => {
    try {
      const saved = await apiRequest<Patient>('/profile', { method: 'PUT', body: input });
      if (active.current) setPatient(saved);
      return { ok: true };
    } catch (error) { return { ok: false, error: errorText(error) }; }
  }, []);
  const markNotificationRead = useCallback((id: string) => {
    void apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
      .then(() => { if (active.current) setNotifications(current => current.map(item => item.id === id ? { ...item, read: true } : item)); })
      .catch(error => { if (active.current) setError(errorText(error)); });
  }, []);
  const markAllRead = useCallback(() => {
    void apiRequest('/notifications/read-all', { method: 'POST' })
      .then(() => { if (active.current) setNotifications(current => current.map(item => ({ ...item, read: true }))); })
      .catch(error => { if (active.current) setError(errorText(error)); });
  }, []);
  return <ClinicContext.Provider value={{ patient, appointments, notifications, ready, storageError,
    bookAppointment, cancelAppointment, updatePatient, markNotificationRead, markAllRead }}>{children}</ClinicContext.Provider>;
}
