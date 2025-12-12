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
    const { category, timeframe = "current", region } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error(
        "LOVABLE_API_KEY is not configured. " +
        "Please set it using: supabase secrets set LOVABLE_API_KEY=your_key " +
        "or via the Supabase Dashboard → Settings → Edge Functions → Secrets."
      );
    }

    const prompt = `You are Style Shepherd's Trend Analysis Agent. Analyze current fashion trends based on:

Category: ${category || "General fashion"}
Timeframe: ${timeframe || "current"}
Region: ${region || "Global"}

Analyze and return a structured JSON response with:
{
  "trends": [
    {
      "trendName": "string (e.g., 'Minimalist Aesthetics')",
      "category": "string",
      "description": "string (detailed trend description)",
      "popularity": number (0-1, how popular this trend is),
      "growthRate": "string ('rising' | 'stable' | 'declining')",
      "keyElements": ["element 1", "element 2"],
      "colorPalette": ["color 1", "color 2"],
      "styleAttributes": ["attribute 1", "attribute 2"],
      "recommendedProducts": ["product type 1", "product type 2"],
      "seasonality": "string (e.g., 'Year-round' or 'Spring/Summer')",
      "targetAudience": "string (who this trend appeals to)",
      "confidence": number (0-1)
    }
  ],
  "emergingTrends": [
    {
      "trendName": "string",
      "description": "string",
      "earlyAdopterAppeal": number (0-1),
      "projectedGrowth": "string"
    }
  ],
  "decliningTrends": [
    {
      "trendName": "string",
      "description": "string",
      "declineReason": "string"
    }
  ],
  "seasonalRecommendations": {
    "currentSeason": "string",
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "marketInsights": {
    "overallTrend": "string (summary of fashion direction)",
    "keyDrivers": ["driver 1", "driver 2"],
    "consumerBehavior": "string (how consumers are responding)"
  }
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
            content: "You are a fashion trend analyst AI that identifies and analyzes current fashion trends. Return JSON only.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_trends",
              description: "Analyze fashion trends and provide insights",
              parameters: {
                type: "object",
                properties: {
                  trends: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        trendName: { type: "string" },
                        category: { type: "string" },
                        description: { type: "string" },
                        popularity: { type: "number", minimum: 0, maximum: 1 },
                        growthRate: {
                          type: "string",
                          enum: ["rising", "stable", "declining"],
                        },
                        keyElements: {
                          type: "array",
                          items: { type: "string" },
                        },
                        colorPalette: {
                          type: "array",
                          items: { type: "string" },
                        },
                        styleAttributes: {
                          type: "array",
                          items: { type: "string" },
                        },
                        recommendedProducts: {
                          type: "array",
                          items: { type: "string" },
                        },
                        seasonality: { type: "string" },
                        targetAudience: { type: "string" },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                      },
                      required: [
                        "trendName",
                        "category",
                        "description",
                        "popularity",
                        "growthRate",
                        "keyElements",
                        "confidence",
                      ],
                    },
                  },
                  emergingTrends: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        trendName: { type: "string" },
                        description: { type: "string" },
                        earlyAdopterAppeal: { type: "number", minimum: 0, maximum: 1 },
                        projectedGrowth: { type: "string" },
                      },
                      required: ["trendName", "description", "earlyAdopterAppeal"],
                    },
                  },
                  decliningTrends: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        trendName: { type: "string" },
                        description: { type: "string" },
                        declineReason: { type: "string" },
                      },
                      required: ["trendName", "description", "declineReason"],
                    },
                  },
                  seasonalRecommendations: {
                    type: "object",
                    properties: {
                      currentSeason: { type: "string" },
                      recommendations: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["currentSeason", "recommendations"],
                  },
                  marketInsights: {
                    type: "object",
                    properties: {
                      overallTrend: { type: "string" },
                      keyDrivers: {
                        type: "array",
                        items: { type: "string" },
                      },
                      consumerBehavior: { type: "string" },
                    },
                    required: ["overallTrend", "keyDrivers"],
                  },
                },
                required: [
                  "trends",
                  "emergingTrends",
                  "seasonalRecommendations",
                  "marketInsights",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_trends" } },
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
      const analysis = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No trend analysis generated");
  } catch (error) {
    console.error("Trend analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

