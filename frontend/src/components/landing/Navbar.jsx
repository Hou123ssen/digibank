import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon } from 'lucide-react';
import logo from '../../images/logo digi.png';
import { useTheme } from './ThemeContext.jsx';

const NAV_LINKS = ['Overview', 'Features', 'Security', 'Daret', 'Support'];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { dark, toggle } = useTheme();

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b"
      style={{
        background: dark ? 'rgba(0,31,28,0.75)' : 'rgba(240,255,254,0.85)',
        borderColor: dark ? 'rgba(0,194,168,0.1)' : 'rgba(0,150,130,0.15)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="DigiBank logo" className="w-9 h-9 rounded-xl object-cover" />
          <span className="font-bold text-xl tracking-tight" style={{ color: dark ? '#fff' : '#003d35' }}>DigiBank</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <motion.a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="text-sm font-medium"
              style={{ color: dark ? 'rgba(234,247,245,0.6)' : 'rgba(0,61,53,0.6)' }}
              whileHover={{ y: -3, color: '#00C2A8' }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              {link}
            </motion.a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme toggle */}
          <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.12, boxShadow: '0 0 18px rgba(0,194,168,0.35)' }}
            whileTap={{ scale: 0.93 }}
            className="w-9 h-9 rounded-full flex items-center justify-center border"
            style={{
              background: dark ? 'rgba(0,194,168,0.08)' : 'rgba(0,150,130,0.08)',
              borderColor: dark ? 'rgba(0,194,168,0.2)' : 'rgba(0,150,130,0.2)',
              color: '#00C2A8',
            }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, color: '#00C2A8' }}
            whileTap={{ scale: 0.97 }}
            className="text-sm font-medium px-2"
            style={{ color: dark ? 'rgba(234,247,245,0.7)' : 'rgba(0,61,53,0.7)' }}
          >
            Login
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 22px rgba(0,194,168,0.3)', borderColor: 'rgba(0,194,168,0.7)' }}
            whileTap={{ scale: 0.97 }}
            className="text-sm font-semibold px-5 py-2.5 rounded-full border"
            style={{
              background: dark ? '#000' : 'transparent',
              color: dark ? '#fff' : '#007a6a',
              borderColor: dark ? 'rgba(0,194,168,0.25)' : 'rgba(0,150,130,0.45)',
            }}
          >
            Get Started
          </motion.button>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: '#00C2A8' }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            className="p-1"
            style={{ color: dark ? '#fff' : '#003d35' }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t px-6 py-4 flex flex-col gap-4"
            style={{
              background: dark ? 'rgba(0,31,28,0.95)' : 'rgba(240,255,254,0.97)',
              borderColor: dark ? 'rgba(0,194,168,0.1)' : 'rgba(0,150,130,0.15)',
            }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium py-1 transition-colors"
                style={{ color: dark ? 'rgba(234,247,245,0.7)' : 'rgba(0,61,53,0.7)' }}
              >
                {link}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <button className="text-sm font-medium border px-4 py-2 rounded-full flex-1"
                style={{ color: dark ? '#fff' : '#003d35', borderColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,61,53,0.2)' }}>
                Login
              </button>
              <button className="text-sm font-semibold px-4 py-2 rounded-full border flex-1"
                style={{ background: dark ? '#000' : '#fff', color: dark ? '#fff' : '#003d35', borderColor: 'rgba(0,194,168,0.3)' }}>
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
