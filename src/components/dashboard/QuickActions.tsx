import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Camera, Shirt, MessageSquare, Sparkles, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const actions = [
  { 
    icon: Sparkles, 
    label: 'Style Recommendations', 
    to: '/style-recommendations', 
    color: 'bg-gradient-to-br from-pink-500 to-rose-600',
    description: 'AI-powered style suggestions',
    gradient: 'from-pink-500 to-rose-600'
  },
  { 
    icon: Ruler, 
    label: 'Size Prediction', 
    to: '/size-prediction', 
    color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    description: 'Find your perfect fit',
    gradient: 'from-blue-500 to-indigo-600'
  },
  { 
    icon: Mic, 
    label: 'Voice Shop', 
    to: '/voice-shop', 
    color: 'bg-gradient-to-br from-primary to-primary/80',
    description: 'Shop with voice commands',
    gradient: 'from-blue-500 to-purple-600'
  },
  { 
    icon: Camera, 
    label: 'Scan Item', 
    to: '/scan-item', 
    color: 'bg-gradient-to-br from-secondary to-secondary/80',
    description: 'Find similar products',
    gradient: 'from-green-500 to-emerald-600'
  },
  { 
    icon: Shirt, 
    label: 'My Wardrobe', 
    to: '/wardrobe', 
    color: 'bg-gradient-to-br from-accent to-accent/80',
    description: 'Manage your collection',
    gradient: 'from-orange-500 to-pink-600'
  },
  { 
    icon: MessageSquare, 
    label: 'AI Chat', 
    to: '/ai-chat', 
    color: 'bg-gradient-to-br from-purple-500 to-pink-600',
    description: 'Get style advice',
    gradient: 'from-purple-500 to-pink-600'
  },
];

export function QuickActions() {
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-3 flex-1 auto-rows-fr">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to={action.to}>
                <Button 
                  variant="outline" 
                  className="w-full h-full flex-col gap-2 py-6 hover:bg-accent/50 transition-all border-2 hover:border-primary/50 group relative overflow-hidden"
                >
                  <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold">{action.label}</span>
                    <span className="text-xs text-muted-foreground">{action.description}</span>
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                </Button>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
