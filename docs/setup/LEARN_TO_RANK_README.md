# Learn-to-Rank System for Style Shepherd

This directory contains scripts and tools to implement a learn-to-rank model for product recommendations using embeddings, vector databases, and LightGBM.

## Overview

The system consists of:
1. **Product Embedding Generation**: Compute and persist embeddings for products
2. **Vector DB Migration**: Migrate embeddings to Pinecone or Weaviate (optional)
3. **Training Data Export**: Export labeled training data from user interactions
4. **Model Training**: Train a LightGBM classifier to predict purchase probability

## Prerequisites

### Node.js Dependencies

Install required packages:

```bash
# From repo root
npm install pg dotenv

# For Pinecone (optional)
npm install @pinecone-database/pinecone

# For Weaviate (optional)
npm install weaviate-client
```

### Python Dependencies

Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install numpy pandas scikit-learn lightgbm joblib
```

### Environment Variables

Add these to `.env.local`:

```bash
# OpenAI / embeddings
OPENAI_API_KEY=sk-...

# Database (PostgreSQL)
VULTR_POSTGRES_HOST=your-host
VULTR_POSTGRES_PORT=5432
VULTR_POSTGRES_DATABASE=your-db
VULTR_POSTGRES_USER=your-user
VULTR_POSTGRES_PASSWORD=your-password
VULTR_POSTGRES_SSL=true

# Pinecone (optional)
PINECONE_API_KEY=xxxx
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=style-shepherd-products

# Weaviate (optional)
WEAVIATE_URL=https://your-weaviate.instance
WEAVIATE_API_KEY=xxxx
```

## Step-by-Step Instructions

### Step 1: Ensure Product Embeddings Exist

If your products don't have embeddings yet, run:

```bash
node scripts/compute_product_embeddings.js
```

This script:
- Finds products without embeddings
- Generates embeddings using OpenAI API
- Persists them to the `catalog.embedding` column

### Step 2: (Optional) Migrate to Vector DB

#### Option A: Pinecone

```bash
node scripts/migrate_embeddings_to_pinecone.js
```

**Note**: Create the Pinecone index first in your Pinecone console with dimension 1536 (for `text-embedding-3-small`).

#### Option B: Weaviate

```bash
node scripts/migrate_embeddings_to_weaviate.js
```

The script will create the schema automatically if it doesn't exist.

### Step 3: Export Training Data

Export labeled training data from your interactions:

```bash
node scripts/export_training_data.js
```

This script:
- Scans `interactions` table for recommendation impressions
- Computes labels (purchase within 7 days = 1, else 0)
- Computes features:
  - `sim`: Cosine similarity between query and product embeddings
  - `sizeMatch`: Whether user size matches product sizes
  - `returnRisk`: Product return risk score
  - `popularity`: Product popularity score
  - `recencyDays`: Days since product creation
  - `priceNorm`: Normalized price
- Writes `training_data.csv`

**Important**: Make sure your recommendation system logs impressions to the `interactions` table with:
- `type = 'recommendation_impression'` or `'view'`
- `metadata` JSONB containing `query` or `searchQuery` field

### Step 4: Train the Model

Train the LightGBM model:

```bash
python trainer/train_ranker.py
```

This will:
- Load `training_data.csv`
- Train a binary classifier
- Evaluate on test set (AUC-ROC, Average Precision)
- Save model to `models/ranker.joblib`
- Print feature importance

## Using the Model in Production

### Load and Use in Node.js

```javascript
const joblib = require('python-shell').PythonShell; // or use a Python bridge
// Or better: expose via API endpoint that loads the model

// Compute features for a product
const features = {
  sim: cosineSimilarity(queryEmbedding, productEmbedding),
  sizeMatch: userSizeMatches ? 1 : 0,
  returnRisk: product.return_risk,
  popularity: product.popularity,
  recencyDays: (Date.now() - product.created_at) / (1000 * 3600 * 24),
  priceNorm: product.price / 10000
};

// Predict purchase probability
const score = model.predict_proba([features])[0][1];
```

### Integration with Recommendation API

Update `server/src/services/ProductRecommendationAPI.ts` to:
1. Load the trained model (or expose via API endpoint)
2. Compute features for candidate products
3. Use model predictions as ranking scores
4. Combine with semantic similarity for hybrid ranking

## File Structure

```
.
├── lib/
│   └── embeddings.js                    # Embedding utilities
├── scripts/
│   ├── compute_product_embeddings.js   # Generate product embeddings
│   ├── migrate_embeddings_to_pinecone.js # Pinecone migration
│   ├── migrate_embeddings_to_weaviate.js # Weaviate migration
│   └── export_training_data.js          # Export training data
├── trainer/
│   └── train_ranker.py                 # Train LightGBM model
├── models/
│   └── ranker.joblib                   # Trained model (generated)
└── training_data.csv                    # Training data (generated)
```

## Database Schema Requirements

Ensure your database has:

1. **catalog table** with:
   - `embedding` JSONB column (for product embeddings)
   - `return_risk` DECIMAL(3,2) (0-1)
   - `popularity` DECIMAL(5,4) (0-1)
   - `sizes` JSONB array
   - `price` DECIMAL(10,2)
   - `created_at` TIMESTAMP

2. **interactions table** with:
   - `user_id` VARCHAR(255)
   - `product_id` VARCHAR(255)
   - `type` VARCHAR(50) (includes 'recommendation_impression', 'view', 'purchase', 'add_to_cart')
   - `metadata` JSONB (should contain 'query' or 'searchQuery')
   - `created_at` TIMESTAMP

3. **user_profiles table** with:
   - `user_id` VARCHAR(255)
   - `body_measurements` JSONB (should contain 'size' or 'preferredSize')
   - `preferences` JSONB

Run the migration if needed:
```bash
psql -h $VULTR_POSTGRES_HOST -U $VULTR_POSTGRES_USER -d $VULTR_POSTGRES_DATABASE \
  -f server/src/db/migrations/add_embeddings_and_interactions.sql
```

## Advanced: Group-Based Learning-to-Rank

For true learning-to-rank with query grouping, modify `train_ranker.py`:

```python
# Group by query/user session
groups = df.groupby('queryId').size().values

train_data = lgb.Dataset(
    X_train, 
    label=y_train,
    group=groups_train  # Group sizes for each query
)

params = {
    'objective': 'lambdarank',  # or 'rank_xendcg'
    'metric': 'ndcg',
    # ... other params
}
```

This requires tracking `query_id` or `session_id` in your interactions.

## Troubleshooting

### No embeddings found
- Run `compute_product_embeddings.js` first
- Check that `OPENAI_API_KEY` is set correctly

### No training data exported
- Ensure interactions are being logged with `type = 'recommendation_impression'`
- Check that `metadata` contains query text
- Verify database connection settings

### Model performance is poor
- Check label distribution (may need more positive examples)
- Add more features (user history, time-of-day, etc.)
- Increase training data size
- Try different LightGBM parameters

### Vector DB migration fails
- Verify API keys and environment settings
- Check that index exists (Pinecone) or schema can be created (Weaviate)
- Ensure embedding dimension matches (1536 for text-embedding-3-small)

## Next Steps

1. **Feature Engineering**: Add more features (user lifetime value, time-of-day, device type, etc.)
2. **Incremental Training**: Set up daily pipelines to retrain on new data
3. **A/B Testing**: Compare model performance vs. baseline recommendations
4. **Monitoring**: Track offline metrics (AUC) and online metrics (CTR, conversion)
5. **Production Integration**: Expose model via API endpoint for real-time ranking

## Support

For issues or questions, refer to:
- [LightGBM Documentation](https://lightgbm.readthedocs.io/)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [Weaviate Documentation](https://weaviate.io/developers/weaviate)

