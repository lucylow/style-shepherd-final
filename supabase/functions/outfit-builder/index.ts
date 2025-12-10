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
    const { occasion, style, products, userProfile, budget } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error(
        "LOVABLE_API_KEY is not configured. " +
        "Please set it using: supabase secrets set LOVABLE_API_KEY=your_key " +
        "or via the Supabase Dashboard → Settings → Edge Functions → Secrets."
      );
    }

    const prompt = `You are Style Shepherd's Outfit Builder Agent. Create complete, stylish outfits based on:

Occasion: ${occasion || "Casual everyday"}
Style Preference: ${style || "Not specified"}
Budget: $${budget || "Flexible"}

User Profile:
- Body Type: ${userProfile?.bodyType || "Not specified"}
- Height: ${userProfile?.height || "Not specified"}
- Style: ${userProfile?.style || "Not specified"}
- Color Preferences: ${userProfile?.colorPreferences?.join(", ") || "Not specified"}

Available Products:
${products ? JSON.stringify(products, null, 2) : "No specific products provided - suggest general outfit combinations"}

Analyze and return a structured JSON response with:
{
  "outfits": [
    {
      "id": "string (unique outfit ID)",
      "name": "string (e.g., 'Casual Chic')",
      "occasion": "string",
      "items": [
        {
          "category": "string (e.g., 'top', 'bottom', 'shoes', 'accessories')",
          "productId": "string or null",
          "description": "string (e.g., 'White cotton t-shirt')",
          "color": "string",
          "size": "string or null",
          "price": number or null
        }
      ],
      "totalPrice": number,
      "styleNotes": "string (why this outfit works)",
      "stylingTips": ["tip 1", "tip 2"],
      "confidence": number (0-1),
      "imageDescription": "string (description for outfit visualization)"
    }
  ],
  "alternatives": [
    {
      "item": "string (item to swap)",
      "alternatives": ["alternative 1", "alternative 2"],
      "reasoning": "string"
    }
  ],
  "budgetBreakdown": {
    "total": number,
    "byCategory": {
      "tops": number,
      "bottoms": number,
      "shoes": number,
      "accessories": number
    }
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
            content: "You are a fashion stylist AI that creates complete, cohesive outfits. Return JSON only.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_outfits",
              description: "Build complete outfits from products or suggestions",
              parameters: {
                type: "object",
                properties: {
                  outfits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        occasion: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              category: { type: "string" },
                              productId: { type: ["string", "null"] },
                              description: { type: "string" },
                              color: { type: "string" },
                              size: { type: ["string", "null"] },
                              price: { type: ["number", "null"] },
                            },
                            required: ["category", "description", "color"],
                          },
                        },
                        totalPrice: { type: "number" },
                        styleNotes: { type: "string" },
                        stylingTips: {
                          type: "array",
                          items: { type: "string" },
                        },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                        imageDescription: { type: "string" },
                      },
                      required: ["id", "name", "occasion", "items", "totalPrice", "styleNotes", "confidence"],
                    },
                  },
                  alternatives: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        alternatives: {
                          type: "array",
                          items: { type: "string" },
                        },
                        reasoning: { type: "string" },
                      },
                      required: ["item", "alternatives", "reasoning"],
                    },
                  },
                  budgetBreakdown: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      byCategory: {
                        type: "object",
                        properties: {
                          tops: { type: "number" },
                          bottoms: { type: "number" },
                          shoes: { type: "number" },
                          accessories: { type: "number" },
                        },
                      },
                    },
                    required: ["total"],
                  },
                },
                required: ["outfits", "budgetBreakdown"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_outfits" } },
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
      const outfits = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(outfits), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No outfits generated");
  } catch (error) {
    console.error("Outfit builder error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
