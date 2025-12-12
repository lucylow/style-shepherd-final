/**
 * Hook for managing HITL shopping sessions
 * Provides real-time session status and actions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface StartSessionParams {
  userId: string;
  query: string;
  budget?: number;
  occasion?: string;
  preferences?: Record<string, any>;
  tier?: 'premium' | 'express' | 'vip';
}

export const useHITLSession = (sessionId?: string) => {
  const queryClient = useQueryClient();

  // Start a new shopping session
  const startSession = useMutation({
    mutationFn: async (params: StartSessionParams) => {
      const response = await api.post('/shopping/start', params);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['shopping-session', data.sessionId], data);
      toast({
        title: 'Session started',
        description: 'Your stylist is reviewing your preferences...',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to start session',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get session status
  const { data: session, isLoading } = useQuery({
    queryKey: ['shopping-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await api.get(`/shopping/session/${sessionId}`);
      return response.data.session;
    },
    enabled: !!sessionId,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Subscribe to real-time updates
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
          queryClient.setQueryData(['shopping-session', sessionId], payload.new);
          
          // Show toast notifications for status changes
          const status = payload.new.status;
          if (status === 'shopper_approved') {
            toast({
              title: 'Outfits approved!',
              description: 'Your stylist has approved your outfits',
            });
          } else if (status === 'size_approved') {
            toast({
              title: 'Sizes confirmed',
              description: 'Size recommendations have been approved',
            });
          } else if (status === 'checkout_ready') {
            toast({
              title: 'Ready to shop! 🎉',
              description: 'Your complete look is ready',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  return {
    session,
    isLoading,
    startSession: startSession.mutate,
    isStarting: startSession.isPending,
  };
};

