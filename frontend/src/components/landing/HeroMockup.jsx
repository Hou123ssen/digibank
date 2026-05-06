import { motion, useAnimationFrame, useMotionValue, useSpring } from 'framer-motion';
import { useRef } from 'react';
import { Bell, TrendingUp, ArrowUpRight, ArrowDownLeft, Shield, Zap } from 'lucide-react';
import logo from '../../images/logo digi.png';
import { useTheme } from './ThemeContext.jsx';

const QUICK_ACTIONS = [
  { label: 'Send',    Icon: ArrowUpRight },
  { label: 'Receive', Icon: ArrowDownLeft },
  { label: 'Daret',   Icon: Shield },
];

const TRANSACTIONS = [
  { name: 'Ahmed K.', amount: '-1,200 MAD', type: 'out', time: '2m ago' },
  { name: 'Salary',   amount: '+15,000 MAD', type: 'in',  time: 'Today' },
];

const HeroMockup = () => {
  const { dark } = useTheme();
  const ref = useRef(null);

  /* ── Continuous auto-swing 3D ── */
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(rawX, { stiffness: 60, damping: 20 });
  const rotateY = useSpring(rawY, { stiffness: 60, damping: 20 });

  useAnimationFrame((t) => {
    const s = t / 1000;
    rawX.set(Math.sin(s * 0.5) * 8);
    rawY.set(Math.sin(s * 0.35 + 1) * 12);
  });

  const p = {
    bg:         dark ? 'linear-gradient(160deg,#002D27,#001a17)' : 'linear-gradient(160deg,#ffffff,#edfcf8)',
    border:     dark ? 'rgba(0,194,168,0.25)' : 'rgba(0,194,168,0.35)',
    shadow:     dark
      ? '0 0 0 1px rgba(0,194,168,0.15), 0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(0,194,168,0.12)'
      : '0 0 0 1px rgba(0,194,168,0.2),  0 40px 100px rgba(0,150,130,0.22), 0 0 80px rgba(0,194,168,0.14)',
    statusBg:   dark ? '#001A18' : '#d4f5ee',
    statusTxt:  dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,41,32,0.5)',
    headerBdr:  dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,194,168,0.15)',
    appName:    dark ? '#fff' : '#002920',
    balanceBg:  dark
      ? 'linear-gradient(135deg,rgba(0,194,168,0.3),rgba(0,59,53,0.9))'
      : 'linear-gradient(135deg,rgba(0,194,168,0.22),rgba(0,194,168,0.06))',
    balanceBdr: dark ? 'rgba(0,194,168,0.3)' : 'rgba(0,194,168,0.35)',
    balanceLbl: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,41,32,0.55)',
    balanceVal: dark ? '#fff' : '#002920',
    scoreBg:    dark ? 'rgba(0,41,32,0.75)' : '#fff',
    scoreBdr:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,194,168,0.2)',
    scoreLbl:   dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,41,32,0.5)',
    scoreVal:   dark ? '#fff' : '#002920',
    trackBg:    dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,194,168,0.15)',
    actionBg:   dark ? 'rgba(0,20,18,0.8)' : '#fff',
    actionBdr:  dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,194,168,0.18)',
    actionLbl:  dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,41,32,0.6)',
    txBdr:      dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,194,168,0.1)',
    txName:     dark ? '#fff' : '#002920',
    txTime:     dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,41,32,0.4)',
    daretBg:    dark
      ? 'linear-gradient(90deg,rgba(0,59,53,0.8),rgba(0,41,32,0.8))'
      : 'linear-gradient(90deg,rgba(0,194,168,0.1),rgba(0,194,168,0.05))',
    daretBdr:   dark ? 'rgba(0,194,168,0.2)' : 'rgba(0,194,168,0.25)',
    daretName:  dark ? '#fff' : '#002920',
    daretSub:   dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,41,32,0.45)',
    floatBg:    dark ? 'linear-gradient(135deg,#002D27,#001a17)' : '#fff',
    floatBdr:   dark ? 'rgba(0,194,168,0.35)' : 'rgba(0,194,168,0.4)',
    floatShadow:dark ? '0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,194,168,0.1)' : '0 12px 40px rgba(0,150,130,0.2), 0 0 20px rgba(0,194,168,0.12)',
    floatTxt:   dark ? '#fff' : '#002920',
    floatSub:   dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,41,32,0.45)',
    glow1:      dark ? 'rgba(0,194,168,0.2)' : 'rgba(0,194,168,0.28)',
    glow2:      dark ? 'rgba(0,100,80,0.15)' : 'rgba(0,194,168,0.18)',
  };

  return (
    <div
      ref={ref}
      className="relative w-[320px] md:w-[340px] select-none"
      style={{ perspective: '1000px' }}
    >
      {/* Multi-layer ambient glow */}
      <div className="absolute pointer-events-none" style={{ inset: -40, borderRadius: '3rem', background: p.glow1, filter: 'blur(60px)' }} />
      <div className="absolute pointer-events-none" style={{ inset: -10, borderRadius: '3rem', background: p.glow2, filter: 'blur(30px)' }} />



      {/* Phone frame — 3D tilt */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative rounded-[2.5rem] overflow-hidden"
      >
        {/* Glass shine overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 rounded-[2.5rem]"
          style={{ background: dark
            ? 'linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 50%)'
            : 'linear-gradient(135deg,rgba(255,255,255,0.6) 0%,transparent 50%)',
          }} />

        <div style={{ background: p.bg, border: `1px solid ${p.border}`, boxShadow: p.shadow, borderRadius: '2.5rem', overflow: 'hidden' }}>

          {/* Status bar */}
          <div className="px-5 pt-3 pb-2 flex justify-between items-center" style={{ background: p.statusBg }}>
            <span className="text-[11px] font-medium" style={{ color: p.statusTxt }}>9:41</span>
            <div className="flex gap-[3px] items-end h-3">
              {[40, 60, 80, 100].map((h, i) => (
                <div key={i} className="w-[3px] rounded-sm" style={{ height: `${h}%`, background: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,41,32,0.35)' }} />
              ))}
            </div>
          </div>

          {/* App header */}
          <div className="px-5 py-3 flex justify-between items-center border-b" style={{ borderColor: p.headerBdr }}>
            <div className="flex items-center gap-2">
              <img src={logo} alt="DigiBank logo" className="w-7 h-7 rounded-lg object-cover" />
              <span className="text-sm font-bold tracking-tight" style={{ color: p.appName }}>DigiBank</span>
            </div>
            <div className="relative">
              <Bell size={15} style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,41,32,0.45)' }} />
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#00C2A8] rounded-full flex items-center justify-center"
              >
                <span className="text-[7px] text-[#001F1C] font-bold leading-none">3</span>
              </motion.div>
            </div>
          </div>

          {/* Balance Card — with shimmer */}
          <div className="mx-3.5 mt-3 rounded-2xl p-4 border relative overflow-hidden"
            style={{ background: p.balanceBg, borderColor: p.balanceBdr }}>
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.12) 50%,transparent 60%)', backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
            />
            <div className="flex items-center gap-1.5 mb-1">
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-[#00C2A8]"
              />
              <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: p.balanceLbl }}>Total Balance</p>
            </div>
            <p className="text-[1.6rem] font-bold tracking-tight leading-tight" style={{ color: p.balanceVal }}>412,850 MAD</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <TrendingUp size={11} className="text-[#00C2A8]" />
              <span className="text-[#00C2A8] text-[11px] font-medium">+2.4% this month</span>
            </div>
          </div>

          {/* Trust Score */}
          <div className="mx-3.5 mt-2.5 rounded-xl p-3 flex items-center justify-between border"
            style={{ background: p.scoreBg, borderColor: p.scoreBdr }}>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: p.scoreLbl }}>Trust Score</p>
              <p className="text-xl font-bold leading-tight" style={{ color: p.scoreVal }}>85</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[72px] h-1.5 rounded-full overflow-hidden" style={{ background: p.trackBg }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg,#00C2A8,#00E0C8)' }}
                  animate={{ width: ['0%', '85%'] }}
                  transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[#00C2A8] text-[11px] font-semibold">Excellent</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mx-3.5 mt-2.5 grid grid-cols-3 gap-2">
            {QUICK_ACTIONS.map(({ label, Icon }) => (
              <motion.div
                key={label}
                whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,194,168,0.2)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="rounded-xl p-2.5 flex flex-col items-center gap-1 border cursor-pointer"
                style={{ background: p.actionBg, borderColor: p.actionBdr }}
              >
                <div className="w-7 h-7 bg-[#00C2A8]/10 rounded-lg flex items-center justify-center">
                  <Icon size={13} className="text-[#00C2A8]" />
                </div>
                <span className="text-[10px] font-medium" style={{ color: p.actionLbl }}>{label}</span>
              </motion.div>
            ))}
          </div>

          {/* Recent Transactions */}
          <div className="mx-3.5 mt-3">
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: p.txTime }}>Recent</p>
            {TRANSACTIONS.map((tx) => (
              <div key={tx.name} className="flex items-center justify-between py-2 border-b" style={{ borderColor: p.txBdr }}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${tx.type === 'in' ? 'bg-[#00C2A8]/15' : 'bg-red-500/15'}`}>
                    {tx.type === 'in'
                      ? <ArrowDownLeft size={12} className="text-[#00C2A8]" />
                      : <ArrowUpRight size={12} className="text-red-400" />}
                  </div>
                  <div>
                    <p className="text-[12px] font-medium leading-none" style={{ color: p.txName }}>{tx.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: p.txTime }}>{tx.time}</p>
                  </div>
                </div>
                <span className={`text-[12px] font-semibold ${tx.type === 'in' ? 'text-[#00C2A8]' : 'text-red-400'}`}>
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>

          {/* Daret Progress */}
          <div className="mx-3.5 mt-2.5 mb-4 rounded-xl p-3 border"
            style={{ background: p.daretBg, borderColor: p.daretBdr }}>
            <div className="flex justify-between items-center mb-2">
              <p className="text-[12px] font-semibold" style={{ color: p.daretName }}>Daret Circle #7</p>
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[#00C2A8] text-[10px] bg-[#00C2A8]/10 border border-[#00C2A8]/20 px-2 py-0.5 rounded-full font-medium"
              >
                Active
              </motion.span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: p.trackBg }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#00C2A8,#00E0C8)' }}
                animate={{ width: ['0%', '65%'] }}
                transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px]" style={{ color: p.daretSub }}>6 / 10 members paid</span>
              <span className="text-[#00C2A8] text-[10px] font-semibold">65%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating payment badge */}
      <motion.div
        animate={{ x: [0, 8, 0], y: [0, -4, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        className="absolute -right-2 sm:-right-12 top-[88px] rounded-2xl p-3 w-[140px] sm:w-[152px] border"
        style={{ background: p.floatBg, borderColor: p.floatBdr, boxShadow: p.floatShadow }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <Zap size={10} className="text-[#00C2A8]" />
          </motion.div>
          <p className="text-[#00C2A8] text-[10px] font-semibold">Payment Received</p>
        </div>
        <p className="text-[15px] font-bold" style={{ color: p.floatTxt }}>+15,000 MAD</p>
        <p className="text-[10px]" style={{ color: p.floatSub }}>From: Employer</p>
      </motion.div>

      {/* Floating KYC badge */}
      <motion.div
        animate={{ x: [0, -7, 0], y: [0, 5, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        className="absolute -left-2 sm:-left-12 bottom-[100px] rounded-2xl p-3 border"
        style={{ background: p.floatBg, borderColor: p.floatBdr, boxShadow: p.floatShadow }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ boxShadow: ['0 0 0px rgba(0,194,168,0)', '0 0 12px rgba(0,194,168,0.5)', '0 0 0px rgba(0,194,168,0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-7 h-7 bg-[#00C2A8]/15 rounded-lg flex items-center justify-center flex-shrink-0"
          >
            <Shield size={13} className="text-[#00C2A8]" />
          </motion.div>
          <div>
            <p className="text-[11px] font-semibold leading-none" style={{ color: p.floatTxt }}>KYC Verified</p>
            <p className="text-[#00C2A8] text-[10px] mt-0.5">Identity Confirmed</p>
          </div>
        </div>
      </motion.div>

      {/* Floating score badge */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
        className="absolute -right-2 sm:-right-8 bottom-[60px] rounded-xl px-3 py-2 border"
        style={{ background: p.floatBg, borderColor: p.floatBdr, boxShadow: p.floatShadow }}
      >
        <div className="flex items-center gap-1.5">
          <TrendingUp size={11} className="text-[#00C2A8]" />
          <span className="text-[11px] font-bold" style={{ color: p.floatTxt }}>Score 85</span>
          <span className="text-[10px] text-[#00C2A8] font-semibold">↑</span>
        </div>
      </motion.div>
    </div>
  );
};

export default HeroMockup;
