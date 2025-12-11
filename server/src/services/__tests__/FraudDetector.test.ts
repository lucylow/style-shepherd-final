/**
 * Fraud Detector Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  _internal,
  runFraudChecks,
  FraudContext,
} from '../FraudDetector.js';

describe('FraudDetector', () => {
  describe('emailRisk', () => {
    it('should detect disposable email domains', () => {
      const result = _internal.emailRisk('test@10minutemail.com');
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.isDisposable).toBe(true);
    });

    it('should give low risk to free email domains', () => {
      const result = _internal.emailRisk('user@gmail.com');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(0.5);
      expect(result.isFree).toBe(true);
    });

    it('should return 0 score for missing email', () => {
      const result = _internal.emailRisk();
      expect(result.score).toBe(0);
    });
  });

  describe('shippingBillingMismatch', () => {
    it('should detect country mismatch', () => {
      const result = _internal.shippingBillingMismatch({
        billingAddress: { country: 'US' },
        shippingAddress: { country: 'CN' },
      });
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.reason).toBe('country_mismatch');
    });

    it('should return 0 for matching countries', () => {
      const result = _internal.shippingBillingMismatch({
        billingAddress: { country: 'US' },
        shippingAddress: { country: 'US' },
      });
      expect(result.score).toBe(0);
      expect(result.reason).toBe('ok');
    });

    it('should handle missing addresses', () => {
      const result = _internal.shippingBillingMismatch({});
      expect(result.score).toBe(0);
      expect(result.reason).toBe('missing');
    });
  });

  describe('ipRisk', () => {
    it('should mark private IPs as safe', async () => {
      const result = await _internal.ipRisk('127.0.0.1');
      expect(result.score).toBe(0);
      expect(result.reason).toBe('private');
    });

    it('should handle missing IP', async () => {
      const result = await _internal.ipRisk();
      expect(result.score).toBe(0);
      expect(result.reason).toBe('no_ip');
    });
  });

  describe('runFraudChecks', () => {
    it('should create incident with allow decision for low-risk transaction', async () => {
      const context: FraudContext = {
        userId: 'user123',
        email: 'user@example.com',
        ip: '127.0.0.1',
        billingAddress: { country: 'US' },
        shippingAddress: { country: 'US' },
        amount: 5000, // $50
        action: 'checkout',
      };

      const incident = await runFraudChecks(context);

      expect(incident).toBeDefined();
      expect(incident.decision).toBe('allow');
      expect(incident.score).toBeLessThan(0.45);
      expect(incident.rulesFired).toBeDefined();
    });

    it('should flag high-risk transaction', async () => {
      const context: FraudContext = {
        userId: 'user123',
        email: 'test@10minutemail.com', // Disposable email
        ip: '1.2.3.4',
        billingAddress: { country: 'US' },
        shippingAddress: { country: 'CN' }, // Mismatch
        amount: 100000, // $1000 - high amount
        action: 'checkout',
      };

      const incident = await runFraudChecks(context);

      expect(incident).toBeDefined();
      expect(incident.score).toBeGreaterThan(0.45);
      expect(incident.rulesFired.length).toBeGreaterThan(0);
    });
  });
});

