import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  ShoppingBag, 
  Mic, 
  Brain, 
  Settings,
  TrendingUp,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  to: string;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: ShoppingBag, label: 'Products', to: '/products' },
  { icon: Mic, label: 'Voice Shop', to: '/voice-shop' },
  { icon: Brain, label: 'AI Memory', to: '/ai-memory', badge: 'New' },
  { icon: TrendingUp, label: 'Analytics', to: '/lovable/analytics' },
  { icon: Users, label: 'Demo', to: '/demo' },
  { icon: Settings, label: 'Settings', to: '/lovable/settings' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border h-full pt-4">
      <nav className="space-y-1 px-3">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="absolute bottom-4 left-0 right-0 px-6">
        <div className="bg-accent/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-1">Style Shepherd AI</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Powered by Raindrop SmartMemory
          </p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">AI Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
