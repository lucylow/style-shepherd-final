-- Fraud Prevention Tables Migration
-- Run this migration to add fraud detection tables to your database

-- Fraud Incidents Table
CREATE TABLE IF NOT EXISTS fraud_incidents (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES user_profiles(user_id),
  user_email VARCHAR(255),
  user_ip VARCHAR(45), -- IPv6 support
  user_agent TEXT,
  action VARCHAR(100) NOT NULL, -- e.g., 'checkout', 'autonomous_payment'
  amount INTEGER, -- amount in cents
  currency VARCHAR(10) DEFAULT 'usd',
  score DECIMAL(5, 4) NOT NULL, -- combined risk score 0..1
  model_score DECIMAL(5, 4), -- optional model-derived score
  rule_scores JSONB, -- e.g., {"velocity":0.5, "shipping_mismatch":1.0}
  rules_fired TEXT[], -- array of rule IDs
  decision VARCHAR(50) NOT NULL CHECK (decision IN ('allow', 'challenge', 'deny', 'manual_review')),
  evidence_id VARCHAR(255), -- link to existing evidence log
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices Table (for tracking device fingerprints)
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES user_profiles(user_id),
  ip VARCHAR(45),
  user_agent TEXT,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fingerprints JSONB -- device fingerprint data
);

-- User Risk Profiles Table
CREATE TABLE IF NOT EXISTS user_risk_profiles (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES user_profiles(user_id),
  avg_return_rate DECIMAL(5, 4), -- percentage 0..1
  chargeback_count INTEGER DEFAULT 0,
  fraud_flags INTEGER DEFAULT 0, -- heuristic count
  last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fraud_incidents_user_id ON fraud_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_incidents_user_email ON fraud_incidents(user_email);
CREATE INDEX IF NOT EXISTS idx_fraud_incidents_score ON fraud_incidents(score);
CREATE INDEX IF NOT EXISTS idx_fraud_incidents_decision ON fraud_incidents(decision);
CREATE INDEX IF NOT EXISTS idx_fraud_incidents_created_at ON fraud_incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
CREATE INDEX IF NOT EXISTS idx_user_risk_profiles_user_id ON user_risk_profiles(user_id);

-- Update timestamp trigger for fraud_incidents
CREATE TRIGGER update_fraud_incidents_updated_at BEFORE UPDATE ON fraud_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for user_risk_profiles
CREATE TRIGGER update_user_risk_profiles_updated_at BEFORE UPDATE ON user_risk_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

