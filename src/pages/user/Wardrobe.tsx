import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shirt, 
  Plus, 
  Filter, 
  Grid3X3, 
  List, 
  Search,
  Sparkles,
  Calendar,
  TrendingUp,
  Heart,
  ShoppingBag,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/shopping/ProductCard';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import HeaderNav from '@/components/layout/HeaderNav';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Product } from '@/types/fashion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WardrobeItem extends Product {
  addedDate: string;
  wornCount?: number;
  lastWorn?: string;
  category: string;
}

export default function Wardrobe() {
  const { user } = useAuth();
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddItem, setShowAddItem] = useState(false);

  // Mock wardrobe data - in production, fetch from API
  useEffect(() => {
    const loadWardrobe = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock wardrobe items (would come from user's purchase history or manually added items)
        const mockWardrobe: WardrobeItem[] = [
          {
            id: '1',
            name: 'Classic White T-Shirt',
            brand: 'Basic Co',
            price: 29.99,
            imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
            category: 'Tops',
            addedDate: '2024-01-15',
            wornCount: 12,
            lastWorn: '2024-03-10',
            description: 'Essential white tee',
            sizes: ['S', 'M', 'L'],
            colors: ['White'],
            inStock: true,
          },
          {
            id: '2',
            name: 'Denim Jacket',
            brand: 'Denim Co',
            price: 89.99,
            imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
            category: 'Outerwear',
            addedDate: '2024-02-20',
            wornCount: 8,
            lastWorn: '2024-03-08',
            description: 'Classic denim jacket',
            sizes: ['S', 'M', 'L'],
            colors: ['Blue'],
            inStock: true,
          },
        ];
        
        setWardrobeItems(mockWardrobe);
      } catch (error) {
        console.error('Error loading wardrobe:', error);
        toast.error('Failed to load wardrobe');
      } finally {
        setIsLoading(false);
      }
    };

    loadWardrobe();
  }, [user]);

  const filteredItems = wardrobeItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(wardrobeItems.map(item => item.category)));

  const stats = {
    totalItems: wardrobeItems.length,
    categories: categories.length,
    mostWorn: wardrobeItems.reduce((max, item) => 
      (item.wornCount || 0) > (max.wornCount || 0) ? item : max, wardrobeItems[0] || {} as WardrobeItem
    ),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl shadow-lg">
                <Shirt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  My Wardrobe
                  <Sparkles className="w-5 h-5 text-primary" />
                </h1>
                <p className="text-muted-foreground">Manage your clothing collection</p>
              </div>
            </div>
            <Button onClick={() => setShowAddItem(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">{stats.totalItems}</p>
                  </div>
                  <Shirt className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="text-2xl font-bold">{stats.categories}</p>
                  </div>
                  <Grid3X3 className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Most Worn</p>
                    <p className="text-lg font-bold truncate">
                      {stats.mostWorn?.name || 'N/A'}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your wardrobe..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Wardrobe Items */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <SkeletonLoader variant="product" count={8} />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }>
              <AnimatePresence>
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        <div className="relative">
                          <ProductCard
                            product={item}
                            onAddToCart={() => toast.info('Already in your wardrobe!')}
                            onQuickView={() => {}}
                            onImageZoom={() => {}}
                            onToggleWishlist={() => {}}
                            isInWishlist={false}
                            onCompare={() => {}}
                          />
                          <div className="absolute top-2 right-2 flex gap-2">
                            {item.wornCount && (
                              <Badge variant="secondary" className="bg-background/80">
                                Worn {item.wornCount}x
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="p-4 border-t">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Added {new Date(item.addedDate).toLocaleDateString()}</span>
                            </div>
                            {item.lastWorn && (
                              <div className="flex items-center gap-2">
                                <span>Last worn {new Date(item.lastWorn).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState
              icon={Shirt}
              title="No items found"
              description={
                searchQuery || categoryFilter !== 'all'
                  ? "Try adjusting your search or filters"
                  : "Start building your wardrobe by adding items"
              }
            />
          )}
        </motion.div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
