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
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
    label: "Demo & Metrics",
    items: [
      { href: "/demo", label: "Judge Demo", icon: PlayCircle },
      { href: "/demo-integrations", label: "Integrations Demo", icon: Layers },
      { href: "/pilot-kpis", label: "Pilot KPIs", icon: Target },
      { href: "/unit-economics", label: "Unit Economics", icon: Calculator },
      { href: "/sponsor-metrics", label: "Sponsor Metrics", icon: Building2 },
    ],
  },
];

export default function MainNav() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-foreground">
          {!collapsed && "Style Shepherd"}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navGroups.map((group) => (
          <Collapsible key={group.label} defaultOpen={group.defaultOpen ?? false}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              {!collapsed && (
                <>
                  <span>{group.label}</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 relative group",
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1"
                      )}
                    >
                      {isActive(item.href) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
                      )}
                      <item.icon className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        isActive(item.href) ? "scale-110" : "group-hover:scale-110"
                      )} />
                      {!collapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </nav>
    </div>
  );

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
