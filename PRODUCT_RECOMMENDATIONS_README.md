# Product Recommendations - Hybrid Recommender System

This document describes the enhanced hybrid product recommendation system that combines embeddings-based semantic search with business rules and collaborative filtering.

## Overview

The hybrid recommender system provides:
- **Semantic Relevance**: Uses OpenAI embeddings for RAG-style semantic matching
- **Business Rules**: Size fit bonuses, return-risk penalties, recency boosts
- **Collaborative Signals**: User interaction history and popularity scores
- **Explainability**: Detailed score breakdowns and reasoning for each recommendation
- **Metrics & A/B Testing**: Comprehensive interaction logging for analytics

## Architecture

### Components

1. **Embeddings Service** (`server/src/lib/embeddings.ts`)
   - Generates text embeddings using OpenAI API
   - Caches embeddings in Valkey (Redis) for performance
   - Provides cosine similarity calculations

2. **Hybrid Recommender** (`server/src/services/ProductRecommendationAPI.ts`)
   - `getHybridRecommendations()`: Main hybrid recommendation method
   - Combines semantic similarity with business rules
   - Applies diversity filtering to avoid brand repeats

3. **Database Schema** (`server/src/db/migrations/add_embeddings_and_interactions.sql`)
   - Adds `embedding` column to `catalog` table (JSONB)
   - Adds `popularity` and `return_risk` columns
   - Creates `interactions` table for tracking user behavior

4. **Frontend Component** (`src/components/recommendations/RecommendationList.tsx`)
   - Search interface for natural language queries
   - Displays recommendations with explainability
   - Logs interactions for metrics

## Setup

### 1. Database Migration

Run the migration to add embeddings support:

```bash
psql -h $VULTR_POSTGRES_HOST -U $VULTR_POSTGRES_USER -d $VULTR_POSTGRES_DATABASE -f server/src/db/migrations/add_embeddings_and_interactions.sql
```

Or if using a migration tool, execute the SQL file.

### 2. Environment Variables

Add to your `.env` file:

```bash
# OpenAI for embeddings
OPENAI_API_KEY=sk-...

# Recommendation tuning (optional, defaults provided)
RECOMMEND_TOP_K=50
RECOMMEND_RETURN_PENALTY_WEIGHT=0.7
RECOMMEND_SIZE_BONUS=1.2
RECOMMEND_RECENCY_BOOST=1.1
```

### 3. API Endpoints

#### Get Hybrid Recommendations

```http
POST /api/recommendations
Content-Type: application/json

{
  "userPreferences": {
    "preferredSizes": ["M", "L"],
    "preferredBrands": ["Nike", "Adidas"]
  },
  "context": {
    "searchQuery": "red winter coat size M under $200",
    "category": "outerwear",
    "budget": 200
  },
  "userId": "user_123",
  "useHybrid": true
}
```

Response:
```json
{
  "recommendations": [
    {
      "productId": "prod_123",
      "score": 0.8542,
      "confidence": 0.89,
      "reasons": [
        "Strong semantic match (78% similarity)",
        "Matches your preferred size",
        "Low return risk"
      ],
      "returnRisk": 0.15,
      "explain": {
        "sim": 0.7823,
        "popularity": 0.65,
        "sizeBonus": 1.2,
        "riskPenalty": 0.895,
        "recency": 1.1
      }
    }
  ]
}
```

#### Log Interactions

```http
POST /api/interactions
Content-Type: application/json

{
  "userId": "user_123",
  "productId": "prod_123",
  "type": "click",
  "value": 1,
  "metadata": {
    "source": "recommendations",
    "position": 1
  }
}
```

## Scoring Algorithm

The hybrid score combines multiple factors:

```
final_score = (semantic_similarity × 0.7 + popularity × 0.3) 
              × size_bonus 
              × return_risk_penalty 
              × recency_boost
```

### Factors

1. **Semantic Similarity** (0-1): Cosine similarity between query and product embeddings
2. **Popularity** (0-1): Normalized popularity score from database
3. **Size Bonus** (1.0 or 1.2): Applied if product size matches user preferences
4. **Return Risk Penalty** (0.3-1.0): Penalty based on predicted return risk
5. **Recency Boost** (1.0-1.1): Boost for recently added products

### Diversity

The system applies post-processing to ensure brand diversity:
- First 5 items: No brand restrictions
- Remaining items: Deprioritize repeated brands (15% score reduction)

## Usage Examples

### Frontend Component

```tsx
import RecommendationList from '@/components/recommendations/RecommendationList';

function MyPage() {
  return (
    <RecommendationList
      initialQuery="red winter coat"
      category="outerwear"
      budgetCents={20000}
      userId="user_123"
      preferredSizes={["M", "L"]}
      preferredBrands={["Nike"]}
      onProductClick={(productId) => {
        // Navigate to product page
      }}
      onAddToCart={(productId) => {
        // Add to cart
      }}
    />
  );
}
```

### Backend Service

```typescript
import { productRecommendationAPI } from '@/server/src/services/ProductRecommendationAPI';

const recommendations = await productRecommendationAPI.getHybridRecommendations(
  "red winter coat size M under $200",
  {
    preferredSizes: ["M"],
    preferredBrands: ["Nike"]
  },
  {
    searchQuery: "red winter coat size M under $200",
    budget: 200
  },
  "user_123"
);
```

## Metrics & Analytics

The system logs all interactions to the `interactions` table:

- `recommendation_impression`: When a recommendation is shown
- `click`: User clicks on a recommendation
- `add_to_cart`: User adds to cart
- `purchase`: User purchases
- `return`: User returns the item

### Query Metrics

```sql
-- Click-through rate (CTR)
SELECT 
  COUNT(CASE WHEN type = 'click' THEN 1 END) * 100.0 / 
  COUNT(CASE WHEN type = 'recommendation_impression' THEN 1 END) as ctr
FROM interactions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Conversion rate
SELECT 
  COUNT(CASE WHEN type = 'purchase' THEN 1 END) * 100.0 / 
  COUNT(CASE WHEN type = 'recommendation_impression' THEN 1 END) as conversion_rate
FROM interactions
WHERE created_at > NOW() - INTERVAL '7 days';
```

## Performance Optimization

1. **Embedding Caching**: Query embeddings are cached in Valkey for 7 days
2. **Product Embeddings**: Stored in database, generated on-demand if missing
3. **Candidate Filtering**: Pre-filters by category, price, brand before scoring
4. **Batch Processing**: Can process multiple recommendations in parallel

## Future Improvements

1. **Vector Database**: Migrate to Pinecone/Weaviate for faster similarity search
2. **Learn-to-Rank**: Train ML model using interaction data
3. **Personalization**: User latent vectors from matrix factorization
4. **MMR Diversity**: Implement Maximal Marginal Relevance for better diversity
5. **Real-time Updates**: Update embeddings when products change

## Troubleshooting

### Embeddings not generating
- Check `OPENAI_API_KEY` is set correctly
- Verify API quota/rate limits
- Check network connectivity to OpenAI

### Low recommendation quality
- Tune weights in environment variables
- Check product embeddings are being generated
- Verify popularity scores are populated

### Performance issues
- Enable embedding caching (should be automatic)
- Reduce `RECOMMEND_TOP_K` if too many candidates
- Consider using vector database for large catalogs

## References

- OpenAI Embeddings API: https://platform.openai.com/docs/guides/embeddings
- Cosine Similarity: Standard vector similarity metric
- Hybrid Recommender Systems: Combines multiple recommendation strategies

