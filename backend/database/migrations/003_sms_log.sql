-- Tracks each SMS sent through Africa's Talking so the delivery-report
-- callback can update the real outcome (Delivered/Failed) after the fact —
-- the initial API response only confirms AT handed it to the telco, not
-- that the patient's phone actually received it.

CREATE TABLE IF NOT EXISTS sms_log (
  id SERIAL PRIMARY KEY,
  referral_id INTEGER REFERENCES referrals(id),
  phone TEXT NOT NULL,
  message_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'Sent',
  failure_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
