# Learn-to-Rank Quick Start Guide

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
# Node.js dependencies (from repo root)
npm install pg dotenv

# Python dependencies
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r trainer/requirements.txt
```

### 2. Configure Environment

Add to `.env.local`:

```bash
OPENAI_API_KEY=sk-...
VULTR_POSTGRES_HOST=your-host
VULTR_POSTGRES_DATABASE=your-db
VULTR_POSTGRES_USER=your-user
VULTR_POSTGRES_PASSWORD=your-password
VULTR_POSTGRES_SSL=true
```

### 3. Run the Pipeline

```bash
# Step 1: Compute product embeddings (if needed)
node scripts/compute_product_embeddings.js

# Step 2: Export training data
node scripts/export_training_data.js

# Step 3: Train the model
python trainer/train_ranker.py
```

That's it! The trained model will be saved to `models/ranker.joblib`.

## Optional: Vector DB Migration

If you want to use Pinecone or Weaviate for fast semantic search:

```bash
# Install optional dependencies
npm install @pinecone-database/pinecone  # or weaviate-client

# Add to .env.local
PINECONE_API_KEY=xxx
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=style-shepherd-products

# Run migration
node scripts/migrate_embeddings_to_pinecone.js
```

## Next Steps

See `LEARN_TO_RANK_README.md` for:
- Detailed documentation
- Production integration guide
- Advanced features (group-based LTR)
- Troubleshooting
