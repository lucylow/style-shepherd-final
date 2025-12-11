-- Guardrails Framework Database Schema
-- Creates tables for violation tracking, audit logs, and monitoring

-- Guardrail Violations Table
CREATE TABLE IF NOT EXISTS guardrail_violations (
  id SERIAL PRIMARY KEY,
  agent VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  user_id VARCHAR(255),
  reason TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  payload JSONB,
  check_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_guardrail_violations_agent (agent),
  INDEX idx_guardrail_violations_user (user_id),
  INDEX idx_guardrail_violations_created (created_at),
  INDEX idx_guardrail_violations_severity (severity)
);

-- Guardrail Audit Logs Table
CREATE TABLE IF NOT EXISTS guardrail_audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  agent VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  user_id VARCHAR(255),
  approved BOOLEAN NOT NULL,
  reason TEXT,
  warnings JSONB,
  payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_guardrail_audit_agent (agent),
  INDEX idx_guardrail_audit_user (user_id),
  INDEX idx_guardrail_audit_approved (approved),
  INDEX idx_guardrail_audit_created (created_at)
);

-- Circuit Breaker States Table (for persistence across restarts)
CREATE TABLE IF NOT EXISTS guardrail_circuit_breakers (
  agent VARCHAR(50) PRIMARY KEY,
  is_open BOOLEAN DEFAULT FALSE,
  failure_count INTEGER DEFAULT 0,
  last_failure_time TIMESTAMP,
  opened_at TIMESTAMP,
  violation_rate DECIMAL(5, 4) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_circuit_breakers_open (is_open)
);

-- User Permission Overrides Table (for custom permissions)
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  user_id VARCHAR(255) PRIMARY KEY,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('FREE', 'PREMIUM', 'VIP')),
  auto_purchase_max DECIMAL(10, 2),
  auto_purchase_categories JSONB,
  autonomy_level INTEGER CHECK (autonomy_level >= 1 AND autonomy_level <= 5),
  approved_brands JSONB,
  budget_cap DECIMAL(10, 2),
  max_auto_refunds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Auto-Refund Tracking Table
CREATE TABLE IF NOT EXISTS user_auto_refund_tracking (
  user_id VARCHAR(255) NOT NULL,
  month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
  refund_count INTEGER DEFAULT 0,
  last_refund_date TIMESTAMP,
  PRIMARY KEY (user_id, month_year),
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  INDEX idx_auto_refund_user_month (user_id, month_year)
);
