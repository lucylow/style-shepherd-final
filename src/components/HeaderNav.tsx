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
import { User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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

  const links = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: '/voice-shop', label: 'Voice Shop' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/sponsor-metrics', label: 'Sponsor Metrics' },
  ];

  return (
    <nav role="navigation" aria-label="Main navigation" className="bg-background/95 backdrop-blur-xl shadow-elevated border-b border-border/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
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
          
          <ul className="hidden md:flex gap-2 items-center" role="menubar">
            {links.map(link => (
              <li key={link.href} role="none">
                <Link
                  to={link.href}
                  aria-current={location.pathname === link.href ? 'page' : undefined}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                    location.pathname === link.href
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-muted/50 hover:text-primary'
                  }`}
                >
                  {link.label}
                  {location.pathname === link.href && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>

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

