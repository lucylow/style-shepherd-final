/**
 * Alert Service
 * Sends alerts for high-risk fraud incidents
 */

import env from '../config/env.js';

/**
 * Send Slack alert
 */
export async function sendSlackAlert(text: string): Promise<void> {
  const url = env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.warn('Slack webhook URL not configured');
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.error('Failed to send Slack alert:', response.statusText);
    }
  } catch (error: any) {
    console.error('Error sending Slack alert:', error.message);
  }
}

/**
 * Send SMS alert (placeholder - integrate with Twilio or similar)
 */
export async function sendSMSAlert(message: string): Promise<void> {
  const number = env.FRAUD_SMS_ALERT_NUMBER;
  if (!number) {
    console.warn('SMS alert number not configured');
    return;
  }

  // TODO: Integrate with Twilio or similar SMS service
  console.log('SMS Alert (not implemented):', { number, message });
}

/**
 * Send fraud alert for high-risk incident
 */
export async function sendFraudAlert(incident: {
  id: string;
  score: number;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  amount?: number | null;
  decision: string;
}): Promise<void> {
  if (incident.score < 0.9) {
    // Only alert for very high-risk incidents
    return;
  }

  const message = `🚨 HIGH-RISK FRAUD INCIDENT DETECTED
ID: ${incident.id}
Score: ${(incident.score * 100).toFixed(1)}%
Decision: ${incident.decision}
Action: ${incident.action}
User: ${incident.userEmail || incident.userId || 'Unknown'}
Amount: ${incident.amount ? `$${((incident.amount || 0) / 100).toFixed(2)}` : 'N/A'}
Time: ${new Date().toISOString()}`;

  // Send to Slack
  await sendSlackAlert(message);

  // Send SMS if configured
  await sendSMSAlert(message);
}

