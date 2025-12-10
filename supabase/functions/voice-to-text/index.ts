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
    const { audio, text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error(
        "LOVABLE_API_KEY is not configured. " +
        "Please set it using: supabase secrets set LOVABLE_API_KEY=your_key " +
        "or via the Supabase Dashboard → Settings → Edge Functions → Secrets. " +
        "See SUPABASE_SECRETS_SETUP.md for detailed instructions."
      );
    }

    // If text is already provided (from browser speech recognition), use it directly
    const userQuery = text || "Hello, I need fashion advice";

    console.log("Processing voice query:", userQuery);

    // Use Lovable AI to process the fashion query
    const systemPrompt = `You are Style Shepherd's AI fashion assistant. You help users with:
- Finding products based on their requests (e.g., "show me blue dresses", "find casual shirts")
- Personalized outfit recommendations
- Size and fit advice to reduce returns
- Style tips and fashion trends

When users ask to see products, respond with a helpful message and include search terms.
Keep responses concise and friendly. If they ask to see specific items, acknowledge their request.

Example responses:
- "I found some beautiful blue dresses for you! Here are some options that would look great."
- "Great choice! Let me show you our casual shirt collection."`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I'd be happy to help you find what you're looking for!";

    // Extract search terms from the query for product filtering
    const searchTerms = extractSearchTerms(userQuery);

    return new Response(
      JSON.stringify({
        success: true,
        text: aiResponse,
        userQuery,
        searchTerms,
        intent: detectIntent(userQuery),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Voice-to-text error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractSearchTerms(query: string): string[] {
  const terms: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  // Colors
  const colors = ["blue", "red", "black", "white", "green", "yellow", "pink", "purple", "orange", "brown", "gray", "grey", "navy", "beige"];
  colors.forEach(color => {
    if (lowerQuery.includes(color)) terms.push(color);
  });
  
  // Clothing items
  const items = ["dress", "dresses", "shirt", "shirts", "pants", "jeans", "jacket", "jackets", "coat", "coats", "skirt", "skirts", "blouse", "top", "tops", "sweater", "hoodie", "suit", "blazer"];
  items.forEach(item => {
    if (lowerQuery.includes(item)) terms.push(item);
  });
  
  // Styles
  const styles = ["casual", "formal", "business", "elegant", "sporty", "vintage", "modern", "classic", "trendy"];
  styles.forEach(style => {
    if (lowerQuery.includes(style)) terms.push(style);
  });
  
  return terms;
}

function detectIntent(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes("show") || lowerQuery.includes("find") || lowerQuery.includes("search") || lowerQuery.includes("looking for")) {
    return "product_search";
  }
  if (lowerQuery.includes("recommend") || lowerQuery.includes("suggest") || lowerQuery.includes("what do you")) {
    return "recommendation";
  }
  if (lowerQuery.includes("size") || lowerQuery.includes("fit")) {
    return "sizing";
  }
  if (lowerQuery.includes("style") || lowerQuery.includes("wear") || lowerQuery.includes("match")) {
    return "styling";
  }
  
  return "general";
}
