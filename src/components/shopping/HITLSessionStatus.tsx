/**
 * HITL Session Status Component
 * Displays real-time status of a shopping session with human review updates
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Clock, User, ShoppingBag, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface HITLSessionStatusProps {
  sessionId: string;
  userId: string;
}

interface SessionStatus {
  status: string;
  stylist_name: string | null;
  message: string;
  progress: number;
}

const STATUS_MESSAGES: Record<string, string> = {
  shopper_pending: 'Stylist reviewing your preferences...',
  shopper_approved: 'Outfits approved! Analyzing sizes...',
  shopper_refined: 'Refining outfits based on feedback...',
  size_review: 'Expert reviewing size recommendations...',
  size_approved: 'Sizes confirmed! Checking return risks...',
  final_approval: 'Final validation in progress...',
  checkout_ready: 'Your complete look is ready to shop! 🎉',
  completed: 'Session completed successfully',
  cancelled: 'Session was cancelled',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  shopper_pending: <Clock className="h-5 w-5 animate-pulse" />,
  shopper_approved: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  size_review: <User className="h-5 w-5" />,
  size_approved: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  final_approval: <Sparkles className="h-5 w-5" />,
  checkout_ready: <ShoppingBag className="h-5 w-5 text-green-500" />,
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  cancelled: <CheckCircle2 className="h-5 w-5 text-gray-500" />,
};

const STATUS_PROGRESS: Record<string, number> = {
  shopper_pending: 20,
  shopper_approved: 40,
  size_review: 50,
  size_approved: 70,
  final_approval: 85,
  checkout_ready: 100,
  completed: 100,
};

export const HITLSessionStatus = ({ sessionId, userId }: HITLSessionStatusProps) => {
  const [session, setSession] = useState<any>(null);

  // Fetch session status
  const { data, isLoading } = useQuery({
    queryKey: ['shopping-session', sessionId],
    queryFn: async () => {
      const response = await api.get(`/shopping/session/${sessionId}`);
      return response.data.session;
    },
    refetchInterval: 2000, // Poll every 2 seconds
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (data) {
      setSession(data);
    }
  }, [data]);

  // Real-time subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_sessions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (isLoading || !session) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const status = session.status || 'shopper_pending';
  const progress = STATUS_PROGRESS[status] || 0;
  const message = session.stylist_name
    ? `${session.stylist_name} ${STATUS_MESSAGES[status] || 'Processing...'}`
    : STATUS_MESSAGES[status] || 'Processing...';

  const getStatusColor = () => {
    if (status === 'checkout_ready' || status === 'completed') return 'text-green-600';
    if (status === 'cancelled') return 'text-gray-500';
    return 'text-blue-600';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {STATUS_ICONS[status] || <Loader2 className="h-5 w-5 animate-spin" />}
            <span className={getStatusColor()}>
              {message}
            </span>
          </CardTitle>
          <Badge variant={status === 'checkout_ready' ? 'default' : 'secondary'}>
            {status.replace('_', ' ')}
          </Badge>
        </div>
        <CardDescription>
          Session ID: {sessionId.slice(0, 12)}...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {session.stylist_name && (
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              Your personal stylist <strong>{session.stylist_name}</strong> is reviewing your request
            </AlertDescription>
          </Alert>
        )}

        {session.size_confidence && session.size_confidence < 0.80 && (
          <Alert>
            <AlertDescription>
              Size confidence: {(session.size_confidence * 100).toFixed(0)}% - Expert review recommended
            </AlertDescription>
          </Alert>
        )}

        {session.return_risk_score && session.return_risk_score > 0.40 && (
          <Alert variant="destructive">
            <AlertDescription>
              Return risk: {(session.return_risk_score * 100).toFixed(0)}% - Reviewing alternatives
            </AlertDescription>
          </Alert>
        )}

        {status === 'checkout_ready' && session.outfits && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Ready to Shop</h4>
            <p className="text-sm text-muted-foreground">
              {session.outfits.outfits?.length || 0} outfits have been curated and approved for you.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
