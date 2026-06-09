CREATE TABLE users (
    id UUID PRIMARY KEY,
    worker_id VARCHAR(50),
    password_hash TEXT
);

CREATE TABLE referrals (
    id UUID PRIMARY KEY,
    patient_name VARCHAR(100),
    age INT,
    referral_reason TEXT,
    destination_hospital VARCHAR(100),
    status VARCHAR(20),
    created_at TIMESTAMP
);