import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Package,
  Mic,
  LayoutDashboard,
  Brain,
  Layers,
  Target,
  TrendingUp,
  BarChart3,
  Shield,
  Award,
  PlayCircle,
  LineChart,
  Calculator,
  Building2,
  Cloud,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Ruler,
  Camera,
  Shirt,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    defaultOpen: true,
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
    label: "Shopping & Style",
    items: [
      { href: "/style-recommendations", label: "Style Recommendations", icon: Sparkles },
      { href: "/size-prediction", label: "Size Prediction", icon: Ruler },
      { href: "/scan-item", label: "Scan Item", icon: Camera },
      { href: "/wardrobe", label: "My Wardrobe", icon: Shirt },
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
    label: "Admin",
    items: [
      { href: "/monitoring", label: "Admin Dashboard", icon: Cloud },
      { href: "/admin/risk", label: "Risk & Compliance", icon: Shield },
      { href: "/admin/providers", label: "Provider Management", icon: Building2 },
    ],
  },
];

export default function MainNav() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    // For exact matches or when pathname starts with href followed by / or end of string
    // This handles routes like /features being active when on /features/:id
    const pathname = location.pathname;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const NavContent = () => {
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
      navGroups.reduce((acc, group) => {
        acc[group.label] = group.defaultOpen ?? false;
        return acc;
      }, {} as Record<string, boolean>)
    );

    const toggleGroup = (label: string) => {
      setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
    };

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link 
            to="/" 
            className="font-bold text-lg text-foreground hover:text-primary transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            {!collapsed && "Style Shepherd"}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2" role="navigation" aria-label="Main navigation">
          {navGroups.map((group) => (
            <Collapsible 
              key={group.label} 
              open={openGroups[group.label]}
              onOpenChange={() => toggleGroup(group.label)}
            >
              <CollapsibleTrigger 
                className={cn(
                  "flex items-center justify-between w-full p-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md",
                  !collapsed && "mb-1"
                )}
                disabled={collapsed}
              >
                {!collapsed && (
                  <>
                    <span className="text-xs uppercase tracking-wider">{group.label}</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      openGroups[group.label] && "rotate-180"
                    )} />
                  </>
                )}
                {collapsed && group.items.some(item => isActive(item.href)) && (
                  <div className="w-1 h-6 bg-primary rounded-r-full" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          onClick={() => {
                            setMobileOpen(false);
                            if (collapsed) {
                              setCollapsed(false);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 relative group",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          aria-current={active ? 'page' : undefined}
                        >
                          {active && !collapsed && (
                            <motion.div
                              layoutId="sidebarActive"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            />
                          )}
                          <item.icon className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            active ? "scale-110" : "group-hover:scale-110"
                          )} />
                          {!collapsed && (
                            <span className={cn(
                              "font-medium transition-all",
                              active && "font-semibold"
                            )}>
                              {item.label}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Mobile trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card/95 backdrop-blur-xl border-r border-border transform transition-transform duration-300 ease-out md:hidden shadow-elevated-lg",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card/95 backdrop-blur-sm transition-all shadow-elevated",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
