# Human-in-the-Loop (HITL) Orchestration Implementation Summary

## Overview

Successfully implemented a comprehensive Human-in-the-Loop (HITL) orchestration system that adds human approval gates at critical decision points in Style Shepherd's 4-agent pipeline. The system uses Supabase workflows to pause agents until stylist/expert validation, perfect for high-value purchases or uncertain predictions.

## Architecture

### Core Components

1. **Database Schema** (`supabase/migrations/20250101000000_add_shopping_sessions_hitl.sql`)
   - `shopping_sessions` table with status flow tracking
   - `stylists` table for stylist management
   - `stylist_reviews` table for rating system
   - Row Level Security (RLS) policies for access control
   - Database triggers for automated agent notifications
   - Auto-assignment logic based on tier and risk

2. **HITL Orchestrator** (`server/src/services/HITLOrchestrator.ts`)
   - Main orchestration service with pause/wait functionality
   - Integrates with Personal Shopper, Size Predictor, Returns Predictor agents
   - Polling mechanism with timeout handling
   - Confidence-based trigger points

3. **API Endpoints** (`server/src/routes/shopping-sessions.ts`)
   - `POST /api/shopping/start` - Start HITL shopping session
   - `GET /api/shopping/session/:sessionId` - Get session status
   - `POST /api/shopping/human-action` - Handle stylist approvals/rejections
   - `GET /api/shopping/stylist/queue` - Get pending sessions queue
   - `POST /api/shopping/stylist/claim` - Claim session for review

4. **Stylist Dashboard** (`src/pages/stylist/StylistDashboard.tsx`)
   - Real-time queue with live updates via Supabase Realtime
   - Session claiming and assignment
   - Approval/rejection interface
   - SLA tracking and deadline management

5. **User-Facing Components**
   - `HITLSessionStatus` component for status display
   - `useHITLSession` hook for session management
   - Real-time status updates via WebSocket subscriptions

## HITL Decision Gates

### Flow Diagram

```
User Request → Personal Shopper → [HITL: APPROVE OUTFIT?] 
             ↓ YES                          ↓ NO (refine)
Size Predictor → [HITL: SIZE CONFIDENCE <80%?] → Returns Predictor 
             ↓ HIGH RISK                   ↓
       [HITL: FINAL VALIDATION] → Checkout
```

### Trigger Points by Agent

| Agent | HITL Trigger | Human Action Options | Escalation |
|-------|-------------|---------------------|------------|
| Personal Shopper | Always (premium feature) | Approve / Refine style / New budget | Brand stylist |
| Size Predictor | Confidence <80% | Confirm size / Override / Body scan needed | Fit specialist |
| Returns Predictor | Risk >40% | Accept risk / Swap item / Remove | Returns analyst |
| Makeup Artist | Skin analysis uncertain | Shade approval / Selfie retake | Beauty expert |

## Status Flow

The system uses the following status progression:

1. `shopper_pending` - Waiting for stylist to approve outfits
2. `shopper_approved` - Outfits approved, moving to size prediction
3. `shopper_refined` - Outfits rejected, Personal Shopper re-running
4. `size_review` - Size confidence <80%, waiting for expert review
5. `size_approved` - Sizes confirmed, moving to returns prediction
6. `final_approval` - Return risk >40%, final validation needed
7. `checkout_ready` - All approvals complete, ready to shop
8. `completed` - Session successfully completed
9. `cancelled` - Session cancelled

## Key Features

### 1. Automatic Stylist Assignment

The database trigger automatically assigns stylists based on:
- **Tier**: VIP → Senior stylist (3min SLA), Express → Junior (5min SLA)
- **Risk Level**: High confidence issues → Senior stylist
- **Availability**: Load balancing across active stylists
- **Rating**: Prefers higher-rated stylists

### 2. Real-Time Updates

- Supabase Realtime subscriptions for instant status updates
- WebSocket broadcasts for status changes
- Frontend polling as fallback (2-3 second intervals)

### 3. SLA Management

- Automatic SLA deadline calculation based on stylist level
- Visual indicators for approaching deadlines
- Overdue alerts in stylist dashboard

### 4. Confidence-Based Triggers

- **Size Predictor**: Triggers HITL if confidence < 80%
- **Returns Predictor**: Triggers HITL if risk > 40%
- Configurable thresholds per tier

## Frontend Integration

### Stylist Dashboard

- Route: `/stylist/dashboard`
- Real-time queue of pending sessions
- Session detail modal with full context
- Action buttons (Approve/Reject/Override)
- My Sessions tab for assigned work

### User Experience

- Status component shows progress with icons and messages
- Real-time notifications for status changes
- Clear messaging: "Sarah approved 3 outfits for you! 🎉"
- Progress bar showing pipeline completion

## Monetization Model

The system supports three tiers:

1. **Premium** ($9.99): Stylist review + guaranteed fit
2. **Express** ($4.99): Junior stylist (2min SLA)
3. **VIP** ($29.99): Personal stylist + video consult

Revenue split: 30% stylist commission, 70% platform

## Business Impact

Expected outcomes:
- **22% reduction** in abandoned carts via human trust
- **15% price premium** justified by expert validation
- **50+ stylist jobs** created while maintaining AI scale
- Improved conversion rates for high-value purchases
- Reduced return rates through expert size validation

## Environment Setup

Required environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The system gracefully handles missing Supabase configuration with warnings.

## Database Migration

Run the migration to set up the schema:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via Supabase dashboard SQL editor
# File: supabase/migrations/20250101000000_add_shopping_sessions_hitl.sql
```

## API Usage Examples

### Start a Shopping Session

```typescript
POST /api/shopping/start
{
  "userId": "user_123",
  "query": "I need a business casual outfit for a conference",
  "budget": 500,
  "occasion": "conference",
  "tier": "premium"
}
```

### Get Session Status

```typescript
GET /api/shopping/session/{sessionId}
```

### Handle Human Action (Stylist)

```typescript
POST /api/shopping/human-action
{
  "sessionId": "session_123",
  "action": "approved",
  "stylistId": "stylist_456",
  "updates": {}
}
```

## Next Steps

1. **Stylist Onboarding**: Create signup flow and rating system
2. **Video Integration**: Add video call support for VIP tier
3. **Analytics Dashboard**: Track SLA compliance, conversion rates
4. **Escalation Rules**: Automated escalation for overdue sessions
5. **Multi-language Support**: International stylist pool

## Files Created/Modified

### New Files
- `supabase/migrations/20250101000000_add_shopping_sessions_hitl.sql`
- `server/src/services/HITLOrchestrator.ts`
- `server/src/routes/shopping-sessions.ts`
- `src/pages/stylist/StylistDashboard.tsx`
- `src/components/shopping/HITLSessionStatus.tsx`
- `src/hooks/useHITLSession.ts`

### Modified Files
- `server/src/index.ts` - Added shopping-sessions route
- `src/config/routes.tsx` - Added stylist dashboard route

## Testing

To test the HITL flow:

1. Start a shopping session via API
2. Open Stylist Dashboard in another browser/incognito
3. Claim the session
4. Approve/reject to see pipeline progression
5. Check user-facing status component for real-time updates

## Security

- Row Level Security (RLS) policies ensure:
  - Users can only see their own sessions
  - Stylists can only see pending/assigned sessions
  - Service role key used for backend operations
- Session validation at all endpoints
- Stylist authentication required for actions
