import { motion } from 'framer-motion';
import { ArrowRight, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TRUST_BADGES = [
  '🔒  256-bit encryption',
  '✓  Bank Al-Maghrib compliant',
  '⚡  24 / 7 availability',
];

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section
      className="relative py-32 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #000000 0%, #001F1C 100%)' }}
    >
      {/* Central glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-[#00C2A8]/7 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,194,168,0.18), transparent)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-8"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-full px-4 py-2">
            <span className="w-1.5 h-1.5 bg-[#00C2A8] rounded-full animate-pulse" />
            <span className="text-[#00C2A8] text-sm font-medium">Join 50,000+ users</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
            Ready to experience{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #00C2A8 0%, #EAF7F5 100%)' }}
            >
              smarter banking?
            </span>
          </h2>

          <p className="text-[#EAF7F5]/55 text-xl max-w-xl mx-auto leading-relaxed">
            Join thousands of Moroccans who've already made the switch to digital-first banking.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register')}
              className="flex items-center gap-2.5 font-semibold px-8 py-4 rounded-full text-[#001F1C] text-lg transition-all duration-300"
              style={{ background: '#00C2A8' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#00D4B8';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(0,194,168,0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#00C2A8';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Create Account
              <ArrowRight size={20} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
              className="flex items-center gap-2.5 text-white border border-white/20 px-8 py-4 rounded-full text-lg hover:border-[#00C2A8]/50 hover:text-[#00C2A8] transition-all duration-300"
            >
              <LogIn size={20} />
              Login
            </motion.button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-4">
            {TRUST_BADGES.map((badge) => (
              <span key={badge} className="text-[#EAF7F5]/35 text-sm">
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
