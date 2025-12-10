import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// User interface compatible with WorkOS
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  workosId?: string;
  stripeCustomerId?: string;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithSSO: (provider?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'style_shepherd_users',
  CURRENT_USER: 'style_shepherd_current_user',
  SESSION: 'style_shepherd_session',
};

// Generate a mock token
const generateToken = () => {
  return `ss_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Generate Stripe-like customer ID
const generateStripeCustomerId = () => {
  return `cus_${Math.random().toString(36).substring(2, 15)}`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);
        if (sessionStr) {
          const savedSession: Session = JSON.parse(sessionStr);
          
          // Check if session is expired
          if (savedSession.expiresAt > Date.now()) {
            setSession(savedSession);
            setUser(savedSession.user);
          } else {
            // Session expired, clear it
            localStorage.removeItem(STORAGE_KEYS.SESSION);
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Get all users from storage
  const getUsers = useCallback((): User[] => {
    try {
      const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
      return usersStr ? JSON.parse(usersStr) : [];
    } catch {
      return [];
    }
  }, []);

  // Save users to storage
  const saveUsers = useCallback((users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, []);

  // Create session
  const createSession = useCallback((user: User): Session => {
    const session: Session = {
      accessToken: generateToken(),
      refreshToken: generateToken(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      user,
    };
    
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    
    return session;
  }, []);

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const users = getUsers();
      
      if (users.find(u => u.email === email)) {
        throw new Error('An account with this email already exists');
      }
      
      const newUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        workosId: `workos_${Math.random().toString(36).substring(2, 10)}`,
        stripeCustomerId: generateStripeCustomerId(),
        createdAt: new Date().toISOString(),
      };
      
      users.push(newUser);
      saveUsers(users);
      
      const newSession = createSession(newUser);
      setSession(newSession);
      setUser(newUser);
      
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getUsers, saveUsers, createSession]);

  // Sign in with email/password or SSO demo
  const signIn = useCallback(async (email?: string, password?: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If no email provided, create a demo user (SSO simulation)
      if (!email) {
        const demoUser: User = {
          id: `user_demo_${Date.now()}`,
          email: 'demo@styleshepherd.com',
          name: 'Demo User',
          workosId: `workos_demo_${Date.now()}`,
          stripeCustomerId: generateStripeCustomerId(),
          createdAt: new Date().toISOString(),
        };
        
        const newSession = createSession(demoUser);
        setSession(newSession);
        setUser(demoUser);
        
        toast.success('Signed in as demo user!');
        return;
      }
      
      const users = getUsers();
      const foundUser = users.find(u => u.email === email);
      
      if (!foundUser) {
        throw new Error('Invalid email or password');
      }
      
      const newSession = createSession(foundUser);
      setSession(newSession);
      setUser(foundUser);
      
      toast.success('Signed in successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getUsers, createSession]);

  // Sign in with SSO (WorkOS simulation)
  const signInWithSSO = useCallback(async (provider?: string) => {
    setIsLoading(true);
    
    try {
      // Simulate SSO flow delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const ssoUser: User = {
        id: `user_sso_${Date.now()}`,
        email: `user_${Date.now()}@sso.example.com`,
        name: `SSO User (${provider || 'WorkOS'})`,
        workosId: `workos_sso_${Date.now()}`,
        stripeCustomerId: generateStripeCustomerId(),
        createdAt: new Date().toISOString(),
      };
      
      // Save SSO user to users list
      const users = getUsers();
      if (!users.find(u => u.email === ssoUser.email)) {
        users.push(ssoUser);
        saveUsers(users);
      }
      
      const newSession = createSession(ssoUser);
      setSession(newSession);
      setUser(ssoUser);
      
      toast.success(`Signed in with ${provider || 'SSO'}!`);
    } catch (error: any) {
      toast.error(error.message || 'SSO sign in failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getUsers, saveUsers, createSession]);

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      
      setSession(null);
      setUser(null);
      
      toast.success('Signed out successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    signIn,
    signUp,
    signOut,
    signInWithSSO,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Re-export for backwards compatibility with WorkOS hook usage
export { AuthProvider as AuthKitProvider };
