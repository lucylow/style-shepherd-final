-- Multi-Agent Workflow Tables
-- Creates tables for orchestrating Style Shepherd's 4 specialized agents

-- Core workflow state table
CREATE TABLE IF NOT EXISTS shopping_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'agents_complete', 'aggregated', 'delivered', 'error', 'cancelled')),
  current_stage text,
  user_intent jsonb,
  agent_results jsonb DEFAULT '[]'::jsonb,
  final_result jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Agent communication bus
CREATE TABLE IF NOT EXISTS agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES shopping_workflows(id) ON DELETE CASCADE,
  agent_type text NOT NULL CHECK (agent_type IN ('personal-shopper', 'makeup-artist', 'size-predictor', 'returns-predictor', 'aggregator')),
  message_type text NOT NULL CHECK (message_type IN ('input', 'output', 'error', 'status')),
  payload jsonb NOT NULL,
  timestamp timestamptz DEFAULT now(),
  retry_count integer DEFAULT 0
);

-- Workflow analytics table
CREATE TABLE IF NOT EXISTS workflow_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES shopping_workflows(id) ON DELETE CASCADE,
  agent_type text,
  duration_ms integer,
  success boolean,
  error_type text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON shopping_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON shopping_workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON shopping_workflows(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_messages_workflow_id ON agent_messages(workflow_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_agent_type ON agent_messages(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_messages_timestamp ON agent_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_workflow_id ON workflow_analytics(workflow_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON shopping_workflows
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to trigger size predictor when shopper completes
CREATE OR REPLACE FUNCTION trigger_size_predictor()
RETURNS TRIGGER AS $$
DECLARE
  workflow_status text;
BEGIN
  -- Only trigger if this is an output message from personal-shopper
  IF NEW.message_type = 'output' AND NEW.agent_type = 'personal-shopper' THEN
    -- Check workflow status
    SELECT status INTO workflow_status
    FROM shopping_workflows
    WHERE id = NEW.workflow_id;
    
    -- Only trigger if workflow is still running
    IF workflow_status = 'running' THEN
      -- Insert a status message to trigger size predictor
      INSERT INTO agent_messages (workflow_id, agent_type, message_type, payload)
      VALUES (
        NEW.workflow_id,
        'size-predictor',
        'input',
        jsonb_build_object(
          'triggered_by', 'personal-shopper',
          'workflow_id', NEW.workflow_id,
          'shopper_results', NEW.payload
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on agent_messages for size predictor
CREATE TRIGGER shopper_complete_trigger
AFTER INSERT ON agent_messages
FOR EACH ROW
WHEN (NEW.message_type = 'output' AND NEW.agent_type = 'personal-shopper')
EXECUTE FUNCTION trigger_size_predictor();

-- Function to trigger returns predictor when size predictor completes
CREATE OR REPLACE FUNCTION trigger_returns_predictor()
RETURNS TRIGGER AS $$
DECLARE
  workflow_status text;
BEGIN
  IF NEW.message_type = 'output' AND NEW.agent_type = 'size-predictor' THEN
    SELECT status INTO workflow_status
    FROM shopping_workflows
    WHERE id = NEW.workflow_id;
    
    IF workflow_status = 'running' THEN
      INSERT INTO agent_messages (workflow_id, agent_type, message_type, payload)
      VALUES (
        NEW.workflow_id,
        'returns-predictor',
        'input',
        jsonb_build_object(
          'triggered_by', 'size-predictor',
          'workflow_id', NEW.workflow_id,
          'size_results', NEW.payload
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on agent_messages for returns predictor
CREATE TRIGGER size_complete_trigger
AFTER INSERT ON agent_messages
FOR EACH ROW
WHEN (NEW.message_type = 'output' AND NEW.agent_type = 'size-predictor')
EXECUTE FUNCTION trigger_returns_predictor();

-- Function to check if all agents are complete and trigger aggregator
CREATE OR REPLACE FUNCTION check_agents_complete()
RETURNS TRIGGER AS $$
DECLARE
  workflow_status text;
  shopper_complete boolean;
  size_complete boolean;
  returns_complete boolean;
  makeup_complete boolean;
BEGIN
  IF NEW.message_type = 'output' THEN
    SELECT status INTO workflow_status
    FROM shopping_workflows
    WHERE id = NEW.workflow_id;
    
    IF workflow_status = 'running' THEN
      -- Check which agents have completed
      SELECT 
        EXISTS(SELECT 1 FROM agent_messages WHERE workflow_id = NEW.workflow_id AND agent_type = 'personal-shopper' AND message_type = 'output'),
        EXISTS(SELECT 1 FROM agent_messages WHERE workflow_id = NEW.workflow_id AND agent_type = 'size-predictor' AND message_type = 'output'),
        EXISTS(SELECT 1 FROM agent_messages WHERE workflow_id = NEW.workflow_id AND agent_type = 'returns-predictor' AND message_type = 'output'),
        EXISTS(SELECT 1 FROM agent_messages WHERE workflow_id = NEW.workflow_id AND agent_type = 'makeup-artist' AND message_type = 'output')
      INTO shopper_complete, size_complete, returns_complete, makeup_complete;
      
      -- Check if required agents are complete (shopper, size, returns are required; makeup is optional)
      IF shopper_complete AND size_complete AND returns_complete THEN
        -- Update workflow status
        UPDATE shopping_workflows
        SET status = 'agents_complete',
            current_stage = 'aggregation'
        WHERE id = NEW.workflow_id;
        
        -- Trigger aggregator
        INSERT INTO agent_messages (workflow_id, agent_type, message_type, payload)
        VALUES (
          NEW.workflow_id,
          'aggregator',
          'input',
          jsonb_build_object(
            'triggered_by', 'workflow_complete',
            'workflow_id', NEW.workflow_id
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check agent completion
CREATE TRIGGER check_agents_complete_trigger
AFTER INSERT ON agent_messages
FOR EACH ROW
WHEN (NEW.message_type = 'output')
EXECUTE FUNCTION check_agents_complete();

-- Enable Row Level Security (RLS)
ALTER TABLE shopping_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own workflows
CREATE POLICY "Users can view their own workflows"
ON shopping_workflows FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
ON shopping_workflows FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
ON shopping_workflows FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for agent_messages
CREATE POLICY "Users can view messages for their workflows"
ON agent_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shopping_workflows
    WHERE shopping_workflows.id = agent_messages.workflow_id
    AND shopping_workflows.user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert agent messages"
ON agent_messages FOR INSERT
WITH CHECK (true); -- Service role can insert

-- RLS Policies for workflow_analytics
CREATE POLICY "Users can view analytics for their workflows"
ON workflow_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shopping_workflows
    WHERE shopping_workflows.id = workflow_analytics.workflow_id
    AND shopping_workflows.user_id = auth.uid()
  )
);
