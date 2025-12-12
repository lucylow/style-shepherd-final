import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { Mail, Users, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";

const AnimatedStat = ({ value, label, icon: Icon }: { value: number; label: string; icon: any }) => {
  const spring = useSpring(0, { stiffness: 50, damping: 30 });
  const display = useTransform(spring, (current) => {
    if (label.includes("Rating")) {
      return current.toFixed(1);
    }
    return Math.round(current);
  });

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  const getSuffix = () => {
    if (label.includes("%")) return "%";
    if (label.includes("K") || label.includes("Users")) return "K+";
    return "";
  };

  const getLabelText = () => {
    if (label.includes("Active Users")) return "Active Users";
    if (label.includes("Returns Reduced")) return "Returns Reduced";
    if (label.includes("User Rating")) return "User Rating";
    return label;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
    >
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
        className="inline-block mb-2"
      >
        <Icon className="w-6 h-6 mx-auto" />
      </motion.div>
      <div className="text-3xl font-bold mb-1">
        {label.includes("Rating") ? display : display.toLocaleString()}
        {getSuffix()}
      </div>
      <div className="text-sm opacity-90">{getLabelText()}</div>
    </motion.div>
  );
};

const CTASection = () => {
  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setEmail("");
      setShowForm(false);
    }, 3000);
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#f093fb] via-[#f5576c] to-[#4facfe] text-white relative overflow-hidden">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -40, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
        />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
          />
        ))}
      </div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-3 gap-4 mb-12"
        >
          <AnimatedStat value={50000} label="Active Users" icon={Users} />
          <AnimatedStat value={90} label="Returns Reduced %" icon={TrendingUp} />
          <AnimatedStat value={4.9} label="User Rating" icon={Sparkles} />
        </motion.div>

        <div className="text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight"
          >
            Ready to Transform Your Shopping Experience?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg sm:text-xl mb-8 opacity-90 leading-relaxed max-w-2xl mx-auto"
          >
            Join thousands of smart shoppers who never worry about returns again.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-center gap-4 sm:space-x-6 mb-6"
          >
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="bg-white text-gray-900 hover:bg-gray-100 font-bold shadow-2xl hover:shadow-elevated-xl w-full sm:w-auto transition-all relative overflow-hidden group"
                asChild
              >
                <Link to="/dashboard" className="relative z-10 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 group-hover:animate-spin" />
                  Try Free Demo
                </Link>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowForm(!showForm)}
                className="border-2 border-white/90 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white w-full sm:w-auto transition-all shadow-lg relative overflow-hidden group"
              >
                <Mail className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                {showForm ? "Close Form" : "Get Early Access"}
              </Button>
            </motion.div>
          </motion.div>

          {/* Email Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-md mx-auto mb-6"
              >
                {!submitted ? (
                  <motion.form
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                    onSubmit={handleSubmit}
                    className="flex gap-2"
                  >
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/70 backdrop-blur-sm"
                    />
                    <Button
                      type="submit"
                      className="bg-white text-gray-900 hover:bg-gray-100"
                    >
                      Subscribe
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center gap-2 p-4 bg-green-500/20 rounded-lg border border-green-400/30"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-300" />
                    <span>Thanks! We'll be in touch soon.</span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 text-sm opacity-80 flex flex-wrap justify-center gap-2 sm:gap-4"
          >
            {[
              { icon: CheckCircle2, text: "No credit card required" },
              { icon: CheckCircle2, text: "14-day free trial" },
              { icon: CheckCircle2, text: "Cancel anytime" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                whileHover={{ scale: 1.1 }}
                className="flex items-center gap-2"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
