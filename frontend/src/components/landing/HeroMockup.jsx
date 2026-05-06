import { motion } from 'framer-motion';
import { Shield, Bell, TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Send', Icon: ArrowUpRight },
  { label: 'Receive', Icon: ArrowDownLeft },
  { label: 'Daret', Icon: Shield },
];

const TRANSACTIONS = [
  { name: 'Ahmed K.', amount: '-1,200 MAD', type: 'out', time: '2m ago' },
  { name: 'Salary', amount: '+15,000 MAD', type: 'in', time: 'Today' },
];

const HeroMockup = () => {
  return (
    <div className="relative w-[320px] md:w-[340px] select-none">
      {/* Ambient glow */}
      <div className="absolute inset-[-20px] bg-[#00C2A8]/15 blur-[70px] rounded-3xl pointer-events-none" />

      {/* Phone frame */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative bg-gradient-to-b from-[#002D27] to-[#001F1C] border border-[#00C2A8]/20 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/60"
        style={{ boxShadow: '0 0 0 1px rgba(0,194,168,0.12), 0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,194,168,0.08)' }}
      >
        {/* Status bar */}
        <div className="bg-[#001A18] px-5 pt-3 pb-2 flex justify-between items-center">
          <span className="text-white/40 text-[11px] font-medium">9:41</span>
          <div className="flex gap-[3px] items-end h-3">
            {[40, 60, 80, 100].map((h, i) => (
              <div key={i} className="w-[3px] rounded-sm bg-white/50" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* App header */}
        <div className="px-5 py-3 flex justify-between items-center border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-[#00C2A8] to-[#007A6E] rounded-lg flex items-center justify-center">
              <Shield size={13} className="text-[#001F1C]" strokeWidth={2.5} />
            </div>
            <span className="text-white text-sm font-bold tracking-tight">DigiBank</span>
          </div>
          <div className="relative">
            <Bell size={15} className="text-white/50" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#00C2A8] rounded-full flex items-center justify-center">
              <span className="text-[7px] text-[#001F1C] font-bold leading-none">3</span>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="mx-3.5 mt-3 bg-gradient-to-br from-[#00C2A8]/25 to-[#003B35]/80 border border-[#00C2A8]/25 rounded-2xl p-4">
          <p className="text-white/45 text-[11px] font-medium uppercase tracking-wider mb-1">Total Balance</p>
          <p className="text-white text-[1.6rem] font-bold tracking-tight leading-tight">412,850 MAD</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <TrendingUp size={11} className="text-[#00C2A8]" />
            <span className="text-[#00C2A8] text-[11px] font-medium">+2.4% this month</span>
          </div>
        </div>

        {/* Trust Score */}
        <div className="mx-3.5 mt-2.5 bg-[#002920]/70 border border-white/5 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Trust Score</p>
            <p className="text-white text-xl font-bold leading-tight">85</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[72px] h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="w-[85%] h-full bg-gradient-to-r from-[#00C2A8] to-[#00E0C8] rounded-full" />
            </div>
            <span className="text-[#00C2A8] text-[11px] font-semibold">Excellent</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mx-3.5 mt-2.5 grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(({ label, Icon }) => (
            <div key={label} className="bg-[#001F1C] border border-white/5 rounded-xl p-2.5 flex flex-col items-center gap-1">
              <div className="w-7 h-7 bg-[#00C2A8]/10 rounded-lg flex items-center justify-center">
                <Icon size={13} className="text-[#00C2A8]" />
              </div>
              <span className="text-white/50 text-[10px] font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Recent Transactions */}
        <div className="mx-3.5 mt-3">
          <p className="text-white/35 text-[10px] uppercase tracking-wider mb-2">Recent</p>
          {TRANSACTIONS.map((tx) => (
            <div key={tx.name} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${tx.type === 'in' ? 'bg-[#00C2A8]/15' : 'bg-red-500/15'}`}>
                  {tx.type === 'in'
                    ? <ArrowDownLeft size={12} className="text-[#00C2A8]" />
                    : <ArrowUpRight size={12} className="text-red-400" />
                  }
                </div>
                <div>
                  <p className="text-white text-[12px] font-medium leading-none">{tx.name}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">{tx.time}</p>
                </div>
              </div>
              <span className={`text-[12px] font-semibold ${tx.type === 'in' ? 'text-[#00C2A8]' : 'text-red-400'}`}>
                {tx.amount}
              </span>
            </div>
          ))}
        </div>

        {/* Daret Progress */}
        <div className="mx-3.5 mt-2.5 mb-4 bg-gradient-to-r from-[#003B35]/70 to-[#002920]/70 border border-[#00C2A8]/15 rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-white text-[12px] font-semibold">Daret Circle #7</p>
            <span className="text-[#00C2A8] text-[10px] bg-[#00C2A8]/10 border border-[#00C2A8]/20 px-2 py-0.5 rounded-full font-medium">
              Active
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="w-[65%] h-full bg-gradient-to-r from-[#00C2A8] to-[#00E0C8] rounded-full" />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white/35 text-[10px]">6 / 10 members paid</span>
            <span className="text-[#00C2A8] text-[10px] font-semibold">65%</span>
          </div>
        </div>
      </motion.div>

      {/* Floating payment badge */}
      <motion.div
        animate={{ x: [0, 7, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        className="absolute -right-10 top-[88px] bg-[#002D27] border border-[#00C2A8]/30 rounded-xl p-3 shadow-xl shadow-black/40 w-[148px]"
      >
        <p className="text-[#00C2A8] text-[10px] font-semibold mb-0.5">Payment Received</p>
        <p className="text-white text-[14px] font-bold">+15,000 MAD</p>
        <p className="text-white/35 text-[10px]">From: Employer</p>
      </motion.div>

      {/* Floating KYC badge */}
      <motion.div
        animate={{ x: [0, -6, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        className="absolute -left-10 bottom-[100px] bg-[#002D27] border border-[#00C2A8]/30 rounded-xl p-3 shadow-xl shadow-black/40"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#00C2A8]/15 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={13} className="text-[#00C2A8]" />
          </div>
          <div>
            <p className="text-white text-[11px] font-semibold leading-none">KYC Verified</p>
            <p className="text-[#00C2A8] text-[10px] mt-0.5">Identity Confirmed</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HeroMockup;
