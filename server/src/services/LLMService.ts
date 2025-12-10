/**
 * LLM Service for AI-powered intent extraction and response generation
 * Uses OpenAI GPT models for natural language understanding and generation
 */

import OpenAI from 'openai';
import env from '../config/env.js';

export interface IntentAnalysis {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  context?: Record<string, any>;
}

export interface ConversationSummary {
  summary: string;
  keyPoints: string[];
  userPreferences?: Record<string, any>;
  timestamp: number;
}

export class LLMService {
  private client: OpenAI | null = null;
  private readonly DEFAULT_MODEL = 'gpt-4o-mini'; // Fast and cost-effective
  private readonly FALLBACK_MODEL = 'gpt-3.5-turbo';
  private readonly MAX_TOKENS = 500;
  private readonly MAX_CONTEXT_MESSAGES = 20;
  
  // Token usage tracking
  private tokenUsage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalRequests: number;
    costEstimate: number; // USD
  } = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalRequests: 0,
    costEstimate: 0,
  };
  
  // Cost per 1M tokens (approximate for gpt-4o-mini)
  private readonly INPUT_COST_PER_MILLION = 0.15; // $0.15 per 1M input tokens
  private readonly OUTPUT_COST_PER_MILLION = 0.60; // $0.60 per 1M output tokens

  constructor() {
    const apiKey = env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        this.client = new OpenAI({
          apiKey: apiKey,
        });
        console.log('✅ OpenAI LLM client initialized successfully');
      } catch (error) {
        console.warn('⚠️ Failed to initialize OpenAI client:', error);
        this.client = null;
      }
    } else {
      console.warn('⚠️ OPENAI_API_KEY not found, LLM features will use fallback methods');
    }
  }

  /**
   * Extract intent and entities using LLM
   * Falls back to keyword matching if LLM is unavailable
   */
  async extractIntentAndEntities(
    text: string,
    conversationHistory?: any[],
    userProfile?: any
  ): Promise<IntentAnalysis> {
    if (!this.client) {
      return this.fallbackIntentExtraction(text);
    }

    try {
      // Enhanced system prompt with better entity extraction
      const systemPrompt = `You are an AI assistant for a fashion e-commerce platform. Analyze user queries and extract detailed information.

INTENTS (choose the most specific one):
- search_product: User wants to find specific products
- get_recommendations: User wants personalized style recommendations
- ask_about_size: User has questions about sizing or fit
- check_availability: User wants to know if items are in stock
- add_to_cart: User wants to purchase/add items
- get_style_advice: User wants fashion/style guidance
- return_product: User wants to return or exchange items
- track_order: User wants order status/shipping info
- save_preference: User wants to save preferences (size, style, etc.)
- general_question: General inquiries

ENTITIES to extract:
- color: Any color mentioned (red, blue, navy, etc.)
- category: Clothing type (dress, shirt, pants, shoes, etc.)
- size: Size mentioned (XS, S, M, L, XL, or numeric sizes)
- brand: Brand names mentioned
- occasion: Event type (wedding, party, casual, business, etc.)
- priceRange: Price range with min and max
- style: Style descriptors (casual, formal, trendy, etc.)
- productId: Specific product IDs mentioned

SENTIMENT: positive, neutral, or negative

CONFIDENCE: 0-1 score based on how clear the intent is

Respond with valid JSON only:
{
  "intent": "string",
  "entities": { "color": "string", "category": "string", "size": "string", "brand": "string", "occasion": "string", "priceRange": { "min": number, "max": number }, "style": "string", "productId": "string" },
  "confidence": number,
  "sentiment": "positive|neutral|negative",
  "context": {}
}`;

      // Build richer context from conversation history
      const userContext = conversationHistory 
        ? `Previous conversation context:\n${conversationHistory.slice(-3).map((m: any) => `${m.type}: ${m.message}`).join('\n')}\n\nUser profile context: ${userProfile ? JSON.stringify(userProfile).substring(0, 150) : 'None'}`
        : '';

      const response = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${userContext}\n\nUser query: "${text}"` }
        ],
        temperature: 0.2, // Lower temperature for more consistent extraction
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      const parsed = JSON.parse(content);
      
      // Enhanced entity normalization
      const normalizedEntities: Record<string, any> = {};
      if (parsed.entities) {
        // Normalize colors
        if (parsed.entities.color) {
          normalizedEntities.color = parsed.entities.color.toLowerCase();
        }
        // Normalize sizes
        if (parsed.entities.size) {
          const size = parsed.entities.size.toUpperCase();
          normalizedEntities.size = size;
        }
        // Normalize categories
        if (parsed.entities.category) {
          normalizedEntities.category = parsed.entities.category.toLowerCase();
        }
        // Copy other entities as-is
        Object.keys(parsed.entities).forEach(key => {
          if (!normalizedEntities[key]) {
            normalizedEntities[key] = parsed.entities[key];
          }
        });
      }

      return {
        intent: parsed.intent || 'general_question',
        entities: normalizedEntities,
        confidence: Math.min(0.95, Math.max(0.5, parsed.confidence || 0.7)),
        sentiment: parsed.sentiment || 'neutral',
        context: parsed.context || {},
      };
    } catch (error) {
      console.warn('LLM intent extraction failed, using fallback:', error);
      return this.fallbackIntentExtraction(text);
    }
  }

  /**
   * Generate contextual response using LLM
   * Falls back to rule-based responses if LLM is unavailable
   */
  async generateResponse(
    query: string,
    intentAnalysis: IntentAnalysis,
    conversationHistory: any[],
    userProfile?: any,
    preferences?: any
  ): Promise<string> {
    if (!this.client) {
      return this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
    }

    try {
      // Enhanced system prompt with better context awareness
      const systemPrompt = `You are Style Shepherd, a friendly and knowledgeable fashion shopping assistant. 

Your personality:
- Warm, conversational, and genuinely enthusiastic about helping people find their perfect style
- Proactive in offering personalized style advice based on user preferences and context
- Remember user preferences, past purchases, and style history - reference them naturally
- Keep responses concise (1-2 sentences for voice, 2-3 for text) but informative
- Use the user's name when available to create a personal connection
- Be helpful and supportive, never pushy or salesy
- Anticipate follow-up questions and provide complete but concise answers
- When recommending products, explain WHY they're a good fit (style match, occasion appropriateness, etc.)

Context awareness:
- Consider the user's intent: ${intentAnalysis.intent}
- Detected entities: ${JSON.stringify(intentAnalysis.entities)}
- User sentiment: ${intentAnalysis.sentiment || 'neutral'}
- Confidence: ${intentAnalysis.confidence}

User profile: ${userProfile ? JSON.stringify(userProfile).substring(0, 200) : 'New user'}
User preferences: ${preferences ? JSON.stringify(preferences).substring(0, 200) : 'None yet'}

Remember to:
- Acknowledge the user's query directly
- Provide actionable information or next steps
- End with a natural follow-up question when appropriate
- Use fashion terminology naturally but explain when needed`;

      // Build conversation context (last 5 messages with better formatting)
      const recentHistory = conversationHistory.slice(-5);
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history with better context
      for (const msg of recentHistory) {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.message,
        });
      }

      // Add current query with intent context
      const enrichedQuery = intentAnalysis.entities && Object.keys(intentAnalysis.entities).length > 0
        ? `${query}\n\n[Context: Looking for ${Object.entries(intentAnalysis.entities).map(([k, v]) => `${k}: ${v}`).join(', ')}]`
        : query;

      messages.push({
        role: 'user',
        content: enrichedQuery,
      });

      const response = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 200, // Increased for more detailed responses
        presence_penalty: 0.1, // Encourage variety
        frequency_penalty: 0.1, // Reduce repetition
      });

      const content = response.choices[0]?.message?.content;
      
      // Track token usage
      const usage = response.usage;
      if (usage) {
        this.tokenUsage.totalInputTokens += usage.prompt_tokens || 0;
        this.tokenUsage.totalOutputTokens += usage.completion_tokens || 0;
        this.tokenUsage.totalRequests += 1;
        this.tokenUsage.costEstimate += 
          ((usage.prompt_tokens || 0) / 1_000_000) * this.INPUT_COST_PER_MILLION +
          ((usage.completion_tokens || 0) / 1_000_000) * this.OUTPUT_COST_PER_MILLION;
      }
      
      return content?.trim() || this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
    } catch (error) {
      console.warn('LLM response generation failed, using fallback:', error);
      return this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
    }
  }

  /**
   * Generate streaming response for real-time feedback
   * Returns an async generator that yields response chunks
   */
  async *generateStreamingResponse(
    query: string,
    intentAnalysis: IntentAnalysis,
    conversationHistory: any[],
    userProfile?: any,
    preferences?: any
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      // Fallback: yield full response at once
      const response = this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
      yield response;
      return;
    }

    try {
      const systemPrompt = `You are Style Shepherd, a friendly and knowledgeable fashion shopping assistant. 

Your personality:
- Warm, conversational, and genuinely enthusiastic about helping people find their perfect style
- Proactive in offering personalized style advice based on user preferences and context
- Remember user preferences, past purchases, and style history - reference them naturally
- Keep responses concise (1-2 sentences for voice, 2-3 for text) but informative
- Use the user's name when available to create a personal connection
- Be helpful and supportive, never pushy or salesy

Context awareness:
- Consider the user's intent: ${intentAnalysis.intent}
- Detected entities: ${JSON.stringify(intentAnalysis.entities)}
- User sentiment: ${intentAnalysis.sentiment || 'neutral'}

User profile: ${userProfile ? JSON.stringify(userProfile).substring(0, 200) : 'New user'}
User preferences: ${preferences ? JSON.stringify(preferences).substring(0, 200) : 'None yet'}`;

      const recentHistory = conversationHistory.slice(-5);
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      for (const msg of recentHistory) {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.message,
        });
      }

      messages.push({
        role: 'user',
        content: query,
      });

      const stream = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 200,
        stream: true,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.warn('LLM streaming response failed, using fallback:', error);
      const response = this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
      yield response;
    }
  }

  /**
   * Summarize conversation history for long contexts
   */
  async summarizeConversation(
    conversationHistory: any[],
    maxMessages: number = this.MAX_CONTEXT_MESSAGES
  ): Promise<ConversationSummary> {
    if (!this.client || conversationHistory.length <= maxMessages) {
      return {
        summary: 'Recent conversation',
        keyPoints: conversationHistory.slice(-5).map((m: any) => m.message.substring(0, 50)),
        timestamp: Date.now(),
      };
    }

    try {
      const messages = conversationHistory
        .slice(0, -maxMessages) // Messages to summarize
        .map((m: any) => `${m.type}: ${m.message}`)
        .join('\n');

      const response = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Summarize this conversation, extracting key points, user preferences mentioned, and important context. Return JSON: { "summary": "string", "keyPoints": ["string"], "userPreferences": {} }',
          },
          {
            role: 'user',
            content: messages,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          summary: parsed.summary || 'Conversation summary',
          keyPoints: parsed.keyPoints || [],
          userPreferences: parsed.userPreferences,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.warn('Conversation summarization failed:', error);
    }

    return {
      summary: 'Recent conversation',
      keyPoints: [],
      timestamp: Date.now(),
    };
  }

  /**
   * Analyze sentiment of user query
   */
  async analyzeSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    if (!this.client) {
      // Simple keyword-based sentiment
      const lowerText = text.toLowerCase();
      const positiveWords = ['love', 'great', 'perfect', 'amazing', 'wonderful', 'excellent', 'thanks', 'thank you'];
      const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'wrong', 'disappointed', 'frustrated', 'angry'];

      if (positiveWords.some(w => lowerText.includes(w))) return 'positive';
      if (negativeWords.some(w => lowerText.includes(w))) return 'negative';
      return 'neutral';
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of the user message. Respond with only one word: "positive", "neutral", or "negative".',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      });

      const sentiment = response.choices[0]?.message?.content?.trim().toLowerCase();
      if (sentiment === 'positive' || sentiment === 'negative') {
        return sentiment;
      }
      return 'neutral';
    } catch (error) {
      console.warn('Sentiment analysis failed:', error);
      return 'neutral';
    }
  }

  /**
   * Fallback intent extraction using keyword matching
   */
  private fallbackIntentExtraction(text: string): IntentAnalysis {
    const lowerText = text.toLowerCase();
    const entities: Record<string, any> = {};
    let detectedIntent = 'general_question';
    let confidence = 0.5;

    // Intent detection
    if (lowerText.match(/\b(remember|save|store|prefer|my preference|i like|i wear)\b/i)) {
      detectedIntent = 'save_preference';
      confidence = 0.85;
    } else if (lowerText.match(/\b(find|search|show|get|looking for)\b/i)) {
      detectedIntent = 'search_product';
      confidence = 0.8;
    } else if (lowerText.match(/\b(recommend|suggest|what should|advice)\b/i)) {
      detectedIntent = 'get_recommendations';
      confidence = 0.85;
    } else if (lowerText.match(/\b(size|fit|measurement|small|medium|large)\b/i)) {
      detectedIntent = 'ask_about_size';
      confidence = 0.75;
    } else if (lowerText.match(/\b(add|cart|buy|purchase)\b/i)) {
      detectedIntent = 'add_to_cart';
      confidence = 0.8;
    } else if (lowerText.match(/\b(return|refund|exchange)\b/i)) {
      detectedIntent = 'return_product';
      confidence = 0.9;
    } else if (lowerText.match(/\b(order|track|shipping|delivery)\b/i)) {
      detectedIntent = 'track_order';
      confidence = 0.85;
    }

    // Entity extraction
    const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'pink', 'purple', 'orange', 'gray', 'grey', 'navy', 'beige', 'brown'];
    const categories = ['dress', 'shirt', 'pants', 'jeans', 'jacket', 'coat', 'shoes', 'boots', 'sneakers', 'heels', 'skirt', 'top', 'blouse'];
    const occasions = ['wedding', 'party', 'casual', 'formal', 'business', 'date', 'work', 'weekend', 'vacation'];
    const sizes = ['xs', 'small', 's', 'medium', 'm', 'large', 'l', 'xl', 'xxl'];
    const brands = ['nike', 'adidas', 'zara', 'h&m', 'gucci', 'prada', 'versace', 'calvin klein', 'tommy hilfiger', 'levi\'s', 'levis'];

    for (const color of colors) {
      if (lowerText.includes(color)) {
        entities.color = color;
        break;
      }
    }

    for (const category of categories) {
      if (lowerText.includes(category)) {
        entities.category = category;
        break;
      }
    }

    for (const occasion of occasions) {
      if (lowerText.includes(occasion)) {
        entities.occasion = occasion;
        break;
      }
    }

    for (const size of sizes) {
      if (lowerText.includes(size)) {
        entities.size = size.toUpperCase();
        break;
      }
    }

    for (const brand of brands) {
      if (lowerText.includes(brand)) {
        entities.brand = brand;
        break;
      }
    }

    const priceMatch = lowerText.match(/\$?(\d+)(?:\s*-\s*\$?(\d+))?/);
    if (priceMatch) {
      entities.priceRange = {
        min: parseInt(priceMatch[1]),
        max: priceMatch[2] ? parseInt(priceMatch[2]) : undefined,
      };
    }

    return {
      intent: detectedIntent,
      entities,
      confidence: Math.min(0.95, confidence),
      sentiment: 'neutral',
    };
  }

  /**
   * Fallback response generation
   */
  private fallbackResponse(
    query: string,
    intentAnalysis: IntentAnalysis,
    userProfile?: any,
    preferences?: any
  ): string {
    const userName = userProfile?.name || userProfile?.firstName || 'there';
    const { intent, entities } = intentAnalysis;

    switch (intent) {
      case 'search_product': {
        const productDesc = [];
        if (entities.color) productDesc.push(entities.color);
        if (entities.category) productDesc.push(entities.category);
        const searchDesc = productDesc.length > 0 ? productDesc.join(' ') : 'items';
        return `I'll help you find ${searchDesc}${entities.occasion ? ` for ${entities.occasion}` : ''}. Let me search our collection for you, ${userName}!`;
      }

      case 'get_recommendations': {
        const prefText = preferences?.stylePreferences?.length
          ? ` based on your preference for ${preferences.stylePreferences.join(' and ')}`
          : '';
        return `Based on your style preferences${prefText}${entities.occasion ? ` and the ${entities.occasion} occasion` : ''}, I have some great recommendations for you!`;
      }

      case 'ask_about_size':
        return `I can help you find the perfect size! ${entities.size ? `You mentioned size ${entities.size}. ` : ''}Would you like me to check your measurements and recommend the best fit?`;

      case 'add_to_cart':
        return `Great choice! I'll add that to your cart. Would you like to continue shopping or proceed to checkout?`;

      case 'return_product':
        return `I can help you with your return. Do you have an order number, or would you like me to look up your recent orders?`;

      case 'track_order':
        return `Let me check the status of your order for you. One moment please!`;

      default:
        return `Hi ${userName}! I'm here to help you find the perfect fashion items. You can ask me to search for products, get recommendations, check sizes, or help with your orders. What would you like to explore today?`;
    }
  }

  /**
   * Check if LLM service is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage() {
    return {
      ...this.tokenUsage,
      totalTokens: this.tokenUsage.totalInputTokens + this.tokenUsage.totalOutputTokens,
      averageInputTokens: this.tokenUsage.totalRequests > 0 
        ? Math.round(this.tokenUsage.totalInputTokens / this.tokenUsage.totalRequests)
        : 0,
      averageOutputTokens: this.tokenUsage.totalRequests > 0
        ? Math.round(this.tokenUsage.totalOutputTokens / this.tokenUsage.totalRequests)
        : 0,
    };
  }

  /**
   * Reset token usage statistics
   */
  resetTokenUsage(): void {
    this.tokenUsage = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalRequests: 0,
      costEstimate: 0,
    };
  }

  /**
   * Generate streaming response (for real-time responses)
   */
  async generateStreamingResponse(
    query: string,
    intentAnalysis: IntentAnalysis,
    conversationHistory: any[],
    userProfile?: any,
    preferences?: any,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!this.client) {
      return this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
    }

    try {
      const systemPrompt = `You are a friendly and helpful fashion shopping assistant named Style Shepherd. 
Your personality:
- Warm, conversational, and enthusiastic about fashion
- Proactive in offering style advice
- Remember user preferences and reference them naturally
- Keep responses concise (1-2 sentences for voice, 2-3 for text)
- Use the user's name when available
- Be helpful but not pushy

User profile: ${userProfile ? JSON.stringify(userProfile).substring(0, 200) : 'New user'}
User preferences: ${preferences ? JSON.stringify(preferences).substring(0, 200) : 'None yet'}`;

      const recentHistory = conversationHistory.slice(-5);
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      for (const msg of recentHistory) {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.message,
        });
      }

      messages.push({
        role: 'user',
        content: query,
      });

      const stream = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 150,
        stream: true,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      // Track approximate token usage for streaming
      this.tokenUsage.totalRequests += 1;
      const estimatedInputTokens = messages.reduce((sum, m) => 
        sum + (typeof m.content === 'string' ? m.content.length / 4 : 0), 0
      );
      const estimatedOutputTokens = fullResponse.length / 4;
      this.tokenUsage.totalInputTokens += estimatedInputTokens;
      this.tokenUsage.totalOutputTokens += estimatedOutputTokens;
      this.tokenUsage.costEstimate += 
        (estimatedInputTokens / 1_000_000) * this.INPUT_COST_PER_MILLION +
        (estimatedOutputTokens / 1_000_000) * this.OUTPUT_COST_PER_MILLION;

      return fullResponse.trim() || this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
    } catch (error) {
      console.warn('LLM streaming response generation failed, using fallback:', error);
      return this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
    }
  }
}

export const llmService = new LLMService();

