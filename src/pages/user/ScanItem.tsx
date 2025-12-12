import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Search, X, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/shopping/ProductCard';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import HeaderNav from '@/components/layout/HeaderNav';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Product } from '@/types/fashion';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/api-config';

export default function ScanItem() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Unable to access camera. Please allow camera permissions.');
      console.error('Camera error:', err);
      toast.error('Camera access denied');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageUrl);
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      toast.error('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setUploadedImage(imageUrl);
      setCapturedImage(imageUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleScan = useCallback(async () => {
    const imageToScan = capturedImage || uploadedImage;
    if (!imageToScan) {
      toast.error('Please capture or upload an image first');
      return;
    }

    setIsScanning(true);
    setError(null);
    setSimilarProducts([]);

    try {
      // The API expects an imageUrl, so we'll use the base64 data URL directly
      // In production, you might want to upload the image to a storage service first
      const apiBase = getApiBaseUrl();
      
      const searchResponse = await fetch(`${apiBase}/visual-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageToScan,
          limit: 10,
        }),
      });

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to scan image');
      }

      const data = await searchResponse.json();
      // Transform results to match Product type
      const products = (data.results || []).map((result: any) => ({
        id: result.productId || result.id || `product-${Math.random()}`,
        name: result.name || result.title || 'Product',
        brand: result.brand || 'Unknown',
        price: result.price || 0,
        imageUrl: result.imageUrl || result.image || '',
        description: result.description || '',
        category: result.category || '',
        sizes: result.sizes || [],
        colors: result.colors || [],
        inStock: true,
      }));
      
      setSimilarProducts(products);
      
      if (products.length > 0) {
        toast.success(`Found ${products.length} similar products!`);
      } else {
        toast.info('No similar products found. Try a different image.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scan image';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsScanning(false);
    }
  }, [capturedImage, uploadedImage]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setUploadedImage(null);
    setSimilarProducts([]);
    setError(null);
    startCamera();
  }, [startCamera]);

  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setUploadedImage(null);
    setSimilarProducts([]);
    setError(null);
    stopCamera();
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                Scan Item
                <Sparkles className="w-5 h-5 text-primary" />
              </h1>
              <p className="text-muted-foreground">Capture or upload an item to find similar products</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera/Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Capture or Upload Image</CardTitle>
                <CardDescription>
                  Take a photo with your camera or upload an existing image
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-md">
                    {error}
                  </div>
                )}

                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <AnimatePresence mode="wait">
                    {!capturedImage ? (
                      <motion.div
                        key="camera"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative w-full h-full"
                      >
                        {stream ? (
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <div className="text-center">
                              <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Camera preview</p>
                            </div>
                          </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                      </motion.div>
                    ) : (
                      <motion.img
                        key="captured"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        src={capturedImage}
                        alt="Captured item"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </AnimatePresence>
                </div>

                {!capturedImage ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <Button 
                        onClick={startCamera} 
                        className="flex-1"
                        disabled={!!stream}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {stream ? 'Camera Active' : 'Start Camera'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {stream && (
                      <Button onClick={capturePhoto} className="w-full">
                        <Camera className="h-4 w-4 mr-2" />
                        Capture Photo
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleScan} 
                      className="flex-1"
                      disabled={isScanning}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Find Similar Products
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleRetake} 
                      variant="outline" 
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Retake
                    </Button>
                  </div>
                )}

                {capturedImage && !isScanning && (
                  <Button 
                    onClick={handleReset} 
                    variant="ghost" 
                    className="w-full"
                  >
                    Start Over
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Similar Products</span>
                  {similarProducts.length > 0 && (
                    <Badge variant="secondary">{similarProducts.length} found</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Products matching your scanned item
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isScanning ? (
                  <div className="space-y-4">
                    <SkeletonLoader variant="product" count={3} />
                  </div>
                ) : similarProducts.length > 0 ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {similarProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ProductCard
                          product={product}
                          onAddToCart={() => toast.success('Added to cart!')}
                          onQuickView={() => {}}
                          onImageZoom={() => {}}
                          onToggleWishlist={() => {}}
                          isInWishlist={false}
                          onCompare={() => {}}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Search}
                    title="No products found"
                    description={
                      capturedImage
                        ? "Click 'Find Similar Products' to search"
                        : "Capture or upload an image to get started"
                    }
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
