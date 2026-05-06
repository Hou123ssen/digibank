import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import HeroMockup from './HeroMockup.jsx';
import AnimatedBackground from './AnimatedBackground.jsx';
import { useTheme } from './ThemeContext.jsx';

const WORDS = ['Digital Banking', 'Smart Savings', 'Secure Payments', 'Daret Circles', 'Your Future'];

const Typewriter = ({ dark }) => {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[wordIdx];
    let timeout;
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setWordIdx((i) => (i + 1) % WORDS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, wordIdx]);

  return (
    <span className="text-transparent bg-clip-text inline-block"
      style={{ backgroundImage: dark ? 'linear-gradient(135deg,#00C2A8 0%,#EAF7F5 100%)' : 'linear-gradient(135deg,#00A090 0%,#006655 100%)' }}
    >
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block ml-[2px] w-[3px] h-[0.85em] rounded-sm align-middle"
        style={{ background: dark ? '#00C2A8' : '#00A090', verticalAlign: 'middle' }}
      />
    </span>
  );
};

const STATS = [
  { value: '50K+', label: 'Active Users' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★', label: 'App Rating' },
];

const HeroSection = () => {
  const { dark } = useTheme();
  return (
    <section
      id="overview"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: dark ? '#001F1C' : '#f0fffe' }}
    >
      <AnimatedBackground variant="hero" />

      {/* ── Wave divider ── */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
          <path
            d="M0,40 C300,80 600,0 900,40 C1100,65 1300,20 1440,40 L1440,80 L0,80 Z"
            fill="#001F1C"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">

          {/* Left: Text */}
          <div className="space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-2 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-full px-4 py-2">
                <span className="w-1.5 h-1.5 bg-[#00C2A8] rounded-full animate-pulse" />
              <span className="text-sm font-medium" style={{ color: '#00C2A8' }}>Morocco's #1 Digital Bank</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-[4.25rem] font-bold leading-[1.1] tracking-tight"
              style={{ color: dark ? '#fff' : '#002920' }}
            >
              The Future of{' '}
              <Typewriter dark={dark} />
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="text-base sm:text-lg leading-relaxed max-w-lg"
              style={{ color: dark ? 'rgba(234,247,245,0.6)' : 'rgba(0,41,32,0.65)' }}
            >
              A smart Moroccan fintech platform combining secure banking, Daret savings,
              verified donations, trust scoring, and AI-powered support.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(0,194,168,0.55)' }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 font-semibold px-7 py-3.5 rounded-full"
                style={{ background: 'linear-gradient(135deg,#00C2A8,#00a896)', color: '#001F1C' }}
              >
                Get Started
                <motion.span whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400 }}>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </motion.span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, borderColor: '#00C2A8', color: '#00C2A8', boxShadow: dark ? '0 0 20px rgba(0,194,168,0.15)' : '0 0 20px rgba(0,194,168,0.2)' }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-7 py-3.5 rounded-full border"
                style={{ color: dark ? '#fff' : '#007a6a', borderColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,150,130,0.4)' }}
              >
                <Play size={16} className="fill-current" />
                Learn More
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex gap-10 pt-2 border-t"
              style={{ borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,41,32,0.08)' }}
            >
              {STATS.map((s) => (
                <div key={s.label} className="pt-4">
                  <p className="text-2xl font-bold" style={{ color: dark ? '#fff' : '#002920' }}>{s.value}</p>
                  <p className="text-sm mt-0.5" style={{ color: dark ? 'rgba(234,247,245,0.45)' : 'rgba(0,41,32,0.5)' }}>{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className="flex justify-center lg:justify-end pr-0 lg:pr-8 mt-8 lg:mt-0"
          >
            <HeroMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
