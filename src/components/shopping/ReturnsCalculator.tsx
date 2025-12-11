import { useState, useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { TrendingDown, DollarSign, Calendar, Sparkles } from "lucide-react";

const AnimatedCounter = ({ value, duration = 2000, prefix = "", suffix = "" }: { value: number; duration?: number; prefix?: string; suffix?: string }) => {
  const spring = useSpring(0, { stiffness: 50, damping: 30 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span>
      {prefix}
      {display}
      {suffix}
    </motion.span>
  );
};

const ReturnsCalculator = () => {
  const [spending, setSpending] = useState(1000);
  const [returnRate, setReturnRate] = useState(25);
  const [isVisible, setIsVisible] = useState(false);

  const currentCost = Math.round(spending * (returnRate / 100));
  const newCost = Math.round(currentCost * 0.3);
  const savings = currentCost - newCost;
  const annualSavings = savings * 12;
  const savingsPercentage = Math.round(((savings / currentCost) * 100) || 0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("calculator-section");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How Style Shepherd Works
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Three simple steps to perfect fashion choices
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              num: 1,
              color: "bg-primary",
              title: "Tell Us About Yourself",
              desc: "Share your measurements, style preferences, and fashion goals with our AI assistant.",
              icon: Sparkles,
            },
            {
              num: 2,
              color: "bg-fashion-gold",
              title: "Get AI Recommendations",
              desc: "Receive personalized size predictions and style suggestions with low return risk.",
              icon: TrendingDown,
            },
            {
              num: 3,
              color: "bg-fashion-sage",
              title: "Shop With Confidence",
              desc: "Enjoy perfect fits, reduced returns, and continuous style evolution.",
              icon: DollarSign,
            },
          ].map((step, idx) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="text-center bg-card rounded-2xl p-6 border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="relative mb-6"
              >
                <div
                  className={`w-20 h-20 ${step.color} rounded-full flex items-center justify-center mx-auto text-white text-2xl font-bold shadow-lg group-hover:shadow-glow-primary transition-all relative overflow-hidden`}
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100"
                  />
                  <step.icon className="w-10 h-10 relative z-10" />
                </div>
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                {step.title}
              </h3>
              <p className="text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          id="calculator-section"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-background rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-border/50"
        >
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xl sm:text-2xl font-bold text-center text-foreground mb-6 sm:mb-8"
          >
            Try Our Returns Calculator
          </motion.h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-foreground mb-2 font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Monthly Fashion Spending
                </label>
                <Slider
                  value={[spending]}
                  onValueChange={(value) => setSpending(value[0])}
                  min={100}
                  max={5000}
                  step={100}
                  className="mb-2"
                />
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>$100</span>
                  <motion.span
                    key={spending}
                    initial={{ scale: 1.2, color: "#10b981" }}
                    animate={{ scale: 1, color: "inherit" }}
                    className="font-bold text-foreground"
                  >
                    ${spending.toLocaleString()}
                  </motion.span>
                  <span>$5,000</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-foreground mb-2 font-medium flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Current Return Rate
                </label>
                <Slider
                  value={[returnRate]}
                  onValueChange={(value) => setReturnRate(value[0])}
                  min={10}
                  max={50}
                  step={5}
                  className="mb-2"
                />
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>10%</span>
                  <motion.span
                    key={returnRate}
                    initial={{ scale: 1.2, color: "#ef4444" }}
                    animate={{ scale: 1, color: "inherit" }}
                    className="font-bold text-foreground"
                  >
                    {returnRate}%
                  </motion.span>
                  <span>50%</span>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
            >
              {/* Animated background */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-20 -right-20 w-40 h-40 bg-white rounded-full blur-3xl"
              />

              <div className="relative z-10">
                <h4 className="text-lg sm:text-xl font-bold mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Your Potential Savings
                </h4>

                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-between items-center p-3 rounded-lg bg-white/10 backdrop-blur-sm"
                  >
                    <span>Current Return Costs:</span>
                    <motion.span
                      key={currentCost}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-2xl font-bold"
                    >
                      $<AnimatedCounter value={currentCost} />
                    </motion.span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-between items-center p-3 rounded-lg bg-white/10 backdrop-blur-sm"
                  >
                    <span>With Style Shepherd:</span>
                    <motion.span
                      key={newCost}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-2xl font-bold text-green-300"
                    >
                      $<AnimatedCounter value={newCost} />
                    </motion.span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="border-t border-white/30 pt-4"
                  >
                    <div className="flex justify-between items-center text-lg mb-2">
                      <span>Monthly Savings:</span>
                      <motion.span
                        key={savings}
                        initial={{ scale: 1.3, color: "#10b981" }}
                        animate={{ scale: 1, color: "#fff" }}
                        className="text-3xl font-bold text-green-300"
                      >
                        $<AnimatedCounter value={savings} />
                      </motion.span>
                    </div>
                    <div className="text-sm opacity-90 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7, type: "spring" }}
                        className="inline-block px-3 py-1 bg-green-500/20 rounded-full"
                      >
                        {savingsPercentage}% reduction
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="text-center pt-4 border-t border-white/30"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm opacity-90 mb-2">
                      <Calendar className="w-4 h-4" />
                      Annual Savings:
                    </div>
                    <motion.div
                      key={annualSavings}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-2xl font-bold"
                    >
                      $<AnimatedCounter value={annualSavings} />
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ReturnsCalculator;
