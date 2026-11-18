import type { ActionResult } from '../data/types';

export type StoredAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uri: string;
  dataBase64?: string;
};

export type InsuranceCard = {
  id: string;
  number: string;
  holderName: string;
  birthDate: string;
  registrationPlace: string;
  validFrom: string;
  validTo: string;
  attachment?: StoredAttachment;
  updatedAt: string;
};
export type InsuranceInput = Omit<InsuranceCard, 'id' | 'updatedAt'>;

export type CertificatePurpose = 'employment' | 'study' | 'driving' | 'other';
export type HealthCertificate = {
  id: string;
  title: string;
  purpose: CertificatePurpose;
  issuer: string;
  examDate: string;
  validUntil?: string;
  notes: string;
  attachment?: StoredAttachment;
  status: 'unverified';
  createdAt: string;
};
export type CertificateInput = Omit<HealthCertificate, 'id' | 'status' | 'createdAt'>;

export type RecordsState = { version: 1; insurance: InsuranceCard | null; certificates: HealthCertificate[] };
export type RecordsContextValue = {
  ready: boolean;
  isRemote: boolean;
  storageError: string | null;
  insurance: InsuranceCard | null;
  certificates: HealthCertificate[];
  saveInsurance: (input: InsuranceInput) => Promise<ActionResult>;
  removeInsurance: () => Promise<ActionResult>;
  addCertificate: (input: CertificateInput) => Promise<ActionResult>;
  removeCertificate: (id: string) => Promise<ActionResult>;
};

export const purposeLabels: Record<CertificatePurpose, string> = {
  employment: 'Đi làm / xin việc', study: 'Học tập', driving: 'Lái xe', other: 'Mục đích khác',
};
