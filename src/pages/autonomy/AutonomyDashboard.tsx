/**
 * Autonomous Agent Monitoring Dashboard
 * 
 * Displays metrics and activity for all autonomous agents:
 * - Proactive triggers fired
 * - Auto-completed purchases
 * - Self-healing successes
 * - Personalization accuracy
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AutonomyMetrics {
  proactiveTriggersFired: number;
  autoCompletedPurchases: number;
  selfHealingSuccesses: number;
  personalizationAccuracy: number;
  conversionLift: number;
  timeSavedPerPurchase: number;
  returnReduction: number;
}

interface AgentActivity {
  id: string;
  userId: string;
  agentType: string;
  triggerType: string;
  action: string;
  success: boolean;
  autonomyLevel: number;
  createdAt: string;
}

export default function AutonomyDashboard() {
  const [metrics, setMetrics] = useState<AutonomyMetrics | null>(null);
  const [activity, setActivity] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMetrics();
    fetchActivity();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/autonomy/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load autonomy metrics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      // In production, would fetch for all users or specific user
      const response = await fetch('/api/autonomy/activity/user123?limit=20');
      if (!response.ok) throw new Error('Failed to fetch activity');
      const data = await response.json();
      setActivity(data);
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const getAgentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      personalShopper: 'Personal Shopper',
      makeupArtist: 'Makeup Artist',
      sizePredictor: 'Size Predictor',
      returnsPredictor: 'Returns Predictor',
    };
    return labels[type] || type;
  };

  const getTriggerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      calendar: '📅 Calendar',
      weather: '🌧️ Weather',
      stock: '📦 Stock',
      budget: '💰 Budget',
      return: '↩️ Return',
      schedule: '⏰ Schedule',
      selfie: '📸 Selfie',
      checkout: '🛒 Checkout',
    };
    return labels[type] || type;
  };

  const getAutonomyLevelBadge = (level: number) => {
    const levels = [
      { label: 'Level 1: Reactive', color: 'bg-gray-500' },
      { label: 'Level 2: Proactive', color: 'bg-blue-500' },
      { label: 'Level 3: Transactional', color: 'bg-green-500' },
      { label: 'Level 4: Self-Healing', color: 'bg-purple-500' },
      { label: 'Level 5: Forecasting', color: 'bg-orange-500' },
    ];
    const levelInfo = levels[level - 1] || levels[0];
    return (
      <Badge className={levelInfo.color}>
        {levelInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading autonomy metrics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Autonomous Agent Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor proactive triggers, auto-completed purchases, and self-healing actions
          </p>
        </div>
        <Button onClick={fetchMetrics} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Proactive Triggers</CardTitle>
              <CardDescription>Triggers fired today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.proactiveTriggersFired}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Calendar, weather, stock alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Auto Purchases</CardTitle>
              <CardDescription>Completed autonomously</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.autoCompletedPurchases}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {metrics.conversionLift > 0 && (
                  <span className="text-green-600">
                    +{Math.round(metrics.conversionLift * 100)}% conversion lift
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Self-Healing</CardTitle>
              <CardDescription>Autonomous resolutions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.selfHealingSuccesses}</div>
              <p className="text-xs text-muted-foreground mt-2">
                92% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
              <CardDescription>Personalization accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round(metrics.personalizationAccuracy * 100)}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {metrics.personalizationAccuracy > 0.94 && (
                  <span className="text-green-600">
                    +{Math.round((metrics.personalizationAccuracy - 0.94) * 100)}% improvement
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Business Impact */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Business Impact</CardTitle>
            <CardDescription>Quantifiable improvements from autonomous agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  +{Math.round(metrics.conversionLift * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Conversion Increase</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.timeSavedPerPurchase} min
                </div>
                <div className="text-sm text-muted-foreground">Time Saved per Purchase</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  -{Math.round(metrics.returnReduction * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Return Reduction</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Agent Activity</CardTitle>
          <CardDescription>Latest autonomous actions and triggers</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Agents</TabsTrigger>
              <TabsTrigger value="personalShopper">Personal Shopper</TabsTrigger>
              <TabsTrigger value="makeupArtist">Makeup Artist</TabsTrigger>
              <TabsTrigger value="sizePredictor">Size Predictor</TabsTrigger>
              <TabsTrigger value="returnsPredictor">Returns Predictor</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-2">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={item.success ? 'default' : 'destructive'}>
                        {item.success ? '✓' : '✗'}
                      </Badge>
                      <div>
                        <div className="font-medium">
                          {getAgentTypeLabel(item.agentType)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getTriggerTypeLabel(item.triggerType)} • {item.action}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getAutonomyLevelBadge(item.autonomyLevel)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
