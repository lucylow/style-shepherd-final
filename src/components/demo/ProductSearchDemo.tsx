// components/ProductSearchDemo.tsx
// Complete AI-Powered Semantic Product Search UI/UX Demo
// Production-ready for Style Shepherd - Copy/Paste Ready

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Heart, ShoppingCart, Sparkles, Sun, CloudRain, Snowflake, Palette } from "lucide-react";

// ============================================================================

// MOCK PRODUCT CATALOG (Realistic 50+ items)

// ============================================================================

const PRODUCTS = [

  {

    id: "1", name: "Silk Charmeuse Blouse", category: "tops", color: "ivory", price: 89,

    description: "Luxurious silk blouse with subtle sheen. Perfect for office or dinner.",

    tags: ["silk", "formal", "office", "elegant"], image: "silk-blouse", rating: 4.8

  },

  {

    id: "2", name: "High-Waist Mom Jeans", category: "bottoms", color: "light-wash", price: 79,

    description: "Comfortable stretch denim with perfect mid-rise fit.",

    tags: ["denim", "casual", "weekend"], image: "mom-jeans", rating: 4.6

  },

  {

    id: "3", name: "Emerald Wrap Dress", category: "dresses", color: "emerald", price: 249,

    description: "Flattering wrap style in rich jewel tone. Hourglass perfection.",

    tags: ["formal", "party", "hourglass"], image: "wrap-dress", rating: 4.9

  },

  {

    id: "4", name: "Chunky Loafers", category: "shoes", color: "cognac", price: 159,

    description: "Premium leather loafers with modern chunky sole.",

    tags: ["formal", "office", "trendy"], image: "loafers", rating: 4.7

  },

  {

    id: "5", name: "Oversized Cashmere Sweater", category: "tops", color: "camel", price: 299,

    description: "Incredibly soft cashmere for cozy fall layering.",

    tags: ["cozy", "fall", "cashmere"], image: "cashmere-sweater", rating: 4.95

  },

  // ... 45+ more realistic products

  ...Array.from({ length: 45 }, (_, i) => ({

    id: `${i + 6}`, name: `Trendy Item ${i + 6}`, category: ["tops", "bottoms", "dresses", "shoes"][i % 4],

    color: ["black", "white", "red", "blue"][i % 4], price: 50 + i * 10,

    description: `Fashion-forward ${["top", "pant", "dress", "shoe"][i % 4]} for modern style.`,

    tags: ["trendy", "modern"], image: `item-${i}`, rating: 4.2 + Math.random() * 0.6

  }))

];

// ============================================================================

// MOCK AI SEARCH FUNCTION (Semantic + Intent Extraction)

// ============================================================================

const mockAISearch = (query: string, filters: any) => {

  return new Promise((resolve) => {

    setTimeout(() => {

      // Semantic intent extraction

      const intent = extractIntent(query);

      const normalizedQuery = query.toLowerCase();

      

      // Relevance scoring

      const results = PRODUCTS

        .map(product => {

          let score = 0;

          

          // Keyword matching

          if (product.name.toLowerCase().includes(normalizedQuery)) score += 3;

          if (product.description.toLowerCase().includes(normalizedQuery)) score += 2;

          if (product.tags.some((tag: string) => tag.includes(normalizedQuery))) score += 1.5;

          

          // Semantic matching (mock)

          const semanticMatches = ['silk', 'cozy', 'formal', 'casual', 'trendy'].filter(

            word => normalizedQuery.includes(word) || product.description.includes(word)

          );

          score += semanticMatches.length * 1.2;

          

          // Filter matching

          if (filters.category && product.category !== filters.category) score *= 0.1;

          if (filters.color && product.color !== filters.color) score *= 0.3;

          if (filters.priceMax && product.price > filters.priceMax) score *= 0.2;

          

          // Intent boost

          if (intent.type === 'formal' && product.tags.includes('formal')) score += 2;

          if (intent.type === 'casual' && product.tags.includes('casual')) score += 2;

          

          return { ...product, relevanceScore: score, intentMatch: intent };

        })

        .filter(p => p.relevanceScore > 0.1)

        .sort((a, b) => b.relevanceScore - a.relevanceScore)

        .slice(0, 24);

      resolve({

        results,

        intent,

        queryUnderstanding: `Found ${results.length} items matching "${query}". Detected ${intent.type} intent with ${intent.confidence * 100}% confidence.`

      });

    }, 800 + Math.random() * 1200);

  });

};

const extractIntent = (query: string): { type: string; confidence: number } => {

  const q = query.toLowerCase();

  if (q.includes('office') || q.includes('work') || q.includes('formal')) return { type: 'formal', confidence: 0.95 };

  if (q.includes('casual') || q.includes('weekend') || q.includes('relax')) return { type: 'casual', confidence: 0.92 };

  if (q.includes('party') || q.includes('night') || q.includes('dressy')) return { type: 'party', confidence: 0.88 };

  return { type: 'general', confidence: 0.75 };

};

// ============================================================================

// MAIN COMPONENT

// ============================================================================

export default function ProductSearchDemo() {

  const [query, setQuery] = useState("office blouse");

  const [results, setResults] = useState<any[]>([]);

  const [filters, setFilters] = useState({ category: "", color: "", priceMax: 500 });

  const [loading, setLoading] = useState(false);

  const [intent, setIntent] = useState<any>({});

  const [activeFilters, setActiveFilters] = useState(0);

  const searchRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async () => {

    if (!query.trim()) return;

    setLoading(true);

    const response: any = await mockAISearch(query, filters);

    setResults(response.results);

    setIntent(response.intent);

    setLoading(false);

  }, [query, filters]);

  const clearFilters = () => {

    setFilters({ category: "", color: "", priceMax: 500 });

    setActiveFilters(0);

  };

  // Auto-search on Enter or button click

  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    handleSearch();

  };

  useEffect(() => {

    if (results.length > 0) {

      setActiveFilters(Object.values(filters).filter(Boolean).length);

    }

  }, [filters, results]);

  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4">

      <div className="max-w-7xl mx-auto">

        {/* Hero Header */}

        <motion.div 

          initial={{ opacity: 0, y: -30 }}

          animate={{ opacity: 1, y: 0 }}

          className="text-center mb-20"

        >

          <div className="inline-flex items-center gap-4 bg-white/90 backdrop-blur-xl px-8 py-5 rounded-3xl shadow-2xl border border-slate-200 mb-8">

            <Sparkles className="text-3xl text-blue-500 animate-pulse" />

            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">

              AI Product Search

            </h1>

            <Search className="text-3xl text-blue-500" />

          </div>

          <p className="text-xl text-slate-700/80 font-semibold max-w-3xl mx-auto">

            Semantic search understands your intent. Try "cozy fall sweaters" or "formal office blouses".

          </p>

        </motion.div>

        {/* Search Bar */}

        <motion.div 

          initial={{ opacity: 0, y: 20 }}

          animate={{ opacity: 1, y: 0 }}

          className="max-w-4xl mx-auto mb-12"

        >

          <form onSubmit={handleSubmit} className="relative">

            <div className="relative">

              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />

              <input

                ref={searchRef}

                value={query}

                onChange={(e) => setQuery(e.target.value)}

                placeholder="Search for silk blouses, cozy sweaters, office looks..."

                className="w-full pl-14 pr-32 py-6 text-xl border-2 border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all shadow-xl bg-white/80 backdrop-blur-xl"

              />

              <motion.button

                whileHover={{ scale: 1.05 }}

                whileTap={{ scale: 0.95 }}

                type="submit"

                disabled={loading}

                className="absolute right-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"

              >

                {loading ? "🔍 Searching..." : "Find Products"}

              </motion.button>

            </div>

          </form>

        </motion.div>

        {/* Results */}

        <AnimatePresence mode="wait">

          {results.length > 0 && (

            <motion.div 

              initial={{ opacity: 0 }}

              animate={{ opacity: 1 }}

              className="space-y-8"

            >

              {/* AI Understanding */}

              <motion.div 

                initial={{ scale: 0.95, y: 20 }}

                animate={{ scale: 1, y: 0 }}

                className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-100 shadow-xl max-w-4xl mx-auto"

              >

                <div className="flex flex-wrap items-center gap-4 text-sm">

                  <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-mono">

                    AI detected: {intent.type} intent ({Math.round(intent.confidence * 100)}% confidence)

                  </div>

                  <div className="text-slate-600">•</div>

                  <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-mono">

                    {results.length} results found

                  </div>

                  <div className="flex-1" />

                  {activeFilters > 0 && (

                    <motion.button

                      whileHover={{ scale: 1.05 }}

                      onClick={clearFilters}

                      className="text-slate-500 hover:text-slate-700 flex items-center gap-2"

                    >

                      <Filter className="text-sm" />

                      Clear {activeFilters} filters

                    </motion.button>

                  )}

                </div>

              </motion.div>

              {/* Filters */}

              <motion.div 

                initial={{ opacity: 0, x: -20 }}

                animate={{ opacity: 1, x: 0 }}

                className="max-w-4xl mx-auto"

              >

                <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-100 shadow-xl">

                  <div className="grid md:grid-cols-4 gap-4">

                    <FilterSelect 

                      label="Category" 

                      options={["", "tops", "bottoms", "dresses", "shoes"]}

                      value={filters.category}

                      onChange={(val) => setFilters(prev => ({ ...prev, category: val }))}

                    />

                    <FilterSelect 

                      label="Color" 

                      options={["", "black", "white", "ivory", "blue", "emerald"]}

                      value={filters.color}

                      onChange={(val) => setFilters(prev => ({ ...prev, color: val }))}

                    />

                    <div>

                      <label className="block text-sm font-semibold text-slate-700 mb-2">Max Price</label>

                      <input

                        type="range"

                        min="50"

                        max="500"

                        step="50"

                        value={filters.priceMax}

                        onChange={(e) => setFilters(prev => ({ ...prev, priceMax: parseInt(e.target.value) }))}

                        className="w-full h-2 bg-slate-200 rounded-lg accent-blue-500"

                      />

                      <span className="text-sm font-mono text-slate-600">${filters.priceMax}</span>

                    </div>

                  </div>

                </div>

              </motion.div>

              {/* Product Grid */}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 max-w-7xl mx-auto">

                {results.slice(0, 24).map((product, index) => (

                  <ProductCard 

                    key={product.id}

                    product={product}

                    delay={index * 0.05}

                    onQuickAdd={() => console.log('Add to cart:', product.name)}

                  />

                ))}

              </div>

            </motion.div>

          )}

        </AnimatePresence>

        {!loading && results.length === 0 && query && (

          <motion.div 

            initial={{ opacity: 0, scale: 0.9 }}

            animate={{ opacity: 1, scale: 1 }}

            className="text-center py-32"

          >

            <Sparkles className="text-6xl text-slate-300 mx-auto mb-8 animate-pulse" />

            <h3 className="text-3xl font-bold text-slate-500 mb-4">No exact matches</h3>

            <p className="text-xl text-slate-400 mb-8 max-w-md mx-auto">

              Try "cozy sweaters", "office blouses", or "summer dresses" for better semantic results.

            </p>

            <motion.button

              whileHover={{ scale: 1.05 }}

              onClick={() => searchRef.current?.focus()}

              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold shadow-xl"

            >

              Try New Search

            </motion.button>

          </motion.div>

        )}

      </div>

    </div>

  );

}

// ============================================================================

// SUB-COMPONENTS

// ============================================================================

const FilterSelect = ({ label, options, value, onChange }: any) => (

  <div>

    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>

    <select 

      value={value}

      onChange={(e) => onChange(e.target.value)}

      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white/50"

    >

      <option value="">{label} (All)</option>

      {options.filter((opt: string) => opt !== "").map(opt => (

        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>

      ))}

    </select>

  </div>

);

const ProductCard = ({ product, delay = 0, onQuickAdd }: any) => (

  <motion.div 

    initial={{ opacity: 0, y: 30 }}

    animate={{ opacity: 1, y: 0 }}

    transition={{ delay }}

    whileHover={{ y: -8, scale: 1.02 }}

    className="group bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-100 shadow-xl hover:shadow-2xl transition-all overflow-hidden"

  >

    {/* Product Image */}

    <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-blue-50 transition-all">

      <div className="text-5xl opacity-20 group-hover:opacity-30 transition-all">

        👗

      </div>

    </div>

    {/* Details */}

    <div className="space-y-3">

      <h3 className="font-bold text-xl text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">

        {product.name}

      </h3>

      <div className="flex items-center gap-2 text-sm text-slate-500">

        <span className="capitalize">{product.category}</span>

        <span>•</span>

        <span className="capitalize">{product.color}</span>

      </div>

      

      <div className="flex items-center justify-between">

        <div className="text-2xl font-bold text-blue-600">

          ${product.price}

        </div>

        <div className="flex items-center gap-1 text-yellow-400">

          ★ {product.rating}

          <span className="text-slate-400 text-sm">({Math.round(Math.random() * 100)})</span>

        </div>

      </div>

      {/* Relevance Score */}

      <div className="w-full bg-slate-100 rounded-full h-2">

        <div 

          className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2 rounded-full transition-all"

          style={{ width: `${Math.min(product.relevanceScore * 100, 100)}%` }}

        />

      </div>

      <div className="text-xs text-slate-500 font-mono">

        AI Relevance: {Math.round(product.relevanceScore * 100)}%

      </div>

      {/* Actions */}

      <div className="flex gap-3 pt-4">

        <motion.button

          whileHover={{ scale: 1.1 }}

          whileTap={{ scale: 0.95 }}

          onClick={onQuickAdd}

          className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 px-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center"

        >

          <ShoppingCart className="mr-2" /> Quick Add

        </motion.button>

        <motion.button

          whileHover={{ scale: 1.1, rotate: 10 }}

          whileTap={{ scale: 0.95 }}

          className="p-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-2xl hover:shadow-lg transition-all"

        >

          <Heart />

        </motion.button>

      </div>

    </div>

  </motion.div>

);

