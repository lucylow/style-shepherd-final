# Fraud Prevention System

Complete fraud prevention implementation for Style Shepherd with deterministic rules, ML model support, and admin UI.

## Overview

This fraud prevention system provides:
- **Deterministic rule engine** for fast, auditable fraud detection
- **Optional ML model** for learned patterns from historical data
- **Real-time checks** at checkout and payment endpoints
- **Admin UI** for reviewing and managing incidents
- **Stripe integration** for chargeback tracking
- **Alerting** for high-risk incidents

## Setup

### 1. Database Migration

Run the SQL migration to create fraud tables:

```bash
psql -h $VULTR_POSTGRES_HOST -U $VULTR_POSTGRES_USER -d $VULTR_POSTGRES_DATABASE -f server/src/db/fraud_migration.sql
```

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Fraud Detection Thresholds
FRAUD_SCORE_THRESHOLD=0.65           # Score above this = deny
FRAUD_FLAG_THRESHOLD=0.45            # Score above this = manual_review
FRAUD_MODEL_PATH=./model_fraud.json  # Path to ML model (optional)
FRAUD_MODEL_ALPHA=0.5                # Weight for heuristic vs model (0-1)

# Optional: External Services
IPINFO_TOKEN=                         # For IP geolocation/proxy detection
EMAILREP_KEY=                         # For email reputation (not implemented)
BINLIST_KEY=                          # For BIN lookup (uses public API)

# Alerts
FRAUD_SMS_ALERT_NUMBER=+15555555555   # SMS alerts (not implemented)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...  # Slack webhook for alerts

# Admin
ADMIN_API_KEY=your-secret-admin-key   # For admin API protection
```

### 3. Install Python Dependencies (for training)

```bash
pip install scikit-learn pandas sqlalchemy joblib psycopg2-binary
```

## Usage

### Automatic Fraud Detection

Fraud checks run automatically on payment intent creation via middleware:

```typescript
// Already integrated in server/src/routes/api.ts
router.post('/payments/intent', fraudMiddleware, ...)
```

The middleware:
1. Extracts context (IP, email, billing/shipping, amount, etc.)
2. Runs fraud checks
3. Blocks high-risk transactions (score >= 0.65)
4. Flags medium-risk for review (score >= 0.45)
5. Allows low-risk transactions

### Manual Fraud Check

For autonomous actions or other scenarios:

```typescript
import { fraudCheckForAction } from './middleware/fraudMiddleware';

const result = await fraudCheckForAction({
  userId: 'user123',
  email: 'user@example.com',
  ip: '1.2.3.4',
  amount: 5000, // cents
  action: 'autonomous_payment',
  // ... other context
});

if (!result.allowed) {
  // Handle denied transaction
}
```

## Training ML Model

### 1. Collect Historical Data

The model trains from `fraud_incidents` table. You need at least 100+ incidents with some positive samples (deny/manual_review decisions).

### 2. Run Trainer

```bash
export DATABASE_URL="postgresql://user:pass@host/db"
export FRAUD_MODEL_OUT=./model_fraud.json
export FRAUD_MODEL_JOBLIB=./model_fraud.json.joblib
python train_fraud.py
```

### 3. Deploy Model

Copy the generated files to your server and set `FRAUD_MODEL_PATH` in environment.

### 4. Retrain Periodically

Set up a cron job or scheduled task to retrain weekly/monthly:

```bash
# Example cron (weekly on Sunday 2 AM)
0 2 * * 0 cd /path/to/project && python train_fraud.py
```

## Admin UI

### Access Admin Page

Navigate to `/admin/fraud` (or add route in your router):

```tsx
import FraudIncidents from '@/pages/admin/FraudIncidents';

// In your router
<Route path="/admin/fraud" element={<FraudIncidents />} />
```

### Admin API Endpoints

All admin endpoints require `x-admin-key` header (or implement proper auth):

- `GET /api/admin/fraud/incidents` - List incidents
- `GET /api/admin/fraud/incidents/:id` - Get specific incident
- `GET /api/admin/fraud/stats` - Get statistics
- `POST /api/admin/fraud/action` - Take action (mark_safe, block_user, etc.)

## Fraud Detection Rules

The system checks:

1. **Velocity** - Too many actions from same IP/user in short time
2. **Shipping/Billing Mismatch** - Different countries
3. **Email Risk** - Disposable/free email domains
4. **IP Risk** - Datacenter/proxy IPs (if IPInfo configured)
5. **Payment Pattern** - BIN country mismatch, high amounts
6. **User History** - Return rate, chargeback count

## Stripe Integration

The webhook handler automatically:
- Updates fraud incidents when disputes occur
- Increments chargeback count in user risk profiles
- Links payment intents to fraud incidents via metadata

## Alerting

High-risk incidents (score >= 0.9) trigger:
- Slack webhook notification (if configured)
- SMS alert (placeholder - integrate Twilio)

## Testing

### Unit Tests

```bash
cd server
npm test -- FraudDetector
```

### Manual Testing

1. Create a test payment with suspicious patterns:
   - High velocity (multiple requests quickly)
   - Shipping/billing mismatch
   - Disposable email
   - High amount

2. Check admin UI to see incident

3. Test actions (mark safe, block user)

## Monitoring

Key metrics to track:
- Incident rate (incidents per transaction)
- False positive rate (incidents marked safe)
- Average fraud score
- High-risk incident count
- Chargeback correlation

Query examples:

```sql
-- Incident rate (last 7 days)
SELECT 
  COUNT(DISTINCT fi.id) as incidents,
  COUNT(DISTINCT o.order_id) as orders,
  COUNT(DISTINCT fi.id)::float / NULLIF(COUNT(DISTINCT o.order_id), 0) as rate
FROM fraud_incidents fi
LEFT JOIN orders o ON o.user_id = fi.user_id
WHERE fi.created_at >= NOW() - INTERVAL '7 days';

-- False positive rate
SELECT 
  COUNT(*) FILTER (WHERE decision = 'allow' AND notes LIKE '%marked safe%') as false_positives,
  COUNT(*) as total_incidents,
  COUNT(*) FILTER (WHERE decision = 'allow' AND notes LIKE '%marked safe%')::float / NULLIF(COUNT(*), 0) as rate
FROM fraud_incidents
WHERE created_at >= NOW() - INTERVAL '30 days';
```

## Security Notes

1. **Admin Routes**: Protect with WorkOS SSO or similar. The current implementation uses a simple API key - upgrade for production.

2. **Privacy**: Never store full card numbers. Only BIN (first 6 digits) or last4.

3. **Rate Limiting**: Admin endpoints should have stricter rate limits.

4. **Audit Logging**: All admin actions are logged in incident notes.

## Troubleshooting

### Model not loading
- Check `FRAUD_MODEL_PATH` points to valid JSON
- Verify file permissions
- Check logs for parse errors

### Redis connection errors
- Velocity checks will default to safe scores if Redis unavailable
- Verify `VULTR_VALKEY_*` environment variables

### High false positive rate
- Lower `FRAUD_SCORE_THRESHOLD` and `FRAUD_FLAG_THRESHOLD`
- Review rule weights in `FraudDetector.ts`
- Retrain model with more data

### No incidents being created
- Check middleware is applied to payment routes
- Verify database connection
- Check logs for errors

## Next Steps

1. **Integrate EmailRep API** for better email reputation checks
2. **Add device fingerprinting** for better device tracking
3. **Implement SMS alerts** via Twilio
4. **Add more rules** based on your business patterns
5. **A/B test thresholds** to optimize false positive/negative balance
6. **Build manual review queue** UI for flagged transactions

## Support

For issues or questions, check:
- Server logs: `server/src/services/FraudDetector.ts`
- Admin UI: `src/pages/admin/FraudIncidents.tsx`
- API routes: `server/src/routes/admin.ts`
