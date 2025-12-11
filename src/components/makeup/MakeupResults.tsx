/**
 * Makeup Results Component
 * Displays makeup routine, products, and bundles
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ShoppingCart, Play, ExternalLink, Sparkles } from 'lucide-react';
import type { MakeupLook } from '@/types/makeup';

interface MakeupResultsProps {
  look: MakeupLook;
  onAddToCart?: (productIds: string[]) => void;
  onViewBundle?: (bundleId: string) => void;
}

export const MakeupResults = ({ look, onAddToCart, onViewBundle }: MakeupResultsProps) => {
  const [activeStep, setActiveStep] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl">{look.routine.style} Look</CardTitle>
              <CardDescription className="text-lg mt-2">
                For {look.occasion} • {formatTime(look.routine.totalTime)} total time
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {look.routine.difficulty}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Badge>{look.analysis.skinTone.label}</Badge>
            <Badge variant="outline">{look.analysis.undertone} undertone</Badge>
            <Badge variant="outline">{look.analysis.faceShape} face</Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="routine" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="routine">Routine</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="bundles">Bundles</TabsTrigger>
        </TabsList>

        {/* Routine Tab */}
        <TabsContent value="routine" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step-by-Step Tutorial</CardTitle>
              <CardDescription>
                Follow these steps to achieve your {look.routine.style.toLowerCase()} look
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {look.routine.steps.map((step, index) => (
                <Card
                  key={step.stepNumber}
                  className={`cursor-pointer transition-all ${
                    activeStep === index ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setActiveStep(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{step.name}</h3>
                          <Badge variant="outline">{formatTime(step.estimatedTime)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{step.productType}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Shade: {step.shadeRecommendation}
                          </span>
                        </div>
                        <ul className="text-sm space-y-1 mt-2">
                          {step.applicationTips.map((tip, tipIndex) => (
                            <li key={tipIndex} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                        {step.tutorialUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(step.tutorialUrl, '_blank');
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Watch Tutorial
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {look.products.products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                {product.imageUrl && (
                  <div className="aspect-square bg-muted">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>{product.brand}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">${product.price.toFixed(2)}</span>
                      {product.rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Sparkles className="h-3 w-3 text-yellow-500" />
                          <span>{product.rating}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">{product.shade}</Badge>
                    {product.arPreviewUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(product.arPreviewUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        AR Preview
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => onAddToCart?.([product.id])}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Bundles Tab */}
        <TabsContent value="bundles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {look.products.bundles.map((bundle) => (
              <Card key={bundle.bundleId} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{bundle.name}</CardTitle>
                    {bundle.discount && (
                      <Badge variant="destructive">Save {bundle.discount}%</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Regular Price</span>
                      <span className="line-through text-muted-foreground">
                        ${bundle.totalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Bundle Price</span>
                      <span className="text-2xl font-bold text-primary">
                        ${bundle.discountedPrice?.toFixed(2) || bundle.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Includes:</p>
                    <ul className="text-sm space-y-1">
                      {bundle.products.map((product) => (
                        <li key={product.id} className="flex items-center gap-2">
                          <span className="text-primary">•</span>
                          <span>{product.name}</span>
                          <Badge variant="outline" className="ml-auto">
                            {product.shade}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => onViewBundle?.(bundle.bundleId)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add Bundle to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
