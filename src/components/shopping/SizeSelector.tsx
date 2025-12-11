/**
 * Size Selector Component
 * Real-time size predictions using Size Predictor AI Agent
 * Displays recommended sizes, confidence scores, and risk warnings
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Product } from '@/types/fashion';
import { useAuth } from '@/contexts/AuthContext';

interface SizePrediction {
  recommendedSize: string;
  confidence: number;
  alternatives: string[];
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  sizeAdjustment?: number;
  warnings: string[];
  trueToSize?: boolean;
}

interface SizeSelectorProps {
  product: Product;
  onSizeSelect: (size: string) => void;
  selectedSize?: string;
  className?: string;
}

export function SizeSelector({
  product,
  onSizeSelect,
  selectedSize,
  className = '',
}: SizeSelectorProps) {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<SizePrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch size prediction when component mounts or product changes
  useEffect(() => {
    if (!product) return;
    
    // Use demo user if not authenticated
    const userId = user?.id || 'demo_user';

    const fetchPrediction = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/agents/size-predictor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            products: [{
              id: product.id,
              name: product.name,
              brand: product.brand,
              category: product.category,
              price: product.price,
              description: product.description,
              sizes: product.sizes,
            }],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get size prediction');
        }

        const data = await response.json();
        if (data.predictions && data.predictions.length > 0) {
          setPrediction(data.predictions[0].prediction);
          
          // Auto-select recommended size if none selected
          if (!selectedSize && data.predictions[0].prediction.recommendedSize) {
            onSizeSelect(data.predictions[0].prediction.recommendedSize);
          }
        }
      } catch (err) {
        console.error('Size prediction error:', err);
        setError('Unable to load size recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, product.id, product.brand, product.category]);

  const availableSizes = product.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const recommendedSize = prediction?.recommendedSize;
  const confidence = prediction ? Math.round(prediction.confidence * 100) : undefined;
  const riskScore = prediction ? Math.round(prediction.riskScore * 100) : undefined;
  const riskLevel = prediction?.riskLevel;

  // Get risk color
  const getRiskColor = (level?: string) => {
    if (level === 'high') return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    if (level === 'medium') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  };

  const riskColors = getRiskColor(riskLevel);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Size Selection Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">Size</label>
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {prediction && confidence !== undefined && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs">
                    {confidence}% confidence
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI size prediction confidence: {confidence}%</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {availableSizes.map((size) => {
            const isRecommended = size === recommendedSize;
            const isSelected = size === selectedSize;
            const isAlternative = prediction?.alternatives?.includes(size);

            return (
              <TooltipProvider key={size}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={`
                        relative
                        ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                        ${isRecommended && !isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                        ${isAlternative ? 'border-dashed' : ''}
                      `}
                      onClick={() => onSizeSelect(size)}
                    >
                      {size}
                      {isRecommended && (
                        <CheckCircle2 className="absolute -top-1 -right-1 w-3 h-3 text-primary bg-background rounded-full" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isRecommended && (
                      <p className="font-semibold">Recommended for you</p>
                    )}
                    {isAlternative && (
                      <p>Alternative size option</p>
                    )}
                    {!isRecommended && !isAlternative && (
                      <p>Available size</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Recommended Size Badge */}
        {recommendedSize && (
          <div className="mt-2 flex items-center space-x-2 text-sm">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Recommended: {recommendedSize}
            </Badge>
            {prediction?.trueToSize && (
              <Badge variant="outline" className="text-xs">
                True to size
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Risk Warning */}
      {prediction && riskScore !== undefined && riskScore > 30 && (
        <div className={`p-3 rounded-lg border ${riskColors.bg} ${riskColors.border} ${riskColors.text}`}>
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {riskLevel === 'high' ? 'High' : 'Medium'} Return Risk
                </span>
                <span className="text-xs font-semibold">{riskScore}%</span>
              </div>
              {prediction.warnings && prediction.warnings.length > 0 && (
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  {prediction.warnings.slice(0, 2).map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Low Risk Success Message */}
      {prediction && riskScore !== undefined && riskScore <= 30 && (
        <div className="p-3 rounded-lg border bg-green-50 border-green-200 text-green-700">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              Low return risk - Good fit likelihood
            </span>
          </div>
        </div>
      )}

      {/* Alternative Sizes */}
      {prediction && prediction.alternatives && prediction.alternatives.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span>Also consider: </span>
          <span className="font-medium">
            {prediction.alternatives.join(', ')}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-700">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Size Guide Link */}
      <div className="text-xs text-muted-foreground">
        <button
          type="button"
          className="underline hover:text-foreground transition-colors"
          onClick={() => {
            // Open size guide modal or page
            console.log('Open size guide');
          }}
        >
          Size guide
        </button>
      </div>
    </div>
  );
}
