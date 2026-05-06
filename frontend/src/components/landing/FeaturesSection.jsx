import { motion } from 'framer-motion';
import { CreditCard, Users, Heart, Shield, Star, MessageCircle } from 'lucide-react';

const FEATURES = [
  {
    Icon: CreditCard,
    title: 'Smart Banking',
    description:
      'Real-time balance tracking, instant transfers, and AI-driven spending insights built for daily Moroccan life.',
  },
  {
    Icon: Users,
    title: 'Daret Digital',
    description:
      'Modernize your rotating savings circle. Transparent, fully automated, and fraud-protected with smart contracts.',
  },
  {
    Icon: Heart,
    title: 'Verified Donations',
    description:
      'Every charity campaign is KYC-verified. Donate with confidence and track impact in real time.',
  },
  {
    Icon: Shield,
    title: 'KYC Security',
    description:
      'Multi-step identity verification ensuring every account is compliant with Bank Al-Maghrib regulations.',
  },
  {
    Icon: Star,
    title: 'Trust Score',
    description:
      'Your financial reputation — built from payment history, behaviour, and verification level. Unlock better rates.',
  },
  {
    Icon: MessageCircle,
    title: 'Smart Ticketing AI',
    description:
      'AI-powered support that categorises, prioritises, and generates replies in Arabic, Darija, French, or English.',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-28 bg-[#001F1C]">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00C2A8]/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00C2A8]/10 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          className="text-center mb-18"
        >
          <div className="inline-flex items-center gap-2 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-full px-4 py-2 mb-5">
            <span className="text-[#00C2A8] text-sm font-medium">Platform Features</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-5">
            Everything you need,{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #00C2A8 0%, #EAF7F5 100%)' }}
            >
              reimagined
            </span>
          </h2>
          <p className="text-[#EAF7F5]/50 text-lg max-w-2xl mx-auto leading-relaxed">
            Built for modern Moroccans who expect more from their banking experience.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-14"
        >
          {FEATURES.map(({ Icon, title, description }) => (
            <motion.div
              key={title}
              variants={cardVariants}
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="group relative bg-gradient-to-b from-[#002920]/80 to-[#001F1C] border border-white/5 rounded-2xl p-7 cursor-pointer overflow-hidden"
              style={{ transition: 'border-color 0.3s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(0,194,168,0.28)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
            >
              {/* Hover glow overlay */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(0,194,168,0.04) 0%, transparent 60%)' }} />

              {/* Top glow line */}
              <div className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(0,194,168,0.5), transparent)' }} />

              {/* Icon */}
              <div
                className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
                style={{
                  background: 'rgba(0,194,168,0.08)',
                  border: '1px solid rgba(0,194,168,0.15)',
                }}
              >
                <Icon size={22} className="text-[#00C2A8]" />
              </div>

              <h3 className="text-white font-semibold text-lg mb-2.5">{title}</h3>
              <p className="text-[#EAF7F5]/48 text-[0.9rem] leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
