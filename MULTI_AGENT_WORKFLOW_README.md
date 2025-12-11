# Multi-Agent Workflow System

## Overview

The Multi-Agent Workflow orchestrates Style Shepherd's 4 specialized agents through an event-driven state machine with Supabase as the central workflow engine. This enables parallel execution, automatic retries, and real-time collaboration.

## Architecture

```
┌─────────────────┐    Supabase    ┌──────────────────┐
│   Frontend      │◄───Channels──►│  Workflow State   │
│   User Journey  │    RLS+Triggers│  Machine Engine   │
└─────────────────┘                └──────────────────┘
         │                                 │
         ▼                                 ▼
┌──────────────┐                 ┌──────────────┐
│  Intent LLM  │───────Routes───▶│ Orchestrator │
└──────────────┘                 └──────────────┘
         │                                 │
         ▼                                 ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │Personal     │ │Makeup       │ │Size         │ │Returns      │
    │Shopper      │ │Artist       │ │Predictor    │ │Predictor    │
    └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
         │              │              │              │
         └───────┬──────┼──────┬───────┼──────┬──────┘
                │       │       │       │
                └───────┼───────┼───────┘
                       │       │
                ┌───────▼───────▼───────┐
                │   AGGREGATOR Agent    │
                │  (Final Synthesis)    │
                └───────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Frontend    │
                    │  Results     │
                    └──────────────┘
```

## Components

### 1. Database Schema (Supabase)

**Tables:**
- `shopping_workflows` - Core workflow state
- `agent_messages` - Agent communication bus
- `workflow_analytics` - Performance monitoring

**Triggers:**
- `trigger_size_predictor()` - Auto-triggers when Personal Shopper completes
- `trigger_returns_predictor()` - Auto-triggers when Size Predictor completes
- `check_agents_complete()` - Auto-triggers Aggregator when all required agents complete

### 2. Workflow Engine (`server/src/services/agents/workflow-engine.ts`)

The `MultiAgentWorkflow` class orchestrates the complete workflow:

```typescript
const recommendation = await multiAgentWorkflow.execute({
  userId: 'user-123',
  budget: 500,
  occasion: 'wedding',
  style: 'elegant',
  preferences: {
    colors: ['black', 'navy'],
    brands: ['Zara', 'H&M'],
  },
  measurements: {
    height: 65,
    weight: 140,
    chest: 36,
    waist: 28,
  },
});
```

### 3. API Endpoints

- `POST /api/workflows/start` - Start a new workflow
- `GET /api/workflows/:workflowId` - Get workflow status and results
- `GET /api/workflows/:workflowId/status` - Get workflow status only
- `GET /api/workflows/:workflowId/messages` - Get agent messages
- `POST /api/workflows/:workflowId/cancel` - Cancel a workflow

### 4. Frontend Hook (`src/hooks/useWorkflowProgress.ts`)

Real-time workflow tracking:

```typescript
const { workflow, messages, progress, isLoading } = useWorkflowProgress(workflowId);

// Start a workflow
const { startWorkflow, isLoading } = useStartWorkflow();
const workflowId = await startWorkflow({
  userId: 'user-123',
  budget: 500,
  occasion: 'wedding',
});
```

## Execution Flow

### Stage 1: Discovery (Parallel)
- **Personal Shopper** - Recommends outfits
- **Makeup Artist** (optional) - Recommends makeup looks if selfie provided

### Stage 2: Validation (Sequential)
- **Size Predictor** - Predicts sizes for recommended products
  - Triggered automatically when Personal Shopper completes

### Stage 3: Risk Assessment (Sequential)
- **Returns Predictor** - Predicts return risk
  - Triggered automatically when Size Predictor completes

### Stage 4: Synthesis (Automatic)
- **Aggregator** - Combines all results into final recommendation
  - Triggered automatically when all required agents complete

## Workflow States

1. `pending` - Workflow created, not started
2. `running` - Agents executing
3. `agents_complete` - All agents finished, awaiting aggregation
4. `aggregated` - Final synthesis complete
5. `delivered` - Results delivered to frontend
6. `error` - Workflow failed
7. `cancelled` - Workflow cancelled by user

## Error Handling & Retries

- Agent failures are logged in `agent_messages` with `message_type='error'`
- Workflow retries up to `max_retries` (default: 3)
- Fallback chain: Returns Predictor → Size Predictor → Basic rules → Generic recommendations

## Real-time Updates

The frontend subscribes to Supabase real-time channels:

```typescript
// Automatically updates when workflow state changes
const channel = supabase
  .channel(`workflow-${workflowId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'shopping_workflows',
    filter: `id=eq.${workflowId}`,
  }, (payload) => {
    // Update UI with new workflow state
  })
  .subscribe();
```

## Performance Monitoring

Analytics are automatically recorded in `workflow_analytics`:

- `duration_ms` - Agent execution time
- `success` - Whether agent succeeded
- `error_type` - Error classification

## Setup

### 1. Database Migration

Run the Supabase migration:

```bash
supabase migration up
```

Or apply the SQL directly:

```bash
psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -f supabase/migrations/20250101000000_workflow_tables.sql
```

### 2. Environment Variables

Add to `.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Test Workflow

```bash
curl -X POST http://localhost:3001/api/workflows/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "budget": 500,
    "occasion": "wedding",
    "style": "elegant"
  }'
```

## Example Usage

### Frontend

```typescript
import { useStartWorkflow, useWorkflowProgress } from '@/hooks/useWorkflowProgress';

function ShoppingFlow() {
  const { startWorkflow, isLoading: isStarting } = useStartWorkflow();
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const { workflow, progress, messages } = useWorkflowProgress(workflowId);

  const handleStart = async () => {
    const id = await startWorkflow({
      userId: 'user-123',
      budget: 500,
      occasion: 'wedding',
      measurements: {
        height: 65,
        waist: 28,
      },
    });
    setWorkflowId(id);
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isStarting}>
        Start Shopping
      </button>
      
      {workflow && (
        <div>
          <p>Status: {workflow.status}</p>
          <p>Stage: {progress.stage}</p>
          <p>Progress: {progress.percentage}%</p>
          <p>Agents Complete: {progress.agentsComplete.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
```

## Benefits

1. **Parallel Execution** - Discovery agents run simultaneously
2. **Event-Driven** - Supabase triggers automatically chain agents
3. **Real-time Updates** - Frontend gets live progress via Supabase channels
4. **Observable** - Complete audit trail in database
5. **Self-Healing** - Automatic retries and fallbacks
6. **Scalable** - Horizontal scaling via Supabase

## Future Enhancements

- [ ] Human-in-loop escalation for high-risk items
- [ ] A/B testing different agent configurations
- [ ] Workflow templates for common scenarios
- [ ] Multi-user collaborative workflows
- [ ] Workflow versioning and rollback
