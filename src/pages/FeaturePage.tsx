import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Loader2, Copy, Check } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { toast } from "sonner";
import backendEndpoints from "@/config/backendEndpoints.json";

interface Endpoint {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
}

const examplePayloads: Record<string, string> = {
  "elevenlabs-tts": JSON.stringify({ text: "Hello, welcome to Style Shepherd!", voiceId: "JBFqnCBsd6RMkjVDRZzb" }, null, 2),
  "vultr-inference": JSON.stringify({ prompt: "Recommend a summer outfit for a casual beach party" }, null, 2),
  "fashion-assistant": JSON.stringify({ message: "What should I wear to a job interview?", context: {} }, null, 2),
  "style-recommendations": JSON.stringify({ preferences: { style: "casual", colors: ["blue", "white"] } }, null, 2),
};

export default function FeaturePage() {
  const { id } = useParams<{ id: string }>();
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [input, setInput] = useState("{}");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const found = (backendEndpoints as Endpoint[]).find((e) => e.id === id);
    if (found) {
      setEndpoint(found);
      setInput(examplePayloads[id] || "{}");
    }
  }, [id]);

  async function callEndpoint() {
    if (!endpoint) return;
    
    setLoading(true);
    setResult(null);

    try {
      let response;
      if (endpoint.method === "GET") {
        response = await apiGet(endpoint.path);
      } else {
        const body = JSON.parse(input);
        response = await apiPost(endpoint.path, body);
      }

      if (response.success) {
        setResult(JSON.stringify(response.data, null, 2));
        toast.success("Request successful");
      } else {
        setResult(`Error: ${response.error}`);
        toast.error(response.error || "Request failed");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Invalid JSON or request error";
      setResult(`Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function copyResult() {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!endpoint) {
    return (
      <Layout>
        <div className="container py-8">
          <p className="text-muted-foreground">Feature not found</p>
          <Button asChild variant="link" className="mt-4">
            <Link to="/features">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Features
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/features">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Features
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{endpoint.name}</CardTitle>
                <CardDescription className="mt-2">
                  {endpoint.description}
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {endpoint.method}
              </Badge>
            </div>
            <p className="font-mono text-sm text-muted-foreground mt-2 bg-muted px-2 py-1 rounded">
              {endpoint.path}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {endpoint.method !== "GET" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Request Body (JSON)</label>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder='{"key": "value"}'
                />
              </div>
            )}

            <Button onClick={callEndpoint} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {loading ? "Calling..." : `Call ${endpoint.name}`}
            </Button>

            {result && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Response</label>
                  <Button variant="ghost" size="sm" onClick={copyResult}>
                    {copied ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap">
                  {result}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-medium mb-2">Demo Mode Notice</h3>
          <p className="text-sm text-muted-foreground">
            This feature page allows you to test backend endpoints. If API keys are not configured,
            some endpoints may return mock responses. Check the response for a <code>source</code> field
            indicating whether the response is from the actual service or a mock.
          </p>
        </div>
      </div>
    </Layout>
  );
}
