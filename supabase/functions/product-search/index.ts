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
    const { query, filters, userId, limit = 20 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error(
        "LOVABLE_API_KEY is not configured. " +
        "Please set it using: supabase secrets set LOVABLE_API_KEY=your_key " +
        "or via the Supabase Dashboard → Settings → Edge Functions → Secrets."
      );
    }

    const prompt = `You are Style Shepherd's AI Product Search Agent. Analyze the user's search query and extract semantic meaning:

User Query: "${query || ""}"

Filters:
- Category: ${filters?.category || "Any"}
- Price Range: ${filters?.priceMin || "$0"} - ${filters?.priceMax || "No limit"}
- Size: ${filters?.size || "Any"}
- Brand: ${filters?.brand || "Any"}
- Color: ${filters?.color || "Any"}
- Style: ${filters?.style || "Any"}

User Context:
- User ID: ${userId || "Guest"}

Analyze the query intent and return a structured JSON response with:
{
  "searchTerms": ["extracted", "key", "terms"],
  "intent": "string ('product_search' | 'style_inquiry' | 'size_question' | 'trend_question' | 'general')",
  "semanticQuery": "string (expanded semantic understanding of query)",
  "categorySuggestions": ["suggested", "categories"],
  "styleAttributes": ["extracted", "style", "attributes"],
  "colorPreferences": ["extracted", "colors"],
  "refinedFilters": {
    "category": "string or null",
    "priceMin": number or null,
    "priceMax": number or null,
    "size": "string or null",
    "brand": "string or null",
    "color": "string or null",
    "style": "string or null"
  },
  "searchStrategy": "string (description of search approach)",
  "expectedResults": "string (description of what user likely wants)"
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
            content: "You are a fashion search AI that understands natural language queries and extracts semantic meaning. Return JSON only.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_search_query",
              description: "Analyze and extract semantic meaning from search query",
              parameters: {
                type: "object",
                properties: {
                  searchTerms: {
                    type: "array",
                    items: { type: "string" },
                  },
                  intent: {
                    type: "string",
                    enum: ["product_search", "style_inquiry", "size_question", "trend_question", "general"],
                  },
                  semanticQuery: { type: "string" },
                  categorySuggestions: {
                    type: "array",
                    items: { type: "string" },
                  },
                  styleAttributes: {
                    type: "array",
                    items: { type: "string" },
                  },
                  colorPreferences: {
                    type: "array",
                    items: { type: "string" },
                  },
                  refinedFilters: {
                    type: "object",
                    properties: {
                      category: { type: ["string", "null"] },
                      priceMin: { type: ["number", "null"] },
                      priceMax: { type: ["number", "null"] },
                      size: { type: ["string", "null"] },
                      brand: { type: ["string", "null"] },
                      color: { type: ["string", "null"] },
                      style: { type: ["string", "null"] },
                    },
                  },
                  searchStrategy: { type: "string" },
                  expectedResults: { type: "string" },
                },
                required: [
                  "searchTerms",
                  "intent",
                  "semanticQuery",
                  "categorySuggestions",
                  "refinedFilters",
                  "searchStrategy",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_search_query" } },
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

    throw new Error("No search analysis generated");
  } catch (error) {
    console.error("Product search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
