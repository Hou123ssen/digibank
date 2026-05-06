import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Menu, X } from 'lucide-react';

const NAV_LINKS = ['Overview', 'Features', 'Security', 'Daret', 'Support'];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#001F1C]/75 backdrop-blur-xl border-b border-[#00C2A8]/10"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-[#00C2A8] to-[#007A6E] rounded-xl flex items-center justify-center shadow-lg shadow-[#00C2A8]/30">
            <Shield size={17} className="text-[#001F1C]" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">DigiBank</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="text-[#EAF7F5]/60 hover:text-[#00C2A8] transition-colors duration-200 text-sm font-medium"
            >
              {link}
            </a>
          ))}
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button className="text-[#EAF7F5]/70 hover:text-white text-sm font-medium transition-colors px-2">
            Login
          </button>
          <button className="bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-full border border-[#00C2A8]/25 hover:border-[#00C2A8]/60 hover:shadow-[0_0_20px_rgba(0,194,168,0.2)] transition-all duration-300">
            Get Started
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-[#001F1C]/95 border-t border-[#00C2A8]/10 px-6 py-4 flex flex-col gap-4"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="text-[#EAF7F5]/70 hover:text-[#00C2A8] transition-colors text-sm font-medium py-1"
              >
                {link}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <button className="text-white text-sm font-medium border border-white/20 px-4 py-2 rounded-full flex-1">
                Login
              </button>
              <button className="bg-black text-white text-sm font-semibold px-4 py-2 rounded-full border border-[#00C2A8]/30 flex-1">
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
