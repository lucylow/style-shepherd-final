# RAG Implementation Summary

This document summarizes the RAG (Retrieval-Augmented Generation) implementation for Style Shepherd's Fashioni assistant.

## Files Created

### Server-Side (TypeScript)

1. **`server/src/lib/promptTemplates.ts`**
   - Centralized persona system prompt
   - Few-shot examples for consistent responses
   - `buildPrompt()` function that combines persona, memories, examples, and user message

2. **`server/src/lib/normalize.ts`**
   - Utility functions for normalizing size, fabric, and color tokens
   - `extractMeasurements()` to parse height/weight from text

3. **`server/src/lib/fieldExtractor.ts`**
   - `extractStructuredFields()` to extract size, fabrics, and colors from assistant responses
   - Uses regex patterns and normalization functions

4. **`server/src/lib/ragClient.ts`**
   - Main RAG orchestration:
     - Searches Raindrop SmartMemory for relevant context
     - Builds prompt with memories
     - Calls Vultr LLM
     - Extracts structured fields from response
   - Exports `generateFashioniResponse()` function

5. **`server/src/lib/evalHarness.ts`**
   - Evaluation harness for automated quality checks
   - `evaluateSamples()` function to test model outputs against expected results
   - Computes quality scores based on checks

### API Routes

6. **`server/src/routes/api.ts`** (updated)
   - Added `POST /api/fashioni/respond` endpoint
   - Added `POST /api/eval/run` endpoint for evaluation

### Frontend

7. **`src/services/aiAssistant.ts`** (updated)
   - Added `getFashioniResponse()` function to call the new RAG endpoint
   - Returns structured response with `assistantText` and `fields` (size, fabrics, colors)

8. **`src/components/demo/FashioniRAGDemo.tsx`** (new)
   - Demo component showing RAG endpoint usage
   - Displays extracted fields as badges (size, fabric, color)
   - Shows response source (vultr/mock)

## How to Use

### Backend API

#### 1. Fashioni RAG Endpoint

```typescript
POST /api/fashioni/respond
Content-Type: application/json

{
  "userId": "demo_user",  // optional, defaults to 'demo_user'
  "message": "I'm 5'3\" and 135lbs, what size for a midi dress?",
  "model": "gpt-3.5-turbo"  // optional
}

Response:
{
  "success": true,
  "source": "vultr" | "mock",
  "assistantText": "Size: M (relaxed). Tip: Pair with ankle boots...",
  "fields": {
    "raw": "...",
    "size": "M",
    "fabrics": ["cotton"],
    "colors": ["black"]
  }
}
```

#### 2. Evaluation Endpoint

```typescript
POST /api/eval/run
Content-Type: application/json

{
  "model": "gpt-3.5-turbo"  // optional
}

Response:
{
  "success": true,
  "results": [
    {
      "id": "t1",
      "prompt": "...",
      "assistant": "...",
      "extracted": { "size": "M", "fabrics": [...], "colors": [...] },
      "checks": { "size": true, "fabric": true },
      "score": 1.0
    },
    ...
  ]
}
```

### Frontend Usage

#### Using the Service Function

```typescript
import { getFashioniResponse } from '@/services/aiAssistant';

const response = await getFashioniResponse(
  "I'm 5'3\" and 135lbs, what size for a midi dress?",
  "demo_user",  // userId
  "gpt-3.5-turbo"  // optional model
);

console.log(response.assistantText);
console.log(response.fields.size);      // "M"
console.log(response.fields.fabrics);    // ["cotton"]
console.log(response.fields.colors);     // ["black"]
```

#### Using the Demo Component

```tsx
import { FashioniRAGDemo } from '@/components/demo/FashioniRAGDemo';

// In your page/component:
<FashioniRAGDemo />
```

## Features

### 1. RAG (Retrieval-Augmented Generation)
- Automatically searches Raindrop SmartMemory for relevant user context
- Includes relevant memories in the prompt for personalized responses
- Falls back gracefully if Raindrop is unavailable (uses mock mode)

### 2. Prompt Templates
- Consistent persona system prompt
- Few-shot examples for better response quality
- Easy to tune and iterate

### 3. Structured Field Extraction
- Automatically extracts:
  - **Size**: S, M, L, XL, etc.
  - **Fabrics**: cotton, linen, silk, etc.
  - **Colors**: black, white, red, etc.
- Normalizes variations (e.g., "small" → "S", "grey" → "gray")

### 4. Evaluation Harness
- Run automated quality checks before judge review
- Test against expected outputs
- Compute quality scores

### 5. Demo-Friendly
- Works without API keys (uses mocks)
- Safe for Lovable deployment
- Graceful fallbacks at every layer

## Integration Points

The implementation integrates with existing infrastructure:

- **Vultr Client**: Uses `server/src/lib/vultrClient.ts` (already has mock fallback)
- **Raindrop Client**: Uses `server/src/lib/raindropClient.ts` (already has mock fallback)
- **API Base URL**: Uses `getApiBaseUrl()` from `src/lib/api-config.ts`

## Testing

### Quick Test (curl)

```bash
# Test Fashioni RAG endpoint
curl -X POST http://localhost:3001/api/fashioni/respond \
  -H "Content-Type: application/json" \
  -d '{"message": "I'\''m 5'\''3\" and 135lbs, what size for a midi dress?"}'

# Test evaluation harness
curl -X POST http://localhost:3001/api/eval/run \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Frontend Testing

1. Navigate to a page that includes `<FashioniRAGDemo />`
2. Try example prompts:
   - "I'm 5'3\" and 135lbs, looking at a black midi dress — what size?"
   - "Want a fitted summer linen dress, I'm usually a size S."
   - "Show recommendations for a midi dress for 5'8 and 160 lbs"

## Next Steps

1. **Tune Prompt Templates**: Adjust `promptTemplates.ts` based on judge feedback
2. **Expand Evaluation**: Add more test cases to `evalHarness.ts`
3. **UI Integration**: Use `getFashioniResponse()` in your main chat interface
4. **Memory Storage**: Automatically store user preferences after conversations
5. **Caching**: Add response caching for common queries

## Notes

- All code is TypeScript (matching the codebase style)
- All endpoints use existing validation middleware
- Mock fallbacks ensure demo-friendly behavior
- Field extraction uses heuristics (can be improved with LLM-based extraction if needed)

