import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User, LogOut, Home, Package, Mic, LayoutDashboard, Brain, Layers,
  Target, TrendingUp, BarChart3, Shield, Lightbulb, Award,
  PlayCircle, LineChart, Calculator, Building2, Cloud, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/features", label: "Features Explorer", icon: Layers },
      { href: "/products", label: "Products", icon: Package },
      { href: "/voice-shop", label: "Voice Shop", icon: Mic },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/ai-memory", label: "AI Memory", icon: Brain },
    ],
  },
  {
    label: "Idea Quality",
    items: [
      { href: "/idea-quality", label: "Overview", icon: Lightbulb },
      { href: "/competitive-analysis", label: "Competitive Analysis", icon: Target },
      { href: "/market-opportunity", label: "Market Opportunity", icon: TrendingUp },
      { href: "/problem-validation", label: "Problem Validation", icon: BarChart3 },
      { href: "/innovation-scoring", label: "Innovation Scoring", icon: Award },
      { href: "/impact-measurement", label: "Impact Measurement", icon: LineChart },
      { href: "/competitive-moats", label: "Competitive Moats", icon: Shield },
      { href: "/judging-criteria", label: "Judging Criteria", icon: Award },
    ],
  },
  {
    label: "Demo & Metrics",
    items: [
      { href: "/demo", label: "Judge Demo", icon: PlayCircle },
      { href: "/demo-integrations", label: "Integrations Demo", icon: Layers },
      { href: "/pilot-kpis", label: "Pilot KPIs", icon: Target },
      { href: "/unit-economics", label: "Unit Economics", icon: Calculator },
      { href: "/sponsor-metrics", label: "Sponsor Metrics", icon: Building2 },
    ],
  },
  {
    label: "Lovable Cloud",
    items: [
      { href: "/lovable", label: "Dashboard", icon: Cloud },
      { href: "/lovable/deployment", label: "Deployment", icon: Cloud },
      { href: "/lovable/monitoring", label: "Monitoring", icon: BarChart3 },
      { href: "/lovable/analytics", label: "Analytics", icon: LineChart },
      { href: "/lovable/logs", label: "Logs", icon: LayoutDashboard },
      { href: "/lovable/health", label: "Health", icon: Shield },
    ],
  },
];

export default function HeaderNav() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  // Get main items (most commonly used)
  const mainItems = navGroups[0].items;

  return (
    <nav role="navigation" aria-label="Main navigation" className="bg-background/95 backdrop-blur-xl shadow-soft border-b border-border/50 sticky top-0 z-50 supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-all duration-200 group"
              aria-label="Style Shepherd Home"
            >
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-8 h-8 bg-gradient-to-br from-primary via-primary/90 to-fashion-gold rounded-lg shadow-sm group-hover:shadow-glow-primary transition-all"
              />
              <span className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">Style Shepherd</span>
            </Link>
          </div>
          
          <div className="hidden lg:flex gap-1 items-center" role="menubar">
            {/* Main navigation items */}
            {mainItems.slice(0, 4).map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative flex items-center gap-2 group",
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-foreground hover:bg-muted/60 hover:text-primary hover:shadow-soft'
                  )}
                >
                  {Icon && (
                    <Icon className={cn(
                      "w-4 h-4 transition-transform duration-300",
                      isActive(item.href) ? 'scale-110' : 'group-hover:scale-110'
                    )} />
                  )}
                  <span className="relative z-10">{item.label}</span>
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
            
            {/* More dropdown for additional items */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    // Check if any route in the "More" menu is active
                    navGroups.slice(1).some(group => 
                      group.items.some(item => isActive(item.href))
                    ) || mainItems.slice(4).some(item => isActive(item.href))
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-muted/50 hover:text-primary'
                  )}
                >
                  More
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-[80vh] overflow-y-auto">
                {navGroups.slice(1).map((group) => (
                  <div key={group.label}>
                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link 
                            to={item.href} 
                            className={cn(
                              "flex items-center gap-2",
                              active && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            {Icon && <Icon className="w-4 h-4" />}
                            {item.label}
                            {active && <span className="ml-auto w-2 h-2 bg-primary rounded-full" />}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </div>
                ))}
                {/* Add remaining main items */}
                {mainItems.slice(4).map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link 
                        to={item.href} 
                        className={cn(
                          "flex items-center gap-2",
                          active && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        {item.label}
                        {active && <span className="ml-auto w-2 h-2 bg-primary rounded-full" />}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu - simplified */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Layers className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-[80vh] overflow-y-auto">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link 
                            to={item.href} 
                            className={cn(
                              "flex items-center gap-2",
                              active && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            {Icon && <Icon className="w-4 h-4" />}
                            {item.label}
                            {active && <span className="ml-auto w-2 h-2 bg-primary rounded-full" />}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{user.name || user.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/dashboard">Try Demo</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

