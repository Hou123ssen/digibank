import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const css = `
@keyframes aurora1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(60px,-40px) scale(1.1); }
  66%      { transform: translate(-40px,50px) scale(0.93); }
}
@keyframes aurora2 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(-50px,30px) scale(1.12); }
  66%      { transform: translate(40px,-50px) scale(0.9); }
}
@keyframes aurora3 {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(40px,40px) scale(1.15); }
}
@keyframes waveFlow {
  0%,100% { d: path('M-100,200 C150,100 350,300 600,180 C850,60 1050,280 1300,160 C1450,100 1550,200 1700,150'); }
  50%      { d: path('M-100,180 C100,280 400,80 650,220 C900,360 1100,100 1350,240 C1500,320 1600,140 1700,200'); }
}
@keyframes waveFlow2 {
  0%,100% { d: path('M-100,300 C200,180 400,380 700,260 C950,140 1150,340 1400,220 C1550,160 1650,280 1700,240'); }
  50%      { d: path('M-100,260 C150,360 450,160 700,300 C950,440 1200,200 1450,320 C1580,380 1660,220 1700,280'); }
}
@keyframes particleDrift {
  0%   { transform: translateY(0) translateX(0); opacity:0; }
  10%  { opacity:0.8; }
  90%  { opacity:0.8; }
  100% { transform: translateY(var(--py)) translateX(var(--px)); opacity:0; }
}
@keyframes streakMove {
  0%   { transform: translateX(-120%) rotate(var(--angle)); opacity:0; }
  15%  { opacity:1; }
  85%  { opacity:1; }
  100% { transform: translateX(120vw) rotate(var(--angle)); opacity:0; }
}
@keyframes ringExpand {
  0%   { transform: scale(0.6); opacity:0.4; }
  100% { transform: scale(2.2); opacity:0; }
}
`;

const Blob = ({ top, left, right, bottom, width, height, color, anim, dur, delay = 0, blur = 80 }) => (
  <div style={{
    position: 'absolute', top, left, right, bottom,
    width, height, borderRadius: '50%',
    background: color, filter: `blur(${blur}px)`,
    animation: `${anim} ${dur}s ${delay}s ease-in-out infinite`,
    pointerEvents: 'none',
  }} />
);

const Ring = ({ cx, cy, size, delay, dark }) => (
  <div style={{
    position: 'absolute', left: cx, top: cy,
    marginLeft: -size / 2, marginTop: -size / 2,
    width: size, height: size, borderRadius: '50%',
    border: `1px solid ${dark ? 'rgba(0,194,168,0.15)' : 'rgba(0,160,135,0.2)'}`,
    animation: `ringExpand 6s ${delay}s ease-out infinite`,
    pointerEvents: 'none',
  }} />
);

const Particles = ({ dark }) => {
  const pts = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    x: Math.random() * 98 + 1,
    y: Math.random() * 80 + 10,
    size: Math.random() * 2 + 1,
    dur: Math.random() * 12 + 10,
    delay: Math.random() * 14,
    px: `${(Math.random() - 0.5) * 80}px`,
    py: `${-(Math.random() * 120 + 60)}px`,
  }));
  return (
    <>
      {pts.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: '50%',
          background: dark ? 'rgba(0,194,168,0.7)' : 'rgba(0,160,135,0.6)',
          boxShadow: dark ? '0 0 8px 2px rgba(0,194,168,0.3)' : '0 0 8px 2px rgba(0,194,168,0.35)',
          '--px': p.px, '--py': p.py,
          animation: `particleDrift ${p.dur}s ${p.delay}s ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
};

const Streaks = ({ dark }) => {
  const streaks = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    top: Math.random() * 80 + 5,
    width: Math.random() * 300 + 200,
    dur: Math.random() * 10 + 8,
    delay: Math.random() * 12,
    angle: Math.random() * 20 - 10,
  }));
  return (
    <>
      {streaks.map(s => (
        <div key={s.id} style={{
          position: 'absolute', top: `${s.top}%`, left: 0,
          width: s.width, height: 1.5,
          background: `linear-gradient(90deg,transparent,${dark ? 'rgba(0,194,168,0.12)' : 'rgba(0,160,135,0.25)'},transparent)`,
          '--angle': `${s.angle}deg`,
          animation: `streakMove ${s.dur}s ${s.delay}s linear infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
};

const AuthBackground = ({ hasInput, dark, children }) => (
  <motion.div
    animate={{ opacity: hasInput ? 0.12 : 1 }}
    transition={{ duration: 0.7, ease: 'easeInOut' }}
    className="relative w-full lg:w-[60%] flex flex-col justify-between p-8 lg:p-16 overflow-hidden"
    style={{
      background: dark
        ? 'linear-gradient(135deg,#001a17 0%,#002920 55%,#000e0c 100%)'
        : 'linear-gradient(135deg,#c8f5ee 0%,#e0faf5 40%,#b8f0e8 100%)',
    }}
  >
    <style>{css}</style>

    {/* aurora blobs */}
    <Blob top="-5%"   right="-5%"  width={700} height={700} blur={dark?90:60}
      color={dark ? 'radial-gradient(circle,rgba(0,194,168,0.14) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(0,194,168,0.45) 0%,transparent 65%)'}
      anim="aurora1" dur={22} />
    <Blob bottom="-5%" left="-5%"  width={600} height={600} blur={dark?90:60}
      color={dark ? 'radial-gradient(circle,rgba(0,110,85,0.2) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(0,210,175,0.5) 0%,transparent 65%)'}
      anim="aurora2" dur={18} delay={3} />
    <Blob top="25%"  left="20%"   width={800} height={550} blur={dark?90:70}
      color={dark ? 'radial-gradient(ellipse,rgba(0,194,168,0.07) 0%,transparent 70%)' : 'radial-gradient(ellipse,rgba(0,230,200,0.3) 0%,transparent 65%)'}
      anim="aurora3" dur={28} delay={6} />

    {/* wave SVG */}
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible', pointerEvents:'none' }}
      viewBox="0 0 1700 500" preserveAspectRatio="none">
      <path d="M-100,200 C150,100 350,300 600,180 C850,60 1050,280 1300,160 C1450,100 1550,200 1700,150"
        fill="none"
        stroke={dark ? 'rgba(0,194,168,0.07)' : 'rgba(0,160,135,0.25)'}
        strokeWidth={dark ? '1.5' : '2'}
        style={{ animation: 'waveFlow 12s ease-in-out infinite' }} />
      <path d="M-100,300 C200,180 400,380 700,260 C950,140 1150,340 1400,220 C1550,160 1650,280 1700,240"
        fill="none"
        stroke={dark ? 'rgba(0,194,168,0.05)' : 'rgba(0,160,135,0.15)'}
        strokeWidth={dark ? '1' : '1.5'}
        style={{ animation: 'waveFlow2 16s ease-in-out infinite' }} />
    </svg>

    {/* particles + streaks */}
    <Particles dark={dark} />
    <Streaks dark={dark} />

    {/* scan line */}
    <motion.div
      animate={{ top: ['-2%', '102%'] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
      style={{
        position: 'absolute', left: 0, right: 0, height: '2px', pointerEvents: 'none',
        background: dark
          ? 'linear-gradient(90deg,transparent,rgba(0,194,168,0.35),transparent)'
          : 'linear-gradient(90deg,transparent,rgba(0,160,135,0.4),transparent)',
        boxShadow: '0 0 10px rgba(0,194,168,0.2)',
      }}
    />

    {/* vignette bottom */}
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: dark
        ? 'linear-gradient(to top,rgba(0,0,0,0.4) 0%,transparent 40%)'
        : 'linear-gradient(to bottom,rgba(180,245,235,0.15) 0%,transparent 50%)',
    }} />

    <div className="relative z-10 flex flex-col justify-between h-full">
      {children}
    </div>
  </motion.div>
);

export default AuthBackground;
