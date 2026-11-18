CREATE TABLE patient_accounts (
  id VARCHAR(36) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  patient_json TEXT NOT NULL,
  created_at VARCHAR(40) NOT NULL
);
CREATE TABLE access_tokens (
  token_hash VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL,
  expires_at BIGINT NOT NULL,
  CONSTRAINT fk_token_account FOREIGN KEY (account_id) REFERENCES patient_accounts(id)
);
CREATE INDEX ix_tokens_expiry ON access_tokens(expires_at);
CREATE TABLE doctor_locks (id VARCHAR(36) PRIMARY KEY);
CREATE TABLE appointments (
  id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL,
  doctor_id VARCHAR(36) NOT NULL,
  starts_at BIGINT NOT NULL,
  ends_at BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  hold_expires_at BIGINT,
  appointment_json TEXT NOT NULL,
  CONSTRAINT fk_appointment_account FOREIGN KEY (account_id) REFERENCES patient_accounts(id),
  CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_locks(id)
);
CREATE INDEX ix_appointments_doctor_time ON appointments(doctor_id, starts_at, ends_at);
CREATE INDEX ix_appointments_patient_time ON appointments(account_id, starts_at, ends_at);
CREATE TABLE insurance_cards (
  account_id VARCHAR(36) PRIMARY KEY,
  card_json TEXT NOT NULL,
  CONSTRAINT fk_insurance_account FOREIGN KEY (account_id) REFERENCES patient_accounts(id)
);
CREATE TABLE certificates (
  id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL,
  certificate_json TEXT NOT NULL,
  CONSTRAINT fk_certificate_account FOREIGN KEY (account_id) REFERENCES patient_accounts(id)
);
CREATE INDEX ix_certificates_account ON certificates(account_id);
