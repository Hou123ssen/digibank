import { motion } from 'framer-motion';
import { ArrowRight, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from './AnimatedBackground.jsx';
import { useTheme } from './ThemeContext.jsx';

const TRUST_BADGES = [
  '🔒  256-bit encryption',
  '✓  Bank Al-Maghrib compliant',
  '⚡  24 / 7 availability',
];

const CTASection = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  return (
    <section
      className="relative py-20 sm:py-28 lg:py-32 overflow-hidden"
      style={{ background: dark ? 'linear-gradient(180deg,#000000 0%,#001F1C 100%)' : 'linear-gradient(180deg,#e0f9f5 0%,#f0fffe 100%)' }}
    >
      <AnimatedBackground variant="cta" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-8"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-full px-4 py-2">
            <span className="w-1.5 h-1.5 bg-[#00C2A8] rounded-full animate-pulse" />
            <span className="text-[#00C2A8] text-sm font-medium">Join 50,000+ users</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight" style={{ color: dark ? '#fff' : '#002920' }}>
            Ready to experience{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: dark ? 'linear-gradient(135deg, #00C2A8 0%, #EAF7F5 100%)' : 'linear-gradient(135deg, #00A090 0%, #006655 100%)' }}
            >
              smarter banking?
            </span>
          </h2>

          <p className="text-base sm:text-xl max-w-xl mx-auto leading-relaxed" style={{ color: dark ? 'rgba(234,247,245,0.55)' : 'rgba(0,41,32,0.65)' }}>
            Join thousands of Moroccans who've already made the switch to digital-first banking.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <motion.button
              whileHover={{ scale: 1.06, boxShadow: '0 8px 40px rgba(0,194,168,0.55)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register')}
              className="flex items-center gap-2.5 font-semibold px-8 py-4 rounded-full text-[#001F1C] text-lg"
              style={{ background: 'linear-gradient(135deg,#00C2A8,#00a896)' }}
            >
              Create Account
              <motion.span whileHover={{ x: 5 }} transition={{ type: 'spring', stiffness: 400 }}>
                <ArrowRight size={20} strokeWidth={2.5} />
              </motion.span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.06, borderColor: '#00C2A8', color: '#00C2A8', boxShadow: dark ? '0 0 25px rgba(0,194,168,0.15)' : '0 0 25px rgba(0,194,168,0.25)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
              className="flex items-center gap-2.5 text-lg px-8 py-4 rounded-full border"
              style={{ color: dark ? '#fff' : '#007a6a', borderColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,150,130,0.4)' }}
            >
              <LogIn size={20} />
              Login
            </motion.button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-4">
            {TRUST_BADGES.map((badge) => (
              <span key={badge} className="text-sm" style={{ color: dark ? 'rgba(234,247,245,0.35)' : 'rgba(0,41,32,0.4)' }}>
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
