import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { checkEndpointStatus } from "@/lib/apiClient";
import backendEndpoints from "@/config/backendEndpoints.json";

interface Endpoint {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
}

export default function FeaturesExplorer() {
  const [endpoints, setEndpoints] = useState<(Endpoint & { status?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEndpoints() {
      // Use static config
      const list = backendEndpoints as Endpoint[];
      
      // Check status for each endpoint
      const withStatus = await Promise.all(
        list.map(async (ep) => {
          const status = await checkEndpointStatus(ep.path, ep.method);
          return { ...ep, status };
        })
      );
      
      setEndpoints(withStatus);
      setLoading(false);
    }
    
    loadEndpoints();
  }, []);

  const getStatusBadge = (status?: number) => {
    if (!status || status === 0) {
      return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unknown</Badge>;
    }
    if (status >= 200 && status < 300) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>;
    }
    if (status >= 400) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <Layout>
      <div className="container py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Features Explorer</h1>
          <p className="text-muted-foreground">
            Discover and test all backend features and API endpoints available in Style Shepherd.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {endpoints.map((ep) => (
              <Card key={ep.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{ep.name}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        <Badge variant="outline" className="mr-2">{ep.method}</Badge>
                        {ep.path}
                      </CardDescription>
                    </div>
                    {getStatusBadge(ep.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{ep.description}</p>
                  <Button asChild size="sm">
                    <Link to={`/features/${ep.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-medium mb-2">Adding New Features</h3>
          <p className="text-sm text-muted-foreground">
            To add a new backend feature to this explorer, update{" "}
            <code className="bg-background px-1 py-0.5 rounded">src/config/backendEndpoints.json</code>
            {" "}with the endpoint details.
          </p>
        </div>
      </div>
    </Layout>
  );
}
