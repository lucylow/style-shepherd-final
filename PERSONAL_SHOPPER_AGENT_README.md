# Personal Shopper AI Agent Implementation

## Overview

The Personal Shopper AI Agent enhances Style Shepherd by curating complete outfit bundles based on user profiles, budget, and style preferences. It analyzes user inputs from style quizzes, past purchases (Stripe), and body measurements to generate 3-5 personalized outfit bundles.

## ✅ Implementation Status

All core functionality has been implemented:

### Backend Components

1. **PersonalShopperAgent** (`server/src/services/agents/PersonalShopperAgent.ts`)
   - ✅ Profile extraction from user data
   - ✅ Outfit bundle generation logic
   - ✅ Product matching with sponsor data
   - ✅ Size recommendations
   - ✅ Budget filtering
   - ✅ Color complementarity validation
   - ✅ Occasion appropriateness scoring

2. **API Route** (`/api/agents/personal-shopper`)
   - ✅ POST endpoint for outfit curation
   - ✅ Request validation with Zod
   - ✅ Error handling

3. **Agent Registration** (`server/src/services/agents/index.ts`)
   - ✅ Exported for use in orchestration

### Frontend Components

1. **PersonalShopper Component** (`src/components/shopping/PersonalShopper.tsx`)
   - ✅ Query form (occasion, budget, style, measurements)
   - ✅ Outfit bundle display
   - ✅ Add to cart functionality
   - ✅ Product images and details
   - ✅ Confidence scores

2. **TypeScript Types** (`src/types/personal-shopper.ts`)
   - ✅ OutfitBundle interface
   - ✅ OutfitQuery interface
   - ✅ BodyMeasurements interface
   - ✅ Product types

### Testing

1. **Test Script** (`scripts/test-shopper.ts`)
   - ✅ Multiple test scenarios
   - ✅ Performance timing
   - ✅ Output validation

## Architecture

### Agent Structure

```
PersonalShopperAgent
├── extractProfile()         # Analyzes user style quiz, purchases, measurements
├── fetchSponsorProducts()   # Loads products from sponsor-mock-data.md + Supabase
├── buildOutfits()           # Creates outfit bundles with complementary items
├── validateBundles()        # Validates color/occasion matches
└── recommendSize()          # Size recommendations (can integrate with Size Oracle)
```

### Data Flow

1. **Input**: User query with style, budget, occasion, measurements
2. **Profile Extraction**: 
   - Loads from Raindrop SmartMemory (user preferences)
   - Fetches past purchases from Vultr PostgreSQL
   - Analyzes style query for preference inference
3. **Product Matching**:
   - Loads products from Supabase catalog or mock data
   - Filters by 75%+ profile match score
   - Scores by color, brand, price, style preferences
4. **Bundle Generation**:
   - Selects products across categories (tops, bottoms, shoes, outerwear)
   - Ensures budget compliance
   - Validates color complementarity
   - Scores occasion appropriateness
5. **Output**: 3-5 outfit bundles with products, sizes, prices, confidence scores

## API Usage

### Endpoint

```http
POST /api/agents/personal-shopper
Content-Type: application/json
```

### Request Body

```typescript
{
  style?: string;              // e.g., "business casual", "minimalist"
  budget: number;              // Required, must be positive
  occasion: string;            // Required: "work", "wedding", "date", "beach", etc.
  measurements?: {             // Optional body measurements
    height?: number;           // cm
    weight?: number;           // kg
    chest?: number;            // cm
    waist?: number;            // cm
    hips?: number;             // cm
    shoeSize?: string;
  };
  userId?: string;             // Optional, for profile loading
  preferredColors?: string[];  // Optional color preferences
  excludeCategories?: string[]; // Optional category exclusions
}
```

### Response

```typescript
{
  outfits: OutfitBundle[];
  count: number;
  query: OutfitQuery;
}
```

### Example Request

```bash
curl -X POST http://localhost:3001/api/agents/personal-shopper \
  -H "Content-Type: application/json" \
  -d '{
    "style": "business casual",
    "budget": 500,
    "occasion": "work",
    "userId": "user_123",
    "preferredColors": ["navy", "black", "white"],
    "measurements": {
      "height": 170,
      "chest": 95,
      "waist": 80
    }
  }'
```

## Frontend Integration

### Basic Usage

```tsx
import { PersonalShopper } from '@/components/shopping/PersonalShopper';

function ShoppingPage() {
  const handleAddToCart = (productId: string, size?: string) => {
    // Add product to cart
    console.log('Adding product:', productId, size);
  };

  return (
    <PersonalShopper
      userId="user_123"
      onAddToCart={handleAddToCart}
    />
  );
}
```

### Features

- **Query Form**: Occasion selection, budget slider, style input, optional measurements
- **Outfit Display**: Cards showing bundle products, prices, sizes, confidence scores
- **Add to Cart**: One-click add entire bundle or individual items
- **Responsive Design**: Works on mobile and desktop

## Integration Points

### 1. Profile Data Sources

- **Raindrop SmartMemory**: User preferences (colors, brands, styles)
- **Vultr PostgreSQL**: Past purchases, order history
- **Request Body**: Real-time style quiz, measurements

### 2. Product Data Sources

- **Supabase Catalog**: Primary source (`catalog` table)
- **Mock Data**: Fallback (`mocks/products.json`)
- **Sponsor Data**: Reference (`sponsor-mock-data.md`)

### 3. Agent Coordination

The Personal Shopper Agent can integrate with:

- **Size Oracle Agent**: For accurate size recommendations (currently uses simple logic)
- **Returns Prophet Agent**: For return risk prediction on bundles
- **Search Agent**: For product discovery

### Future Enhancements

1. **Direct Agent Integration**:
   ```typescript
   // Use Size Oracle Agent
   const sizeResult = await multiAgentOrchestrator.invokeSizeOracle(
     userId,
     product.brand,
     product.category
   );
   
   // Use Returns Prophet Agent
   const returnRisk = await returnsAgent.predict(userId, product, size);
   ```

2. **Stripe Checkout Links**: Generate checkout URLs for complete outfit bundles

3. **Collaborative Filtering**: Enhanced product ranking using user similarity

4. **LLM Integration**: More sophisticated style preference extraction from natural language

## Testing

### Run Test Script

```bash
bun run scripts/test-shopper.ts
```

### Manual Testing

1. Start the server: `npm run dev`
2. Navigate to Personal Shopper component in frontend
3. Fill out query form
4. Click "Get Outfit Recommendations"
5. Review generated bundles

### Test Scenarios

- ✅ Business casual work outfits
- ✅ Beach vacation bundles
- ✅ Formal wedding attire
- ✅ Budget-constrained options
- ✅ Style preference matching

## Performance

- **Profile Extraction**: ~50-100ms (cached for 10 minutes)
- **Product Loading**: ~100-200ms (database query)
- **Bundle Generation**: ~200-500ms (depends on product count)
- **Total End-to-End**: ~500-1000ms typical response time

## Configuration

### Cache TTL

```typescript
private readonly CACHE_TTL = 600; // 10 minutes
```

### Bundle Limits

```typescript
private readonly MIN_BUNDLE_COUNT = 3;
private readonly MAX_BUNDLE_COUNT = 5;
```

### Profile Match Threshold

```typescript
private readonly MIN_PROFILE_MATCH = 0.75; // 75% similarity
```

## Dependencies

- No additional npm packages required (uses existing codebase dependencies)
- Uses existing services:
  - `raindrop-config` for user memory
  - `vultr-postgres` for database
  - `vultr-valkey` for caching

## Future Work

1. ✅ Basic implementation (Complete)
2. ⏳ Integration with Size Oracle Agent (Enhancement)
3. ⏳ Integration with Returns Prophet Agent (Enhancement)
4. ⏳ Stripe checkout URL generation (Enhancement)
5. ⏳ Advanced LLM-based style analysis (Enhancement)
6. ⏳ Visual outfit preview (Enhancement)
7. ⏳ Save favorite outfits (Enhancement)

## Notes

- The agent currently uses simple size recommendation logic. To use the Size Oracle Agent, call `multiAgentOrchestrator.invokeSizeOracle()` in the `recommendSize()` method.
- Product matching uses cosine similarity on style vectors conceptually, but currently uses rule-based scoring. Can be enhanced with actual embeddings using `@xenova/transformers`.
- Sponsor data integration is ready but currently loads from database/mock data. Can be enhanced to fetch from live sponsor APIs.

---

**Status**: ✅ Core implementation complete and ready for use
**Last Updated**: 2025-01-XX
