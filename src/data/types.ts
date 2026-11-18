export type ServiceType = 'in-person' | 'online';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired';

export type Doctor = {
  id: string;
  name: string;
  title: string;
  specialty: string;
  experience: number;
  rating: number;
  reviewCount: number;
  fee: number;
  durationMinutes: number;
  initials: string;
  color: string;
  bio: string;
  education: string[];
  languages: string[];
  supportsOnline?: boolean;
};

export type HealthCheckPurpose = 'employment' | 'study' | 'driving' | 'other';
export type InsuranceSnapshot = {
  cardId: string;
  number: string;
  holderName: string;
  registrationPlace: string;
  validFrom: string;
  validTo: string;
  verification: 'unverified';
};

export type Appointment = {
  id: string;
  doctorId: string;
  service: ServiceType;
  date: string;
  time: string;
  durationMinutes: number;
  fee: number;
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
  holdExpiresAt?: string;
  cancelReason?: string;
  cancelledAt?: string;
  insurance?: InsuranceSnapshot;
  healthCheckPurpose?: HealthCheckPurpose;
  result?: { summary: string; advice: string; followUp?: string };
};

export type Patient = {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: string;
  address: string;
  allergies: string;
};

export type ClinicNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  appointmentId?: string;
};

export type ClinicState = {
  version: 1;
  patient: Patient;
  appointments: Appointment[];
  notifications: ClinicNotification[];
};

export type BookingInput = Pick<Appointment, 'doctorId' | 'service' | 'date' | 'time' | 'reason' | 'insurance' | 'healthCheckPurpose'>;
export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

