# Style Shepherd Edge Functions

This directory contains Supabase Edge Functions for Style Shepherd, powered by Lovable AI Gateway.

## Overview

All edge functions use the Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) with the `google/gemini-2.5-flash` model for fast, cost-effective AI inference.

## Configuration

All functions require the `LOVABLE_API_KEY` environment variable to be set:

```bash
supabase secrets set LOVABLE_API_KEY=your_key
```

Or via the Supabase Dashboard → Settings → Edge Functions → Secrets.

## Available Functions

### Core AI Functions

#### 1. `fashion-assistant`
**Path**: `/functions/v1/fashion-assistant`  
**Method**: POST  
**Description**: General-purpose fashion assistant for chat-based interactions

**Request**:
```json
{
  "messages": [
    { "role": "user", "content": "What should I wear to a summer wedding?" }
  ]
}
```

**Response**: Streaming text response

---

#### 2. `style-recommendations`
**Path**: `/functions/v1/style-recommendations`  
**Method**: POST  
**Description**: Get personalized style recommendations with structured output

**Request**:
```json
{
  "userProfile": {
    "bodyType": "hourglass",
    "height": 170,
    "sizePreferences": "M"
  },
  "preferences": {
    "style": "minimalist",
    "budgetRange": "mid-range"
  },
  "context": {
    "occasion": "casual everyday"
  }
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "category": "tops",
      "items": ["white cotton t-shirt", "navy blazer"],
      "reasoning": "Matches your minimalist style preference"
    }
  ],
  "sizeGuidance": "Size M recommended based on your measurements",
  "styleNotes": "Pair with neutral accessories"
}
```

---

### Size & Fit Functions

#### 3. `size-prediction`
**Path**: `/functions/v1/size-prediction`  
**Method**: POST  
**Description**: Predict optimal size across brands with cross-brand normalization

**Request**:
```json
{
  "measurements": {
    "height": 170,
    "weight": 65,
    "chest": 38,
    "waist": 32,
    "hips": 36
  },
  "brand": "Zara",
  "category": "dress",
  "productId": "prod_123",
  "userId": "user_456"
}
```

**Response**:
```json
{
  "recommendedSize": "M",
  "confidence": 0.92,
  "confidencePercentage": 92,
  "reasoning": [
    "Based on your waist measurement (32\"), size M is recommended",
    "Zara typically runs small - consider sizing up"
  ],
  "fitConfidence": "92%",
  "alternativeSizes": ["S", "L"],
  "brandSizingNotes": "runs small - consider sizing up",
  "crossBrandNormalization": {
    "standardSize": "M",
    "brandAdjusted": true,
    "variance": "2.4%"
  },
  "warnings": []
}
```

---

#### 4. `size-comparison`
**Path**: `/functions/v1/size-comparison`  
**Method**: POST  
**Description**: Compare sizes across multiple brands with variance analysis

**Request**:
```json
{
  "brands": ["Zara", "H&M", "Uniqlo"],
  "category": "dress",
  "measurements": {
    "chest": 38,
    "waist": 32,
    "hips": 36
  },
  "userSize": "M"
}
```

**Response**:
```json
{
  "comparison": [
    {
      "brand": "Zara",
      "recommendedSize": "M",
      "equivalentSizes": {
        "standard": "M",
        "us": "8",
        "eu": "38",
        "uk": "10"
      },
      "fitNotes": "runs small",
      "variance": "+2.4%",
      "confidence": 0.92
    }
  ],
  "sizeMapping": {
    "standardSize": "M",
    "brandEquivalents": [...]
  },
  "recommendations": [...],
  "warnings": []
}
```

---

### Returns Prevention Functions

#### 5. `return-risk-prediction`
**Path**: `/functions/v1/return-risk-prediction`  
**Method**: POST  
**Description**: Predict return risk for purchases using 55+ features

**Request**:
```json
{
  "userId": "user_123",
  "productId": "prod_456",
  "selectedSize": "M",
  "orderValue": 150.00,
  "userHistory": {
    "returnRate": 0.15,
    "sizeConsistency": 0.85,
    "totalPurchases": 25
  },
  "productData": {
    "category": "dress",
    "brand": "Zara",
    "price": 79.99,
    "avgReturnRate": 0.22
  }
}
```

**Response**:
```json
{
  "returnRisk": 0.18,
  "returnRiskPercentage": 18,
  "riskLevel": "low",
  "confidence": 0.89,
  "factors": [
    {
      "factor": "Size match",
      "impact": "positive",
      "weight": 0.85,
      "description": "High confidence in size recommendation"
    }
  ],
  "recommendations": [
    "Size M is well-matched to your measurements",
    "Consider adding size S as backup option"
  ],
  "preventionStrategies": [
    "Provide detailed size chart",
    "Show fit guide for this brand"
  ],
  "sizeConfidence": 0.92,
  "styleMatch": 0.88
}
```

---

### Product Discovery Functions

#### 6. `product-search`
**Path**: `/functions/v1/product-search`  
**Method**: POST  
**Description**: AI-powered semantic product search with intent extraction

**Request**:
```json
{
  "query": "show me blue dresses for summer",
  "filters": {
    "category": "dresses",
    "priceMin": 50,
    "priceMax": 200
  },
  "userId": "user_123",
  "limit": 20
}
```

**Response**:
```json
{
  "searchTerms": ["blue", "dresses", "summer"],
  "intent": "product_search",
  "semanticQuery": "Summer dresses in blue color suitable for warm weather",
  "categorySuggestions": ["dresses", "casual dresses", "summer dresses"],
  "styleAttributes": ["casual", "lightweight", "breathable"],
  "colorPreferences": ["blue", "navy", "sky blue"],
  "refinedFilters": {
    "category": "dresses",
    "color": "blue",
    "style": "casual"
  },
  "searchStrategy": "Focus on summer-appropriate fabrics and colors",
  "expectedResults": "Lightweight blue dresses suitable for summer weather"
}
```

---

### Styling Functions

#### 7. `outfit-builder`
**Path**: `/functions/v1/outfit-builder`  
**Method**: POST  
**Description**: Build complete, cohesive outfits from products or suggestions

**Request**:
```json
{
  "occasion": "casual brunch",
  "style": "minimalist",
  "products": [
    { "id": "prod_1", "category": "top", "color": "white" },
    { "id": "prod_2", "category": "bottom", "color": "navy" }
  ],
  "userProfile": {
    "bodyType": "hourglass",
    "style": "minimalist"
  },
  "budget": 200
}
```

**Response**:
```json
{
  "outfits": [
    {
      "id": "outfit_1",
      "name": "Casual Chic",
      "occasion": "casual brunch",
      "items": [
        {
          "category": "top",
          "productId": "prod_1",
          "description": "White cotton t-shirt",
          "color": "white",
          "size": "M",
          "price": 29.99
        }
      ],
      "totalPrice": 149.99,
      "styleNotes": "Minimalist color palette with clean lines",
      "stylingTips": ["Add white sneakers", "Minimal jewelry"],
      "confidence": 0.91,
      "imageDescription": "Casual minimalist outfit with white top and navy bottom"
    }
  ],
  "alternatives": [...],
  "budgetBreakdown": {
    "total": 149.99,
    "byCategory": {
      "tops": 29.99,
      "bottoms": 79.99,
      "shoes": 40.01
    }
  }
}
```

---

### Trend Analysis Functions

#### 8. `trend-analysis`
**Path**: `/functions/v1/trend-analysis`  
**Method**: POST  
**Description**: Analyze current fashion trends and provide market insights

**Request**:
```json
{
  "category": "womenswear",
  "timeframe": "current",
  "region": "Global"
}
```

**Response**:
```json
{
  "trends": [
    {
      "trendName": "Minimalist Aesthetics",
      "category": "womenswear",
      "description": "Clean lines and neutral colors",
      "popularity": 0.85,
      "growthRate": "rising",
      "keyElements": ["neutral colors", "simple silhouettes"],
      "colorPalette": ["beige", "white", "navy", "black"],
      "styleAttributes": ["minimalist", "clean", "timeless"],
      "recommendedProducts": ["tailored blazers", "straight-leg pants"],
      "seasonality": "Year-round",
      "targetAudience": "Professionals and minimalists",
      "confidence": 0.92
    }
  ],
  "emergingTrends": [...],
  "decliningTrends": [...],
  "seasonalRecommendations": {
    "currentSeason": "Spring/Summer",
    "recommendations": ["Lightweight fabrics", "Pastel colors"]
  },
  "marketInsights": {
    "overallTrend": "Shift towards sustainable and minimalist fashion",
    "keyDrivers": ["Sustainability", "Versatility", "Timelessness"],
    "consumerBehavior": "Consumers prioritizing quality over quantity"
  }
}
```

---

### Voice Functions

#### 9. `voice-to-text`
**Path**: `/functions/v1/voice-to-text`  
**Method**: POST  
**Description**: Process voice queries and extract search intent

**Request**:
```json
{
  "text": "show me blue dresses",
  "audio": "base64_encoded_audio"
}
```

**Response**:
```json
{
  "success": true,
  "text": "I found some beautiful blue dresses for you!",
  "userQuery": "show me blue dresses",
  "searchTerms": ["blue", "dresses"],
  "intent": "product_search"
}
```

---

#### 10. `elevenlabs-tts`
**Path**: `/functions/v1/elevenlabs-tts`  
**Method**: POST  
**Description**: Convert text to speech using ElevenLabs API

**Request**:
```json
{
  "text": "I found some beautiful blue dresses for you!",
  "voiceId": "JBFqnCBsd6RMkjVDRZzb",
  "stability": 0.5,
  "similarity_boost": 0.75
}
```

**Response**:
```json
{
  "success": true,
  "source": "eleven",
  "audioBase64": "base64_encoded_audio",
  "mimeType": "audio/mpeg",
  "cached": false
}
```

---

#### 11. `elevenlabs-voices`
**Path**: `/functions/v1/elevenlabs-voices`  
**Method**: GET  
**Description**: List available ElevenLabs voices

---

#### 12. `vultr-inference`
**Path**: `/functions/v1/vultr-inference`  
**Method**: POST  
**Description**: AI inference using Vultr serverless GPU

**Request**:
```json
{
  "model": "llama2-7b-chat-Q5_K_M",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

---

## Error Handling

All functions handle errors consistently:

- **429**: Rate limit exceeded
- **402**: AI credits depleted
- **500**: Internal server error

Error responses:
```json
{
  "error": "Error message"
}
```

## CORS

All functions include CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Deployment

Deploy functions using Supabase CLI:

```bash
supabase functions deploy size-prediction
supabase functions deploy return-risk-prediction
supabase functions deploy product-search
supabase functions deploy outfit-builder
supabase functions deploy trend-analysis
supabase functions deploy size-comparison
```

Or deploy all at once:

```bash
supabase functions deploy
```

## Testing

Test functions locally:

```bash
supabase functions serve size-prediction
```

Then test with curl:

```bash
curl -X POST http://localhost:54321/functions/v1/size-prediction \
  -H "Content-Type: application/json" \
  -d '{
    "measurements": {"chest": 38, "waist": 32},
    "brand": "Zara",
    "category": "dress"
  }'
```

## Best Practices

1. **Caching**: Consider implementing caching for frequently requested data
2. **Rate Limiting**: Functions handle rate limits gracefully
3. **Error Messages**: Provide clear, actionable error messages
4. **Validation**: Validate input data before processing
5. **Logging**: Use `console.error` for error logging
6. **Structured Output**: Use function calling for structured JSON responses
