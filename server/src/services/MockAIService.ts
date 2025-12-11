/**
 * Mock AI Service
 * Provides intelligent fallback responses when real AI services are unavailable
 * Designed to maintain a good user experience even when AI APIs fail
 */

export interface MockIntentAnalysis {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  context?: Record<string, any>;
}

export interface MockSTTResult {
  text: string;
  confidence: number;
  source: 'mock';
  language?: string;
}

export class MockAIService {
  private readonly INTENT_PATTERNS: Record<string, RegExp[]> = {
    search_product: [
      /\b(find|search|show|get|looking for|need|want|see)\b/i,
      /\b(dress|shirt|pants|jeans|shoes|jacket|coat|skirt|top|blouse)\b/i,
    ],
    get_recommendations: [
      /\b(recommend|suggest|what should|advice|help me choose|what would|ideas)\b/i,
      /\b(style|outfit|look|wear|pair|match)\b/i,
    ],
    ask_about_size: [
      /\b(size|fit|measurement|small|medium|large|xs|xl|sizing|too big|too small)\b/i,
      /\b(what size|which size|size chart|measurements)\b/i,
    ],
    check_availability: [
      /\b(available|in stock|have|carry|sell|inventory)\b/i,
      /\b(is.*available|do you have|do you sell)\b/i,
    ],
    add_to_cart: [
      /\b(add|cart|buy|purchase|checkout|order|get this)\b/i,
      /\b(put.*cart|add.*bag|buy.*now)\b/i,
    ],
    get_style_advice: [
      /\b(style|fashion|advice|tips|how to|what goes|coordinate|match)\b/i,
      /\b(should i|can i|would|outfit|look good)\b/i,
    ],
    return_product: [
      /\b(return|refund|exchange|send back|take back)\b/i,
      /\b(not.*right|wrong.*size|doesn't fit|don't like)\b/i,
    ],
    track_order: [
      /\b(order|track|shipping|delivery|status|when|where)\b/i,
      /\b(where.*order|when.*arrive|tracking|shipped)\b/i,
    ],
    save_preference: [
      /\b(remember|save|store|prefer|my preference|i like|i wear|i'm a)\b/i,
      /\b(always|usually|typically|normally)\b/i,
    ],
  };

  private readonly ENTITY_PATTERNS: Record<string, RegExp[]> = {
    color: [
      /\b(red|blue|green|black|white|yellow|pink|purple|orange|gray|grey|navy|beige|brown|tan|maroon|burgundy|teal|turquoise|lavender|mint|cream|ivory|charcoal)\b/i,
    ],
    category: [
      /\b(dress|shirt|pants|jeans|jacket|coat|shoes|boots|sneakers|heels|flats|skirt|top|blouse|sweater|hoodie|cardigan|shorts|tank|t-shirt|tshirt)\b/i,
    ],
    size: [
      /\b(xs|small|s|medium|m|large|l|xl|xxl|xxxl|0|2|4|6|8|10|12|14|16|18|20|22|24|26|28|30|32|34|36|38|40|42|44|46|48|50)\b/i,
    ],
    brand: [
      /\b(nike|adidas|zara|h&m|hm|gucci|prada|versace|calvin klein|tommy hilfiger|levi's|levis|ralph lauren|michael kors|coach|chanel|dior|louis vuitton|lv)\b/i,
    ],
    occasion: [
      /\b(wedding|party|casual|formal|business|date|work|weekend|vacation|beach|dinner|night|day|event|celebration|holiday)\b/i,
    ],
    priceRange: [
      /\$?(\d+)(?:\s*-\s*\$?(\d+))?/,
      /\b(cheap|affordable|budget|expensive|luxury|premium|under|over)\b/i,
    ],
  };

  /**
   * Extract intent and entities using pattern matching
   */
  extractIntentAndEntities(
    text: string,
    conversationHistory?: any[],
    userProfile?: any
  ): MockIntentAnalysis {
    const lowerText = text.toLowerCase();
    const entities: Record<string, any> = {};
    let detectedIntent = 'general_question';
    let confidence = 0.5;
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

    // Detect sentiment
    const positiveWords = ['love', 'great', 'perfect', 'amazing', 'wonderful', 'excellent', 'thanks', 'thank you', 'awesome', 'fantastic'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'wrong', 'disappointed', 'frustrated', 'angry', 'horrible', 'worst'];
    
    if (positiveWords.some(w => lowerText.includes(w))) {
      sentiment = 'positive';
    } else if (negativeWords.some(w => lowerText.includes(w))) {
      sentiment = 'negative';
    }

    // Detect intent with pattern matching
    let maxMatches = 0;
    for (const [intent, patterns] of Object.entries(this.INTENT_PATTERNS)) {
      const matches = patterns.filter(pattern => pattern.test(text)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedIntent = intent;
        confidence = Math.min(0.95, 0.5 + (matches * 0.15));
      }
    }

    // Extract entities
    for (const [entityType, patterns] of Object.entries(this.ENTITY_PATTERNS)) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          if (entityType === 'priceRange') {
            entities.priceRange = {
              min: parseInt(match[1]),
              max: match[2] ? parseInt(match[2]) : undefined,
            };
          } else if (entityType === 'size') {
            entities.size = match[0].toUpperCase();
          } else if (entityType === 'color') {
            entities.color = match[0].toLowerCase();
          } else if (entityType === 'category') {
            entities.category = match[0].toLowerCase();
          } else if (entityType === 'brand') {
            entities.brand = match[0].toLowerCase();
          } else if (entityType === 'occasion') {
            entities.occasion = match[0].toLowerCase();
          }
          break;
        }
      }
    }

    // Extract product ID if mentioned
    const productIdMatch = text.match(/\b(?:product|item|id)[\s#:]*([a-z0-9-]+)\b/i);
    if (productIdMatch) {
      entities.productId = productIdMatch[1];
    }

    // Use conversation history to improve confidence
    if (conversationHistory && conversationHistory.length > 0) {
      const recentIntents = conversationHistory
        .slice(-3)
        .filter((m: any) => m.intent)
        .map((m: any) => m.intent);
      
      if (recentIntents.includes(detectedIntent)) {
        confidence = Math.min(0.95, confidence + 0.1);
      }
    }

    return {
      intent: detectedIntent,
      entities,
      confidence: Math.min(0.95, Math.max(0.5, confidence)),
      sentiment,
      context: {
        textLength: text.length,
        hasEntities: Object.keys(entities).length > 0,
      },
    };
  }

  /**
   * Generate contextual response using rule-based logic
   */
  generateResponse(
    query: string,
    intentAnalysis: MockIntentAnalysis,
    conversationHistory: any[],
    userProfile?: any,
    preferences?: any
  ): string {
    const userName = userProfile?.name || userProfile?.firstName || 'there';
    const { intent, entities, sentiment } = intentAnalysis;

    // Build response based on intent
    switch (intent) {
      case 'search_product': {
        const productDesc: string[] = [];
        if (entities.color) productDesc.push(entities.color);
        if (entities.category) productDesc.push(entities.category);
        const searchDesc = productDesc.length > 0 ? productDesc.join(' ') : 'items';
        
        let response = `I'll help you find ${searchDesc}`;
        if (entities.occasion) {
          response += ` for ${entities.occasion}`;
        }
        response += `. Let me search our collection for you, ${userName}!`;
        
        if (entities.priceRange) {
          response += ` I'll focus on items in your price range.`;
        }
        
        return response;
      }

      case 'get_recommendations': {
        let response = `Based on your preferences`;
        if (preferences?.stylePreferences?.length) {
          response += ` for ${preferences.stylePreferences.join(' and ')}`;
        }
        if (entities.occasion) {
          response += ` and the ${entities.occasion} occasion`;
        }
        response += `, I have some great recommendations for you!`;
        
        if (entities.color) {
          response += ` I'll include some ${entities.color} options.`;
        }
        
        return response;
      }

      case 'ask_about_size':
        let sizeResponse = `I can help you find the perfect size!`;
        if (entities.size) {
          sizeResponse += ` You mentioned size ${entities.size}.`;
        }
        if (entities.brand) {
          sizeResponse += ` For ${entities.brand}, sizing can vary, so let me check the size chart for you.`;
        }
        sizeResponse += ` Would you like me to recommend the best fit based on your measurements?`;
        return sizeResponse;

      case 'add_to_cart':
        return `Great choice! I'll add that to your cart. Would you like to continue shopping or proceed to checkout?`;

      case 'return_product':
        return `I can help you with your return. Do you have an order number, or would you like me to look up your recent orders?`;

      case 'track_order':
        return `Let me check the status of your order for you. One moment please!`;

      case 'check_availability':
        let availResponse = `Let me check availability for you.`;
        if (entities.category) {
          availResponse += ` I'll look for ${entities.category}`;
          if (entities.size) {
            availResponse += ` in size ${entities.size}`;
          }
          availResponse += `.`;
        }
        return availResponse;

      case 'get_style_advice':
        let styleResponse = `I'd be happy to help with style advice!`;
        if (entities.occasion) {
          styleResponse += ` For a ${entities.occasion}, I'd recommend`;
          if (entities.color) {
            styleResponse += ` ${entities.color}`;
          }
          if (entities.category) {
            styleResponse += ` ${entities.category}`;
          }
          styleResponse += `.`;
        } else {
          styleResponse += ` What occasion or style are you looking for?`;
        }
        return styleResponse;

      case 'save_preference':
        let prefResponse = `I'll remember that for you!`;
        if (entities.size && entities.brand) {
          prefResponse += ` So you're a size ${entities.size} in ${entities.brand}.`;
        }
        prefResponse += ` I'll use this for future recommendations.`;
        return prefResponse;

      default:
        // General response with sentiment awareness
        if (sentiment === 'negative') {
          return `I'm sorry to hear that, ${userName}. Let me help you find what you're looking for. What can I assist you with today?`;
        } else if (sentiment === 'positive') {
          return `I'm glad I could help, ${userName}! Is there anything else you'd like to explore?`;
        }
        return `Hi ${userName}! I'm here to help you find the perfect fashion items. You can ask me to search for products, get recommendations, check sizes, or help with your orders. What would you like to explore today?`;
    }
  }

  /**
   * Mock speech-to-text transcription
   * Uses pattern matching to extract likely text from audio metadata or generates reasonable text
   */
  transcribe(
    audioBuffer: Buffer | ArrayBuffer,
    options?: { language?: string; prompt?: string }
  ): MockSTTResult {
    // In a real mock scenario, we might have some metadata or use the prompt
    // For now, generate a reasonable transcription based on common patterns
    
    let mockText = 'Hello, I need fashion advice';
    
    if (options?.prompt) {
      // Use the prompt as a hint for what was likely said
      const promptLower = options.prompt.toLowerCase();
      if (promptLower.includes('search') || promptLower.includes('find')) {
        mockText = 'I am looking for a dress';
      } else if (promptLower.includes('size') || promptLower.includes('fit')) {
        mockText = 'What size should I get?';
      } else if (promptLower.includes('recommend')) {
        mockText = 'Can you recommend something for me?';
      } else if (promptLower.includes('order') || promptLower.includes('track')) {
        mockText = 'Where is my order?';
      }
    }

    // Add some variation based on audio buffer size (simulating different audio lengths)
    const bufferSize = audioBuffer instanceof Buffer ? audioBuffer.length : audioBuffer.byteLength;
    if (bufferSize > 100000) {
      // Longer audio, might be a longer query
      mockText += ' I would like to see some options';
    }

    return {
      text: mockText,
      confidence: 0.75, // Moderate confidence for mock
      source: 'mock',
      language: options?.language || 'en',
    };
  }

  /**
   * Generate mock recommendations
   */
  generateMockRecommendations(
    userPreferences?: any,
    context?: any
  ): Array<{ productId: string; score: number; confidence: number; reasons: string[] }> {
    const mockProducts = [
      { id: 'prod_mock_1', name: 'Classic White Shirt', category: 'shirt', color: 'white', score: 0.85 },
      { id: 'prod_mock_2', name: 'Blue Denim Jeans', category: 'jeans', color: 'blue', score: 0.80 },
      { id: 'prod_mock_3', name: 'Black Leather Jacket', category: 'jacket', color: 'black', score: 0.75 },
      { id: 'prod_mock_4', name: 'Red Summer Dress', category: 'dress', color: 'red', score: 0.70 },
      { id: 'prod_mock_5', name: 'White Sneakers', category: 'shoes', color: 'white', score: 0.65 },
    ];

    // Filter based on preferences if provided
    let filtered = mockProducts;
    if (userPreferences?.favoriteColors?.length) {
      filtered = filtered.filter(p => 
        userPreferences.favoriteColors.some((c: string) => 
          p.color.toLowerCase().includes(c.toLowerCase())
        )
      );
    }
    if (context?.occasion) {
      // Adjust scores based on occasion
      filtered = filtered.map(p => ({
        ...p,
        score: p.score + (context.occasion === 'casual' ? 0.1 : 0),
      }));
    }

    return filtered.map(p => ({
      productId: p.id,
      score: p.score,
      confidence: 0.7,
      reasons: [
        `Matches your style preferences`,
        `Popular choice for ${context?.occasion || 'everyday wear'}`,
        `High quality and well-reviewed`,
      ],
    }));
  }

  /**
   * Analyze sentiment
   */
  analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const lowerText = text.toLowerCase();
    const positiveWords = ['love', 'great', 'perfect', 'amazing', 'wonderful', 'excellent', 'thanks', 'thank you', 'awesome', 'fantastic', 'beautiful', 'nice'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'wrong', 'disappointed', 'frustrated', 'angry', 'horrible', 'worst', 'dislike', 'poor'];

    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Summarize conversation
   */
  summarizeConversation(conversationHistory: any[]): {
    summary: string;
    keyPoints: string[];
    userPreferences?: Record<string, any>;
    timestamp: number;
  } {
    const recentMessages = conversationHistory.slice(-10);
    const intents = recentMessages
      .filter((m: any) => m.intent)
      .map((m: any) => m.intent);
    
    const mostCommonIntent = intents.length > 0
      ? intents.sort((a, b) => 
          intents.filter(v => v === a).length - intents.filter(v => v === b).length
        ).pop() || 'general_question'
      : 'general_question';

    const keyPoints = recentMessages
      .slice(-5)
      .map((m: any) => m.message?.substring(0, 50) || '')
      .filter(Boolean);

    const preferences: Record<string, any> = {};
    recentMessages.forEach((m: any) => {
      if (m.entities?.size && m.entities?.brand) {
        preferences.sizePreferences = preferences.sizePreferences || {};
        preferences.sizePreferences[m.entities.brand] = m.entities.size;
      }
      if (m.entities?.color) {
        preferences.colorPreferences = preferences.colorPreferences || [];
        if (!preferences.colorPreferences.includes(m.entities.color)) {
          preferences.colorPreferences.push(m.entities.color);
        }
      }
    });

    return {
      summary: `User has been ${mostCommonIntent.replace('_', ' ')}. Recent conversation focused on fashion shopping.`,
      keyPoints,
      userPreferences: Object.keys(preferences).length > 0 ? preferences : undefined,
      timestamp: Date.now(),
    };
  }
}

export const mockAIService = new MockAIService();
