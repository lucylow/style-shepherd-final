/**
 * Stylist Dashboard
 * Real-time queue for human-in-the-loop approval of shopping sessions
 */

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, CheckCircle2, XCircle, User, ShoppingBag, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface ShoppingSession {
  id: string;
  session_id: string;
  user_id: string;
  status: string;
  human_action: string | null;
  stylist_id: string | null;
  stylist_name: string | null;
  stylist_level: string | null;
  outfits: any;
  size_predictions: any;
  return_risks: any;
  user_intent: string | null;
  budget: number | null;
  occasion: string | null;
  size_confidence: number | null;
  return_risk_score: number | null;
  tier: string;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  sla_deadline: string | null;
}

interface StylistSession {
  id: string;
  user_id: string;
  name: string;
  email: string;
  level: string;
}

const StylistDashboard = () => {
  const queryClient = useQueryClient();
  const [currentStylist, setCurrentStylist] = useState<StylistSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<ShoppingSession | null>(null);

  // Get current user (assumed to be stylist)
  useEffect(() => {
    const fetchStylist = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // In production, fetch from stylists table
        // For now, use mock
        setCurrentStylist({
          id: user.id,
          user_id: user.id,
          name: user.email?.split('@')[0] || 'Stylist',
          email: user.email || '',
          level: 'junior',
        });
      }
    };
    fetchStylist();
  }, []);

  // Fetch pending sessions
  const { data: pendingSessions = [], isLoading } = useQuery({
    queryKey: ['stylist-queue'],
    queryFn: async () => {
      const response = await api.get('/shopping/stylist/queue');
      return response.data.sessions as ShoppingSession[];
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Claim session mutation
  const claimSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!currentStylist) throw new Error('No stylist logged in');
      
      const response = await api.post('/shopping/stylist/claim', {
        sessionId,
        stylistId: currentStylist.id,
        stylistName: currentStylist.name,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-queue'] });
      toast({
        title: 'Session claimed',
        description: 'You are now reviewing this session',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to claim session',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle human action mutation
  const handleAction = useMutation({
    mutationFn: async ({ sessionId, action, updates }: { sessionId: string; action: string; updates?: any }) => {
      if (!currentStylist) throw new Error('No stylist logged in');
      
      const response = await api.post('/shopping/human-action', {
        sessionId,
        action,
        stylistId: currentStylist.id,
        updates,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-queue'] });
      setSelectedSession(null);
      toast({
        title: 'Action processed',
        description: 'Session updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to process action',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('shopping_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_sessions',
          filter: `status=in.(shopper_pending,size_review,final_approval)`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stylist-queue'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      shopper_pending: 'default',
      size_review: 'secondary',
      final_approval: 'destructive',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getTimeRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const remaining = new Date(deadline).getTime() - Date.now();
    if (remaining < 0) return 'Overdue';
    const minutes = Math.floor(remaining / 60000);
    return `${minutes}m remaining`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stylist Dashboard</h1>
          <p className="text-muted-foreground">
            Review and approve shopping sessions in real-time
          </p>
        </div>
        {currentStylist && (
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <span className="font-medium">{currentStylist.name}</span>
            <Badge>{currentStylist.level}</Badge>
          </div>
        )}
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">
            Queue ({pendingSessions.length})
          </TabsTrigger>
          <TabsTrigger value="my-sessions">
            My Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pendingSessions.length === 0 ? (
            <Alert>
              <AlertDescription>
                No pending sessions in the queue. Great job!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {pendingSessions.map((session) => (
                <Card key={session.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedSession(session)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {session.user_intent || 'Shopping Request'}
                        </CardTitle>
                        <CardDescription>
                          Session: {session.session_id.slice(0, 8)}... • User: {session.user_id.slice(0, 8)}...
                        </CardDescription>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Tier</div>
                        <div className="font-medium">{session.tier}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Budget</div>
                        <div className="font-medium">${session.budget || 'N/A'}</div>
                      </div>
                      {session.size_confidence && (
                        <div>
                          <div className="text-muted-foreground">Size Confidence</div>
                          <div className="font-medium">
                            {(session.size_confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}
                      {session.sla_deadline && (
                        <div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            SLA
                          </div>
                          <div className={`font-medium ${
                            new Date(session.sla_deadline).getTime() < Date.now() ? 'text-destructive' : ''
                          }`}>
                            {getTimeRemaining(session.sla_deadline)}
                          </div>
                        </div>
                      )}
                    </div>
                    {!session.stylist_id && (
                      <Button
                        className="mt-4 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          claimSession.mutate(session.session_id);
                        }}
                        disabled={claimSession.isPending}
                      >
                        {claimSession.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          'Claim Session'
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-sessions">
          <div className="space-y-4">
            {pendingSessions
              .filter(s => s.stylist_id === currentStylist?.id)
              .map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <CardTitle>{session.user_intent || 'Shopping Request'}</CardTitle>
                    <CardDescription>
                      {session.status} • {new Date(session.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SessionReviewPanel
                      session={session}
                      onAction={(action, updates) =>
                        handleAction.mutate({
                          sessionId: session.session_id,
                          action,
                          updates,
                        })
                      }
                      isProcessing={handleAction.isPending}
                    />
                  </CardContent>
                </Card>
              ))}
            {pendingSessions.filter(s => s.stylist_id === currentStylist?.id).length === 0 && (
              <Alert>
                <AlertDescription>
                  You don't have any active sessions. Claim one from the queue!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedSession(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Session Review</CardTitle>
                  <CardDescription>{selectedSession.session_id}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SessionReviewPanel
                session={selectedSession}
                onAction={(action, updates) => {
                  handleAction.mutate({
                    sessionId: selectedSession.session_id,
                    action,
                    updates,
                  });
                  setSelectedSession(null);
                }}
                isProcessing={handleAction.isPending}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

interface SessionReviewPanelProps {
  session: ShoppingSession;
  onAction: (action: string, updates?: any) => void;
  isProcessing: boolean;
}

const SessionReviewPanel = ({ session, onAction, isProcessing }: SessionReviewPanelProps) => {
  const getActionButtons = () => {
    if (session.status === 'shopper_pending') {
      return (
        <div className="flex gap-2">
          <Button
            onClick={() => onAction('approved')}
            disabled={isProcessing}
            className="flex-1"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve Outfits
          </Button>
          <Button
            variant="outline"
            onClick={() => onAction('rejected')}
            disabled={isProcessing}
            className="flex-1"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Request Refinement
          </Button>
        </div>
      );
    }
    
    if (session.status === 'size_review') {
      return (
        <div className="space-y-2">
          {session.size_confidence && session.size_confidence < 0.80 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Size confidence is {(session.size_confidence * 100).toFixed(0)}%. Review recommended.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => onAction('approved')}
              disabled={isProcessing}
              className="flex-1"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirm Size
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // In production, show size override UI
                onAction('override_size', { size_predictions: session.size_predictions });
              }}
              disabled={isProcessing}
            >
              Override Size
            </Button>
          </div>
        </div>
      );
    }
    
    if (session.status === 'final_approval') {
      return (
        <div className="space-y-2">
          {session.return_risk_score && session.return_risk_score > 0.40 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Return risk is {(session.return_risk_score * 100).toFixed(0)}%. Review recommended.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => onAction('approved')}
              disabled={isProcessing}
              className="flex-1"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Accept Risk & Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => onAction('swap_item')}
              disabled={isProcessing}
            >
              Swap Item
            </Button>
            <Button
              variant="outline"
              onClick={() => onAction('remove')}
              disabled={isProcessing}
            >
              Remove Item
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">User Intent</div>
          <div className="font-medium">{session.user_intent || 'N/A'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Occasion</div>
          <div className="font-medium">{session.occasion || 'N/A'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Budget</div>
          <div className="font-medium">${session.budget || 'N/A'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Tier</div>
          <div className="font-medium">{session.tier}</div>
        </div>
      </div>

      {session.outfits && (
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Outfits ({session.outfits.outfits?.length || 0})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {session.outfits.outfits?.map((outfit: any, idx: number) => (
              <div key={idx} className="p-2 border rounded text-sm">
                <div className="font-medium">{outfit.name || `Outfit ${idx + 1}`}</div>
                <div className="text-muted-foreground">
                  ${outfit.totalPrice} • {outfit.items?.length || 0} items
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {getActionButtons()}
    </div>
  );
};

export default StylistDashboard;

