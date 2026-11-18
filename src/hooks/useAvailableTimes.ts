import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { appointmentStart, getAvailableTimes, type Appointment, type ServiceType } from '../data/clinic';
import { apiConfigured, apiRequest } from '../services/api';

export function useAvailableTimes(doctorId: string, date: string, service: ServiceType, appointments: Appointment[], now: number) {
  const { isDemo } = useAuth();
  const remote = apiConfigured && !isDemo;
  const key = `${doctorId}:${date}:${service}:${Math.floor(now / 30000)}:${appointments.map(item => `${item.id}-${item.status}`).join(',')}`;
  const [response, setResponse] = useState<{ key: string; slots: string[]; error?: string }>({ key: '', slots: [] });
  useEffect(() => {
    if (!remote || !doctorId || !date) return;
    const controller = new AbortController();
    let active = true;
    void apiRequest<string[]>(`/doctors/${encodeURIComponent(doctorId)}/availability?date=${encodeURIComponent(date)}&service=${service}`, { signal: controller.signal })
      .then(slots => { if (active) setResponse({ key, slots }); })
      .catch(error => { if (active && !controller.signal.aborted) setResponse({ key, slots: [], error: error instanceof Error ? error.message : 'Chưa tải được lịch trống.' }); });
    return () => { active = false; controller.abort(); };
  }, [remote, doctorId, date, service, key]);
  if (!remote) return { slots: getAvailableTimes(doctorId, date, service, appointments, now), loading: false, error: undefined };
  return { slots: response.key === key ? response.slots.filter(time => appointmentStart({ date, time }) > now) : [],
    loading: response.key !== key, error: response.key === key ? response.error : undefined };
}
