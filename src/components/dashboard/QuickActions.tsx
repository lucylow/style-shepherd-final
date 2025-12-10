import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Camera, Shirt, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const actions = [
  { icon: Mic, label: 'Voice Shop', to: '/voice-shop', color: 'bg-primary' },
  { icon: Camera, label: 'Scan Item', to: '/products', color: 'bg-secondary' },
  { icon: Shirt, label: 'My Wardrobe', to: '/products', color: 'bg-accent' },
  { icon: MessageSquare, label: 'AI Chat', to: '/demo', color: 'bg-muted' },
];

export function QuickActions() {
  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-2 gap-3 flex-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} to={action.to}>
              <Button 
                variant="outline" 
                className="w-full h-full flex-col gap-2 py-4 hover:bg-accent"
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-sm">{action.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
