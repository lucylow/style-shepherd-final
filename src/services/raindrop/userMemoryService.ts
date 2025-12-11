/**
 * SmartMemory Service - User Profiles and Context
 * 
 * Manages user context, preferences, and conversational history
 * using Raindrop SmartMemory.
 */

import { userMemory } from '@/integrations/raindrop/config';

export interface UserProfile {
  userId: string;
  preferences?: {
    favoriteColors?: string[];
    preferredBrands?: string[];
    preferredStyles?: string[];
    preferredSizes?: string[];
  };
  bodyMeasurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
  };
  orderHistory?: Array<{
    id: string;
    date?: string;
    items: any[];
  }>;
  returnHistory?: Array<{
    productId: string;
    reason?: string;
    date?: string;
  }>;
  updatedAt?: string;
}

export interface ConversationEntry {
  message: string;
  timestamp: number;
  type?: 'user' | 'assistant';
  context?: Record<string, any>;
}

export interface StyleEvolutionEntry {
  timestamp: number;
  styleVector: number[];
  preferences: {
    favoriteColors?: string[];
    preferredBrands?: string[];
    preferredStyles?: string[];
  };
  metadata?: {
    source?: 'purchase' | 'interaction' | 'feedback' | 'explicit';
    confidence?: number;
  };
}

export interface SessionData {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  interactions?: number;
  productsViewed?: string[];
  intentHistory?: string[];
  context?: Record<string, any>;
}

class UserMemoryService {
  /**
   * Store or update user profile with comprehensive error handling
   */
  async saveUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    try {
      const existing = await this.getUserProfile(userId);
      const updated = {
        ...existing,
        ...profile,
        userId,
        updatedAt: new Date().toISOString(),
      };
      await userMemory.set(userId, updated);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UserMemoryService] Failed to save user profile for ${userId}:`, errorMessage);
      throw new Error(`Failed to save user profile: ${errorMessage}`);
    }
  }

  /**
   * Retrieve user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await userMemory.get(userId);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Append to conversation history
   */
  async appendConversation(userId: string, entry: ConversationEntry): Promise<void> {
    const conversationKey = `${userId}-conversation`;
    await userMemory.append(conversationKey, entry);
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId: string, limit?: number): Promise<ConversationEntry[]> {
    try {
      const history = await userMemory.get(`${userId}-conversation`) || [];
      const sorted = Array.isArray(history) 
        ? history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        : [];
      return limit ? sorted.slice(0, limit) : sorted;
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: UserProfile['preferences']): Promise<void> {
    const profile = await this.getUserProfile(userId);
    await this.saveUserProfile(userId, {
      ...profile,
      preferences: {
        ...profile?.preferences,
        ...preferences,
      },
    });
  }

  /**
   * Track product view/interaction
   */
  async trackInteraction(userId: string, productId: string, interactionType: 'view' | 'like' | 'cart' | 'purchase'): Promise<void> {
    const interactionKey = `${userId}-interactions`;
    const interactions = await userMemory.get(interactionKey) || [];
    await userMemory.set(interactionKey, [
      ...(Array.isArray(interactions) ? interactions : []),
      {
        productId,
        type: interactionType,
        timestamp: Date.now(),
      },
    ]);
  }

  /**
   * Get user interaction history
   */
  async getInteractionHistory(userId: string): Promise<any[]> {
    try {
      return await userMemory.get(`${userId}-interactions`) || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UserMemoryService] Failed to get interaction history for ${userId}:`, errorMessage);
      return [];
    }
  }

  /**
   * Track style evolution over time
   * Stores a user's changing style preferences to demonstrate long-term personalization
   */
  async trackStyleEvolution(userId: string, styleVector: number[]): Promise<void> {
    try {
      if (!Array.isArray(styleVector) || styleVector.length === 0) {
        throw new Error('Style vector must be a non-empty array');
      }

      const evolutionKey = `${userId}-style-evolution`;
      const existing = await userMemory.get(evolutionKey) || [];
      
      const profile = await this.getUserProfile(userId);
      const evolutionEntry: StyleEvolutionEntry = {
        timestamp: Date.now(),
        styleVector,
        preferences: {
          favoriteColors: profile?.preferences?.favoriteColors,
          preferredBrands: profile?.preferences?.preferredBrands,
          preferredStyles: profile?.preferences?.preferredStyles,
        },
        metadata: {
          source: 'interaction',
          confidence: 0.8,
        },
      };

      const updated = Array.isArray(existing) 
        ? [...existing, evolutionEntry]
        : [evolutionEntry];

      await userMemory.set(evolutionKey, updated);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UserMemoryService] Failed to track style evolution for ${userId}:`, errorMessage);
      throw new Error(`Failed to track style evolution: ${errorMessage}`);
    }
  }

  /**
   * Get style evolution history
   */
  async getStyleEvolution(userId: string, limit?: number): Promise<StyleEvolutionEntry[]> {
    try {
      const evolutionKey = `${userId}-style-evolution`;
      const history = await userMemory.get(evolutionKey) || [];
      const sorted = Array.isArray(history)
        ? history.sort((a: StyleEvolutionEntry, b: StyleEvolutionEntry) => b.timestamp - a.timestamp)
        : [];
      return limit ? sorted.slice(0, limit) : sorted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UserMemoryService] Failed to get style evolution for ${userId}:`, errorMessage);
      return [];
    }
  }

  /**
   * Start a new user session
   * Stores session data in SmartMemory for tracking and analytics
   */
  async startSession(userId: string, context?: Record<string, any>): Promise<string> {
    try {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const sessionData: SessionData = {
        sessionId,
        userId,
        startTime: Date.now(),
        interactions: 0,
        productsViewed: [],
        intentHistory: [],
        context: context || {},
      };

      const sessionKey = `${userId}-sessions`;
      const existing = await userMemory.get(sessionKey) || [];
      const updated = Array.isArray(existing) ? [...existing, sessionData] : [sessionData];
      
      await userMemory.set(sessionKey, updated);
      
      // Also store active session
      await userMemory.set(`${userId}-active-session`, sessionData);
      
      return sessionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UserMemoryService] Failed to start session for ${userId}:`, errorMessage);
      throw new Error(`Failed to start session: ${errorMessage}`);
    }
  }

  /**
   * End a user session
   * Updates session data with end time and final statistics
   */
  async endSession(userId: string, sessionId?: string): Promise<void> {
    try {
      const activeSessionKey = `${userId}-active-session`;
      const session = sessionId 
        ? await this.getSession(userId, sessionId)
        : await userMemory.get(activeSessionKey);

      if (!session) {
        console.warn(`[UserMemoryService] No active session found for ${userId}`);
        return;
      }

      const updatedSession: SessionData = {
        ...session,
        endTime: Date.now(),
      };

      // Update in sessions list
      const sessionKey = `${userId}-sessions`;
      const sessions = await userMemory.get(sessionKey) || [];
      const updatedSessions = Array.isArray(sessions)
        ? sessions.map((s: SessionData) => 
            s.sessionId === updatedSession.sessionId ? updatedSession : s
          )
        : [updatedSession];

      await userMemory.set(sessionKey, updatedSessions);
      
      // Clear active session
      await userMemory.delete(activeSessionKey);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UserMemoryService] Failed to end session for ${userId}:`, errorMessage);
      // Don't throw - session ending is non-critical
    }
  }

  /**
   * Get a specific session
   */
  async getSession(userId: string, sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = `${userId}-sessions`;
      const sessions = await userMemory.get(sessionKey) || [];
      const session = Array.isArray(sessions)
        ? sessions.find((s: SessionData) => s.sessionId === sessionId)
        : null;
      return session || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UserMemoryService] Failed to get session ${sessionId} for ${userId}:`, errorMessage);
      return null;
    }
  }

  /**
   * Get active session
   */
  async getActiveSession(userId: string): Promise<SessionData | null> {
    try {
      return await userMemory.get(`${userId}-active-session`) || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UserMemoryService] Failed to get active session for ${userId}:`, errorMessage);
      return null;
    }
  }

  /**
   * Update session with interaction
   */
  async updateSession(userId: string, updates: Partial<SessionData>): Promise<void> {
    try {
      const activeSession = await this.getActiveSession(userId);
      if (!activeSession) {
        console.warn(`[UserMemoryService] No active session to update for ${userId}`);
        return;
      }

      const updatedSession: SessionData = {
        ...activeSession,
        ...updates,
        interactions: (activeSession.interactions || 0) + 1,
      };

      await userMemory.set(`${userId}-active-session`, updatedSession);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UserMemoryService] Failed to update session for ${userId}:`, errorMessage);
      // Don't throw - session updates are non-critical
    }
  }
}

export const userMemoryService = new UserMemoryService();

