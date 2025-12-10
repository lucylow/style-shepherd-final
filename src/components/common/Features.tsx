import { Bot, TrendingUp, Leaf, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { ErrorBoundary } from "./ErrorBoundary";

const Features = () => {
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
    },
  ];

  return (
    <ErrorBoundary>
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Revolutionary AI Features
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Powered by cutting-edge machine learning and voice AI technology
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-card rounded-2xl p-8 border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all duration-300 group backdrop-blur-sm"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-glow-primary transition-all`}
              >
                <feature.icon className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">{feature.description}</p>
              <ul className="space-y-3">
                {feature.items.map((item, itemIdx) => (
                  <motion.li 
                    key={itemIdx} 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 + itemIdx * 0.05 }}
                    className="flex items-center space-x-3 text-muted-foreground group/item"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 group-hover/item:scale-110 transition-transform" />
                    <span className="text-sm group-hover/item:text-foreground transition-colors">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
    </ErrorBoundary>
  );
};

export default Features;
