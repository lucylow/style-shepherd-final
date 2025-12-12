import React from 'react';
import { Sparkles, Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const recommendations = [
  {
    id: 1,
    name: 'Classic Blazer',
    style: 'Business Casual',
    match: 95,
    price: '$189',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&h=200&fit=crop'
  },
  {
    id: 2,
    name: 'Silk Blouse',
    style: 'Elegant',
    match: 92,
    price: '$129',
    image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=200&h=200&fit=crop'
  },
  {
    id: 3,
    name: 'Tailored Trousers',
    style: 'Professional',
    match: 88,
    price: '$159',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&h=200&fit=crop'
  }
];

export function StyleRecommendations() {
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Recommendations
        </h2>
        <span className="text-sm text-muted-foreground">Based on your style profile</span>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {recommendations.map((item) => (
          <div 
            key={item.id}
            className="flex items-center gap-4 p-3 bg-accent/30 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <img 
              src={item.image} 
              alt={item.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h4 className="font-medium text-foreground">{item.name}</h4>
              <p className="text-sm text-muted-foreground">{item.style}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                  {item.match}% match
                </span>
                <span className="text-sm font-semibold text-foreground">{item.price}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost">
                <Heart className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost">
                <ShoppingCart className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
