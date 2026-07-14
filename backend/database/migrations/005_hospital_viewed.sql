-- Tracks the first time a hospital clinician actually opens a referral's
-- details in their queue. workflow_status stays 'Pending Hospital Review'
-- for the whole waiting period, so it alone can't tell us whether the
-- hospital has already seen the referral — this timestamp can.

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS hospital_viewed_at TIMESTAMP;
