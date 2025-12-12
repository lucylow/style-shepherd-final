import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShoppingBag, Loader2, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductCard } from './ProductCard';
import type { OutfitBundle, OutfitQuery, BodyMeasurements } from '@/types/personal-shopper';
import { toast } from 'sonner';

interface PersonalShopperProps {
  userId?: string;
  onAddToCart?: (productId: string, size?: string) => void;
}

export const PersonalShopper = ({ userId, onAddToCart }: PersonalShopperProps) => {
  const [outfits, setOutfits] = useState<OutfitBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<OutfitQuery>({
    style: '',
    budget: 500,
    occasion: 'casual',
    preferredColors: [],
  });
  const [measurements, setMeasurements] = useState<BodyMeasurements>({});
  const [showMeasurements, setShowMeasurements] = useState(false);

  const handleGetRecommendations = async () => {
    if (!query.occasion || query.budget <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/agents/personal-shopper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...query,
          measurements: showMeasurements ? measurements : undefined,
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get outfit recommendations');
      }

      const data = await response.json();
      setOutfits(data.outfits || []);
      
      if (data.outfits?.length === 0) {
        toast.info('No outfits found matching your criteria. Try adjusting your preferences.');
      } else {
        toast.success(`Found ${data.outfits.length} outfit ${data.outfits.length === 1 ? 'bundle' : 'bundles'}!`);
      }
    } catch (error) {
      console.error('Personal Shopper error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBundleToCart = (bundle: OutfitBundle) => {
    if (!onAddToCart) {
      toast.info('Add to cart functionality not available');
      return;
    }

    // Add all products from bundle to cart
    bundle.products.forEach(({ product, recommendedSize }) => {
      onAddToCart(product.id, recommendedSize);
    });

    toast.success(`Added ${bundle.products.length} items from "${bundle.name}" to cart!`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Personal Shopper AI</h2>
          <p className="text-muted-foreground">
            Get complete outfit bundles curated just for you
          </p>
        </div>
      </div>

      {/* Query Form */}
      <Card>
        <CardHeader>
          <CardTitle>What are you shopping for?</CardTitle>
          <CardDescription>
            Tell us about your style, occasion, and budget
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Occasion */}
          <div className="space-y-2">
            <Label htmlFor="occasion">Occasion *</Label>
            <Select
              value={query.occasion}
              onValueChange={(value) => setQuery({ ...query, occasion: value })}
            >
              <SelectTrigger id="occasion">
                <SelectValue placeholder="Select occasion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="work">Work / Business</SelectItem>
                <SelectItem value="wedding">Wedding</SelectItem>
                <SelectItem value="date">Date Night</SelectItem>
                <SelectItem value="beach">Beach / Vacation</SelectItem>
                <SelectItem value="formal">Formal Event</SelectItem>
                <SelectItem value="party">Party / Night Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label htmlFor="budget">
              Budget: {formatPrice(query.budget)}
            </Label>
            <Slider
              id="budget"
              min={50}
              max={2000}
              step={50}
              value={[query.budget]}
              onValueChange={([value]) => setQuery({ ...query, budget: value })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>$50</span>
              <span>$2000</span>
            </div>
          </div>

          {/* Style (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="style">Style Preference (Optional)</Label>
            <Input
              id="style"
              placeholder="e.g., business casual, minimalist, bold"
              value={query.style || ''}
              onChange={(e) => setQuery({ ...query, style: e.target.value })}
            />
          </div>

          {/* Measurements Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="measurements">Include Body Measurements</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMeasurements(!showMeasurements)}
              >
                {showMeasurements ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showMeasurements && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={measurements.height || ''}
                    onChange={(e) =>
                      setMeasurements({
                        ...measurements,
                        height: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={measurements.weight || ''}
                    onChange={(e) =>
                      setMeasurements({
                        ...measurements,
                        weight: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chest">Chest (cm)</Label>
                  <Input
                    id="chest"
                    type="number"
                    value={measurements.chest || ''}
                    onChange={(e) =>
                      setMeasurements({
                        ...measurements,
                        chest: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waist">Waist (cm)</Label>
                  <Input
                    id="waist"
                    type="number"
                    value={measurements.waist || ''}
                    onChange={(e) =>
                      setMeasurements({
                        ...measurements,
                        waist: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Get Recommendations Button */}
          <Button
            onClick={handleGetRecommendations}
            disabled={loading || !query.occasion}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Curating Outfits...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get Outfit Recommendations
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {outfits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              {outfits.length} Outfit {outfits.length === 1 ? 'Bundle' : 'Bundles'}
            </h3>
            <Badge variant="secondary">
              <TrendingUp className="w-3 h-3 mr-1" />
              AI Curated
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {outfits.map((bundle) => (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{bundle.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {bundle.occasion}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          bundle.confidence >= 0.8
                            ? 'default'
                            : bundle.confidence >= 0.6
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {Math.round(bundle.confidence * 100)}% Match
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-4">
                    {/* Products */}
                    <ScrollArea className="h-64 pr-4">
                      <div className="space-y-3">
                        {bundle.products.map(({ product, recommendedSize, confidence, reasoning }) => (
                          <div
                            key={product.id}
                            className="p-3 border rounded-lg space-y-2"
                          >
                            <div className="flex items-start gap-3">
                              {product.imageUrl && (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-16 h-16 object-cover rounded border"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {product.brand}
                                    </p>
                                    {recommendedSize && (
                                      <Badge variant="outline" className="mt-1 text-xs">
                                        Size: {recommendedSize}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm font-semibold whitespace-nowrap">
                                    {formatPrice(product.price)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {reasoning && (
                              <p className="text-xs text-muted-foreground italic">
                                {reasoning}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <Separator />

                    {/* Bundle Summary */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Total Cost</span>
                        <span className="text-lg font-bold text-primary">
                          {formatPrice(bundle.totalCost)}
                        </span>
                      </div>

                      {bundle.reasoning && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {bundle.reasoning}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAddBundleToCart(bundle)}
                          className="flex-1"
                          size="sm"
                        >
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Add Bundle to Cart
                        </Button>
                        {bundle.stripeCheckoutUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(bundle.stripeCheckoutUrl, '_blank')}
                          >
                            Checkout
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && outfits.length === 0 && query.occasion && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No outfits yet</h3>
            <p className="text-muted-foreground">
              Fill out the form above and click "Get Outfit Recommendations" to see curated outfits
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

