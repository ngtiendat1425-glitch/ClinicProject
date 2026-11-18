CREATE TABLE record_files (
  id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL,
  original_name VARCHAR(180) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  size_bytes BIGINT NOT NULL,
  disk_name VARCHAR(50) NOT NULL UNIQUE,
  sha256 VARCHAR(64) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_record_file_account FOREIGN KEY (account_id) REFERENCES patient_accounts(id)
);
CREATE INDEX ix_record_files_account ON record_files(account_id);
CREATE TABLE record_file_links (
  file_id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL,
  record_type VARCHAR(20) NOT NULL,
  record_id VARCHAR(36) NOT NULL,
  CONSTRAINT uq_record_file_link UNIQUE (account_id, record_type, record_id),
  CONSTRAINT fk_record_link_file FOREIGN KEY (file_id) REFERENCES record_files(id),
  CONSTRAINT fk_record_link_account FOREIGN KEY (account_id) REFERENCES patient_accounts(id)
);
