import { motion } from 'framer-motion';
import { Lock, Fingerprint, Users, CreditCard, FileText, CheckCircle } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground.jsx';
import { useTheme } from './ThemeContext.jsx';

const SECURITY_ITEMS = [
  {
    Icon: Lock,
    title: 'Sanctum Token Authentication',
    description:
      'Laravel Sanctum provides robust token-based auth with automatic rotation and secure session invalidation on logout.',
  },
  {
    Icon: Fingerprint,
    title: 'KYC Identity Verification',
    description:
      'Multi-step document + liveness check ensuring every account holder is verified and compliant with Moroccan AML rules.',
  },
  {
    Icon: Users,
    title: 'Role-Based Access Control',
    description:
      'Granular permissions distinguishing customers, agents, donors, and administrators — each scoped to minimum required access.',
  },
  {
    Icon: CreditCard,
    title: 'Controlled Overdraft',
    description:
      'Configurable per-account overdraft limits with real-time alerts and automatic freeze to prevent unauthorised debt.',
  },
  {
    Icon: FileText,
    title: 'Immutable Transaction History',
    description:
      'Every transaction is timestamped and cryptographically signed — fully auditable, tamper-evident, and exportable.',
  },
];

const SecuritySection = () => {
  const { dark } = useTheme();
  return (
    <section id="security" className="relative py-16 sm:py-24 lg:py-28 overflow-hidden"
      style={{ background: dark ? 'linear-gradient(180deg,#001F1C 0%,#000d0c 100%)' : 'linear-gradient(180deg,#f0fffe 0%,#e4f8f4 100%)' }}>
      <AnimatedBackground variant="security" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Headline */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-7"
          >
            <div className="inline-flex items-center gap-2 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-full px-4 py-2">
              <span className="text-sm font-medium" style={{ color: '#00C2A8' }}>Bank-Grade Security</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: dark ? '#fff' : '#002920' }}>
              Security that{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: dark ? 'linear-gradient(135deg, #00C2A8 0%, #EAF7F5 100%)' : 'linear-gradient(135deg, #00A090 0%, #006655 100%)' }}
              >
                never sleeps
              </span>
            </h2>

            <p className="text-lg leading-relaxed" style={{ color: dark ? 'rgba(234,247,245,0.55)' : 'rgba(0,41,32,0.6)' }}>
              Every layer of DigiBank is built with security-first engineering, ensuring your money
              and personal data are always protected — even while you sleep.
            </p>

            {/* Compliance badge */}
            <div className="flex items-center gap-4 rounded-2xl p-5 border"
              style={{
                background: dark ? 'rgba(0,41,32,0.7)' : '#fff',
                borderColor: dark ? 'rgba(0,194,168,0.15)' : 'rgba(0,150,130,0.25)',
                boxShadow: dark ? 'none' : '0 2px 16px rgba(0,150,130,0.1)',
              }}>
              <div className="w-12 h-12 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle size={24} className="text-[#00C2A8]" />
              </div>
              <div>
                <p className="font-semibold" style={{ color: dark ? '#fff' : '#002920' }}>Certified &amp; Compliant</p>
                <p className="text-sm mt-0.5" style={{ color: dark ? 'rgba(234,247,245,0.45)' : 'rgba(0,41,32,0.55)' }}>
                  Meets all Bank Al-Maghrib digital banking &amp; AML requirements
                </p>
              </div>
            </div>

            {/* Mini stat row */}
            <div className="flex gap-8 pt-2">
              {[
                { value: '256-bit', label: 'AES Encryption' },
                { value: '2FA', label: 'Required' },
                { value: '< 200ms', label: 'Auth latency' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-bold text-lg" style={{ color: dark ? '#fff' : '#002920' }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: dark ? 'rgba(234,247,245,0.4)' : 'rgba(0,41,32,0.5)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Feature List */}
          <div className="space-y-3.5">
            {SECURITY_ITEMS.map(({ Icon, title, description }, idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                whileHover={{
                  x: 6,
                  boxShadow: dark
                    ? '0 8px 32px rgba(0,194,168,0.12), inset 0 0 0 1px rgba(0,194,168,0.3)'
                    : '0 8px 32px rgba(0,194,168,0.18), inset 0 0 0 1px rgba(0,194,168,0.35)',
                  background: dark ? 'rgba(0,194,168,0.08)' : 'rgba(0,194,168,0.12)',
                }}
                className="group flex items-start gap-4 border rounded-xl p-4 cursor-pointer"
                style={{
                  background: dark ? 'rgba(0,41,32,0.4)' : '#fff',
                  borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,150,130,0.25)',
                  boxShadow: dark ? 'none' : '0 2px 16px rgba(0,150,130,0.1)',
                }}
              >
                <motion.div
                  whileHover={{ scale: 1.15, background: 'rgba(0,194,168,0.25)' }}
                  transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,194,168,0.1)', border: '1px solid rgba(0,194,168,0.2)' }}
                >
                  <Icon size={18} className="text-[#00C2A8]" />
                </motion.div>
                <div>
                  <h3 className="font-semibold text-[0.95rem] mb-1" style={{ color: dark ? '#fff' : '#002920' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: dark ? 'rgba(234,247,245,0.45)' : 'rgba(0,41,32,0.55)' }}>{description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
