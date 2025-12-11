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
    const { userId, productId, selectedSize, orderValue, userHistory, productData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error(
        "LOVABLE_API_KEY is not configured. " +
        "Please set it using: supabase secrets set LOVABLE_API_KEY=your_key " +
        "or via the Supabase Dashboard → Settings → Edge Functions → Secrets."
      );
    }

    const prompt = `You are Style Shepherd's Returns Prophet Agent. Predict the return risk for a purchase based on:

User Context:
- User ID: ${userId || "Unknown"}
- Past Return Rate: ${userHistory?.returnRate || "Not available"}%
- Size Consistency: ${userHistory?.sizeConsistency || "Not available"}
- Purchase History: ${userHistory?.totalPurchases || 0} purchases

Product Context:
- Product ID: ${productId || "Unknown"}
- Selected Size: ${selectedSize || "Not specified"}
- Product Category: ${productData?.category || "Unknown"}
- Brand: ${productData?.brand || "Unknown"}
- Price: $${productData?.price || "Unknown"}
- Average Return Rate: ${productData?.avgReturnRate || "Not available"}%

Order Context:
- Order Value: $${orderValue || 0}
- Item Count: ${productData?.itemCount || 1}

Analyze and return a structured JSON response with:
{
  "returnRisk": number (0-1, probability of return),
  "returnRiskPercentage": number (0-100),
  "riskLevel": "string ('low' | 'medium' | 'high' | 'critical')",
  "confidence": number (0-1),
  "factors": [
    {
      "factor": "string (e.g., 'Size mismatch')",
      "impact": "string ('positive' | 'negative' | 'neutral')",
      "weight": number (0-1),
      "description": "string"
    }
  ],
  "recommendations": [
    "specific recommendation 1",
    "specific recommendation 2"
  ],
  "preventionStrategies": [
    "strategy to reduce return risk 1",
    "strategy to reduce return risk 2"
  ],
  "sizeConfidence": number (0-1, confidence in size recommendation),
  "styleMatch": number (0-1, how well product matches user style)
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
            content: "You are a returns prediction AI that analyzes purchase risk using 55+ features. Return JSON only.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "predict_return_risk",
              description: "Predict return risk with detailed analysis",
              parameters: {
                type: "object",
                properties: {
                  returnRisk: { type: "number", minimum: 0, maximum: 1 },
                  returnRiskPercentage: { type: "number", minimum: 0, maximum: 100 },
                  riskLevel: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                  },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  factors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        factor: { type: "string" },
                        impact: {
                          type: "string",
                          enum: ["positive", "negative", "neutral"],
                        },
                        weight: { type: "number", minimum: 0, maximum: 1 },
                        description: { type: "string" },
                      },
                      required: ["factor", "impact", "weight", "description"],
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                  },
                  preventionStrategies: {
                    type: "array",
                    items: { type: "string" },
                  },
                  sizeConfidence: { type: "number", minimum: 0, maximum: 1 },
                  styleMatch: { type: "number", minimum: 0, maximum: 1 },
                },
                required: [
                  "returnRisk",
                  "returnRiskPercentage",
                  "riskLevel",
                  "confidence",
                  "factors",
                  "recommendations",
                  "preventionStrategies",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "predict_return_risk" } },
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

    throw new Error("No return risk prediction generated");
  } catch (error) {
    console.error("Return risk prediction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

