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
    const { brands, category, measurements, userSize } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error(
        "LOVABLE_API_KEY is not configured. " +
        "Please set it using: supabase secrets set LOVABLE_API_KEY=your_key " +
        "or via the Supabase Dashboard → Settings → Edge Functions → Secrets."
      );
    }

    const prompt = `You are Style Shepherd's Size Comparison Agent. Compare sizes across multiple brands:

Brands to Compare: ${brands?.join(", ") || "Multiple brands"}
Category: ${category || "General"}
User Measurements:
- Height: ${measurements?.height || "Not provided"} cm
- Weight: ${measurements?.weight || "Not provided"} kg
- Chest: ${measurements?.chest || "Not provided"} inches
- Waist: ${measurements?.waist || "Not provided"} inches
- Hips: ${measurements?.hips || "Not provided"} inches

User's Known Size: ${userSize || "Not provided"}

Analyze and return a structured JSON response with:
{
  "comparison": [
    {
      "brand": "string",
      "recommendedSize": "string",
      "equivalentSizes": {
        "standard": "string",
        "us": "string",
        "eu": "string",
        "uk": "string"
      },
      "fitNotes": "string (e.g., 'runs small', 'true to size')",
      "variance": "string (e.g., '+2.4%' or '-1.2%')",
      "confidence": number (0-1),
      "measurements": {
        "chest": "string (e.g., '38-40 inches')",
        "waist": "string",
        "hips": "string",
        "length": "string (if applicable)"
      }
    }
  ],
  "sizeMapping": {
    "standardSize": "string (e.g., 'M')",
    "brandEquivalents": [
      {
        "brand": "string",
        "size": "string",
        "notes": "string"
      }
    ]
  },
  "recommendations": [
    {
      "brand": "string",
      "recommendedSize": "string",
      "reasoning": "string",
      "confidence": number (0-1)
    }
  ],
  "warnings": [
    {
      "brand": "string",
      "warning": "string",
      "severity": "string ('low' | 'medium' | 'high')"
    }
  ],
  "generalNotes": "string (overall sizing insights)"
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
            content: "You are a fashion sizing expert that compares sizes across 500+ brands. Return JSON only.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "compare_sizes",
              description: "Compare sizes across multiple brands",
              parameters: {
                type: "object",
                properties: {
                  comparison: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        brand: { type: "string" },
                        recommendedSize: { type: "string" },
                        equivalentSizes: {
                          type: "object",
                          properties: {
                            standard: { type: "string" },
                            us: { type: "string" },
                            eu: { type: "string" },
                            uk: { type: "string" },
                          },
                        },
                        fitNotes: { type: "string" },
                        variance: { type: "string" },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                        measurements: {
                          type: "object",
                          properties: {
                            chest: { type: "string" },
                            waist: { type: "string" },
                            hips: { type: "string" },
                            length: { type: "string" },
                          },
                        },
                      },
                      required: ["brand", "recommendedSize", "fitNotes", "confidence"],
                    },
                  },
                  sizeMapping: {
                    type: "object",
                    properties: {
                      standardSize: { type: "string" },
                      brandEquivalents: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            brand: { type: "string" },
                            size: { type: "string" },
                            notes: { type: "string" },
                          },
                          required: ["brand", "size"],
                        },
                      },
                    },
                    required: ["standardSize", "brandEquivalents"],
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        brand: { type: "string" },
                        recommendedSize: { type: "string" },
                        reasoning: { type: "string" },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                      },
                      required: ["brand", "recommendedSize", "reasoning", "confidence"],
                    },
                  },
                  warnings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        brand: { type: "string" },
                        warning: { type: "string" },
                        severity: {
                          type: "string",
                          enum: ["low", "medium", "high"],
                        },
                      },
                      required: ["brand", "warning", "severity"],
                    },
                  },
                  generalNotes: { type: "string" },
                },
                required: ["comparison", "sizeMapping", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "compare_sizes" } },
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
      const comparison = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(comparison), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No size comparison generated");
  } catch (error) {
    console.error("Size comparison error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
