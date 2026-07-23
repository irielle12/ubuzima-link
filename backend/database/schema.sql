
-- ============================================================
-- FACILITIES
-- ============================================================
CREATE TABLE facilities (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR NOT NULL UNIQUE,
  name             VARCHAR NOT NULL,
  type             VARCHAR NOT NULL,  -- HEALTH_POST | HEALTH_CENTER | DISTRICT_HOSPITAL
  district         VARCHAR NOT NULL,
  sector           VARCHAR,
  phone            VARCHAR,
  email            VARCHAR,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_by       INTEGER,           -- FK set after users table exists (see below)
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Per-urgency bed/capacity status a DISTRICT_HOSPITAL sets for itself;
  -- health posts read this before choosing where to send a referral.
  capacity_status  JSONB NOT NULL DEFAULT '{"Emergency": "available", "Urgent": "available", "Routine": "available"}'
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id                       SERIAL PRIMARY KEY,
  staff_id                 VARCHAR NOT NULL UNIQUE,
  first_name               VARCHAR NOT NULL,
  last_name                VARCHAR NOT NULL,
  email                    VARCHAR UNIQUE,
  password_hash            TEXT    NOT NULL,
  role                     VARCHAR NOT NULL,  -- nurse | doctor | admin
  facility_id              INTEGER REFERENCES facilities(id),
  active                   BOOLEAN DEFAULT true,
  created_by               INTEGER REFERENCES users(id),
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Auth hardening
  failed_login_attempts    INTEGER NOT NULL DEFAULT 0,
  locked_until             TIMESTAMP,               -- set on lockout, auto-clears once past
  must_change_password     BOOLEAN NOT NULL DEFAULT false,
  refresh_token_hash       TEXT,                     -- sha256 of the current refresh token (never store it raw)
  refresh_token_expires_at TIMESTAMP,
  credentials_version      INTEGER NOT NULL DEFAULT 0, -- bumped to force-sign-out every device (see migrations/007)
  otp_code_hash            TEXT,                     -- sha256 of the current pending email 2FA code (see migrations/009)
  otp_code_expires_at      TIMESTAMP,
  reset_code_hash          TEXT,                     -- sha256 of the current pending password-reset code (see migrations/010)
  reset_code_expires_at    TIMESTAMP
);

-- Back-fill the self-referencing FK on facilities now that users exists
ALTER TABLE facilities
  ADD CONSTRAINT facilities_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE patients (
  id                   SERIAL PRIMARY KEY,
  patient_number       VARCHAR NOT NULL,
  national_id          VARCHAR,           -- null for babies/minors
  guardian_national_id VARCHAR,           -- used when patient has no own national_id
  first_name           VARCHAR NOT NULL,
  last_name            VARCHAR NOT NULL,
  gender               VARCHAR,
  date_of_birth        DATE,
  phone                VARCHAR,
  village              VARCHAR,
  cell                 VARCHAR,
  sector               VARCHAR,
  district             VARCHAR,
  emergency_contact    VARCHAR,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE referrals (
  id                      SERIAL PRIMARY KEY,
  referral_number         VARCHAR NOT NULL,
  patient_id              INTEGER REFERENCES patients(id),
  source_facility_id      INTEGER REFERENCES facilities(id),
  destination_facility_id INTEGER REFERENCES facilities(id),
  -- Clinical fields
  chief_complaint         TEXT,
  medical_history         TEXT,
  vital_bp                VARCHAR(20),
  vital_heart_rate        VARCHAR(20),
  vital_temperature       VARCHAR(20),
  vital_respiratory_rate  VARCHAR(20),
  diagnosis               TEXT NOT NULL,   -- provisional diagnosis
  action_taken            TEXT,
  urgency                 VARCHAR,
  workflow_status         VARCHAR DEFAULT 'Draft',
  sync_status             VARCHAR DEFAULT 'Pending',
  -- Hospital response fields
  rejection_reason        TEXT,
  treatment_status        VARCHAR,
  hospital_notes          TEXT,
  feedback_at             TIMESTAMP,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Valid workflow_status values (enforced in application layer):
--   Draft → Pending Hospital Review → Hospital Accepted → Feedback Received → Closed
--   Draft → Pending Hospital Review → Rejected

-- ============================================================
-- REFERRAL EVENTS  (audit timeline)
-- ============================================================
CREATE TABLE referral_events (
  id                SERIAL PRIMARY KEY,
  referral_id       INTEGER REFERENCES referrals(id),
  event_type        VARCHAR,
  event_description TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Valid event_type values logged by the application:
--   Referral Created | Referral Submitted | Hospital Accepted
--   Referral Rejected | Feedback Sent | Referral Closed
