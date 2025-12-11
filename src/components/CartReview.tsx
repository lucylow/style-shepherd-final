/**
 * Cart Review Component
 * Displays return risk assessments and alternative suggestions for cart items
 * Shown before checkout to prevent costly returns
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Info, ArrowRight, X } from 'lucide-react';
import type { CartItem } from '@/types/fashion';
import type { ReturnRiskAssessment, CartValidationResponse } from '@/services/shopping';

interface CartReviewProps {
  cartItems: CartItem[];
  validation: CartValidationResponse;
  onReplaceItem?: (itemId: string, alternativeId: string) => void;
  onDismiss?: () => void;
}

export const CartReview = ({ cartItems, validation, onReplaceItem, onDismiss }: CartReviewProps) => {
  const { assessments, summary } = validation;

  // Get risk color scheme
  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          icon: Info,
          iconColor: 'text-amber-600',
        };
      default:
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Alert */}
      {summary.averageRisk >= 0.4 && (
        <Alert className={getRiskColor(summary.averageRisk >= 0.6 ? 'high' : 'medium').border}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cart Return Risk Warning</AlertTitle>
          <AlertDescription>
            Your cart has a {Math.round(summary.averageRisk * 100)}% average return risk.
            {summary.highRiskItems > 0 && ` ${summary.highRiskItems} item(s) have high return risk.`}
            {summary.totalPotentialSavings > 0 && (
              <span className="block mt-2 font-semibold">
                Potential savings: ${summary.totalPotentialSavings.toFixed(2)} by preventing returns
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {summary.averageRisk < 0.4 && summary.highRiskItems === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Cart Looks Good!</AlertTitle>
          <AlertDescription className="text-green-700">
            Low return risk ({Math.round(summary.averageRisk * 100)}%) across all items.
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {summary.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Item Assessments */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Item Risk Assessment</h3>
        {cartItems.map((item, idx) => {
          const assessment = assessments[idx];
          if (!assessment) return null;

          const riskColors = getRiskColor(assessment.riskLevel);
          const RiskIcon = riskColors.icon;

          return (
            <Card
              key={item.product.id}
              className={`${riskColors.border} ${assessment.riskLevel === 'high' ? riskColors.bg : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-medium">{item.product.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {item.product.brand} • {item.selectedSize || item.size || 'No size selected'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={assessment.riskLevel === 'high' ? 'destructive' : assessment.riskLevel === 'medium' ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {Math.round(assessment.returnRisk * 100)}% risk
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Risk Level Indicator */}
                <div className="flex items-center space-x-2">
                  <RiskIcon className={`h-4 w-4 ${riskColors.iconColor}`} />
                  <span className={`text-sm ${riskColors.text}`}>
                    {assessment.riskLevel === 'high' && '⚠️ High return risk'}
                    {assessment.riskLevel === 'medium' && 'ℹ️ Moderate return risk'}
                    {assessment.riskLevel === 'low' && '✓ Low return risk'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {Math.round(assessment.keepProbability * 100)}% keep probability
                  </span>
                </div>

                {/* Reason */}
                <p className="text-xs text-muted-foreground">{assessment.reason}</p>

                {/* Key Factors */}
                {assessment.factors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Key Factors:</p>
                    <ul className="space-y-1">
                      {assessment.factors.slice(0, 2).map((factor, factorIdx) => (
                        <li key={factorIdx} className="text-xs text-muted-foreground flex items-start">
                          <span className="mr-1">•</span>
                          <span>{factor.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alternatives */}
                {assessment.alternatives && assessment.alternatives.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium mb-2">Lower-risk alternatives:</p>
                    <div className="space-y-2">
                      {assessment.alternatives.slice(0, 2).map((alt) => (
                        <div
                          key={alt.id}
                          className="flex items-center justify-between p-2 bg-background rounded border border-border"
                        >
                          <div className="flex-1">
                            <p className="text-xs font-medium">{alt.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {alt.brand} • ${alt.price.toFixed(2)} • {Math.round(alt.keepProbability * 100)}% keep rate
                            </p>
                            <p className="text-xs text-green-600 mt-1">{alt.reason}</p>
                          </div>
                          {onReplaceItem && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 text-xs"
                              onClick={() => onReplaceItem(item.product.id, alt.id)}
                            >
                              Replace
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

