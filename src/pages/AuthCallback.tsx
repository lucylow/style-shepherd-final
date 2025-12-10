import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signInWithSSO } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  useEffect(() => {
    const handleCallback = async () => {
      if (error) {
        setStatus('error');
        toast.error('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      if (code) {
        try {
          // In production, exchange code for session via backend
          // For now, simulate SSO completion
          await signInWithSSO('WorkOS');
          
          setStatus('success');
          toast.success('Successfully signed in!');
          
          // Parse redirect from state if provided
          let redirectTo = '/dashboard';
          if (state) {
            try {
              const parsedState = JSON.parse(decodeURIComponent(state));
              if (parsedState.redirect) {
                redirectTo = parsedState.redirect;
              }
            } catch {
              // Use default redirect
            }
          }
          
          setTimeout(() => navigate(redirectTo), 1000);
        } catch (err) {
          setStatus('error');
          toast.error('Failed to complete sign in');
          setTimeout(() => navigate('/login'), 2000);
        }
      } else {
        // No code and no error, redirect to login
        navigate('/login');
      }
    };

    handleCallback();
  }, [code, error, state, navigate, signInWithSSO]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Completing sign in...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-foreground font-medium">Successfully signed in!</p>
            <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-foreground font-medium">Authentication failed</p>
            <p className="text-muted-foreground text-sm">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
