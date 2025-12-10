import { Component, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to error reporting service in production
    if (import.meta.env.PROD) {
      // TODO: Integrate with error reporting service (e.g., Sentry)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="rounded-full bg-destructive/10 p-2">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription className="mt-1">
                    We're sorry, but something unexpected happened.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Don't worry, your data is safe. You can try refreshing the page or return to the home page.
              </p>
              
              {isDev && this.state.error && (
                <details className="p-3 bg-muted rounded-md">
                  <summary className="text-sm font-medium cursor-pointer mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-mono text-destructive break-all">
                      {errorMessage}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleReset} 
                  variant="outline" 
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {!isDev && (
                <p className="text-xs text-center text-muted-foreground">
                  If this problem persists, please contact support.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

