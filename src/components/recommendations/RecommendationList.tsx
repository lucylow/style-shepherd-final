/**
 * RecommendationList Component
 * Displays hybrid product recommendations with explainability
 */

import React, { useState } from 'react';
import { Product } from '@/types/fashion';
import api from '@/lib/api';
import { handleErrorSilently, getErrorMessage } from '@/lib/errorHandler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface RecommendationItem {
  productId: string;
  score: number;
  confidence: number;
  reasons: string[];
  returnRisk: number;
  explain?: {
    sim?: number;
    popularity?: number;
    sizeBonus?: number;
    riskPenalty?: number;
    recency?: number;
  };
  product?: Product; // Full product data if available
}

interface RecommendationListProps {
  initialQuery?: string;
  category?: string;
  budgetCents?: number;
  userId?: string;
  preferredSizes?: string[];
  preferredBrands?: string[];
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
}

export default function RecommendationList({
  initialQuery = '',
  category,
  budgetCents,
  userId,
  preferredSizes = [],
  preferredBrands = [],
  onProductClick,
  onAddToCart,
}: RecommendationListProps) {
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRecommendations() {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/recommendations', {
        userPreferences: {
          preferredSizes,
          preferredBrands,
        },
        context: {
          searchQuery: query,
          category,
          budget: budgetCents ? budgetCents / 100 : undefined,
          sessionType: 'searching',
        },
        userId,
        useHybrid: true, // Use hybrid recommender
      });

      if (response.data.recommendations && Array.isArray(response.data.recommendations)) {
        const recommendations = response.data.recommendations as RecommendationItem[];

        // Fetch full product data for each recommendation
        const productsWithData = await Promise.all(
          recommendations.map(async (rec) => {
            try {
              const productResponse = await api.get(`/vultr/postgres/products?id=${rec.productId}`);
              if (productResponse.data && productResponse.data.length > 0) {
                return {
                  ...rec,
                  product: productResponse.data[0],
                };
              }
            } catch (err) {
              // Silently handle individual product fetch failures
              handleErrorSilently(err);
            }
            return rec;
          })
        );

        setItems(productsWithData);
      } else {
        setError('No recommendations found');
      }
    } catch (err: any) {
      // Use centralized error handler to get user-friendly message
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      // Log error silently (don't show toast as we're showing error in UI)
      handleErrorSilently(err);
    } finally {
      setLoading(false);
    }
  }

  function handleClick(productId: string) {
    // Log click interaction
    if (userId) {
      api.post('/interactions', {
        userId,
        productId,
        type: 'click',
        value: 1,
      }).catch(err => handleErrorSilently(err));
    }

    if (onProductClick) {
      onProductClick(productId);
    } else {
      window.location.href = `/products/${productId}`;
    }
  }

  function handleAddToCart(productId: string) {
    // Log add to cart interaction
    if (userId) {
      api.post('/interactions', {
        userId,
        productId,
        type: 'add_to_cart',
        value: 1,
      }).catch(err => handleErrorSilently(err));
    }

    if (onAddToCart) {
      onAddToCart(productId);
    }
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Find Products</CardTitle>
          <CardDescription>
            Describe what you're looking for and get AI-powered recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., red winter coat size M under $200"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  fetchRecommendations();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={fetchRecommendations}
              disabled={loading}
              className="min-w-[100px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Find
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="mt-2 text-sm text-destructive">{error}</div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Recommendations ({items.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <RecommendationCard
                key={item.productId}
                item={item}
                onClick={() => handleClick(item.productId)}
                onAddToCart={() => handleAddToCart(item.productId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface RecommendationCardProps {
  item: RecommendationItem;
  onClick: () => void;
  onAddToCart: () => void;
}

function RecommendationCard({ item, onClick, onAddToCart }: RecommendationCardProps) {
  const product = item.product;
  const imageUrl = product?.images?.[0] || product?.image_url || '/placeholder.svg';
  const price = product?.price || 0;
  const name = product?.name || 'Product';
  const brand = product?.brand || 'Unknown Brand';
  const category = product?.category || '';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        {item.explain && (
          <div className="absolute top-2 right-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="cursor-help">
                    <Info className="mr-1 h-3 w-3" />
                    Score: {item.score.toFixed(2)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <div>Similarity: {((item.explain.sim || 0) * 100).toFixed(1)}%</div>
                    <div>Popularity: {((item.explain.popularity || 0) * 100).toFixed(1)}%</div>
                    {item.explain.sizeBonus && item.explain.sizeBonus > 1 && (
                      <div>Size Match: +{((item.explain.sizeBonus - 1) * 100).toFixed(0)}%</div>
                    )}
                    <div>Return Risk: {((item.returnRisk || 0) * 100).toFixed(0)}%</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div>
            <h4 className="font-semibold line-clamp-1">{name}</h4>
            <p className="text-sm text-muted-foreground">
              {brand} • {category}
            </p>
            <p className="text-lg font-bold mt-1">${price.toFixed(2)}</p>
          </div>

          {item.reasons && item.reasons.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Why recommended:</p>
              <ul className="text-xs space-y-0.5">
                {item.reasons.slice(0, 2).map((reason, idx) => (
                  <li key={idx} className="text-muted-foreground">
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.returnRisk !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Return Risk:</span>
              <Badge
                variant={
                  item.returnRisk < 0.3
                    ? 'default'
                    : item.returnRisk < 0.6
                    ? 'secondary'
                    : 'destructive'
                }
                className="text-xs"
              >
                {item.returnRisk < 0.3
                  ? 'Low'
                  : item.returnRisk < 0.6
                  ? 'Medium'
                  : 'High'}
              </Badge>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClick}
              className="flex-1"
            >
              View
            </Button>
            <Button
              size="sm"
              onClick={onAddToCart}
              className="flex-1"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
