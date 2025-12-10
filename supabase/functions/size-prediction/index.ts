import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { measurements, brand, category, productId, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error(
        "LOVABLE_API_KEY is not configured. " +
        "Please set it using: supabase secrets set LOVABLE_API_KEY=your_key " +
        "or via the Supabase Dashboard → Settings → Edge Functions → Secrets."
      );
    }

    const prompt = `You are Style Shepherd's Size Oracle Agent. Predict the optimal size for a fashion item based on:

User Measurements:
- Height: ${measurements?.height || "Not provided"} cm
- Weight: ${measurements?.weight || "Not provided"} kg
- Chest: ${measurements?.chest || "Not provided"} inches
- Waist: ${measurements?.waist || "Not provided"} inches
- Hips: ${measurements?.hips || "Not provided"} inches

Product Details:
- Brand: ${brand || "Unknown"}
- Category: ${category || "Unknown"}
- Product ID: ${productId || "N/A"}

Analyze and return a structured JSON response with:
{
  "recommendedSize": "string (e.g., 'M', '10', 'Large')",
  "confidence": number (0-1),
  "confidencePercentage": number (0-100),
  "reasoning": [
    "specific reason 1",
    "specific reason 2",
    "specific reason 3"
  ],
  "fitConfidence": "string (e.g., '92%')",
  "alternativeSizes": ["string array of alternative sizes"],
  "brandSizingNotes": "string (e.g., 'runs small - consider sizing up')",
  "crossBrandNormalization": {
    "standardSize": "string",
    "brandAdjusted": boolean,
    "variance": "string (e.g., '2.4%')"
  },
  "warnings": ["any warnings about fit or sizing"]
}`;

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
            content: "You are a fashion sizing expert that predicts optimal sizes across 500+ brands. Return JSON only.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "predict_size",
              description: "Predict optimal size with cross-brand normalization",
              parameters: {
                type: "object",
                properties: {
                  recommendedSize: { type: "string" },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  confidencePercentage: { type: "number", minimum: 0, maximum: 100 },
                  reasoning: {
                    type: "array",
                    items: { type: "string" },
                  },
                  fitConfidence: { type: "string" },
                  alternativeSizes: {
                    type: "array",
                    items: { type: "string" },
                  },
                  brandSizingNotes: { type: "string" },
                  crossBrandNormalization: {
                    type: "object",
                    properties: {
                      standardSize: { type: "string" },
                      brandAdjusted: { type: "boolean" },
                      variance: { type: "string" },
                    },
                    required: ["standardSize", "brandAdjusted", "variance"],
                  },
                  warnings: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: [
                  "recommendedSize",
                  "confidence",
                  "confidencePercentage",
                  "reasoning",
                  "fitConfidence",
                  "alternativeSizes",
                  "brandSizingNotes",
                  "crossBrandNormalization",
                ],
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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const prediction = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No size prediction generated");
  } catch (error) {
    console.error("Size prediction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
