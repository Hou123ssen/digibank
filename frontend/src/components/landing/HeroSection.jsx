import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import HeroMockup from './HeroMockup.jsx';

const STATS = [
  { value: '50K+', label: 'Active Users' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★', label: 'App Rating' },
];

const HeroSection = () => {
  return (
    <section
      id="overview"
      className="relative min-h-screen flex items-center overflow-hidden bg-[#001F1C]"
    >
      {/* ── Background layers ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#001F1C] via-[#002920] to-black" />

        {/* Radial glow orbs */}
        <div className="absolute top-[15%] right-[10%] w-[500px] h-[500px] bg-[#00C2A8]/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] bg-[#003B35]/60 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-[#00C2A8]/4 rounded-full blur-[120px]" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,194,168,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,194,168,1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      </div>

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
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-14 items-center">

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
                <span className="text-[#00C2A8] text-sm font-medium">Morocco's #1 Digital Bank</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl lg:text-[4.25rem] font-bold text-white leading-[1.08] tracking-tight"
            >
              The Future of{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #00C2A8 0%, #EAF7F5 100%)' }}
              >
                Digital Banking
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="text-[#EAF7F5]/60 text-lg leading-relaxed max-w-lg"
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
              <button
                className="flex items-center gap-2 font-semibold px-7 py-3.5 rounded-full text-[#001F1C] transition-all duration-300"
                style={{
                  background: '#00C2A8',
                  boxShadow: '0 0 0 0 rgba(0,194,168,0)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#00D4B8';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0,194,168,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#00C2A8';
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,194,168,0)';
                }}
              >
                Get Started
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
              <button className="flex items-center gap-2 text-white border border-white/20 px-7 py-3.5 rounded-full hover:border-[#00C2A8]/50 hover:text-[#00C2A8] transition-all duration-300">
                <Play size={16} className="fill-current" />
                Learn More
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex gap-10 pt-2 border-t border-white/5"
            >
              {STATS.map((s) => (
                <div key={s.label} className="pt-4">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-[#EAF7F5]/45 text-sm mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className="flex justify-center lg:justify-end pr-0 lg:pr-8"
          >
            <HeroMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
