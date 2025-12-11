import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800/50 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <motion.div 
                whileHover={{ scale: 1.15, rotate: 10 }}
                className="w-8 h-8 bg-gradient-to-br from-primary via-primary/90 to-fashion-gold rounded-lg shadow-elevated hover:shadow-glow-primary transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-white to-gray-300 bg-clip-text text-transparent">Style Shepherd</span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              AI-powered fashion assistant that reduces returns and enhances your shopping
              experience.
            </p>
            <div className="flex space-x-4">
              {[
                { icon: Twitter, href: "#" },
                { icon: Facebook, href: "#" },
                { icon: Instagram, href: "#" },
                { icon: Linkedin, href: "#" },
              ].map((social, idx) => (
                <motion.a
                  key={idx}
                  href={social.href}
                  whileHover={{ scale: 1.25, y: -3, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-gray-400 hover:text-primary transition-all p-2 rounded-xl hover:bg-gray-800/60 hover:shadow-elevated hover:shadow-primary/30 focus-visible-enhanced"
                  aria-label={`Visit our ${social.icon.name} page`}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {[
            {
              title: "Product",
              links: [
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "API", href: "#" },
                { label: "Integrations", href: "#" },
              ],
            },
            {
              title: "Resources",
              links: [
                { label: "Documentation", href: "#" },
                { label: "Blog", href: "#" },
                { label: "Support", href: "#" },
                { label: "Community", href: "#" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About", href: "#" },
                { label: "Careers", href: "#" },
                { label: "Contact", href: "#" },
                { label: "Privacy Policy", href: "#" },
              ],
            },
          ].map((section, sectionIdx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: sectionIdx * 0.1, duration: 0.5 }}
            >
              <h4 className="font-bold text-lg mb-6 text-white">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <motion.a
                      href={link.href}
                      whileHover={{ x: 6, scale: 1.05 }}
                      className="text-gray-400 hover:text-primary transition-all inline-block hover:underline underline-offset-4 focus-visible-enhanced font-medium"
                    >
                      {link.label}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="border-t border-gray-800/50 mt-12 pt-8 text-center text-gray-400"
        >
          <p>&copy; 2024 Style Shepherd. All rights reserved.</p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
