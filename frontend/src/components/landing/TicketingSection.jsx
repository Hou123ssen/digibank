import { motion } from 'framer-motion';
import { MessageCircle, Zap, User, Bot, Clock, AlertCircle } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground.jsx';
import { useTheme } from './ThemeContext.jsx';

const AI_TAGS = [
  { label: 'Category', value: 'Transfer', color: '#3B82F6' },
  { label: 'Priority', value: 'Urgent', color: '#EF4444' },
  { label: 'Sentiment', value: 'Negative', color: '#F97316' },
];

const AI_CAPABILITIES = [
  { title: 'Multilingual Understanding', desc: 'Supports Arabic, French, Darija, and English natively' },
  { title: 'Smart Categorisation', desc: 'Automatically routes tickets to the right specialist team' },
  { title: 'Sentiment Analysis', desc: 'Detects frustrated users and escalates priority in real-time' },
  { title: 'Auto-Suggestions', desc: 'Generates contextual reply drafts for human agents to review' },
];

const TicketingSection = () => {
  const { dark } = useTheme();

  return (
    <section
      id="support"
      className="relative py-16 sm:py-24 lg:py-28 overflow-hidden"
      style={{ background: dark ? 'linear-gradient(180deg,#000d0c 0%,#000000 100%)' : 'linear-gradient(180deg,#e8faf7 0%,#f5fffd 100%)' }}
    >
      <AnimatedBackground variant="ticketing" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Ticket Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative"
          >
            <div className="absolute inset-[-10px] bg-[#00C2A8]/8 blur-[60px] rounded-3xl pointer-events-none" />

            <div className="relative rounded-2xl overflow-hidden shadow-2xl border"
              style={{
                background: dark ? '#002920' : '#fff',
                borderColor: dark ? 'rgba(0,194,168,0.2)' : 'rgba(0,194,168,0.25)',
                boxShadow: dark ? '0 25px 60px rgba(0,0,0,0.6)' : '0 25px 60px rgba(0,150,130,0.12)',
              }}>

              {/* Ticket header */}
              <div className="px-5 py-4 flex items-center justify-between border-b"
                style={{ background: dark ? '#001A18' : '#f0fffe', borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,194,168,0.15)' }}>
                <div className="flex items-center gap-2">
                  <MessageCircle size={15} className="text-[#00C2A8]" />
                  <span className="font-semibold text-sm" style={{ color: dark ? '#fff' : '#002920' }}>Support Ticket #2847</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  <span className="text-red-400 text-xs font-semibold">Urgent</span>
                </div>
              </div>

              {/* AI analysis bar */}
              <div className="px-5 py-3 flex flex-wrap gap-2.5 border-b"
                style={{ background: dark ? 'rgba(0,194,168,0.04)' : 'rgba(0,194,168,0.06)', borderColor: dark ? 'rgba(0,194,168,0.08)' : 'rgba(0,194,168,0.15)' }}>
                {AI_TAGS.map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
                    style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
                    <Zap size={9} />
                    <span>{label}: <span className="font-semibold">{value}</span></span>
                  </div>
                ))}
              </div>

              {/* Chat thread */}
              <div className="p-5 space-y-4">

                {/* User message */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border"
                    style={{ background: dark ? '#003B35' : 'rgba(0,194,168,0.1)', borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,194,168,0.2)' }}>
                    <User size={12} style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#00A090' }} />
                  </div>
                  <div>
                    <div className="rounded-xl rounded-tl-none px-4 py-3 max-w-xs border"
                      style={{ background: dark ? 'rgba(0,59,53,0.8)' : 'rgba(0,194,168,0.07)', borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,194,168,0.15)' }}>
                      <p className="text-sm leading-relaxed" dir="rtl" style={{ color: dark ? '#fff' : '#002920' }}>
                        لم يصلني المبلغ المحوّل منذ ساعتين. الرجاء المساعدة!
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 ml-1">
                      <Clock size={9} style={{ color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,41,32,0.3)' }} />
                      <span className="text-[10px]" style={{ color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,41,32,0.3)' }}>14:23</span>
                    </div>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex items-start gap-3 justify-end">
                  <div>
                    <div className="rounded-xl rounded-tr-none px-4 py-3 max-w-xs border"
                      style={{
                        background: dark ? 'linear-gradient(135deg,rgba(0,194,168,0.12) 0%,rgba(0,59,53,0.8) 100%)' : 'linear-gradient(135deg,rgba(0,194,168,0.1) 0%,rgba(0,194,168,0.04) 100%)',
                        borderColor: 'rgba(0,194,168,0.2)',
                      }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot size={11} className="text-[#00C2A8]" />
                        <span className="text-[#00C2A8] text-[10px] font-semibold">AI · Auto-generated</span>
                      </div>
                      <p className="text-sm leading-relaxed" dir="rtl" style={{ color: dark ? '#fff' : '#002920' }}>
                        نعتذر عن هذا التأخير. لقد رصدنا التحويل وسيتم معالجته خلال 30 دقيقة. رقم المتابعة:{' '}
                        <span className="text-[#00C2A8] font-semibold">TRX-2024-8821</span>.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 justify-end mr-1">
                      <Clock size={9} style={{ color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,41,32,0.3)' }} />
                      <span className="text-[10px]" style={{ color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,41,32,0.3)' }}>14:24 · AI Generated</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 bg-gradient-to-br from-[#00C2A8] to-[#007A6E] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={12} className="text-[#001F1C]" />
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5"
                  style={{ background: dark ? '#001A18' : 'rgba(0,194,168,0.06)' }}>
                  <AlertCircle size={13} className="text-[#00C2A8] flex-shrink-0" />
                  <span className="text-[11px]" style={{ color: dark ? 'rgba(234,247,245,0.4)' : 'rgba(0,41,32,0.5)' }}>AI Confidence</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '92%' }}
                      viewport={{ once: true, amount: 0 }}
                      transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #00C2A8, #00E0C8)' }}
                    />
                  </div>
                  <span className="text-[#00C2A8] text-[11px] font-bold">92%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Description */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-7"
          >
            <div className="inline-flex items-center gap-2 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-full px-4 py-2">
              <span className="text-[#00C2A8] text-sm font-medium">AI-Powered Support</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: dark ? '#fff' : '#002920' }}>
              Smart support in{' '}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: dark ? 'linear-gradient(135deg,#00C2A8 0%,#EAF7F5 100%)' : 'linear-gradient(135deg,#00A090 0%,#006655 100%)' }}>
                your language
              </span>
            </h2>

            <p className="text-base sm:text-lg leading-relaxed" style={{ color: dark ? 'rgba(234,247,245,0.55)' : 'rgba(0,41,32,0.6)' }}>
              Our AI analyses every support ticket in real-time — detecting urgency, understanding
              sentiment, and generating contextual replies in the customer's own language.
            </p>

            <div className="space-y-4 pt-2">
              {AI_CAPABILITIES.map(({ title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.09 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 bg-[#00C2A8]/15 border border-[#00C2A8]/25 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-[#00C2A8] rounded-full" />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: dark ? 'rgba(234,247,245,0.7)' : 'rgba(0,41,32,0.65)' }}>
                    <span className="font-semibold" style={{ color: dark ? '#fff' : '#002920' }}>{title}: </span>
                    {desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TicketingSection;
