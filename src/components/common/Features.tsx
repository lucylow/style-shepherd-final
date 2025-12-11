import { useState } from "react";
import { Bot, TrendingUp, Leaf, CheckCircle2, ChevronDown, Sparkles, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Features = () => {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const features = [
    {
      icon: Bot,
      color: "bg-primary",
      title: "Voice Fashion Assistant",
      description: "Natural conversations about style, fit, and occasion wear with our AI stylist.",
      items: [
        "24/7 styling advice",
        "Multi-brand size mapping",
        "Personalized recommendations",
      ],
      expandedContent: "Our AI-powered voice assistant understands natural language queries about fashion, sizing, and styling. Simply speak your needs, and get instant recommendations tailored to your body type, style preferences, and occasion requirements.",
      stats: { accuracy: "95%", responseTime: "<2s", languages: "10+" },
    },
    {
      icon: TrendingUp,
      color: "bg-fashion-gold",
      title: "Returns Prediction Engine",
      description: "Advanced ML algorithms predict return likelihood before you buy.",
      items: [
        "90% prediction accuracy",
        "Real-time risk scoring",
        "Size optimization",
      ],
      expandedContent: "Leveraging machine learning models trained on millions of transactions, our prediction engine analyzes product dimensions, material properties, brand sizing patterns, and your personal fit history to calculate return probability with industry-leading accuracy.",
      stats: { accuracy: "90%", savings: "$2.4M", users: "50K+" },
    },
    {
      icon: Leaf,
      color: "bg-fashion-sage",
      title: "Sustainable Shopping",
      description: "Reduce fashion waste by getting it right the first time.",
      items: [
        "Carbon footprint tracking",
        "Waste reduction analytics",
        "Eco-friendly brand partners",
      ],
      expandedContent: "Every purchase decision you make with Style Shepherd contributes to reducing fashion waste. Track your environmental impact, see how many returns you've avoided, and discover sustainable brands that align with your values.",
      stats: { co2Saved: "12.5T", returnsAvoided: "45K", partners: "200+" },
    },
  ];

  return (
    <ErrorBoundary>
      <section id="features" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-12 lg:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 gradient-text-primary tracking-tight">
            Revolutionary AI Features
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Powered by cutting-edge machine learning and voice AI technology
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, idx) => {
            const isExpanded = expandedCard === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                whileHover={{ y: -10, scale: 1.03 }}
                className="bg-card rounded-3xl p-6 sm:p-8 border border-border/50 shadow-elevated hover:shadow-elevated-xl transition-all duration-300 group backdrop-blur-sm hover:border-primary/30 card-hover-enhanced card-premium relative overflow-hidden cursor-pointer"
                onClick={() => setExpandedCard(isExpanded ? null : idx)}
              >
                {/* Enhanced interactive background gradient */}
                <motion.div
                  className={`absolute inset-0 ${feature.color} opacity-0 group-hover:opacity-8 transition-opacity duration-500`}
                  initial={false}
                />
                {/* Subtle shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 10 }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:shadow-glow-primary transition-all relative overflow-hidden z-10`}
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100"
                  />
                  <feature.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10" />
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors flex-1">
                      {feature.title}
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 180 }}
                            whileTap={{ scale: 0.9 }}
                            className="ml-2"
                          >
                            <Info className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to learn more</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-3 mb-4">
                    {feature.items.map((item, itemIdx) => (
                      <motion.li 
                        key={itemIdx} 
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 + itemIdx * 0.05 }}
                        whileHover={{ x: 4 }}
                        className="flex items-center space-x-3 text-muted-foreground group/item cursor-default"
                      >
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 360 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        </motion.div>
                        <span className="text-sm group-hover/item:text-foreground transition-colors">{item}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* Expandable Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-border/50 space-y-4">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {feature.expandedContent}
                          </p>
                          
                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-3 pt-2">
                            {Object.entries(feature.stats).map(([key, value], statIdx) => (
                              <motion.div
                                key={key}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: statIdx * 0.1 }}
                                whileHover={{ scale: 1.08, y: -2 }}
                                className="text-center p-3 rounded-xl bg-gradient-to-br from-muted/60 to-muted/40 border border-border/30 shadow-soft hover:shadow-elevated transition-all"
                              >
                                <div className="text-lg font-bold text-foreground">{value}</div>
                                <div className="text-xs text-muted-foreground capitalize mt-1">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Expand/Collapse Indicator */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-center mt-4 pt-4 border-t border-border/30"
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="ml-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                      {isExpanded ? "Show less" : "Learn more"}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
    </ErrorBoundary>
  );
};

export default Features;
