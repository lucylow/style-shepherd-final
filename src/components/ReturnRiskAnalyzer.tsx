// components/ReturnRiskAnalyzer.tsx

/**
 * Return Risk Analyzer Component
 * UI for displaying return risk predictions with interactive features
 */

import React, { useState, useEffect } from 'react';
import type { RiskPrediction, UserProfile, ProductInfo, TransactionContext } from '@/lib/returnRiskPrediction';
import { getApiBaseUrl } from '@/lib/api-config';

interface ReturnRiskAnalyzerProps {
  userProfile: UserProfile;
  productInfo: ProductInfo;
  context?: TransactionContext;
  onPredictionReady?: (prediction: RiskPrediction) => void;
  compact?: boolean;
}

export const ReturnRiskAnalyzer: React.FC<ReturnRiskAnalyzerProps> = ({
  userProfile,
  productInfo,
  context,
  onPredictionReady,
  compact = false,
}) => {
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFactors, setExpandedFactors] = useState(false);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}/api/functions/v1/return-risk-prediction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: userProfile,
            product: productInfo,
            context: context || {
              deviceType: 'desktop',
              isNewCustomer: false,
              isGiftPurchase: false,
              shippingSpeed: 'standard',
              paymentMethod: 'credit_card',
              returnsWindow: 30,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch prediction');
        }

        const data = await response.json();
        setPrediction(data.prediction);
        onPredictionReady?.(data.prediction);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [userProfile, productInfo, context, onPredictionReady]);

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>Analyzing return risk...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fee', borderRadius: '4px' }}>
        <div style={{ fontSize: '14px', color: '#c33' }}>Error: {error}</div>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  const getRiskColor = (level: string): string => {
    const colors: Record<string, string> = {
      very_low: '#10b981',
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444',
      very_high: '#7f1d1d',
    };
    return colors[level] || '#666';
  };

  const getRiskBgColor = (level: string): string => {
    const colors: Record<string, string> = {
      very_low: '#ecfdf5',
      low: '#eff6ff',
      medium: '#fffbeb',
      high: '#fef2f2',
      very_high: '#fef2f2',
    };
    return colors[level] || '#f9fafb';
  };

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          backgroundColor: getRiskBgColor(prediction.riskLevel),
          borderRadius: '8px',
          border: `2px solid ${getRiskColor(prediction.riskLevel)}`,
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: getRiskColor(prediction.riskLevel),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
          }}
        >
          {Math.round(prediction.riskScore * 100)}
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>
            Return Risk: {prediction.riskLevel.replace('_', ' ').toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            Confidence: {Math.round(prediction.confidence * 100)}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: getRiskBgColor(prediction.riskLevel),
        border: `1px solid ${getRiskColor(prediction.riskLevel)}`,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '16px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: getRiskColor(prediction.riskLevel),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold',
            }}
          >
            {Math.round(prediction.riskScore * 100)}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
              Return Risk Assessment
            </h3>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: getRiskColor(prediction.riskLevel),
                fontWeight: '600',
              }}
            >
              {prediction.riskLevel.replace('_', ' ').toUpperCase()}
            </p>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Confidence: {Math.round(prediction.confidence * 100)}% | Model: {prediction.modelVersion}
        </div>
      </div>

      {/* Risk Score Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
          <span>Very Low (0)</span>
          <span>Very High (1)</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${prediction.riskScore * 100}%`,
              height: '100%',
              backgroundColor: getRiskColor(prediction.riskLevel),
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Top Contributing Factors */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setExpandedFactors(!expandedFactors)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            color: '#333',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{expandedFactors ? '▼' : '▶'}</span>
          Top Risk Factors ({prediction.factors.length})
        </button>
        {expandedFactors && (
          <div style={{ marginTop: '12px' }}>
            {prediction.factors.slice(0, 5).map((factor, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: idx < 4 ? '1px solid #e5e7eb' : 'none',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: '#333', flex: 1 }}>
                  {factor.name.replace(/_/g, ' ')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '6px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, factor.contribution * 500)}%`,
                        height: '100%',
                        backgroundColor: factor.impact > 0 ? '#ef4444' : '#10b981',
                      }}
                    />
                  </div>
                  <span style={{ color: '#666', fontSize: '12px', minWidth: '30px' }}>
                    {factor.impact > 0 ? '+' : ''}{factor.impact.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {prediction.recommendations.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            Recommendations
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {prediction.recommendations.map((rec, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: '13px',
                  color: '#333',
                  marginBottom: '6px',
                  lineHeight: '1.4',
                }}
              >
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MONITORING & ANALYTICS INTEGRATION
// ============================================================================

export const ReturnRiskAnalytics = {
  /**
   * Track prediction accuracy over time
   */
  trackPrediction: async (
    predictionId: string,
    prediction: RiskPrediction,
    actualReturn: boolean,
    daysSincePrediction: number
  ) => {
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/api/analytics/return-risk-accuracy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionId,
          riskScore: prediction.riskScore,
          riskLevel: prediction.riskLevel,
          actualReturn,
          daysSincePrediction,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to track prediction:', error);
    }
  },

  /**
   * Log model performance metrics
   */
  reportMetrics: async (metrics: {
    totalPredictions: number;
    accuracyRate: number;
    precisionByRiskLevel: Record<string, number>;
    calibration: number;
  }) => {
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/api/analytics/model-performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metrics,
          timestamp: new Date().toISOString(),
          modelVersion: '1.0.0',
        }),
      });
    } catch (error) {
      console.error('Failed to report metrics:', error);
    }
  },
};

export default ReturnRiskAnalyzer;
