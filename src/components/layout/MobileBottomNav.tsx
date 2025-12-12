import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Mic, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/products', label: 'Browse', icon: Search },
    { href: '/voice-shop', label: 'Voice', icon: Mic },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  return (
    <nav 
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-[92%] max-w-md md:hidden"
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-elevated-lg flex justify-around p-2 border border-border/50">
        {navItems.map(({ href, label, icon: Icon }, index) => {
          const active = isActive(href);
          return (
            <motion.div
              key={href}
              whileTap={{ scale: 0.95 }}
              className="flex-1"
            >
              <Link
                to={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center text-xs px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px] group focus-visible-enhanced",
                  active
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="mobileNavActive"
                    className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-sm shadow-primary/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <motion.div
                  animate={active ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Icon 
                    size={20} 
                    className={cn(
                      "mb-1 transition-transform duration-200",
                      active ? "scale-110" : "group-hover:scale-105"
                    )} 
                  />
                </motion.div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  active && "font-semibold"
                )}>
                  {label}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </nav>
  );
}

