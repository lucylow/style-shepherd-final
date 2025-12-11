import { Star } from "lucide-react";
import { motion } from "framer-motion";

const Testimonials = () => {
  const testimonials = [
    {
      initial: "S",
      name: "Sarah Chen",
      role: "Fashion Blogger",
      color: "bg-fashion-gold",
      text: "Style Shepherd completely changed how I shop online. The size predictions are incredibly accurate, and I've reduced my returns by 85%!",
    },
    {
      initial: "M",
      name: "Marcus Johnson",
      role: "Busy Professional",
      color: "bg-primary",
      text: "As someone who hates shopping, the voice assistant is a game-changer. I just tell it what I need, and it finds perfect options every time.",
    },
    {
      initial: "E",
      name: "Elena Rodriguez",
      role: "Sustainability Advocate",
      color: "bg-fashion-sage",
      text: "Finally, a solution that addresses fashion waste! I love seeing how much carbon footprint I've saved by avoiding unnecessary returns.",
    },
  ];

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
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Loved by Fashion Enthusiasts
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            See how Style Shepherd is transforming shopping experiences
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-card rounded-2xl p-6 border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all duration-300 group"
            >
              <div className="flex items-center mb-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`w-12 h-12 ${testimonial.color} rounded-full flex items-center justify-center text-white font-bold mr-4 shadow-lg group-hover:shadow-glow-primary transition-all`}
                >
                  {testimonial.initial}
                </motion.div>
                <div>
                  <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{testimonial.name}</h4>
                  <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                </div>
              </div>
              <div className="flex text-fashion-gold mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed">{testimonial.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
