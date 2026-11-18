import { useEffect, useState } from 'react';
import { getAvailableTimes, type Appointment, type Doctor, type ServiceType } from '../data/clinic';
import { apiRequest } from '../services/api';

/** Bounded batches keep a date filter from flooding the API with requests. */
export function useDoctorAvailability(doctors: Doctor[], date: string, service: ServiceType, appointments: Appointment[], now: number, remote: boolean) {
  const key = `${date}:${service}:${Math.floor(now / 30000)}:${doctors.map(doctor => doctor.id).join(',')}`;
  const [result, setResult] = useState<{ key: string; counts: Record<string, number>; error?: string }>({ key: '', counts: {} });
  useEffect(() => {
    if (!remote || !date) return;
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const counts: Record<string, number> = {};
        const supported = doctors.filter(doctor => service !== 'online' || doctor.supportsOnline !== false);
        for (let offset = 0; offset < supported.length; offset += 4) {
          if (controller.signal.aborted) return;
          await Promise.all(supported.slice(offset, offset + 4).map(async doctor => {
            const slots = await apiRequest<string[]>(`/doctors/${encodeURIComponent(doctor.id)}/availability?date=${date}&service=${service}`, { signal: controller.signal });
            counts[doctor.id] = slots.length;
          }));
        }
        if (active) setResult({ key, counts });
      } catch (error) {
        if (active && !controller.signal.aborted) setResult({ key, counts: {}, error: error instanceof Error ? error.message : 'Chưa tải được lịch trống.' });
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [doctors, date, service, remote, key]);
  if (!remote) return { counts: Object.fromEntries(doctors.map(doctor => [doctor.id, getAvailableTimes(doctor.id, date, service, appointments, now).length])), loading: false, error: undefined };
  if (!date) return { counts: {} as Record<string, number>, loading: false, error: undefined };
  return { counts: result.key === key ? result.counts : {}, loading: result.key !== key, error: result.key === key ? result.error : undefined };
}
