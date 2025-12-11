import { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const testimonials = [
    {
      initial: "S",
      name: "Sarah Chen",
      role: "Fashion Blogger",
      color: "bg-fashion-gold",
      text: "Style Shepherd completely changed how I shop online. The size predictions are incredibly accurate, and I've reduced my returns by 85%!",
      rating: 5,
      verified: true,
    },
    {
      initial: "M",
      name: "Marcus Johnson",
      role: "Busy Professional",
      color: "bg-primary",
      text: "As someone who hates shopping, the voice assistant is a game-changer. I just tell it what I need, and it finds perfect options every time.",
      rating: 5,
      verified: true,
    },
    {
      initial: "E",
      name: "Elena Rodriguez",
      role: "Sustainability Advocate",
      color: "bg-fashion-sage",
      text: "Finally, a solution that addresses fashion waste! I love seeing how much carbon footprint I've saved by avoiding unnecessary returns.",
      rating: 5,
      verified: true,
    },
    {
      initial: "J",
      name: "James Wilson",
      role: "Tech Entrepreneur",
      color: "bg-purple-500",
      text: "The AI recommendations are spot-on. I've saved hours of browsing and found styles I never would have discovered on my own.",
      rating: 5,
      verified: true,
    },
    {
      initial: "L",
      name: "Lisa Park",
      role: "Fashion Designer",
      color: "bg-pink-500",
      text: "As a designer, I appreciate the attention to detail. The size prediction technology is revolutionary for online shopping.",
      rating: 5,
      verified: true,
    },
  ];

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
  };

  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight gradient-text-primary">
            Loved by Fashion Enthusiasts
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            See how Style Shepherd is transforming shopping experiences
          </p>
        </motion.div>

        {/* Carousel Container */}
        <div className="relative">
          <div className="overflow-hidden rounded-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="bg-card rounded-3xl p-8 md:p-12 border border-border/50 shadow-elevated-xl card-premium relative overflow-hidden"
              >
                <div className="max-w-4xl mx-auto">
                  {/* Quote Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="mb-6"
                  >
                    <Quote className="w-12 h-12 text-primary/20" />
                  </motion.div>

                  {/* Testimonial Content */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`w-16 h-16 ${testimonials[currentIndex].color} rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-elevated hover:shadow-glow-primary transition-all relative overflow-hidden flex-shrink-0`}
                    >
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
                      />
                      <span className="relative z-10">{testimonials[currentIndex].initial}</span>
                    </motion.div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-bold text-foreground">
                          {testimonials[currentIndex].name}
                        </h4>
                        {testimonials[currentIndex].verified && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring" }}
                            className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                          >
                            <span className="text-white text-xs">✓</span>
                          </motion.div>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-3">{testimonials[currentIndex].role}</p>
                      <div className="flex text-fashion-gold">
                        {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.4 + i * 0.1, type: "spring" }}
                          >
                            <Star className="w-5 h-5 fill-current" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Testimonial Text */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-foreground leading-relaxed italic"
                  >
                    "{testimonials[currentIndex].text}"
                  </motion.p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          <motion.button
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm rounded-full p-3 shadow-elevated-lg hover:shadow-glow-primary transition-all z-10 border border-border/50"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/95 backdrop-blur-md rounded-full p-3 shadow-elevated-lg hover:shadow-glow-primary transition-all z-10 border border-border/50 hover:scale-110"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </motion.button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, idx) => (
              <motion.button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`rounded-full transition-all ${
                  idx === currentIndex ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
                } h-2`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Go to testimonial ${idx + 1}`}
              />
            ))}
          </div>

          {/* Grid View (Desktop) */}
          <div className="hidden lg:grid grid-cols-3 gap-6 mt-12">
            {testimonials.slice(0, 3).map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -6, scale: 1.03 }}
                className={`bg-card rounded-2xl p-6 border border-border/50 shadow-elevated hover:shadow-elevated-xl transition-all duration-300 cursor-pointer card-hover-enhanced ${
                  idx === currentIndex ? "ring-2 ring-primary shadow-glow-primary" : ""
                }`}
                onClick={() => goToSlide(idx)}
              >
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 ${testimonial.color} rounded-2xl flex items-center justify-center text-white font-bold mr-4 shadow-elevated transition-all hover:shadow-glow-primary`}>
                    <span>{testimonial.initial}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{testimonial.name}</h4>
                    <p className="text-muted-foreground text-xs">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex text-fashion-gold mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {testimonial.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
