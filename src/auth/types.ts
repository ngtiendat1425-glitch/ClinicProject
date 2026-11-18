import type { ActionResult, Patient } from '../data/types';

export type AuthAccount = {
  id: string;
  patient: Patient;
  createdAt: string;
};

// These fields stay inside the account store and never enter the public context.
export type StoredAuthAccount = AuthAccount & {
  saltHex: string;
  passwordHashHex: string;
  iterations: 100000;
};

export type AuthAccountsStore = { version: 1; accounts: StoredAuthAccount[] };
export type AuthSession = { version: 1; accountId: string };

export type RegistrationInput = {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export type LoginInput = { identifier: string; password: string };

export type AuthContextValue = {
  ready: boolean;
  busy: boolean;
  storageError: string | null;
  account: AuthAccount | null;
  isDemo: boolean;
  login: (input: LoginInput) => Promise<ActionResult>;
  register: (input: RegistrationInput) => Promise<ActionResult>;
  enterDemo: () => Promise<ActionResult>;
  logout: () => Promise<void>;
};
