import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request body once at the start
  let requestBody: { audio?: string; text?: string };
  try {
    requestBody = await req.json();
  } catch (parseError) {
    console.error("Failed to parse request body:", parseError);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Invalid request body" 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { audio, text } = requestBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let userQuery: string;
    
    // If text is already provided (from browser speech recognition), use it directly
    if (text) {
      userQuery = text;
      console.log("Processing text query:", userQuery);
    } else if (audio) {
      // Audio blob was provided, but we don't have STT service in edge function
      // For now, use a placeholder since browser speech recognition should handle this
      // For a production-ready solution, consider using a dedicated STT service like Vultr Inference
      // or a specialized API (e.g., OpenAI Whisper) for audio transcription.
      console.warn("Audio blob provided but transcription not implemented in edge function. Using browser STT recommended.");
      userQuery = "Hello, I need fashion advice";
    } else {
      userQuery = "Hello, I need fashion advice";
      console.log("No text or audio provided, using default query");
    }

    console.log("Processing voice query:", userQuery);

    // Extract search terms from the query for product filtering
    const searchTerms = extractSearchTerms(userQuery);
    const intent = detectIntent(userQuery);

    // Helper function to create fallback response
    const createFallbackResponse = (query: string, terms: string[], detectedIntent: string, reason: string) => {
      let fallbackResponse = "I'm sorry, the full AI service is currently unavailable. ";
      
      if (detectedIntent === "product_search" && terms.length > 0) {
        const termsString = terms.join(", ");
        fallbackResponse += `However, I can still help you search for ${termsString}. Here are some options for you.`;
      } else {
        fallbackResponse += "Please try again later, or try a simpler query.";
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          text: fallbackResponse,
          userQuery: query,
          searchTerms: terms,
          intent: detectedIntent,
          fallback: true, // Flag to indicate this is a fallback response
          reason: reason,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    };

    // If API key is missing, return a fallback response without AI
    if (!LOVABLE_API_KEY) {
      const reason = "LOVABLE_API_KEY not configured";
      console.warn(`${reason}, using fallback response`);
      return createFallbackResponse(userQuery, searchTerms, intent, reason);
    }

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
      
      // On API error, fall back to basic response
      const reason = `AI Gateway error: ${response.status}`;
      console.warn(`${reason}, using fallback`);
      return createFallbackResponse(userQuery, searchTerms, intent, reason);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I'd be happy to help you find what you're looking for!";

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
    
    // Use already parsed request body for fallback
    const userQuery = requestBody?.text || "Hello, I need fashion advice";
    const searchTerms = extractSearchTerms(userQuery);
    const intent = detectIntent(userQuery);
    
    const reason = error instanceof Error ? error.message : "Unknown error";
    
    return createFallbackResponse(userQuery, searchTerms, intent, reason);
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
