import { motion } from 'framer-motion';
import { Lock, Fingerprint, Users, CreditCard, FileText, CheckCircle } from 'lucide-react';

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
  return (
    <section id="security" className="relative py-28 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #001F1C 0%, #000d0c 100%)' }}>
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-[-120px] w-[480px] h-[480px] bg-[#00C2A8]/5 rounded-full blur-[130px] -translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* Left: Headline */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-7"
          >
            <div className="inline-flex items-center gap-2 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-full px-4 py-2">
              <span className="text-[#00C2A8] text-sm font-medium">Bank-Grade Security</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Security that{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #00C2A8 0%, #EAF7F5 100%)' }}
              >
                never sleeps
              </span>
            </h2>

            <p className="text-[#EAF7F5]/55 text-lg leading-relaxed">
              Every layer of DigiBank is built with security-first engineering, ensuring your money
              and personal data are always protected — even while you sleep.
            </p>

            {/* Compliance badge */}
            <div className="flex items-center gap-4 bg-[#002920]/70 border border-[#00C2A8]/15 rounded-2xl p-5">
              <div className="w-12 h-12 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle size={24} className="text-[#00C2A8]" />
              </div>
              <div>
                <p className="text-white font-semibold">Certified &amp; Compliant</p>
                <p className="text-[#EAF7F5]/45 text-sm mt-0.5">
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
                  <p className="text-white font-bold text-lg">{s.value}</p>
                  <p className="text-[#EAF7F5]/40 text-xs mt-0.5">{s.label}</p>
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
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="group flex items-start gap-4 bg-[#002920]/40 border border-white/5 rounded-xl p-4 hover:border-[#00C2A8]/20 hover:bg-[#002920]/70 transition-all duration-300"
              >
                <div className="w-10 h-10 bg-[#00C2A8]/8 border border-[#00C2A8]/15 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#00C2A8]/16 transition-all duration-300">
                  <Icon size={18} className="text-[#00C2A8]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[0.95rem] mb-1">{title}</h3>
                  <p className="text-[#EAF7F5]/45 text-sm leading-relaxed">{description}</p>
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
