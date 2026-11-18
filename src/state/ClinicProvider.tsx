import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import {
  HOLD_MINUTES,
  appointmentStart,
  createDemoState,
  createPatientState,
  expirePendingAppointments,
  formatDate,
  getDoctor,
  serviceDuration,
  serviceFee,
  validateBooking,
  validateCancellation,
  validatePatient,
  type ActionResult,
  type BookingInput,
  type ClinicState,
  type Patient,
} from '../data/clinic';
import { clinicStorageKey, isClinicState, STORAGE_KEY } from './storage';

export type ClinicContextValue = Omit<ClinicState, 'version'> & {
  ready: boolean;
  storageError: string | null;
  bookAppointment: (input: BookingInput) => Promise<ActionResult>;
  cancelAppointment: (id: string, reason: string) => Promise<ActionResult>;
  updatePatient: (patient: Patient) => Promise<ActionResult>;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
};

export const ClinicContext = createContext<ClinicContextValue | null>(null);

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function withExpiredHolds(state: ClinicState, now = Date.now()): ClinicState {
  const appointments = expirePendingAppointments(state.appointments, now);
  if (appointments === state.appointments) return state;
  const expired = appointments.filter((appointment, index) => appointment.status === 'expired' && state.appointments[index].status === 'pending');
  return {
    ...state,
    appointments,
    notifications: [
      ...expired.map((appointment) => ({
        id: `expired-${appointment.id}`,
        title: 'Lịch hẹn đã hết hạn giữ chỗ',
        body: `Yêu cầu lúc ${appointment.time}, ${formatDate(appointment.date)} chưa được xác nhận trong thời hạn giữ chỗ. Bạn có thể chọn lịch mới.`,
        createdAt: new Date(now).toISOString(),
        read: false,
        appointmentId: appointment.id,
      })),
      ...state.notifications,
    ],
  };
}

export function ClinicProvider({ children, accountId = 'demo', initialPatient, isDemo = true, enabled = true }: {
  children: ReactNode; accountId?: string; initialPatient?: Patient; isDemo?: boolean; enabled?: boolean;
}) {
  const storageKey = clinicStorageKey(accountId);
  const [state, setState] = useState<ClinicState>(() => isDemo ? createDemoState() : createPatientState(initialPatient ?? {
    name: '', phone: '', email: '', birthDate: '', gender: 'Chưa cung cấp', address: '', allergies: '',
  }));
  const [ready, setReady] = useState(!enabled);
  const [storageError, setStorageError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const readyRef = useRef(false);
  const canWriteRef = useRef(false);
  const mountedRef = useRef(true);
  const writesRef = useRef<Promise<void>>(Promise.resolve());

  const persist = useCallback((next: ClinicState) => {
    if (!canWriteRef.current) return;
    const snapshot = JSON.stringify(next);
    // Keep writes ordered so rapid actions cannot restore an older snapshot.
    writesRef.current = writesRef.current
      .then(() => AsyncStorage.setItem(storageKey, snapshot))
      .then(() => { if (mountedRef.current) setStorageError(null); })
      .catch(() => {
        if (mountedRef.current) setStorageError('Chưa lưu được dữ liệu trên thiết bị. Các thay đổi hiện chỉ được giữ trong phiên này.');
      });
  }, [storageKey]);

  const commit = useCallback((next: ClinicState) => {
    stateRef.current = next;
    setState(next);
    persist(next);
  }, [persist]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    mountedRef.current = true;
    async function hydrate() {
      let next = stateRef.current;
      try {
        let raw = await AsyncStorage.getItem(storageKey);
        // Previous versions had one demo profile. Only the explicit demo
        // account may import it; newly registered users always start empty.
        if (raw === null && isDemo) raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;
        if (raw !== null) {
          let parsed: unknown;
          try { parsed = JSON.parse(raw); } catch { parsed = null; }
          if (isClinicState(parsed)) {
            next = withExpiredHolds(parsed);
            canWriteRef.current = true;
          } else {
            // Preserve unreadable storage for recovery instead of overwriting it.
            setStorageError('Dữ liệu đã lưu không hợp lệ. Ứng dụng đang dùng dữ liệu demo tạm thời trong phiên này.');
          }
        } else {
          canWriteRef.current = true;
        }
      } catch {
        if (!active) return;
        setStorageError('Không đọc được dữ liệu trên thiết bị. Ứng dụng đang dùng dữ liệu demo tạm thời trong phiên này.');
      }
      if (!active) return;
      stateRef.current = next;
      setState(next);
      readyRef.current = true;
      setReady(true);
      persist(next);
    }
    void hydrate();
    return () => { active = false; mountedRef.current = false; };
  }, [persist, storageKey, isDemo, enabled]);

  useEffect(() => {
    if (!ready) return;
    const refresh = () => {
      const current = stateRef.current;
      const next = withExpiredHolds(current);
      if (next !== current) commit(next);
    };
    const timer = setInterval(refresh, 15_000);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [commit, ready]);

  const bookAppointment = useCallback(async (input: BookingInput): Promise<ActionResult> => {
    if (!readyRef.current) return { ok: false, error: 'Dữ liệu đang được tải. Vui lòng thử lại.' };
    const now = Date.now();
    const current = withExpiredHolds(stateRef.current, now);
    const error = validateBooking(input, current.appointments, now);
    if (error) {
      if (current !== stateRef.current) commit(current);
      return { ok: false, error };
    }
    const doctor = getDoctor(input.doctorId)!;
    const id = uniqueId('apt');
    const createdAt = new Date(now).toISOString();
    const holdExpiresAt = new Date(Math.min(now + HOLD_MINUTES * 60_000, appointmentStart(input))).toISOString();
    commit({
      ...current,
      appointments: [{
        id, doctorId: input.doctorId, service: input.service, date: input.date,
        time: input.time, reason: input.reason.trim(), status: 'pending', createdAt,
        holdExpiresAt, durationMinutes: serviceDuration(doctor, input.service), fee: serviceFee(doctor, input.service),
        ...(input.insurance ? { insurance: { ...input.insurance } } : {}),
        ...(input.healthCheckPurpose ? { healthCheckPurpose: input.healthCheckPurpose } : {}),
      }, ...current.appointments],
      notifications: [{
        id: uniqueId('notice'), title: 'Đã gửi yêu cầu đặt lịch',
        body: `Yêu cầu khám với ${doctor.title} ${doctor.name} lúc ${input.time}, ${formatDate(input.date)} đang chờ xác nhận. Chỗ được giữ tối đa ${HOLD_MINUTES} phút.`,
        createdAt, read: false, appointmentId: id,
      }, ...current.notifications],
    });
    return { ok: true, id };
  }, [commit]);

  const cancelAppointment = useCallback(async (id: string, reason: string): Promise<ActionResult> => {
    if (!readyRef.current) return { ok: false, error: 'Dữ liệu đang được tải. Vui lòng thử lại.' };
    const now = Date.now();
    const current = withExpiredHolds(stateRef.current, now);
    const appointment = current.appointments.find((item) => item.id === id);
    const error = validateCancellation(appointment, reason, now);
    if (error) {
      if (current !== stateRef.current) commit(current);
      return { ok: false, error };
    }
    const cancelledAt = new Date(now).toISOString();
    commit({
      ...current,
      appointments: current.appointments.map((item) => item.id === id ? {
        ...item, status: 'cancelled', cancelReason: reason.trim(), cancelledAt,
      } : item),
      notifications: [{
        id: uniqueId('notice'), title: 'Đã hủy lịch hẹn',
        body: `Lịch lúc ${appointment!.time}, ${formatDate(appointment!.date)} đã được hủy theo yêu cầu của bạn.`,
        createdAt: cancelledAt, read: false, appointmentId: id,
      }, ...current.notifications],
    });
    return { ok: true, id };
  }, [commit]);

  const updatePatient = useCallback(async (patient: Patient): Promise<ActionResult> => {
    if (!readyRef.current) return { ok: false, error: 'Dữ liệu đang được tải. Vui lòng thử lại.' };
    const error = validatePatient(patient);
    if (error) return { ok: false, error };
    const cleanPatient = Object.fromEntries(Object.entries(patient).map(([key, value]) => [key, value.trim()])) as Patient;
    commit({ ...stateRef.current, patient: cleanPatient });
    return { ok: true };
  }, [commit]);

  const markNotificationRead = useCallback((id: string) => {
    if (!readyRef.current || !stateRef.current.notifications.some((notice) => notice.id === id && !notice.read)) return;
    commit({ ...stateRef.current, notifications: stateRef.current.notifications.map((notice) => notice.id === id ? { ...notice, read: true } : notice) });
  }, [commit]);

  const markAllRead = useCallback(() => {
    if (!readyRef.current || stateRef.current.notifications.every((notice) => notice.read)) return;
    commit({ ...stateRef.current, notifications: stateRef.current.notifications.map((notice) => ({ ...notice, read: true })) });
  }, [commit]);

  return (
    <ClinicContext.Provider value={{ ...state, ready, storageError, bookAppointment, cancelAppointment, updatePatient, markNotificationRead, markAllRead }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) throw new Error('useClinic must be used inside ClinicProvider');
  return context;
}
