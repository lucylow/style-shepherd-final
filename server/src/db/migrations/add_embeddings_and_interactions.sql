-- Migration: Add embeddings and interactions support for hybrid recommender
-- Run this migration to add vector embeddings and interaction tracking

-- Add embedding column to catalog table (stored as JSONB array of floats)
ALTER TABLE catalog 
ADD COLUMN IF NOT EXISTS embedding JSONB,
ADD COLUMN IF NOT EXISTS popularity DECIMAL(5, 4) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS return_risk DECIMAL(3, 2) DEFAULT 0.25;

-- Create index for embedding similarity search (using GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_catalog_embedding ON catalog USING GIN (embedding);

-- Create interactions table for tracking user-product interactions
CREATE TABLE IF NOT EXISTS interactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),
  product_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('view', 'click', 'add_to_cart', 'purchase', 'return', 'recommendation_impression')),
  value INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for interactions table
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_product_id ON interactions(product_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_user_product ON interactions(user_id, product_id);

-- Add comment for documentation
COMMENT ON COLUMN catalog.embedding IS 'Vector embedding for semantic search (stored as JSONB array)';
COMMENT ON COLUMN catalog.popularity IS 'Normalized popularity score (0-1)';
COMMENT ON COLUMN catalog.return_risk IS 'Precomputed return risk probability (0-1)';
COMMENT ON TABLE interactions IS 'Tracks user-product interactions for collaborative filtering and metrics';
