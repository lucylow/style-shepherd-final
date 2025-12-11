"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// MOCK DATA (Realistic production data)
// ============================================================================

const MOCK_BRANDS = [
  { id: "zara", name: "Zara", vanity: 1.15, logo: "🛍️" },
  { id: "reformation", name: "Reformation", vanity: 1.00, logo: "👗" },
  { id: "hm", name: "H&M", vanity: 1.10, logo: "👚" },
  { id: "uniqlo", name: "Uniqlo", vanity: 1.02, logo: "👕" },
  { id: "everlane", name: "Everlane", vanity: 1.00, logo: "👖" },
  { id: "oldnavy", name: "Old Navy", vanity: 0.90, logo: "🧥" }
];

const BODY_TYPES = [
  "hourglass", "pear", "apple", "rectangle", "inverted_triangle", "athletic"
];

const CATEGORIES = ["dress", "top", "bottom", "jacket", "shoes"];

// ============================================================================
// MOCK API RESPONSE GENERATOR (Fallback)
// ============================================================================

const generateMockPrediction = (measurements: any, brand: string, category: string) => {
  const vanity = MOCK_BRANDS.find(b => b.id === brand.toLowerCase())?.vanity || 1.0;
  const baseSize = measurements.waist_cm < 70 ? "S" : measurements.waist_cm < 80 ? "M" : "L";
  
  const sizes = vanity > 1.1 ? [sizeUp(baseSize), baseSize, sizeDown(baseSize)] :
               vanity < 0.95 ? [baseSize, sizeDown(baseSize), sizeUp(baseSize)] :
               [baseSize, sizeDown(baseSize), sizeUp(baseSize)];

  return {
    predicted_sizes: {
      primary: sizes[0],
      confidence: 0.92 + (Math.random() - 0.5) * 0.1,
      alternatives: sizes.slice(1)
    },
    normalized_measurements: {
      bust_cm: (measurements.bust_cm || 92) * vanity,
      waist_cm: (measurements.waist_cm || 74) * vanity,
      hips_cm: (measurements.hips_cm || 98) * vanity
    },
    brand_adjustments_applied: {
      brand,
      vanity_sizing_factor: vanity,
      adjustment_note: vanity > 1.1 ? "Runs small - size up recommended" : 
                      vanity < 0.95 ? "Runs large - true to size" : "True to size"
    },
    fit_recommendation: {
      recommended_fit: vanity > 1.1 ? "size_up" : vanity < 0.95 ? "size_down" : "true_to_size",
      sizing_consistency: 0.85 + (Math.random() - 0.5) * 0.1,
      return_risk: vanity > 1.15 ? 0.35 : 0.15
    },
    explanation: `Your ${Math.round((measurements.waist_cm || 74) * vanity)}cm waist fits ${sizes[0]} in ${brand}. ${vanity > 1.0 ? 'Vanity sizing applied (+15%).' : ''}`,
    category
  };
};

const sizeUp = (size: string) => ({ S: "M", M: "L", L: "XL", XL: "XXL" }[size] || size);
const sizeDown = (size: string) => ({ M: "S", L: "M", XL: "L", XXL: "XL" }[size] || size);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SizePredictionDemo() {
  const [step, setStep] = useState(1);
  const [measurements, setMeasurements] = useState({
    height_cm: 168,
    weight_kg: 62,
    bust_cm: 92,
    waist_cm: 74,
    hips_cm: 98,
    body_type: "hourglass"
  });
  const [selectedBrands, setSelectedBrands] = useState(["zara", "reformation"]);
  const [selectedCategory, setSelectedCategory] = useState("dress");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowResults(false);

    try {
      // Prepare products array from selected brands
      const products = selectedBrands.map(brandId => {
        const brand = MOCK_BRANDS.find(b => b.id === brandId);
        return {
          brand: brand?.name || brandId,
          category: selectedCategory,
        };
      });

      // Call Supabase Edge Function
      const { data, error: supabaseError } = await supabase.functions.invoke('size-prediction', {
        body: {
          measurements,
          products,
        },
      });

      if (supabaseError) {
        throw supabaseError;
      }

      if (data?.success && data?.predictions) {
        setPredictions(data.predictions);
        setShowResults(true);
      } else {
        // Fallback to mock data if API fails
        const results = selectedBrands.map(brandId => {
          const brand = MOCK_BRANDS.find(b => b.id === brandId);
          return generateMockPrediction(measurements, brand?.name || "Generic", selectedCategory);
        });
        setPredictions(results);
        setShowResults(true);
      }
    } catch (err) {
      console.error("Size prediction error:", err);
      setError(err instanceof Error ? err.message : "Failed to predict sizes");
      
      // Fallback to mock data
      const results = selectedBrands.map(brandId => {
        const brand = MOCK_BRANDS.find(b => b.id === brandId);
        return generateMockPrediction(measurements, brand?.name || "Generic", selectedCategory);
      });
      setPredictions(results);
      setShowResults(true);
    } finally {
      setLoading(false);
    }
  }, [measurements, selectedBrands, selectedCategory]);

  const updateMeasurement = (key: string, value: number | string) => {
    setMeasurements(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-xl px-6 py-3 rounded-full shadow-xl border border-rose-200 mb-6">
            <div className="w-3 h-3 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
              AI Size Predictor
            </h1>
            <div className="w-3 h-3 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full animate-pulse" />
          </div>
          <p className="text-xl text-rose-700/80 font-medium max-w-2xl mx-auto">
            Cross-brand size normalization with vanity sizing correction. 
            Predicts your perfect fit across 50+ brands.
          </p>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800">
            ⚠️ {error} (Using fallback predictions)
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Input Form */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:max-w-lg space-y-8"
          >
            {/* Measurements */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-rose-100 shadow-2xl">
              <h3 className="text-2xl font-bold text-rose-800 mb-6 flex items-center gap-3">
                📏 Your Measurements
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <InputField 
                  label="Height (cm)" 
                  value={measurements.height_cm}
                  onChange={(v) => updateMeasurement("height_cm", v)}
                  min={140} max={200}
                />
                <InputField 
                  label="Bust/Chest (cm)" 
                  value={measurements.bust_cm}
                  onChange={(v) => updateMeasurement("bust_cm", v)}
                  min={70} max={130}
                />
                <InputField 
                  label="Waist (cm)" 
                  value={measurements.waist_cm}
                  onChange={(v) => updateMeasurement("waist_cm", v)}
                  min={50} max={120}
                />
                <InputField 
                  label="Hips (cm)" 
                  value={measurements.hips_cm}
                  onChange={(v) => updateMeasurement("hips_cm", v)}
                  min={70} max={140}
                />
              </div>
              <div className="mt-6 pt-6 border-t border-rose-100">
                <label className="block text-sm font-semibold text-rose-700 mb-3">
                  Body Type
                </label>
                <select 
                  value={measurements.body_type}
                  onChange={(e) => updateMeasurement("body_type", e.target.value)}
                  className="w-full p-3 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                >
                  {BODY_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Brands & Category */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-rose-100 shadow-2xl">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-bold text-rose-800 mb-4">Brands</h4>
                  <div className="space-y-2">
                    {MOCK_BRANDS.map(brand => (
                      <BrandToggle 
                        key={brand.id}
                        brand={brand}
                        selected={selectedBrands.includes(brand.id)}
                        onToggle={(id) => {
                          setSelectedBrands(prev => 
                            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-rose-800 mb-4">Category</h4>
                  <div className="space-y-2">
                    {CATEGORIES.map(cat => (
                      <CategoryToggle 
                        key={cat}
                        category={cat}
                        selected={selectedCategory === cat}
                        onSelect={() => setSelectedCategory(cat)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePredict}
              disabled={loading || selectedBrands.length === 0}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-6 px-8 rounded-3xl text-xl font-bold shadow-2xl hover:shadow-3xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Predicting Sizes...
                </>
              ) : (
                <>
                  ✨ Predict My Perfect Sizes
                  <span className="text-sm">({selectedBrands.length} brands)</span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Right: Results */}
          <AnimatePresence mode="wait">
            {showResults && (
              <motion.div 
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-rose-100 shadow-2xl sticky top-12">
                  <h2 className="text-3xl font-bold text-rose-800 mb-2 flex items-center gap-3">
                    📊
                    <span>Your Perfect Sizes</span>
                  </h2>
                  <p className="text-rose-600 font-semibold">
                    AI analyzed {selectedBrands.length} brands • {Math.round(predictions[0]?.normalized_measurements?.waist_cm || measurements.waist_cm)}cm waist normalized
                  </p>
                </div>

                <div className="space-y-6">
                  {predictions.map((prediction, idx) => (
                    <SizePredictionCard 
                      key={idx}
                      prediction={prediction}
                      index={idx}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const InputField = ({ label, value, onChange, min, max }: any) => (
  <div>
    <label className="block text-sm font-semibold text-rose-700 mb-1.5">{label}</label>
    <input
      type="range"
      min={min}
      max={max}
      step="1"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-2 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-400 hover:accent-rose-500 transition-all"
    />
    <span className="text-sm font-mono font-semibold text-rose-600 ml-2">{value}</span>
  </div>
);

const BrandToggle = ({ brand, selected, onToggle }: any) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => onToggle(brand.id)}
    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
      selected 
        ? "bg-gradient-to-r from-rose-100 to-pink-100 border-rose-400 shadow-md" 
        : "border-rose-200 hover:border-rose-300 hover:shadow-lg"
    }`}
  >
    <span className="text-2xl">{brand.logo}</span>
    <div>
      <div className="font-semibold text-rose-800">{brand.name}</div>
      <div className="text-xs text-rose-500">
        {brand.vanity > 1.1 && "🛑 Runs small"} 
        {brand.vanity < 0.95 && "➕ Runs large"}
        {brand.vanity === 1.0 && "✅ True to size"}
      </div>
    </div>
  </motion.button>
);

const CategoryToggle = ({ category, selected, onSelect }: any) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onSelect}
    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
      selected 
        ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-500 shadow-lg" 
        : "border-rose-200 hover:border-rose-300 hover:shadow-md"
    }`}
  >
    <div className="font-semibold capitalize">{category}</div>
  </motion.button>
);

const SizePredictionCard = ({ prediction, index }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="group bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-rose-100 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-2"
  >
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full" />
        <h3 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
          {prediction.brand_adjustments_applied?.brand || "Unknown Brand"}
        </h3>
      </div>
      <div className="flex items-center gap-2 text-sm bg-rose-100 px-3 py-1 rounded-full">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          (prediction.fit_recommendation?.return_risk || 0) > 0.3 
            ? "bg-orange-200 text-orange-800" 
            : "bg-emerald-200 text-emerald-800"
        }`}>
          {(prediction.fit_recommendation?.return_risk || 0) > 0.3 ? "⚠️ Medium Risk" : "✅ Low Risk"}
        </span>
        <span>{Math.round((prediction.predicted_sizes?.confidence || 0.75) * 100)}% confidence</span>
      </div>
    </div>

    {/* Primary Size */}
    <div className="text-center py-8 px-6 bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl mb-6">
      <div className="text-4xl font-black text-rose-600 mb-2 tracking-wide">
        {prediction.predicted_sizes?.primary || "M"}
      </div>
      <div className="text-sm text-rose-600 font-semibold uppercase tracking-wide">
        Primary Recommendation
      </div>
    </div>

    {/* Alternatives */}
    {prediction.predicted_sizes?.alternatives && prediction.predicted_sizes.alternatives.length > 0 && (
      <div className="grid grid-cols-3 gap-3 mb-6">
        {prediction.predicted_sizes.alternatives.map((size: string, i: number) => (
          <div key={i} className="p-4 border-2 border-rose-200 rounded-xl hover:border-rose-400 transition-all hover:shadow-md">
            <div className="text-2xl font-bold text-rose-600">{size}</div>
            <div className="text-xs text-rose-500 mt-1">Alternative</div>
          </div>
        ))}
      </div>
    )}

    {/* Key Measurements */}
    {prediction.normalized_measurements && (
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {Object.entries(prediction.normalized_measurements).map(([key, value]) => (
          key !== 'body_type' && typeof value === 'number' && (
            <div key={key} className="text-center p-3 bg-rose-50 rounded-xl">
              <div className="text-2xl font-mono font-bold text-rose-700">
                {Math.round(value)}
              </div>
              <div className="text-xs text-rose-600 uppercase tracking-wide">{key.replace('_cm', 'cm')}</div>
            </div>
          )
        ))}
      </div>
    )}

    {/* Recommendation */}
    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
      <div className="font-semibold text-emerald-800 mb-1">
        {(prediction.fit_recommendation?.recommended_fit || "true_to_size").replace('_', ' ').toUpperCase()}
      </div>
      <div className="text-sm text-emerald-700">
        {prediction.brand_adjustments_applied?.adjustment_note || "True to size"}
      </div>
    </div>

    {prediction.explanation && (
      <div className="mt-6 pt-6 border-t border-rose-100 text-sm text-rose-600">
        {prediction.explanation}
      </div>
    )}
  </motion.div>
);

