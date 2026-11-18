import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { doctors as demoDoctors } from '../data/catalog';
import { departments as demoDepartments, type Department } from '../data/departments';
import type { Doctor } from '../data/types';
import { apiRequest } from '../services/api';

type CatalogData = { departments: Department[]; doctors: Doctor[] };
type CatalogSnapshot = CatalogData & { ready: boolean; error: string | null };
type CatalogContextValue = CatalogSnapshot & {
  isRemote: boolean;
  getDoctor: (id: string | undefined) => Doctor | undefined;
  getDepartment: (id: string | undefined) => Department | undefined;
  reload: () => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);
const INVALID_CATALOG = 'Dữ liệu danh mục từ máy chủ không hợp lệ. Vui lòng thử lại hoặc liên hệ phòng khám.';

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function isText(value: unknown, max: number) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
function isId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value); }
function texts(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every(item => isText(item, maxLength));
}
function integer(value: unknown, min: number, max: number) { return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max; }
function isColor(value: unknown) { return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value); }

function isDoctor(value: unknown): value is Doctor {
  if (!isRecord(value) || !isId(value.id)) return false;
  if (!isText(value.name, 150) || !isText(value.title, 100) || !isText(value.specialty, 150) || !isText(value.initials, 12) || !isText(value.bio, 10000)) return false;
  if (!integer(value.experience, 0, 100) || !integer(value.reviewCount, 0, 10000000) || !integer(value.durationMinutes, 1, 240)) return false;
  if (typeof value.rating !== 'number' || !Number.isFinite(value.rating) || value.rating < 0 || value.rating > 5) return false;
  if (typeof value.fee !== 'number' || !Number.isFinite(value.fee) || value.fee < 0 || value.fee > 1e12) return false;
  return isColor(value.color) && texts(value.education, 30, 500) && texts(value.languages, 30, 100)
    && (value.supportsOnline === undefined || typeof value.supportsOnline === 'boolean');
}

function isDepartment(value: unknown): value is Department {
  if (!isRecord(value) || !isId(value.id) || !isText(value.name, 150) || !isText(value.description, 10000)) return false;
  if (typeof value.icon !== 'string' || !/^[a-z0-9-]{1,80}$/.test(value.icon) || !isColor(value.color)) return false;
  if (!texts(value.services, 100, 500) || !Array.isArray(value.doctorIds) || value.doctorIds.length > 10000 || !value.doctorIds.every(isId)) return false;
  return new Set(value.doctorIds).size === value.doctorIds.length && typeof value.supportsOnline === 'boolean' && ['clinical', 'support'].includes(value.kind as string);
}

/** Validate both resources together so stale or dangling references never reach booking screens. */
export function parseCatalog(departments: unknown, doctors: unknown): CatalogData {
  if (!Array.isArray(departments) || departments.length > 1000 || !departments.every(isDepartment)
    || !Array.isArray(doctors) || doctors.length > 10000 || !doctors.every(isDoctor)) throw new Error(INVALID_CATALOG);
  if (new Set(departments.map(item => item.id)).size !== departments.length || new Set(doctors.map(item => item.id)).size !== doctors.length) throw new Error(INVALID_CATALOG);
  const doctorMap = new Map(doctors.map(doctor => [doctor.id, doctor]));
  const assigned = new Set<string>();
  for (const department of departments) {
    for (const id of department.doctorIds) {
      const doctor = doctorMap.get(id);
      if (!doctor || department.kind !== 'clinical' || doctor.specialty !== department.name) throw new Error(INVALID_CATALOG);
      if (doctor.supportsOnline === true && !department.supportsOnline) throw new Error(INVALID_CATALOG);
      assigned.add(id);
    }
  }
  if (doctors.some(doctor => !assigned.has(doctor.id))) throw new Error(INVALID_CATALOG);
  return { departments, doctors: doctors.map(doctor => ({ ...doctor, supportsOnline: doctor.supportsOnline ?? true })) };
}

export function CatalogProvider({ enabled, remote, children }: { enabled: boolean; remote: boolean; children: ReactNode }) {
  return <CatalogStore key={`${enabled}:${remote}`} enabled={enabled} remote={remote}>{children}</CatalogStore>;
}

function CatalogStore({ enabled, remote, children }: { enabled: boolean; remote: boolean; children: ReactNode }) {
  const activeRemote = enabled && remote;
  const [snapshot, setSnapshot] = useState<CatalogSnapshot>(() => remote
    ? { departments: [], doctors: [], ready: !enabled, error: null }
    : { departments: demoDepartments, doctors: demoDoctors, ready: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!activeRemote) return;
    let active = true;
    const controller = new AbortController();
    const requestGeneration = ++generation.current;
    pending.current = controller;
    async function load() {
      try {
        const [departments, doctors] = await Promise.all([
          apiRequest<unknown>('/departments', { auth: false, signal: controller.signal }),
          apiRequest<unknown>('/doctors', { auth: false, signal: controller.signal }),
        ]);
        const data = parseCatalog(departments, doctors);
        if (active && generation.current === requestGeneration) setSnapshot({ ...data, ready: true, error: null });
      } catch (cause) {
        if (active && generation.current === requestGeneration) setSnapshot({ departments: [], doctors: [], ready: true,
          error: cause instanceof Error ? cause.message : 'Không tải được danh mục phòng khám. Vui lòng thử lại.' });
      }
    }
    void load();
    return () => { active = false; controller.abort(); if (pending.current === controller) pending.current = null; };
  }, [activeRemote, attempt]);

  const reload = useCallback(() => {
    if (!activeRemote) return;
    generation.current += 1;
    pending.current?.abort();
    setSnapshot({ departments: [], doctors: [], ready: false, error: null });
    setAttempt(current => current + 1);
  }, [activeRemote]);
  const getDoctor = useCallback((id: string | undefined) => snapshot.doctors.find(doctor => doctor.id === id), [snapshot.doctors]);
  const getDepartment = useCallback((id: string | undefined) => snapshot.departments.find(department => department.id === id), [snapshot.departments]);

  return <CatalogContext.Provider value={{ ...snapshot, isRemote: remote, getDoctor, getDepartment, reload }}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error('useCatalog cần nằm trong CatalogProvider.');
  return catalog;
}
