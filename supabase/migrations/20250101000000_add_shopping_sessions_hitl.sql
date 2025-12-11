-- HITL Shopping Sessions Table
-- Supports human-in-the-loop approval gates for Style Shepherd's 4-agent pipeline

CREATE TABLE IF NOT EXISTS shopping_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  
  -- HITL Status Flow
  status VARCHAR(50) NOT NULL DEFAULT 'shopper_pending' CHECK (
    status IN (
      'shopper_pending',
      'shopper_approved',
      'shopper_refined',
      'size_review',
      'size_approved',
      'final_approval',
      'checkout_ready',
      'completed',
      'cancelled'
    )
  ),
  
  -- Human Action Tracking
  human_action VARCHAR(50) CHECK (
    human_action IN (
      'approved',
      'rejected',
      'suggested_alt',
      'override_size',
      'refine_style',
      'new_budget',
      'confirm_size',
      'body_scan_needed',
      'accept_risk',
      'swap_item',
      'remove',
      'shade_approval',
      'selfie_retake'
    )
  ),
  
  -- Stylist Assignment
  stylist_id UUID,
  stylist_name VARCHAR(255),
  stylist_level VARCHAR(50) CHECK (stylist_level IN ('junior', 'senior', 'expert', 'video')),
  assigned_at TIMESTAMP,
  sla_deadline TIMESTAMP, -- 5min for junior, 3min for senior, etc.
  
  -- Agent Results Storage (JSONB)
  outfits JSONB, -- Personal Shopper results
  size_predictions JSONB, -- Size Predictor results with confidence
  return_risks JSONB, -- Returns Predictor results
  makeup_recommendations JSONB, -- Makeup Artist results
  
  -- Session Metadata
  query JSONB, -- Original user query/intent
  user_intent TEXT,
  budget DECIMAL(10, 2),
  occasion VARCHAR(100),
  
  -- Confidence & Risk Metrics
  size_confidence DECIMAL(3, 2), -- 0.00 to 1.00
  return_risk_score DECIMAL(3, 2), -- 0.00 to 1.00
  overall_confidence DECIMAL(3, 2),
  
  -- Monetization
  tier VARCHAR(50) DEFAULT 'premium' CHECK (tier IN ('premium', 'express', 'vip')),
  stylist_fee_cents INTEGER,
  platform_fee_cents INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_status ON shopping_sessions(status);
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_user_id ON shopping_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_stylist_id ON shopping_sessions(stylist_id);
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_created_at ON shopping_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_sla_deadline ON shopping_sessions(sla_deadline) WHERE sla_deadline IS NOT NULL;

-- Stylists Table
CREATE TABLE IF NOT EXISTS stylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  level VARCHAR(50) NOT NULL DEFAULT 'junior' CHECK (level IN ('junior', 'senior', 'expert', 'video')),
  specializations TEXT[], -- ['womenswear', 'menswear', 'beauty', 'sizing']
  rating DECIMAL(3, 2) DEFAULT 0.0,
  total_sessions INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_break')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stylist Ratings/Reviews
CREATE TABLE IF NOT EXISTS stylist_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES shopping_sessions(id) ON DELETE CASCADE,
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE shopping_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopping_sessions
-- Users can see their own sessions
CREATE POLICY "Users can view own sessions"
  ON shopping_sessions
  FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true));

-- Stylists can view pending sessions assigned to them or unassigned pending sessions
CREATE POLICY "Stylists can view pending sessions"
  ON shopping_sessions
  FOR SELECT
  USING (
    status IN ('shopper_pending', 'size_review', 'final_approval') 
    AND (stylist_id IS NULL OR stylist_id::text = current_setting('request.jwt.claim.sub', true))
  );

-- Users can insert their own sessions
CREATE POLICY "Users can create sessions"
  ON shopping_sessions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true));

-- Stylists can update sessions they're assigned to
CREATE POLICY "Stylists can update assigned sessions"
  ON shopping_sessions
  FOR UPDATE
  USING (
    stylist_id::text = current_setting('request.jwt.claim.sub', true)
    OR (stylist_id IS NULL AND status IN ('shopper_pending', 'size_review', 'final_approval'))
  );

-- RLS Policies for stylists
CREATE POLICY "Public can view active stylists"
  ON stylists
  FOR SELECT
  USING (status = 'active');

-- RLS Policies for stylist_reviews
CREATE POLICY "Users can view reviews"
  ON stylist_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews for their sessions"
  ON stylist_reviews
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_sessions 
      WHERE id = session_id 
      AND user_id = current_setting('request.jwt.claim.sub', true)
    )
  );

-- Enable Supabase Realtime for shopping_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_sessions;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shopping_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_sessions_updated_at
  BEFORE UPDATE ON shopping_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_sessions_updated_at();

-- Trigger function to notify next agent after human approval
CREATE OR REPLACE FUNCTION notify_agent_after_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to size_review, trigger Size Predictor
  IF NEW.status = 'size_review' AND OLD.status = 'shopper_approved' THEN
    PERFORM pg_notify('agent_size_predictor', json_build_object(
      'session_id', NEW.session_id,
      'user_id', NEW.user_id,
      'outfits', NEW.outfits
    )::text);
  END IF;
  
  -- When status changes to final_approval, trigger Returns Predictor
  IF NEW.status = 'final_approval' AND OLD.status = 'size_approved' THEN
    PERFORM pg_notify('agent_returns_predictor', json_build_object(
      'session_id', NEW.session_id,
      'user_id', NEW.user_id,
      'size_predictions', NEW.size_predictions
    )::text);
  END IF;
  
  -- When status changes to checkout_ready, notify frontend
  IF NEW.status = 'checkout_ready' AND OLD.status != 'checkout_ready' THEN
    PERFORM pg_notify('session_ready', json_build_object(
      'session_id', NEW.session_id,
      'user_id', NEW.user_id,
      'status', NEW.status
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_notification_trigger
  AFTER UPDATE ON shopping_sessions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_agent_after_approval();

-- Function to auto-assign stylist based on session characteristics
CREATE OR REPLACE FUNCTION auto_assign_stylist()
RETURNS TRIGGER AS $$
DECLARE
  assigned_stylist UUID;
  stylist_level VARCHAR(50);
  sla_minutes INTEGER;
BEGIN
  -- Only assign if status is pending and no stylist assigned
  IF NEW.status IN ('shopper_pending', 'size_review', 'final_approval') AND NEW.stylist_id IS NULL THEN
    -- Determine required stylist level based on tier and risk
    IF NEW.tier = 'vip' THEN
      stylist_level := 'senior';
      sla_minutes := 3;
    ELSIF NEW.tier = 'express' THEN
      stylist_level := 'junior';
      sla_minutes := 5;
    ELSIF NEW.size_confidence < 0.80 OR NEW.return_risk_score > 0.40 THEN
      stylist_level := 'senior';
      sla_minutes := 3;
    ELSE
      stylist_level := 'junior';
      sla_minutes := 5;
    END IF;
    
    -- Find available stylist
    SELECT id INTO assigned_stylist
    FROM stylists
    WHERE level = stylist_level
      AND status = 'active'
      AND (
        -- Prefer stylists with fewer active sessions
        SELECT COUNT(*) FROM shopping_sessions
        WHERE stylist_id = stylists.id
          AND status IN ('shopper_pending', 'size_review', 'final_approval')
          AND sla_deadline > NOW()
      ) < 5 -- Max 5 concurrent sessions
    ORDER BY 
      rating DESC,
      avg_response_time_seconds ASC NULLS LAST
    LIMIT 1;
    
    IF assigned_stylist IS NOT NULL THEN
      NEW.stylist_id := assigned_stylist;
      SELECT name INTO NEW.stylist_name FROM stylists WHERE id = assigned_stylist;
      NEW.stylist_level := stylist_level;
      NEW.assigned_at := NOW();
      NEW.sla_deadline := NOW() + (sla_minutes || ' minutes')::INTERVAL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_assign_stylist_trigger
  BEFORE INSERT OR UPDATE ON shopping_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_stylist();
