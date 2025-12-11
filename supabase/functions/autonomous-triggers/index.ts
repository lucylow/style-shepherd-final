/**
 * Supabase Edge Function for Autonomous Agent Triggers
 * 
 * Handles database triggers that fire autonomous agents:
 * - Calendar events → Personal Shopper + Makeup Artist
 * - Returns → Size Predictor + Returns Predictor
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AUTONOMY_API_URL = Deno.env.get('AUTONOMY_API_URL') || 'http://localhost:3001';

interface CalendarEvent {
  id: string;
  user_id: string;
  event_title: string;
  event_type?: string;
  start_time: string;
}

interface ReturnEvent {
  id: string;
  user_id: string;
  order_id: string;
  product_id: string;
  reason?: string;
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { table, record, type } = await req.json();

    console.log(`[AutonomousTriggers] ${type} event on ${table}`, record);

    // Handle calendar events
    if (table === 'calendar_events' && type === 'INSERT') {
      const event = record as CalendarEvent;
      await triggerPersonalShopper(event.user_id, event.id);
      await triggerMakeupArtist(event.user_id, event.id);
    }

    // Handle returns (if stored in database)
    if (table === 'stripe_returns' && type === 'INSERT') {
      const returnEvent = record as ReturnEvent;
      await triggerSizePredictor(returnEvent.user_id, returnEvent);
      await triggerReturnsPredictor(returnEvent.user_id, returnEvent);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AutonomousTriggers] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function triggerPersonalShopper(userId: string, eventId: string) {
  try {
    const response = await fetch(`${AUTONOMY_API_URL}/api/autonomy/monitor/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      console.error(`[AutonomousTriggers] Failed to trigger personal shopper for user ${userId}`);
    }
  } catch (error) {
    console.error('[AutonomousTriggers] Error triggering personal shopper:', error);
  }
}

async function triggerMakeupArtist(userId: string, eventId: string) {
  try {
    // Trigger makeup artist monitoring
    const response = await fetch(`${AUTONOMY_API_URL}/api/autonomy/monitor/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      console.error(`[AutonomousTriggers] Failed to trigger makeup artist for user ${userId}`);
    }
  } catch (error) {
    console.error('[AutonomousTriggers] Error triggering makeup artist:', error);
  }
}

async function triggerSizePredictor(userId: string, returnEvent: ReturnEvent) {
  try {
    const response = await fetch(`${AUTONOMY_API_URL}/api/autonomy/handle-return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        orderId: returnEvent.order_id,
        productId: returnEvent.product_id,
        returnReason: returnEvent.reason,
      }),
    });
    
    if (!response.ok) {
      console.error(`[AutonomousTriggers] Failed to trigger size predictor for user ${userId}`);
    }
  } catch (error) {
    console.error('[AutonomousTriggers] Error triggering size predictor:', error);
  }
}

async function triggerReturnsPredictor(userId: string, returnEvent: ReturnEvent) {
  // Returns predictor is triggered via the same handle-return endpoint
  // It's handled in the triggerSizePredictor call above
}
