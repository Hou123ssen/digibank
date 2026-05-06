import { motion } from 'framer-motion';
import { MessageCircle, Zap, User, Bot, Clock, AlertCircle } from 'lucide-react';

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
  return (
    <section
      id="support"
      className="relative py-28 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #000d0c 0%, #000000 100%)' }}
    >
      {/* Ambient glow right */}
      <div className="absolute top-1/2 right-[-100px] w-[460px] h-[460px] bg-[#00C2A8]/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* Left: Ticket Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative"
          >
            {/* Glow behind card */}
            <div className="absolute inset-[-10px] bg-[#00C2A8]/8 blur-[60px] rounded-3xl pointer-events-none" />

            <div className="relative bg-[#002920] border border-[#00C2A8]/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">

              {/* Ticket header */}
              <div className="bg-[#001A18] border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle size={15} className="text-[#00C2A8]" />
                  <span className="text-white font-semibold text-sm">Support Ticket #2847</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  <span className="text-red-400 text-xs font-semibold">Urgent</span>
                </div>
              </div>

              {/* AI analysis bar */}
              <div className="bg-[#00C2A8]/4 border-b border-[#00C2A8]/8 px-5 py-3 flex flex-wrap gap-2.5">
                {AI_TAGS.map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
                    style={{
                      background: `${color}18`,
                      border: `1px solid ${color}30`,
                      color,
                    }}
                  >
                    <Zap size={9} />
                    <span>{label}: <span className="font-semibold">{value}</span></span>
                  </div>
                ))}
              </div>

              {/* Chat thread */}
              <div className="p-5 space-y-4">

                {/* User message */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-[#003B35] border border-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={12} className="text-white/50" />
                  </div>
                  <div>
                    <div className="bg-[#003B35]/80 border border-white/5 rounded-xl rounded-tl-none px-4 py-3 max-w-xs">
                      <p className="text-white text-sm leading-relaxed" dir="rtl">
                        لم يصلني المبلغ المحوّل منذ ساعتين. الرجاء المساعدة!
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 ml-1">
                      <Clock size={9} className="text-white/25" />
                      <span className="text-white/25 text-[10px]">14:23</span>
                    </div>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex items-start gap-3 justify-end">
                  <div>
                    <div
                      className="rounded-xl rounded-tr-none px-4 py-3 max-w-xs border"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,194,168,0.12) 0%, rgba(0,59,53,0.8) 100%)',
                        borderColor: 'rgba(0,194,168,0.2)',
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot size={11} className="text-[#00C2A8]" />
                        <span className="text-[#00C2A8] text-[10px] font-semibold">AI · Auto-generated</span>
                      </div>
                      <p className="text-white text-sm leading-relaxed" dir="rtl">
                        نعتذر عن هذا التأخير. لقد رصدنا التحويل وسيتم معالجته خلال 30 دقيقة. رقم المتابعة:{' '}
                        <span className="text-[#00C2A8] font-semibold">TRX-2024-8821</span>.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 justify-end mr-1">
                      <Clock size={9} className="text-white/25" />
                      <span className="text-white/25 text-[10px]">14:24 · AI Generated</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 bg-gradient-to-br from-[#00C2A8] to-[#007A6E] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={12} className="text-[#001F1C]" />
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="flex items-center gap-2.5 bg-[#001A18] rounded-xl px-4 py-2.5">
                  <AlertCircle size={13} className="text-[#00C2A8] flex-shrink-0" />
                  <span className="text-[#EAF7F5]/40 text-[11px]">AI Confidence</span>
                  <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '92%' }}
                      viewport={{ once: true }}
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
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-7"
          >
            <div className="inline-flex items-center gap-2 bg-[#00C2A8]/10 border border-[#00C2A8]/20 rounded-full px-4 py-2">
              <span className="text-[#00C2A8] text-sm font-medium">AI-Powered Support</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Smart support in{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #00C2A8 0%, #EAF7F5 100%)' }}
              >
                your language
              </span>
            </h2>

            <p className="text-[#EAF7F5]/55 text-lg leading-relaxed">
              Our AI analyses every support ticket in real-time — detecting urgency, understanding
              sentiment, and generating contextual replies in the customer's own language.
            </p>

            <div className="space-y-4 pt-2">
              {AI_CAPABILITIES.map(({ title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.09 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 bg-[#00C2A8]/15 border border-[#00C2A8]/25 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-[#00C2A8] rounded-full" />
                  </div>
                  <p className="text-[#EAF7F5]/70 text-sm leading-relaxed">
                    <span className="text-white font-semibold">{title}: </span>
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
