-- Autonomous Agent System Database Triggers
-- These triggers fire autonomous agents when specific events occur

-- Function to trigger personal shopper on calendar event
CREATE OR REPLACE FUNCTION trigger_personal_shopper()
RETURNS TRIGGER AS $$
BEGIN
  -- Call autonomous trigger function (would integrate with edge function)
  -- For now, just log the trigger
  INSERT INTO agent_trigger_log (
    user_id,
    agent_type,
    trigger_type,
    trigger_data,
    action,
    success,
    autonomy_level
  ) VALUES (
    NEW.user_id,
    'personalShopper',
    'calendar',
    jsonb_build_object('event_id', NEW.id, 'event_title', NEW.event_title),
    'calendar_triggered',
    true,
    2
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on calendar event insert
CREATE TRIGGER calendar_trigger
  AFTER INSERT ON calendar_event
  FOR EACH ROW
  EXECUTE FUNCTION trigger_personal_shopper();

-- Function to trigger size predictor retraining on return
CREATE OR REPLACE FUNCTION retrain_size_model()
RETURNS TRIGGER AS $$
BEGIN
  -- Log return learning event
  INSERT INTO return_learning_event (
    user_id,
    order_id,
    product_id,
    predicted_size,
    actual_fit,
    return_reason
  ) VALUES (
    NEW.user_id,
    NEW.order_id,
    NEW.product_id,
    COALESCE(NEW.predicted_size, 'unknown'),
    CASE 
      WHEN NEW.reason LIKE '%too small%' OR NEW.reason LIKE '%small%' THEN 'too_small'
      WHEN NEW.reason LIKE '%too large%' OR NEW.reason LIKE '%large%' THEN 'too_large'
      WHEN NEW.reason LIKE '%wrong%' OR NEW.reason LIKE '%style%' THEN 'wrong_style'
      ELSE 'perfect'
    END,
    NEW.reason
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger assumes a stripe_returns table exists
-- CREATE TRIGGER return_learning
--   AFTER INSERT ON stripe_returns
--   FOR EACH ROW
--   EXECUTE FUNCTION retrain_size_model();

-- Function to update agent memory when triggers fire
CREATE OR REPLACE FUNCTION update_agent_memory()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_triggered timestamp
  INSERT INTO agent_memory (
    user_id,
    agent_type,
    last_triggered,
    context
  ) VALUES (
    NEW.user_id,
    NEW.agent_type,
    NOW(),
    jsonb_build_object('last_action', NEW.action, 'trigger_type', NEW.trigger_type)
  )
  ON CONFLICT (user_id, agent_type)
  DO UPDATE SET
    last_triggered = NOW(),
    context = agent_memory.context || jsonb_build_object('last_action', NEW.action, 'trigger_type', NEW.trigger_type);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update agent memory on trigger log insert
CREATE TRIGGER agent_memory_update
  AFTER INSERT ON agent_trigger_log
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory();
