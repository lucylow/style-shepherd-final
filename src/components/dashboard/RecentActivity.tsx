import React from 'react';
import { Clock, ShoppingBag, Heart, MessageSquare } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'recommendation',
    icon: ShoppingBag,
    text: 'AI recommended Classic Blazer based on your style',
    time: '2 min ago'
  },
  {
    id: 2,
    type: 'save',
    icon: Heart,
    text: 'You saved "Summer Collection" outfit',
    time: '15 min ago'
  },
  {
    id: 3,
    type: 'chat',
    icon: MessageSquare,
    text: 'Style consultation completed',
    time: '1 hour ago'
  },
  {
    id: 4,
    type: 'recommendation',
    icon: ShoppingBag,
    text: 'New items matching your preferences available',
    time: '2 hours ago'
  }
];

export function RecentActivity() {
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Recent Activity
        </h2>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div 
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-accent/30 rounded-lg"
            >
              <div className="p-2 bg-background rounded-lg">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">{activity.text}</p>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
