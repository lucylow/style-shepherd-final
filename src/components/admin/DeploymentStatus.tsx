import { useState } from 'react';
import { 
  Server, 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Eye,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Deployment {
  id: string;
  version: string;
  branch: string;
  status: 'active' | 'inactive' | 'failed';
  createdAt: string;
  commit: string;
  buildTime: string;
  url: string | null;
}

export default function DeploymentStatus() {
  const [deployments, setDeployments] = useState<Deployment[]>([
    {
      id: '1',
      version: 'v2.1.0',
      branch: 'main',
      status: 'active',
      createdAt: '2024-01-15T10:30:00Z',
      commit: 'a1b2c3d',
      buildTime: '2m 34s',
      url: 'https://style-shepherd.lovable.app',
    },
    {
      id: '2',
      version: 'v2.0.9',
      branch: 'main',
      status: 'inactive',
      createdAt: '2024-01-14T15:20:00Z',
      commit: 'e4f5g6h',
      buildTime: '2m 12s',
      url: 'https://style-shepherd-v2.lovable.app',
    },
    {
      id: '3',
      version: 'v2.0.8',
      branch: 'develop',
      status: 'failed',
      createdAt: '2024-01-13T09:15:00Z',
      commit: 'i7j8k9l',
      buildTime: '1m 45s',
      url: null,
    },
  ]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" />Inactive</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Tabs defaultValue="deployments" className="space-y-6">
      <TabsList>
        <TabsTrigger value="deployments">Deployments</TabsTrigger>
        <TabsTrigger value="new-deployment">New Deployment</TabsTrigger>
        <TabsTrigger value="history">Deployment History</TabsTrigger>
      </TabsList>

      <TabsContent value="deployments">
        <Card>
          <CardHeader>
            <CardTitle>Active Deployments</CardTitle>
            <CardDescription>Manage your current deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {getStatusBadge(deployment.status)}
                      <div>
                        <div className="font-semibold text-lg">{deployment.version}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <GitBranch className="w-4 h-4" />
                          {deployment.branch}
                          <span className="mx-2">•</span>
                          <span>{deployment.commit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deployment.status === 'active' && (
                        <Button variant="outline" size="sm">
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                      )}
                      {deployment.status === 'inactive' && (
                        <Button variant="outline" size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          Activate
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Created</div>
                      <div className="font-medium flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(deployment.createdAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Build Time</div>
                      <div className="font-medium mt-1">{deployment.buildTime}</div>
                    </div>
                    {deployment.url && (
                      <div>
                        <div className="text-muted-foreground">URL</div>
                        <a 
                          href={deployment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline mt-1 block"
                        >
                          {deployment.url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="new-deployment">
        <Card>
          <CardHeader>
            <CardTitle>Create New Deployment</CardTitle>
            <CardDescription>Deploy a new version of your application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="branch">Git Branch</Label>
              <Select>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="develop">develop</SelectItem>
                  <SelectItem value="staging">staging</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version Tag</Label>
              <Input id="version" placeholder="v2.1.1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select>
                <SelectTrigger id="environment">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Deployment Notes (Optional)</Label>
              <Textarea 
                id="notes" 
                placeholder="Add any notes about this deployment..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button>
                <Play className="w-4 h-4 mr-2" />
                Deploy Now
              </Button>
              <Button variant="outline">
                Schedule Deployment
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>Deployment History</CardTitle>
            <CardDescription>View all past deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...deployments, ...deployments].map((deployment, index) => (
                <div key={`${deployment.id}-${index}`} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusBadge(deployment.status)}
                      <div>
                        <div className="font-medium">{deployment.version}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(deployment.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
