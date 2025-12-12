# Risk & Compliance System

This project includes a comprehensive risk/decision pipeline for autonomous actions in Style Shepherd.

## Architecture Overview

### Components

1. **Risk Scoring Engine** (`server/src/lib/riskScorer.ts`)
   - Computes a 0..1 risk score for actions
   - Considers: user history, product attributes, return predictions, brand trust, anomaly flags

2. **Policy Engine** (`server/src/lib/policyEngine.ts`)
   - Maps risk score + autonomy level → decision: `allow`, `require_approval`, or `deny`
   - Supports autonomy levels: `manual`, `hybrid`, `autonomous`

3. **Evidence Logger** (`server/src/lib/evidence.ts`)
   - Creates immutable evidence records with HMAC hashing
   - Persists to file system and optionally to Prisma database

4. **API Endpoints**
   - `POST /api/risk/assess` - Assess risk for an action
   - `POST /api/risk/approve` - Admin approval handler
   - `GET /api/audit/list` - List evidence/incidents (admin)

5. **Admin UI** (`/admin/risk`)
   - View risk incidents
   - Approve/reject actions
   - Review evidence and audit trail

## Environment Variables

Add these to your `.env` file:

```bash
# Risk & evidence
RISK_BASELINE_WEIGHT=1.0
RISK_VALUE_MULTIPLIER=0.0001
RISK_THRESHOLD_ALLOW=0.20        # risk <= allow => auto allow
RISK_THRESHOLD_APPROVAL=0.50     # risk <= approval => require approval otherwise deny
EVIDENCE_STORAGE_PATH=./data/evidence
EVIDENCE_SALT=replace_with_a_random_secret
ADMIN_TOKEN=replace_with_admin_token  # demo admin auth. Replace with real auth in prod

# Optional: ML model integration
RANKER_MODEL_PATH=./model_ranker.json
RANKER_ALPHA=0.5  # weight for combining original score with ML model (0.0 = only model, 1.0 = only original)
```

## Setup

### 1. Install Dependencies

The risk system uses existing dependencies. For ML training (optional), install Python dependencies:

```bash
pip install pandas scikit-learn sqlalchemy psycopg2-binary python-dotenv
```

### 2. Database Setup (Optional)

If using Prisma:

```bash
# Add Prisma if not already installed
npm install -D prisma
npm install @prisma/client

# Generate Prisma client
npx prisma generate

# Run migration
npx prisma migrate dev --name add_risk_evidence
```

### 3. Test the System

```bash
# Test risk scoring locally
npx tsx scripts/test-risk.ts
```

## Usage

### Integration Example: Protect Checkout Flow

```typescript
// In your checkout route handler
import fetch from 'node-fetch';

async function handleCheckout(req, res) {
  const { user, cart, products } = req.body;
  
  // Assess risk before creating payment
  const assessmentResp = await fetch(`${process.env.API_BASE_URL}/api/risk/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user,
      product: {
        sku: products[0].id,
        price: cart.totalAmount,
        brandTrustScore: 0.8,
      },
      action: {
        type: 'checkout',
        details: { amount: cart.totalAmount },
      },
      returnsPrediction: { probability: 0.12 },
      otherSignals: { anomalyFlags: [] },
      autonomy: 'hybrid',
    }),
  });
  
  const assessment = await assessmentResp.json();
  
  if (!assessment.success) {
    return res.status(500).json({ error: 'risk check failed' });
  }
  
  const { result } = assessment;
  
  if (result.decision === 'deny') {
    return res.status(403).json({
      error: 'Action denied by risk policy',
      reasons: result.reasons,
    });
  } else if (result.decision === 'require_approval') {
    return res.status(202).json({
      status: 'requires_approval',
      reasons: result.reasons,
      incident: assessment.evidence,
    });
  }
  
  // Allowed: proceed with checkout
  // ... create payment intent, etc.
}
```

## ML Model Training (Optional)

Train a learn-to-rank model to improve risk predictions:

```bash
# Set DATABASE_URL in .env
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Train model
python scripts/train_ranker.py --limit 2000 --output model_ranker.json
```

The model will be automatically loaded by `modelRankerLoader.ts` if `model_ranker.json` exists.

## Admin UI

Access the admin interface at `/admin/risk`:

1. View all risk incidents
2. See risk score breakdowns
3. Approve or deny actions requiring approval
4. Review evidence hashes and audit trail

**Note**: In production, replace the simple `ADMIN_TOKEN` header auth with proper role-based authentication (e.g., WorkOS SSO).

## Security & Operational Notes

1. **Auth**: Admin endpoints use `ADMIN_TOKEN` demo header. Replace with WorkOS SSO role-based admin check in production.

2. **Evidence Integrity**: Evidence is HMAC-hashed with `EVIDENCE_SALT`. Keep this secret and rotate periodically.

3. **Persistence**: For production, enable Prisma & persist incidents/evidence. File-backed fallback is fine for demo.

4. **Anchoring**: Once evidence is created, you can anchor hashes on-chain (Cambrian/Verisense) for public auditability.

5. **Data Minimization**: Evidence should avoid storing raw PII where possible; use user IDs / DIDs and minimal context. Consider storing encrypted payloads.

6. **Monitoring**: Export metrics: incident counts, approvals, denials, avg risk score, and rate of autonomous actions allowed. Hook to Prometheus/Grafana.

7. **Policy Tuning**: The thresholds in env vars are conservative defaults. Tune using observed data (learn-to-rank / historical interactions).

## Next Steps / Optional Enhancements

1. **Learn-to-rank & Offline Model**: Record approved/denied incidents and outcomes; train a small ranking model to predict approvals and tune threshold automatically.

2. **Fine-grained Policies**: Create JSON policy files per merchant, per product-category, or per geography.

3. **Approval Workflow**: Create Slack/Email notifications for `require_approval` incidents and an approval web UI with comments/audit trail.

4. **Role-based Access**: Integrate WorkOS SSO and only allow certain roles to approve.

5. **Model Serving**: Create a Flask microservice that serves model predictions instead of loading JSON files.

## Files Created

- `server/src/lib/riskScorer.ts` - Risk scoring engine
- `server/src/lib/policyEngine.ts` - Policy decision engine
- `server/src/lib/evidence.ts` - Evidence logging
- `server/src/lib/modelRankerLoader.ts` - ML model loader
- `server/src/routes/risk.ts` - Risk API routes
- `server/src/routes/audit.ts` - Audit API routes
- `src/pages/AdminRisk.tsx` - Admin UI component
- `prisma/schema.prisma` - Database schema (optional)
- `scripts/train_ranker.py` - Python ML trainer
- `scripts/test-risk.ts` - Test script

## Testing

```bash
# Test risk scoring
npx tsx scripts/test-risk.ts

# Test API endpoint (requires server running)
curl -X POST http://localhost:3001/api/risk/assess \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"id": "u1", "history": {"returnRate": 0.2}},
    "product": {"price": 18500, "brandTrustScore": 0.8},
    "action": {"type": "checkout"},
    "returnsPrediction": {"probability": 0.15},
    "autonomy": "hybrid"
  }'
```

