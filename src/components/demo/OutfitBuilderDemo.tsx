// components/OutfitBuilderDemo.tsx

// Complete Interactive Outfit Builder UI/UX Demo for Style Shepherd

// Production-ready with mock AI data - Copy/Paste ready

import React, { useState, useCallback, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";

import { 

  FaSun, FaCloudSun, FaSnowflake, FaUmbrellaBeach, 

  FaSuitcase, FaCocktail, FaRunning, FaUtensils 

} from "react-icons/fa";



// ============================================================================

// MOCK DATA - Realistic Fashion Inventory & AI Responses

// ============================================================================



const INVENTORY = [

  { id: "top-1", category: "top", name: "Silk Blouse", color: "ivory", style: "formal", occasion: "office", price: 89 },

  { id: "top-2", category: "top", name: "Oversized Tee", color: "black", style: "casual", occasion: "weekend", price: 35 },

  { id: "top-3", category: "top", name: "Crop Top", color: "hot-pink", style: "party", occasion: "night-out", price: 45 },

  

  { id: "bottom-1", category: "bottom", name: "Tailored Trousers", color: "charcoal", style: "formal", occasion: "office", price: 129 },

  { id: "bottom-2", category: "bottom", name: "Mom Jeans", color: "light-wash", style: "casual", occasion: "weekend", price: 79 },

  { id: "bottom-3", category: "bottom", name: "Leather Mini", color: "black", style: "party", occasion: "night-out", price: 199 },

  

  { id: "dress-1", category: "dress", name: "Wrap Dress", color: "emerald", style: "formal", occasion: "dinner", price: 249 },

  { id: "dress-2", category: "dress", name: "Sundress", color: "yellow", style: "casual", occasion: "beach", price: 69 },

  

  { id: "shoe-1", category: "shoes", name: "Loafers", color: "brown", style: "formal", occasion: "office", price: 159 },

  { id: "shoe-2", category: "shoes", name: "Sneakers", color: "white", style: "casual", occasion: "weekend", price: 99 },

  { id: "shoe-3", category: "shoes", name: "Heels", color: "nude", style: "party", occasion: "night-out", price: 229 },

  

  { id: "outer-1", category: "outerwear", name: "Blazer", color: "navy", style: "formal", occasion: "office", price: 299 },

  { id: "outer-2", category: "outerwear", name: "Denim Jacket", color: "indigo", style: "casual", occasion: "weekend", price: 119 },

];



const WEATHER_ICONS = {

  sunny: FaSun,

  warm: FaCloudSun,

  cold: FaSnowflake,

  beach: FaUmbrellaBeach

};



const OCCASIONS = [

  { id: "office", label: "Office", icon: FaSuitcase },

  { id: "dinner", label: "Dinner Date", icon: FaUtensils },

  { id: "night-out", label: "Night Out", icon: FaCocktail },

  { id: "weekend", label: "Weekend", icon: FaRunning },

  { id: "beach", label: "Beach Day", icon: FaUmbrellaBeach }

];



// ============================================================================

// MOCK AI OUTFIT GENERATOR

// ============================================================================



const generateMockOutfit = (constraints: any) => {

  const { occasion, weather, bodyType, colors } = constraints;

  

  // AI Logic: Filter by occasion + weather + body type compatibility

  const candidates = INVENTORY.filter(item => {

    const occasionMatch = item.occasion === occasion || item.occasion === "weekend";

    const weatherMatch = weather === "warm" || item.category !== "outerwear";

    const colorHarmony = !colors.length || colors.includes(item.color);

    return occasionMatch && weatherMatch && colorHarmony;

  });



  // Smart combination logic

  const outfit: any[] = [];

  

  // Top/Bottom priority

  const tops = candidates.filter(c => c.category === "top");

  const bottoms = candidates.filter(c => c.category === "bottom");

  const dresses = candidates.filter(c => c.category === "dress");

  

  if (dresses.length && occasion !== "office") {

    outfit.push(dresses[0]);

  } else {

    if (tops.length) outfit.push(tops[Math.floor(Math.random() * tops.length)]);

    if (bottoms.length) outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);

  }

  

  // Shoes

  const shoes = candidates.filter(c => c.category === "shoes");

  if (shoes.length) outfit.push(shoes[Math.floor(Math.random() * shoes.length)]);

  

  // Outerwear for cold weather

  if (weather === "cold") {

    const outerwear = candidates.filter(c => c.category === "outerwear");

    if (outerwear.length) outfit.push(outerwear[0]);

  }



  return {

    id: Date.now(),

    items: outfit,

    score: 0.88 + Math.random() * 0.12,

    cohesion: 0.92 + Math.random() * 0.08,

    suitability: {

      occasion: 0.95,

      weather: weather === "cold" ? 0.90 : 0.97,

      bodyType: bodyType === "hourglass" ? 0.94 : 0.89

    },

    colorHarmony: colors.length ? 0.93 : 0.87,

    price: outfit.reduce((sum: number, item: any) => sum + item.price, 0),

    explanation: `Perfect ${occasion} look for ${weather} weather. ${bodyType} flattering with ${colors.join(', ') || 'versatile'} tones.`,

    constraints

  };

};



// ============================================================================

// MAIN COMPONENT

// ============================================================================



export default function OutfitBuilderDemo() {

  const [step, setStep] = useState(1);

  const [constraints, setConstraints] = useState({

    occasion: "office",

    weather: "warm",

    bodyType: "hourglass",

    colors: ["black", "ivory"],

    budget: 500

  });

  const [outfits, setOutfits] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const [inventoryView, setInventoryView] = useState<Record<string, boolean>>({});



  const handleGenerateOutfits = useCallback(async () => {

    setLoading(true);

    setTimeout(() => {

      const newOutfits = Array.from({ length: 3 }, () => generateMockOutfit(constraints));

      setOutfits(newOutfits);

      setStep(3);

      setLoading(false);

    }, 2000);

  }, [constraints]);



  const toggleInventoryItem = (itemId: string) => {

    setInventoryView(prev => ({

      ...prev,

      [itemId]: !prev[itemId]

    }));

  };



  return (

    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">

      <div className="max-w-7xl mx-auto">

        {/* Hero Header */}

        <motion.div 

          initial={{ opacity: 0, y: -30 }}

          animate={{ opacity: 1, y: 0 }}

          className="text-center mb-20"

        >

          <div className="inline-flex items-center gap-4 bg-white/90 backdrop-blur-xl px-8 py-4 rounded-3xl shadow-2xl border border-indigo-200 mb-8">

            <div className="w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" />

            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">

              AI Outfit Builder

            </h1>

            <div className="w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" />

          </div>

          <p className="text-xl text-indigo-700/80 font-semibold max-w-3xl mx-auto leading-relaxed">

            Your personal stylist generates complete, cohesive outfits considering occasion, weather, body type, and budget.

          </p>

        </motion.div>



        <div className="grid xl:grid-cols-3 gap-12 items-start">

          {/* Left: Constraints Panel */}

          <motion.div 

            initial={{ opacity: 0, x: -50 }}

            animate={{ opacity: 1, x: 0 }}

            className="xl:col-span-1 space-y-8 sticky top-24"

          >

            {/* Step Indicator */}

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-indigo-100 shadow-xl">

              <div className="flex items-center justify-between mb-4">

                <h3 className="text-2xl font-bold text-indigo-800">🎯 Style Brief</h3>

                <div className="flex gap-2 text-sm font-mono text-indigo-500">

                  <span>Step {step}/3</span>

                </div>

              </div>

              

              {/* Occasion */}

              <div className="space-y-3 mb-6">

                <label className="block text-sm font-semibold text-indigo-700 mb-3">Occasion</label>

                <div className="grid grid-cols-2 gap-3">

                  {OCCASIONS.map(({ id, label, icon: Icon }) => (

                    <motion.button

                      key={id}

                      whileHover={{ scale: 1.05 }}

                      whileTap={{ scale: 0.95 }}

                      onClick={() => setConstraints(prev => ({ ...prev, occasion: id }))}

                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all group ${

                        constraints.occasion === id

                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-indigo-500 shadow-lg"

                          : "border-indigo-200 hover:border-indigo-300 hover:shadow-xl bg-white/50"

                      }`}

                    >

                      <Icon className="text-xl group-hover:rotate-6 transition-transform" />

                      <span className="font-semibold">{label}</span>

                    </motion.button>

                  ))}

                </div>

              </div>



              {/* Weather */}

              <div className="space-y-3 mb-6">

                <label className="block text-sm font-semibold text-indigo-700 mb-3">Weather</label>

                <div className="grid grid-cols-2 gap-3">

                  {Object.entries(WEATHER_ICONS).map(([key, Icon]) => (

                    <motion.button

                      key={key}

                      whileHover={{ scale: 1.05 }}

                      whileTap={{ scale: 0.95 }}

                      onClick={() => setConstraints(prev => ({ ...prev, weather: key }))}

                      className={`p-4 rounded-2xl border-2 text-center transition-all ${

                        constraints.weather === key

                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-indigo-500 shadow-lg"

                          : "border-indigo-200 hover:border-indigo-300 hover:shadow-xl bg-white/50"

                      }`}

                    >

                      <Icon className="mx-auto text-2xl mb-2" />

                      <div className="font-semibold capitalize">{key}</div>

                    </motion.button>

                  ))}

                </div>

              </div>



              {/* Quick Filters */}

              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-indigo-100">

                <select 

                  value={constraints.bodyType}

                  onChange={(e) => setConstraints(prev => ({ ...prev, bodyType: e.target.value }))}

                  className="p-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent"

                >

                  <option value="hourglass">Hourglass</option>

                  <option value="pear">Pear</option>

                  <option value="athletic">Athletic</option>

                </select>

                <input

                  type="range"

                  min="100"

                  max="1000"

                  step="50"

                  value={constraints.budget}

                  onChange={(e) => setConstraints(prev => ({ ...prev, budget: parseInt(e.target.value) }))}

                  className="w-full h-2 bg-indigo-200 rounded-lg accent-indigo-500"

                />

                <span className="col-span-2 text-sm text-indigo-600 font-mono">${constraints.budget}</span>

              </div>

            </div>



            {/* Generate Button */}

            <motion.button

              whileHover={{ scale: 1.02 }}

              whileTap={{ scale: 0.98 }}

              onClick={handleGenerateOutfits}

              disabled={loading}

              className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-6 px-8 rounded-3xl text-xl font-bold shadow-2xl hover:shadow-3xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"

            >

              {loading ? (

                <>

                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                  AI Building Outfits...

                </>

              ) : (

                <>✨ Generate 3 Perfect Outfits</>

              )}

            </motion.button>



            {/* Inventory Peek */}

            <motion.div 

              initial={{ opacity: 0 }}

              animate={{ opacity: 1 }}

              className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-indigo-100 shadow-xl"

            >

              <h4 className="font-bold text-indigo-800 mb-4 flex items-center gap-2">👜 Your Wardrobe ({Object.keys(inventoryView).filter(Boolean).length}/20)</h4>

              <div className="grid grid-cols-5 gap-2">

                {INVENTORY.slice(0, 10).map(item => (

                  <motion.div

                    key={item.id}

                    whileHover={{ scale: 1.2, rotate: 5 }}

                    className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${

                      inventoryView[item.id] 

                        ? "bg-indigo-500 text-white border-indigo-500 shadow-lg" 

                        : "bg-indigo-100 border-indigo-200 hover:shadow-md"

                    }`}

                    onClick={() => toggleInventoryItem(item.id)}

                  >

                    {item.category[0].toUpperCase()}

                  </motion.div>

                ))}

              </div>

            </motion.div>

          </motion.div>



          {/* Center: Results */}

          <AnimatePresence mode="wait">

            {step === 3 && outfits.length > 0 && (

              <motion.div 

                initial={{ opacity: 0, scale: 0.95 }}

                animate={{ opacity: 1, scale: 1 }}

                exit={{ opacity: 0, scale: 0.95 }}

                className="xl:col-span-2 space-y-8"

              >

                <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-indigo-100 shadow-2xl">

                  <div className="flex items-center gap-4 mb-6">

                    <h2 className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">

                      ✨ Your Perfect Outfits

                    </h2>

                    <div className="flex gap-3 text-sm bg-indigo-100 px-4 py-2 rounded-full">

                      <span className="font-mono">AI Score: {Math.round(outfits[0].score * 100)}%</span>

                      <span>{outfits.length} looks generated</span>

                    </div>

                  </div>

                </div>



                <div className="grid md:grid-cols-2 gap-8">

                  {outfits.map((outfit, index) => (

                    <OutfitCard 

                      key={outfit.id}

                      outfit={outfit}

                      delay={index * 0.1}

                    />

                  ))}

                </div>

              </motion.div>

            )}

          </AnimatePresence>



          {/* Initial State */}

          {step < 3 && !loading && outfits.length === 0 && (

            <motion.div 

              initial={{ opacity: 0, scale: 0.9 }}

              animate={{ opacity: 1, scale: 1 }}

              className="xl:col-span-2 text-center py-32"

            >

              <div className="text-6xl mb-8">👗</div>

              <h3 className="text-3xl font-bold text-indigo-600 mb-4">Ready to Build Your Perfect Outfit?</h3>

              <p className="text-xl text-indigo-400 max-w-md mx-auto">

                Select your occasion, weather, and preferences. AI will generate 3 cohesive looks just for you.

              </p>

            </motion.div>

          )}

        </div>

      </div>

    </div>

  );

}



// ============================================================================

// SUB-COMPONENTS

// ============================================================================



const OutfitCard = ({ outfit, delay = 0 }: any) => (

  <motion.div 

    initial={{ opacity: 0, y: 30 }}

    animate={{ opacity: 1, y: 0 }}

    transition={{ delay }}

    whileHover={{ y: -8, scale: 1.02 }}

    className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-indigo-100 shadow-xl hover:shadow-2xl transition-all"

  >

    {/* Score Badge */}

    <div className="flex items-center justify-between mb-6">

      <div className="flex items-center gap-3">

        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">

          {Math.round(outfit.score * 100)}%

        </div>

        <div>

          <div className="font-bold text-indigo-800">Outfit {outfit.id % 3 + 1}</div>

          <div className="text-sm text-indigo-500">${outfit.price} total</div>

        </div>

      </div>

      <div className="text-xs text-slate-500 font-mono">

        Cohesion: {Math.round(outfit.cohesion * 100)}%

      </div>

    </div>



    {/* Items Grid */}

    <div className="grid grid-cols-2 gap-4 mb-6">

      {outfit.items.map((item: any, idx: number) => (

        <motion.div

          key={item.id}

          initial={{ opacity: 0, scale: 0.8 }}

          animate={{ opacity: 1, scale: 1 }}

          transition={{ delay: delay + idx * 0.1 }}

          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100"

        >

          <div className="w-full h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl mb-3 flex items-center justify-center">

            <div className="text-3xl opacity-40">

              {item.category === "top" && "👕"}

              {item.category === "bottom" && "👖"}

              {item.category === "dress" && "👗"}

              {item.category === "shoes" && "👠"}

              {item.category === "outerwear" && "🧥"}

            </div>

          </div>

          <div className="space-y-1">

            <div className="font-bold text-indigo-800 text-sm">{item.name}</div>

            <div className="text-xs text-indigo-500 capitalize">{item.color}</div>

            <div className="text-lg font-bold text-indigo-600">${item.price}</div>

          </div>

        </motion.div>

      ))}

    </div>



    {/* AI Explanation */}

    <div className="bg-indigo-50 rounded-2xl p-4 mb-6">

      <div className="text-sm text-indigo-700 leading-relaxed">

        {outfit.explanation}

      </div>

    </div>



    {/* Metrics */}

    <div className="grid grid-cols-3 gap-3 mb-6">

      <MetricBar label="Occasion" value={outfit.suitability.occasion} />

      <MetricBar label="Weather" value={outfit.suitability.weather} />

      <MetricBar label="Fit" value={outfit.suitability.bodyType} />

    </div>



    {/* Actions */}

    <div className="flex gap-3">

      <motion.button

        whileHover={{ scale: 1.05 }}

        whileTap={{ scale: 0.95 }}

        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all"

      >

        Add to Cart

      </motion.button>

      <motion.button

        whileHover={{ scale: 1.05 }}

        whileTap={{ scale: 0.95 }}

        className="px-6 py-3 border-2 border-indigo-300 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all"

      >

        Save

      </motion.button>

    </div>

  </motion.div>

);



const MetricBar = ({ label, value }: { label: string; value: number }) => (

  <div>

    <div className="text-xs text-indigo-600 font-semibold mb-1">{label}</div>

    <div className="w-full bg-indigo-100 rounded-full h-2">

      <div 

        className="bg-gradient-to-r from-indigo-400 to-purple-400 h-2 rounded-full transition-all"

        style={{ width: `${value * 100}%` }}

      />

    </div>

    <div className="text-xs text-indigo-500 font-mono mt-1">{Math.round(value * 100)}%</div>

  </div>

);

