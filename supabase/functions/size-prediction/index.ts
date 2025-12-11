import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UserMeasurement {
  height_cm?: number;
  weight_kg?: number;
  bust_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  chest_cm?: number;
  inseam_cm?: number;
  body_type?: string; // hourglass, pear, apple, rectangle, inverted_triangle
}

interface ProductInfo {
  brand: string;
  category: string; // top, bottom, dress, jacket, shoes
  product_name?: string;
  size_chart?: Record<string, any>;
}

interface BrandNormalizationData {
  brand: string;
  vanity_sizing_factor: number;
  size_mapping: Record<string, string>;
  measurement_adjustments: {
    bust?: number;
    waist?: number;
    hips?: number;
  };
}

interface SizePrediction {
  predicted_sizes: {
    primary: string;
    confidence: number;
    alternatives: string[];
  };
  normalized_measurements: UserMeasurement;
  brand_adjustments_applied: BrandNormalizationData;
  fit_recommendation: {
    recommended_fit: "true_to_size" | "size_up" | "size_down";
    sizing_consistency: number;
    return_risk: number;
  };
  explanation: string;
  cross_brand_equivalents: Record<string, string>;
  category: string;
}

interface SizePredictionResponse {
  success: boolean;
  predictions: SizePrediction[];
  processing_time_ms: number;
  data_sources_used: string[];
  error?: string;
}

// ============================================================================
// BRAND NORMALIZATION DATABASE
// ============================================================================

const BRAND_VANITY_SIZING: Record<string, number> = {
  // Brands that run small (need to size up)
  "Zara": 1.15,
  "H&M": 1.10,
  "Forever 21": 1.20,
  "Shein": 1.25,
  
  // True to size brands
  "Everlane": 1.00,
  "Uniqlo": 1.02,
  "Madewell": 1.01,
  
  // Brands that run large (can size down)
  "Old Navy": 0.90,
  "American Eagle": 0.92,
  "Gap": 0.88,
  
  // Luxury brands (generally true to size)
  "Reformation": 1.00,
  "Theory": 1.00,
  "COS": 1.01
};

const SIZE_CONVERSION_TABLE: Record<string, Record<string, string>> = {
  "US": {
    "0": "EU 32, UK 4",
    "2": "EU 34, UK 6", 
    "4": "EU 36, UK 8",
    "6": "EU 38, UK 10",
    "8": "EU 40, UK 12",
    "10": "EU 42, UK 14",
    "12": "EU 44, UK 16"
  },
  "EU": {
    "36": "US 4, UK 8",
    "38": "US 6, UK 10",
    "40": "US 8, UK 12",
    "42": "US 10, UK 14",
    "44": "US 12, UK 16"
  }
};

const CATEGORY_PRIORITIES: Record<string, string[]> = {
  "dress": ["bust", "waist", "hips"],
  "top": ["bust", "waist"],
  "bottom": ["waist", "hips", "inseam"],
  "jacket": ["chest", "waist"],
  "shoes": ["height", "weight"]
};

// ============================================================================
// AI INTEGRATION (Using Lovable AI Gateway)
// ============================================================================

async function predictSizeWithAI(
  measurements: UserMeasurement,
  product: ProductInfo
): Promise<SizePrediction> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    // Fallback to deterministic prediction if no API key
    return fallbackSizePrediction(measurements, product);
  }

  const vanityFactor = BRAND_VANITY_SIZING[product.brand] || 1.0;
  const priorityMeasurements = CATEGORY_PRIORITIES[product.category]?.join(", ") || "bust,waist,hips";

  const prompt = `Predict optimal size for:

BRAND: ${product.brand}
CATEGORY: ${product.category}
MEASUREMENTS: ${JSON.stringify(measurements)}

Vanity sizing factor: ${vanityFactor}
Priority measurements: ${priorityMeasurements}

Provide detailed size prediction with confidence and cross-brand equivalents.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert clothing size prediction AI with knowledge of 500+ brands and sizing inconsistencies.

CRITICAL RULES:
1. Use precise body measurements (cm) - never guess
2. Apply vanity sizing corrections from provided data
3. Consider category-specific fit priorities
4. Output US sizes first, then provide equivalents
5. Include confidence scores (0.0-1.0)
6. Flag high return risk (>0.3)

RESPONSE FORMAT (JSON ONLY):
{
  "predicted_sizes": {
    "primary": "US 8",
    "confidence": 0.92,
    "alternatives": ["US 6", "US 10"]
  },
  "fit_recommendation": {
    "recommended_fit": "size_up|true_to_size|size_down",
    "sizing_consistency": 0.88,
    "return_risk": 0.15
  },
  "explanation": "Clear reasoning..."
}`,
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "predict_size",
              description: "Predict optimal clothing size with confidence",
              parameters: {
                type: "object",
                properties: {
                  predicted_sizes: {
                    type: "object",
                    properties: {
                      primary: { type: "string" },
                      confidence: { type: "number" },
                      alternatives: { type: "array", items: { type: "string" } },
                    },
                    required: ["primary", "confidence", "alternatives"],
                  },
                  fit_recommendation: {
                    type: "object",
                    properties: {
                      recommended_fit: { type: "string", enum: ["true_to_size", "size_up", "size_down"] },
                      sizing_consistency: { type: "number" },
                      return_risk: { type: "number" },
                    },
                    required: ["recommended_fit", "sizing_consistency", "return_risk"],
                  },
                  explanation: { type: "string" },
                },
                required: ["predicted_sizes", "fit_recommendation", "explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "predict_size" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      if (response.status === 402) {
        throw new Error("AI credits depleted");
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const prediction = JSON.parse(toolCall.function.arguments);
      
      return {
        ...prediction,
        normalized_measurements: measurements,
        brand_adjustments_applied: {
          brand: product.brand,
          vanity_sizing_factor: vanityFactor,
          size_mapping: SIZE_CONVERSION_TABLE["US"] || {},
          measurement_adjustments: {
            bust: measurements.bust_cm ? measurements.bust_cm * vanityFactor : undefined,
            waist: measurements.waist_cm ? measurements.waist_cm * vanityFactor : undefined,
            hips: measurements.hips_cm ? measurements.hips_cm * vanityFactor : undefined,
          },
        },
        cross_brand_equivalents: SIZE_CONVERSION_TABLE["US"] || {},
        category: product.category,
      };
    }
  } catch (error) {
    console.error("AI prediction error:", error);
    // Fall through to deterministic fallback
  }

  // Fallback to deterministic prediction
  return fallbackSizePrediction(measurements, product);
}

// ============================================================================
// DETERMINISTIC FALLBACK (No AI dependency)
// ============================================================================

function fallbackSizePrediction(
  measurements: UserMeasurement,
  product: ProductInfo
): SizePrediction {
  const vanityFactor = BRAND_VANITY_SIZING[product.brand] || 1.0;
  const adjusted = {
    bust_cm: (measurements.bust_cm || 0) * vanityFactor,
    waist_cm: (measurements.waist_cm || 0) * vanityFactor,
    hips_cm: (measurements.hips_cm || 0) * vanityFactor,
  };

  // Simple size mapping based on waist measurement (most reliable)
  let primarySize = "M";
  if (adjusted.waist_cm < 64) primarySize = "XS";
  else if (adjusted.waist_cm < 70) primarySize = "S";
  else if (adjusted.waist_cm < 78) primarySize = "M";
  else if (adjusted.waist_cm < 86) primarySize = "L";
  else primarySize = "XL";

  // Adjust for vanity sizing
  if (vanityFactor > 1.1) primarySize = sizeUp(primarySize);
  if (vanityFactor < 0.95) primarySize = sizeDown(primarySize);

  return {
    predicted_sizes: {
      primary: primarySize,
      confidence: 0.75,
      alternatives: [sizeDown(primarySize), sizeUp(primarySize)].filter(Boolean),
    },
    normalized_measurements: adjusted,
    brand_adjustments_applied: {
      brand: product.brand,
      vanity_sizing_factor: vanityFactor,
      size_mapping: {},
      measurement_adjustments: adjusted,
    },
    fit_recommendation: {
      recommended_fit: vanityFactor > 1.1 ? "size_up" : "true_to_size",
      sizing_consistency: 0.8,
      return_risk: vanityFactor > 1.15 ? 0.4 : 0.2,
    },
    explanation: `Deterministic prediction using waist ${Math.round(adjusted.waist_cm)}cm with ${product.brand} vanity sizing adjustment (${vanityFactor.toFixed(2)}x)`,
    cross_brand_equivalents: {},
    category: product.category,
  };
}

function sizeUp(size: string): string {
  const map: Record<string, string> = { "XS": "S", "S": "M", "M": "L", "L": "XL", "XL": "XXL" };
  return map[size] || size;
}

function sizeDown(size: string): string {
  const map: Record<string, string> = { "XXL": "XL", "XL": "L", "L": "M", "M": "S", "S": "XS" };
  return map[size] || size;
}

// ============================================================================
// BODY TYPE NORMALIZATION
// ============================================================================

function normalizeForBodyType(measurements: UserMeasurement, bodyType?: string): UserMeasurement {
  if (!bodyType) return measurements;

  const adjustments: Record<string, Partial<UserMeasurement>> = {
    "pear": { hips_cm: (measurements.hips_cm || 0) * 1.02 },
    "apple": { waist_cm: (measurements.waist_cm || 0) * 1.03 },
    "hourglass": { 
      bust_cm: (measurements.bust_cm || 0) * 1.01, 
      hips_cm: (measurements.hips_cm || 0) * 1.01 
    },
    "rectangle": { 
      bust_cm: (measurements.bust_cm || 0) * 0.99, 
      waist_cm: (measurements.waist_cm || 0) * 0.98 
    },
  };

  return { ...measurements, ...adjustments[bodyType] };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        predictions: [],
        processing_time_ms: 0,
        data_sources_used: [],
        error: "Method not allowed. Use POST.",
      }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const {
      measurements,
      products,
      user_id,
    }: {
      measurements: UserMeasurement;
      products: ProductInfo[];
      user_id?: string;
    } = await req.json();

    if (!measurements || !products || !Array.isArray(products)) {
      return new Response(
        JSON.stringify({
          success: false,
          predictions: [],
          processing_time_ms: Date.now() - startTime,
          data_sources_used: [],
          error: "Missing required fields: measurements, products",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize measurements for body type
    const normalizedMeasurements = normalizeForBodyType(measurements, measurements.body_type);

    // Generate predictions for all products
    const predictions: SizePrediction[] = [];
    const dataSources: string[] = ["brand_database", "size_charts", "ai_model"];

    for (const product of products) {
      const prediction = await predictSizeWithAI(normalizedMeasurements, product);
      predictions.push(prediction);
    }

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        predictions,
        processing_time_ms: processingTime,
        data_sources_used: dataSources,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Size prediction error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        predictions: [],
        processing_time_ms: Date.now() - startTime,
        data_sources_used: [],
        error: error instanceof Error ? error.message : "Prediction failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
