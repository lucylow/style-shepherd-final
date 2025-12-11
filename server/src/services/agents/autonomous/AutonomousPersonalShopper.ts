/**
 * Autonomous Personal Shopper Agent
 * 
 * Level 2: PROACTIVE - Monitors calendar, weather, stock alerts, budget cycles
 * Level 3: TRANSACTIONAL - Auto-adds to cart with approval thresholds
 * Level 4: SELF-HEALING - Handles stockouts, returns, reorders
 * Level 5: FORECASTING - Predicts needs before user knows
 */

import { PrismaClient } from '@prisma/client';
import { personalShopperAgent, type OutfitRecommendationParams } from '../PersonalShopperAgent.js';
import { searchAgent } from '../SearchAgent.js';
import { vultrValkey } from '../../../lib/vultr-valkey.js';
import { userMemory } from '../../../lib/raindrop-config.js';

const prisma = new PrismaClient();

export interface ProactiveTrigger {
  type: 'calendar' | 'weather' | 'stock' | 'budget' | 'schedule';
  data: any;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export interface AutonomousAction {
  actionType: 'curate' | 'add_to_cart' | 'purchase' | 'notify';
  outfits?: any[];
  items?: any[];
  reason: string;
  requiresApproval: boolean;
}

export class AutonomousPersonalShopper {
  private readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Monitor user and execute proactive actions
   */
  async monitorUser(userId: string): Promise<void> {
    try {
      // Get user autonomy settings
      const settings = await this.getAutonomySettings(userId);
      if (!settings || settings.autonomyLevel < 2) {
        return; // User hasn't enabled proactive features
      }

      // Check all proactive triggers
      const triggers = await this.checkTriggers(userId, settings);
      
      if (triggers.length === 0) {
        return;
      }

      // Process triggers by priority
      const highPriorityTriggers = triggers.filter(t => t.priority === 'high');
      
      for (const trigger of highPriorityTriggers) {
        await this.handleTrigger(userId, trigger, settings);
      }

      // Log trigger activity
      await this.logTrigger(userId, triggers);
    } catch (error) {
      console.error(`[AutonomousPersonalShopper] Error monitoring user ${userId}:`, error);
    }
  }

  /**
   * Check all proactive triggers for a user
   */
  private async checkTriggers(userId: string, settings: any): Promise<ProactiveTrigger[]> {
    const triggers: ProactiveTrigger[] = [];

    // Check enabled triggers from settings
    const personalShopperConfig = settings.personalShopper || {};
    if (!personalShopperConfig.enabled) {
      return triggers;
    }

    const enabledTriggers = personalShopperConfig.triggers || [];

    // 1. Calendar Events
    if (enabledTriggers.includes('calendar')) {
      const calendarTriggers = await this.checkCalendarEvents(userId);
      triggers.push(...calendarTriggers);
    }

    // 2. Weather API
    if (enabledTriggers.includes('weather')) {
      const weatherTrigger = await this.checkWeather(userId);
      if (weatherTrigger) {
        triggers.push(weatherTrigger);
      }
    }

    // 3. Stock Alerts
    if (enabledTriggers.includes('stock')) {
      const stockTriggers = await this.checkStockAlerts(userId);
      triggers.push(...stockTriggers);
    }

    // 4. Budget Cycle (payday detection)
    if (enabledTriggers.includes('budget')) {
      const budgetTrigger = await this.checkBudgetCycle(userId);
      if (budgetTrigger) {
        triggers.push(budgetTrigger);
      }
    }

    return triggers;
  }

  /**
   * Check calendar events for upcoming occasions
   */
  private async checkCalendarEvents(userId: string): Promise<ProactiveTrigger[]> {
    const triggers: ProactiveTrigger[] = [];

    try {
      // Get upcoming calendar events (next 7 days)
      const upcomingEvents = await prisma.calendarEvent.findMany({
        where: {
          userId,
          startTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          processed: false,
        },
        orderBy: { startTime: 'asc' },
        take: 5,
      });

      for (const event of upcomingEvents) {
        // Detect occasion type from event title/type
        const occasion = this.detectOccasionFromEvent(event);
        
        if (occasion) {
          triggers.push({
            type: 'calendar',
            data: {
              eventId: event.id,
              eventTitle: event.eventTitle,
              occasion,
              startTime: event.startTime,
            },
            priority: this.getPriorityForOccasion(occasion),
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('[AutonomousPersonalShopper] Error checking calendar:', error);
    }

    return triggers;
  }

  /**
   * Check weather conditions for proactive recommendations
   */
  private async checkWeather(userId: string): Promise<ProactiveTrigger | null> {
    try {
      // Get user location from profile
      const profile = await userMemory.get(userId);
      const location = profile?.location;
      
      if (!location) {
        return null; // No location data
      }

      // Mock weather API call (replace with actual weather API)
      // In production, use OpenWeatherMap, WeatherAPI, etc.
      const weatherData = await this.fetchWeather(location);
      
      if (!weatherData) {
        return null;
      }

      // Check if weather requires special clothing
      if (weatherData.condition === 'rain' || weatherData.condition === 'snow') {
        return {
          type: 'weather',
          data: {
            condition: weatherData.condition,
            temperature: weatherData.temperature,
            forecast: weatherData.forecast,
          },
          priority: 'high',
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('[AutonomousPersonalShopper] Error checking weather:', error);
      return null;
    }
  }

  /**
   * Check stock alerts for favorite brands/products
   */
  private async checkStockAlerts(userId: string): Promise<ProactiveTrigger[]> {
    const triggers: ProactiveTrigger[] = [];

    try {
      const profile = await userMemory.get(userId);
      const favoriteBrands = profile?.preferences?.brands || [];

      // Check for restocks of favorite brands
      // In production, integrate with product inventory APIs
      for (const brand of favoriteBrands.slice(0, 3)) {
        const restockedItems = await this.checkBrandRestock(brand);
        
        if (restockedItems.length > 0) {
          triggers.push({
            type: 'stock',
            data: {
              brand,
              restockedItems,
            },
            priority: 'medium',
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('[AutonomousPersonalShopper] Error checking stock:', error);
    }

    return triggers;
  }

  /**
   * Check budget cycle (payday detection)
   */
  private async checkBudgetCycle(userId: string): Promise<ProactiveTrigger | null> {
    try {
      const profile = await userMemory.get(userId);
      
      // Simple payday detection based on date patterns
      // In production, learn from user purchase patterns
      const today = new Date();
      const dayOfMonth = today.getDate();
      
      // Common paydays: 1st, 15th, last Friday
      if (dayOfMonth === 1 || dayOfMonth === 15) {
        return {
          type: 'budget',
          data: {
            detectedPayday: true,
            suggestedBudget: profile?.budget || 200,
          },
          priority: 'low',
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('[AutonomousPersonalShopper] Error checking budget:', error);
      return null;
    }
  }

  /**
   * Handle a specific trigger and execute autonomous actions
   */
  private async handleTrigger(userId: string, trigger: ProactiveTrigger, settings: any): Promise<void> {
    try {
      let action: AutonomousAction | null = null;

      switch (trigger.type) {
        case 'calendar':
          action = await this.handleCalendarTrigger(userId, trigger, settings);
          break;
        case 'weather':
          action = await this.handleWeatherTrigger(userId, trigger, settings);
          break;
        case 'stock':
          action = await this.handleStockTrigger(userId, trigger, settings);
          break;
        case 'budget':
          action = await this.handleBudgetTrigger(userId, trigger, settings);
          break;
      }

      if (action) {
        await this.executeAction(userId, action, settings);
      }
    } catch (error) {
      console.error(`[AutonomousPersonalShopper] Error handling trigger:`, error);
    }
  }

  /**
   * Handle calendar event trigger - curate outfits
   */
  private async handleCalendarTrigger(
    userId: string,
    trigger: ProactiveTrigger,
    settings: any
  ): Promise<AutonomousAction> {
    const { occasion, startTime } = trigger.data;
    
    // Get user budget and preferences
    const profile = await userMemory.get(userId);
    const budget = profile?.budget || 300;

    // Curate outfits for the occasion
    const outfitsResult = await personalShopperAgent.recommendOutfits({
      userId,
      budget,
      occasion,
      style: profile?.style,
      preferences: profile?.preferences,
    });

    // Mark calendar event as processed
    if (trigger.data.eventId) {
      await prisma.calendarEvent.update({
        where: { id: trigger.data.eventId },
        data: { 
          processed: true,
          agentTriggered: 'personalShopper',
        },
      });
    }

    return {
      actionType: 'curate',
      outfits: outfitsResult.outfits,
      reason: `Curated ${outfitsResult.outfits.length} outfit(s) for your ${occasion} event on ${new Date(startTime).toLocaleDateString()}`,
      requiresApproval: settings.autonomyLevel < 3, // Level 3+ can auto-add to cart
    };
  }

  /**
   * Handle weather trigger - recommend weather-appropriate items
   */
  private async handleWeatherTrigger(
    userId: string,
    trigger: ProactiveTrigger,
    settings: any
  ): Promise<AutonomousAction> {
    const { condition, temperature } = trigger.data;
    
    const profile = await userMemory.get(userId);
    const budget = 150; // Smaller budget for weather items

    // Search for weather-appropriate items
    let query = '';
    if (condition === 'rain') {
      query = 'waterproof jacket raincoat umbrella';
    } else if (condition === 'snow') {
      query = 'winter coat boots gloves';
    }

    const searchResults = await searchAgent.search({
      query,
      preferences: profile?.preferences,
      limit: 5,
    }, userId);

    return {
      actionType: 'add_to_cart',
      items: searchResults.products.slice(0, 3),
      reason: `Detected ${condition} in forecast - added weather essentials`,
      requiresApproval: settings.autonomyLevel < 3,
    };
  }

  /**
   * Handle stock alert trigger
   */
  private async handleStockTrigger(
    userId: string,
    trigger: ProactiveTrigger,
    settings: any
  ): Promise<AutonomousAction> {
    const { brand, restockedItems } = trigger.data;

    return {
      actionType: 'notify',
      items: restockedItems,
      reason: `${brand} just restocked! Check out the new arrivals`,
      requiresApproval: true, // Always notify, don't auto-add
    };
  }

  /**
   * Handle budget cycle trigger
   */
  private async handleBudgetTrigger(
    userId: string,
    trigger: ProactiveTrigger,
    settings: any
  ): Promise<AutonomousAction> {
    const { suggestedBudget } = trigger.data;

    return {
      actionType: 'notify',
      reason: `Payday detected! Ready to shop with a budget of $${suggestedBudget}?`,
      requiresApproval: true,
    };
  }

  /**
   * Execute autonomous action based on settings and approval requirements
   */
  private async executeAction(userId: string, action: AutonomousAction, settings: any): Promise<void> {
    if (action.requiresApproval && settings.approvalMode !== 'none') {
      // Create notification/pending action
      await this.createPendingAction(userId, action);
      return;
    }

    // Auto-execute based on autonomy level
    if (settings.autonomyLevel >= 3 && action.actionType === 'add_to_cart') {
      await this.autoAddToCart(userId, action.items || [], action.reason, settings);
    } else if (settings.autonomyLevel >= 3 && action.actionType === 'curate' && action.outfits) {
      // Auto-add top outfit to cart
      const topOutfit = action.outfits[0];
      const items = topOutfit.items.map((item: any) => item.product);
      await this.autoAddToCart(userId, items, action.reason, settings);
    }
  }

  /**
   * Auto-add items to cart (Level 3: Transactional)
   */
  private async autoAddToCart(userId: string, items: any[], reason: string, settings: any): Promise<void> {
    // Check price thresholds
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
    
    if (settings.maxAutoPrice && totalPrice > settings.maxAutoPrice) {
      // Requires approval if over threshold
      await this.createPendingAction(userId, {
        actionType: 'add_to_cart',
        items,
        reason: `${reason} (requires approval: $${totalPrice / 100} exceeds limit)`,
        requiresApproval: true,
      });
      return;
    }

    // Add to cart via API or database
    // In production, integrate with cart service
    console.log(`[AutonomousPersonalShopper] Auto-adding ${items.length} items to cart for user ${userId}`);
    
    // Update agent memory
    await this.updateAgentMemory(userId, 'personalShopper', {
      lastAction: 'auto_add_to_cart',
      itemsCount: items.length,
      totalPrice,
    });
  }

  /**
   * Helper methods
   */
  private async getAutonomySettings(userId: string) {
    return await prisma.userAutonomySettings.findUnique({
      where: { userId },
    });
  }

  private async logTrigger(userId: string, triggers: ProactiveTrigger[]): Promise<void> {
    for (const trigger of triggers) {
      await prisma.agentTriggerLog.create({
        data: {
          userId,
          agentType: 'personalShopper',
          triggerType: trigger.type,
          triggerData: trigger.data,
          action: 'monitored',
          success: true,
          autonomyLevel: 2, // Proactive level
        },
      });
    }
  }

  private async createPendingAction(userId: string, action: AutonomousAction): Promise<void> {
    // Store pending action for user approval
    const cacheKey = `pending_action:${userId}:${Date.now()}`;
    await vultrValkey.set(cacheKey, action, 86400); // 24 hours
  }

  private async updateAgentMemory(userId: string, agentType: string, data: any): Promise<void> {
    await prisma.agentMemory.upsert({
      where: {
        userId_agentType: {
          userId: userId,
          agentType: agentType,
        },
      },
      create: {
        userId,
        agentType,
        context: data,
        lastTriggered: new Date(),
      },
      update: {
        context: data,
        lastTriggered: new Date(),
      },
    });
  }

  private detectOccasionFromEvent(event: any): string | null {
    const title = event.eventTitle?.toLowerCase() || '';
    const eventType = event.eventType?.toLowerCase() || '';

    if (title.includes('date') || title.includes('dinner') || eventType === 'date_night') {
      return 'date night';
    }
    if (title.includes('wedding') || eventType === 'wedding') {
      return 'wedding';
    }
    if (title.includes('party') || title.includes('celebration') || eventType === 'party') {
      return 'party';
    }
    if (title.includes('business') || title.includes('meeting') || eventType === 'business') {
      return 'business';
    }
    if (title.includes('beach') || eventType === 'beach') {
      return 'beach';
    }

    return null;
  }

  private getPriorityForOccasion(occasion: string): 'high' | 'medium' | 'low' {
    const highPriority = ['wedding', 'date night', 'business'];
    if (highPriority.includes(occasion)) {
      return 'high';
    }
    return 'medium';
  }

  private async fetchWeather(location: string): Promise<any> {
    // Mock weather API - replace with actual API integration
    // Using OpenWeatherMap, WeatherAPI, or similar
    return {
      condition: 'rain',
      temperature: 65,
      forecast: 'Rainy weekend ahead',
    };
  }

  private async checkBrandRestock(brand: string): Promise<any[]> {
    // Mock stock check - integrate with inventory API
    return [];
  }
}

export const autonomousPersonalShopper = new AutonomousPersonalShopper();
