import { useMemo } from 'react';
import { useTheme } from './ThemeContext.jsx';

const rand = (min, max) => Math.random() * (max - min) + min;

const css = `
@keyframes aurora1 {
  0%,100% { transform: translate(0px,0px) scale(1) rotate(0deg); }
  25%      { transform: translate(70px,-50px) scale(1.1) rotate(5deg); }
  50%      { transform: translate(40px,60px) scale(0.93) rotate(-3deg); }
  75%      { transform: translate(-50px,25px) scale(1.06) rotate(4deg); }
}
@keyframes aurora2 {
  0%,100% { transform: translate(0px,0px) scale(1) rotate(0deg); }
  25%      { transform: translate(-60px,35px) scale(1.12) rotate(-6deg); }
  50%      { transform: translate(25px,-60px) scale(0.9) rotate(3deg); }
  75%      { transform: translate(50px,15px) scale(1.08) rotate(-4deg); }
}
@keyframes aurora3 {
  0%,100% { transform: translate(0px,0px) scale(1); }
  33%      { transform: translate(50px,50px) scale(1.15); }
  66%      { transform: translate(-40px,-35px) scale(0.88); }
}
@keyframes waveFlow {
  0%   { d: path('M-100,200 C150,100 350,300 600,180 C850,60 1050,280 1300,160 C1450,100 1550,200 1700,150'); }
  50%  { d: path('M-100,180 C100,280 400,80 650,220 C900,360 1100,100 1350,240 C1500,320 1600,140 1700,200'); }
  100% { d: path('M-100,200 C150,100 350,300 600,180 C850,60 1050,280 1300,160 C1450,100 1550,200 1700,150'); }
}
@keyframes waveFlow2 {
  0%   { d: path('M-100,300 C200,180 400,380 700,260 C950,140 1150,340 1400,220 C1550,160 1650,280 1700,240'); }
  50%  { d: path('M-100,260 C150,360 450,160 700,300 C950,440 1200,200 1450,320 C1580,380 1660,220 1700,280'); }
  100% { d: path('M-100,300 C200,180 400,380 700,260 C950,140 1150,340 1400,220 C1550,160 1650,280 1700,240'); }
}
@keyframes streakMove {
  0%   { transform: translateX(-120%) rotate(var(--angle)); opacity:0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateX(120vw) rotate(var(--angle)); opacity:0; }
}
@keyframes particleDrift {
  0%   { transform: translateY(0) translateX(0); opacity:0; }
  10%  { opacity: 0.8; }
  90%  { opacity: 0.8; }
  100% { transform: translateY(var(--py)) translateX(var(--px)); opacity:0; }
}
@keyframes glowBreath {
  0%,100% { transform: scale(1); opacity: 0.7; }
  50%      { transform: scale(1.2); opacity: 1; }
}
@keyframes ringExpand {
  0%   { transform: scale(0.6); opacity: 0.4; }
  100% { transform: scale(2.2); opacity: 0; }
}
`;

/* ── Floating particles ── */
const Particles = ({ count = 20 }) => {
  const { dark } = useTheme();
  const color = dark ? 'rgba(0,194,168,0.7)' : 'rgba(0,180,155,0.75)';
  const shadow = dark ? '0 0 8px 2px rgba(0,194,168,0.3)' : '0 0 10px 3px rgba(0,194,168,0.45)';
  const pts = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand(2, 98), y: rand(10, 90),
      size: rand(1.5, 3),
      dur: rand(10, 22),
      delay: rand(0, 14),
      px: `${(Math.random() - 0.5) * 100}px`,
      py: `${-rand(80, 200)}px`,
    })), [count]);

  return (
    <>
      {pts.map((p) => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: color,
          boxShadow: shadow,
          '--px': p.px, '--py': p.py,
          animation: `particleDrift ${p.dur}s ${p.delay}s ease-in-out infinite`,
        }} />
      ))}
    </>
  );
};

/* ── Light streaks ── */
const Streaks = ({ count = 4, color = 'rgba(0,194,168,0.06)' }) => {
  const streaks = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      top: rand(5, 85),
      width: rand(200, 500),
      height: rand(1, 2),
      dur: rand(8, 18),
      delay: rand(0, 12),
      angle: rand(-15, 15),
    })), [count]);

  return (
    <>
      {streaks.map((s) => (
        <div key={s.id} style={{
          position: 'absolute',
          top: `${s.top}%`, left: 0,
          width: s.width, height: s.height,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          borderRadius: 2,
          '--angle': `${s.angle}deg`,
          animation: `streakMove ${s.dur}s ${s.delay}s linear infinite`,
        }} />
      ))}
    </>
  );
};

/* ── Aurora blob ── */
const Blob = ({ top, left, right, bottom, width, height, color, anim, dur, delay = 0, mt = 0, ml = 0, blur = 90 }) => (
  <div style={{
    position: 'absolute',
    top, left, right, bottom,
    marginTop: mt, marginLeft: ml,
    width, height,
    borderRadius: '50%',
    background: color,
    filter: `blur(${blur}px)`,
    animation: `${anim} ${dur}s ${delay}s ease-in-out infinite`,
  }} />
);

/* ── Expanding ring ── */
const Ring = ({ cx, cy, size, delay }) => (
  <div style={{
    position: 'absolute',
    left: cx, top: cy,
    marginLeft: -size / 2, marginTop: -size / 2,
    width: size, height: size,
    borderRadius: '50%',
    border: '1px solid rgba(0,194,168,0.15)',
    animation: `ringExpand 6s ${delay}s ease-out infinite`,
  }} />
);

/* ════════════════════════════════════════════
   HERO
════════════════════════════════════════════ */
const HeroBg = () => {
  const { dark } = useTheme();
  return (
  <>
    <div style={{ position:'absolute', inset:0, background: dark
      ? 'linear-gradient(135deg,#001a17 0%,#002920 55%,#000e0c 100%)'
      : 'linear-gradient(135deg,#c8f5ee 0%,#e0faf5 40%,#b8f0e8 100%)' }} />
    <Blob top="-5%"  right="-5%"  width={750} height={750} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,194,168,0.14) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(0,194,168,0.45) 0%,transparent 65%)'} anim="aurora1" dur={22} />
    <Blob bottom="-5%" left="-5%" width={650} height={650} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,110,85,0.2) 0%,transparent 70%)'  : 'radial-gradient(circle,rgba(0,210,175,0.5) 0%,transparent 65%)'}  anim="aurora2" dur={18} delay={3} />
    <Blob top="25%"  left="20%"   width={900} height={600} blur={dark?90:70} color={dark ? 'radial-gradient(ellipse,rgba(0,194,168,0.07) 0%,transparent 70%)' : 'radial-gradient(ellipse,rgba(0,230,200,0.3) 0%,transparent 65%)'} anim="aurora3" dur={28} delay={6} />
    <Blob top="60%"  right="20%"  width={500} height={500} blur={dark?90:55} color={dark ? 'radial-gradient(circle,rgba(0,150,120,0.06) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(20,255,210,0.35) 0%,transparent 60%)'} anim="aurora2" dur={16} delay={9} />
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }} viewBox="0 0 1700 500" preserveAspectRatio="none">
      <path d="M-100,200 C150,100 350,300 600,180 C850,60 1050,280 1300,160 C1450,100 1550,200 1700,150"
        fill="none" stroke={dark ? 'rgba(0,194,168,0.07)' : 'rgba(0,160,135,0.25)'} strokeWidth={dark?'1.5':'2'}
        style={{ animation:'waveFlow 12s ease-in-out infinite' }} />
      <path d="M-100,300 C200,180 400,380 700,260 C950,140 1150,340 1400,220 C1550,160 1650,280 1700,240"
        fill="none" stroke={dark ? 'rgba(0,194,168,0.05)' : 'rgba(0,160,135,0.18)'} strokeWidth={dark?'1':'1.5'}
        style={{ animation:'waveFlow2 16s ease-in-out infinite' }} />
    </svg>
    <Streaks count={5} color={dark ? 'rgba(0,194,168,0.07)' : 'rgba(0,194,168,0.22)'} />
    <Ring cx="65%" cy="45%" size={300} delay={0} />
    <Ring cx="65%" cy="45%" size={300} delay={2} />
    <Ring cx="65%" cy="45%" size={300} delay={4} />
    <Particles count={dark ? 24 : 38} />
    <div style={{ position:'absolute', inset:0, background: dark
      ? 'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 40%,rgba(0,0,0,0.1) 100%)'
      : 'linear-gradient(to bottom,rgba(180,245,235,0.2) 0%,transparent 50%)' }} />
  </>
  );
};

/* ════════════════════════════════════════════
   FEATURES
════════════════════════════════════════════ */
const FeaturesBg = () => {
  const { dark } = useTheme();
  return (
  <>
    <div style={{ position:'absolute', inset:0, background: dark
      ? 'linear-gradient(160deg,#001a17 0%,#001F1C 60%,#000e0c 100%)'
      : 'linear-gradient(160deg,#d0f7f0 0%,#eafcf8 50%,#c5f2ea 100%)' }} />
    <Blob top="-15%" left="10%"   width={750} height={750} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,194,168,0.11) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(0,194,168,0.42) 0%,transparent 65%)'} anim="aurora2" dur={20} />
    <Blob bottom="-10%" right="5%" width={650} height={650} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,90,70,0.18) 0%,transparent 70%)'  : 'radial-gradient(circle,rgba(0,220,185,0.45) 0%,transparent 65%)'}  anim="aurora1" dur={24} delay={4} />
    <Blob top="40%"  left="40%"   width={550} height={450} blur={dark?90:65} color={dark ? 'radial-gradient(ellipse,rgba(0,194,168,0.06) 0%,transparent 70%)' : 'radial-gradient(ellipse,rgba(0,240,210,0.3) 0%,transparent 65%)'} anim="aurora3" dur={18} delay={8} />
    <Blob top="10%"  right="5%"   width={400} height={400} blur={dark?90:55} color={dark ? 'radial-gradient(circle,rgba(0,150,120,0.05) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(20,255,215,0.32) 0%,transparent 60%)'} anim="aurora1" dur={14} delay={5} />
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }} viewBox="0 0 1700 500" preserveAspectRatio="none">
      <path d="M-100,200 C150,100 350,300 600,180 C850,60 1050,280 1300,160 C1450,100 1550,200 1700,150"
        fill="none" stroke={dark ? 'rgba(0,194,168,0.06)' : 'rgba(0,160,135,0.22)'} strokeWidth={dark?'1.2':'2'}
        style={{ animation:'waveFlow 14s ease-in-out infinite' }} />
    </svg>
    <Streaks count={4} color={dark ? 'rgba(0,194,168,0.06)' : 'rgba(0,194,168,0.2)'} />
    <Particles count={dark ? 18 : 30} />
    <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background: dark ? 'linear-gradient(90deg,transparent,rgba(0,194,168,0.25),transparent)' : 'linear-gradient(90deg,transparent,rgba(0,160,135,0.4),transparent)' }} />
    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background: dark ? 'linear-gradient(90deg,transparent,rgba(0,194,168,0.12),transparent)' : 'linear-gradient(90deg,transparent,rgba(0,160,135,0.25),transparent)' }} />
  </>
  );
};

/* ════════════════════════════════════════════
   SECURITY
════════════════════════════════════════════ */
const SecurityBg = () => {
  const { dark } = useTheme();
  return (
  <>
    <div style={{ position:'absolute', inset:0, background: dark
      ? 'linear-gradient(180deg,#001F1C 0%,#000d0c 100%)'
      : 'linear-gradient(180deg,#c5f2ea 0%,#daf8f2 50%,#c0f0e8 100%)' }} />
    <Blob top="5%"   left="-10%"  width={700} height={700} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,194,168,0.11) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(0,194,168,0.44) 0%,transparent 65%)'} anim="aurora3" dur={24} />
    <Blob bottom="0%" right="-5%" width={600} height={600} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,100,75,0.18) 0%,transparent 70%)'  : 'radial-gradient(circle,rgba(0,220,185,0.42) 0%,transparent 65%)'}  anim="aurora1" dur={20} delay={5} />
    <Blob top="35%"  right="20%"  width={550} height={400} blur={dark?90:65} color={dark ? 'radial-gradient(ellipse,rgba(0,194,168,0.06) 0%,transparent 70%)' : 'radial-gradient(ellipse,rgba(0,240,210,0.28) 0%,transparent 65%)'} anim="aurora2" dur={30} delay={2} />
    <Blob top="60%"  left="20%"   width={400} height={400} blur={dark?90:55} color={dark ? 'radial-gradient(circle,rgba(0,150,120,0.05) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(20,255,215,0.3) 0%,transparent 60%)'} anim="aurora3" dur={17} delay={7} />
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }} viewBox="0 0 1700 500" preserveAspectRatio="none">
      <path d="M-100,300 C200,180 400,380 700,260 C950,140 1150,340 1400,220 C1550,160 1650,280 1700,240"
        fill="none" stroke={dark ? 'rgba(0,194,168,0.06)' : 'rgba(0,160,135,0.22)'} strokeWidth={dark?'1.2':'2'}
        style={{ animation:'waveFlow2 18s ease-in-out infinite' }} />
    </svg>
    <Streaks count={4} color={dark ? 'rgba(0,194,168,0.06)' : 'rgba(0,194,168,0.2)'} />
    <Ring cx="10%" cy="50%" size={280} delay={0} />
    <Ring cx="10%" cy="50%" size={280} delay={2} />
    <Ring cx="10%" cy="50%" size={280} delay={4} />
    <Particles count={dark ? 16 : 28} />
  </>
  );
};

/* ════════════════════════════════════════════
   TICKETING
════════════════════════════════════════════ */
const TicketingBg = () => {
  const { dark } = useTheme();
  return (
  <>
    <div style={{ position:'absolute', inset:0, background: dark
      ? 'linear-gradient(180deg,#000d0c 0%,#000000 100%)'
      : 'linear-gradient(180deg,#c8f5ee 0%,#dffaf5 50%,#c2f3eb 100%)' }} />
    <Blob top="-5%"  right="-8%"  width={700} height={700} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,194,168,0.1) 0%,transparent 70%)'  : 'radial-gradient(circle,rgba(0,194,168,0.42) 0%,transparent 65%)'}  anim="aurora1" dur={18} />
    <Blob bottom="-5%" left="0%"  width={630} height={630} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,80,60,0.2) 0%,transparent 70%)'   : 'radial-gradient(circle,rgba(0,215,180,0.45) 0%,transparent 65%)'}    anim="aurora3" dur={22} delay={4} />
    <Blob top="30%"  left="30%"   width={650} height={450} blur={dark?90:65} color={dark ? 'radial-gradient(ellipse,rgba(0,194,168,0.05) 0%,transparent 70%)' : 'radial-gradient(ellipse,rgba(0,235,205,0.3) 0%,transparent 65%)'} anim="aurora2" dur={28} delay={8} />
    <Blob top="5%"   left="5%"    width={380} height={380} blur={dark?90:55} color={dark ? 'radial-gradient(circle,rgba(0,150,120,0.05) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(20,255,215,0.32) 0%,transparent 60%)'} anim="aurora1" dur={15} delay={6} />
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }} viewBox="0 0 1700 500" preserveAspectRatio="none">
      <path d="M-100,200 C150,100 350,300 600,180 C850,60 1050,280 1300,160 C1450,100 1550,200 1700,150"
        fill="none" stroke={dark ? 'rgba(0,194,168,0.05)' : 'rgba(0,160,135,0.2)'} strokeWidth={dark?'1':'1.8'}
        style={{ animation:'waveFlow 16s ease-in-out infinite' }} />
      <path d="M-100,300 C200,180 400,380 700,260 C950,140 1150,340 1400,220 C1550,160 1650,280 1700,240"
        fill="none" stroke={dark ? 'rgba(0,194,168,0.04)' : 'rgba(0,160,135,0.14)'} strokeWidth={dark?'1':'1.5'}
        style={{ animation:'waveFlow2 20s ease-in-out infinite' }} />
    </svg>
    <Streaks count={5} color={dark ? 'rgba(0,194,168,0.06)' : 'rgba(0,194,168,0.2)'} />
    <Particles count={dark ? 20 : 34} />
  </>
  );
};

/* ════════════════════════════════════════════
   CTA
════════════════════════════════════════════ */
const CTABg = () => {
  const { dark } = useTheme();
  return (
  <>
    <div style={{ position:'absolute', inset:0, background: dark
      ? 'linear-gradient(180deg,#000000 0%,#001a17 100%)'
      : 'linear-gradient(180deg,#b8f0e8 0%,#d5f8f2 50%,#c0f2ea 100%)' }} />
    <Blob top="50%" left="50%" mt={-400} ml={-400} width={900} height={900} blur={dark?90:65} color={dark ? 'radial-gradient(circle,rgba(0,194,168,0.12) 0%,transparent 65%)' : 'radial-gradient(circle,rgba(0,194,168,0.48) 0%,transparent 60%)'} anim="aurora1" dur={14} />
    <Blob top="0%"  left="0%"  width={550} height={550} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,90,65,0.18) 0%,transparent 70%)'  : 'radial-gradient(circle,rgba(0,220,185,0.45) 0%,transparent 65%)'}   anim="aurora2" dur={20} delay={2} />
    <Blob bottom="0%" right="0%" width={500} height={500} blur={dark?90:60} color={dark ? 'radial-gradient(circle,rgba(0,194,168,0.08) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(20,255,215,0.38) 0%,transparent 65%)'} anim="aurora3" dur={26} delay={6} />
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }} viewBox="0 0 1700 500" preserveAspectRatio="none">
      <path d="M-100,200 C150,100 350,300 600,180 C850,60 1050,280 1300,160 C1450,100 1550,200 1700,150"
        fill="none" stroke={dark ? 'rgba(0,194,168,0.07)' : 'rgba(0,150,130,0.12)'} strokeWidth="1.5"
        style={{ animation:'waveFlow 10s ease-in-out infinite' }} />
      <path d="M-100,300 C200,180 400,380 700,260 C950,140 1150,340 1400,220 C1550,160 1650,280 1700,240"
        fill="none" stroke={dark ? 'rgba(0,194,168,0.05)' : 'rgba(0,150,130,0.08)'} strokeWidth="1"
        style={{ animation:'waveFlow2 14s ease-in-out infinite' }} />
    </svg>
    <Streaks count={6} color={dark ? 'rgba(0,194,168,0.07)' : 'rgba(0,150,130,0.08)'} />
    <Ring cx="50%" cy="50%" size={350} delay={0} />
    <Ring cx="50%" cy="50%" size={350} delay={2} />
    <Ring cx="50%" cy="50%" size={350} delay={4} />
    <Particles count={dark ? 28 : 44} />
    <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background: dark ? 'linear-gradient(90deg,transparent,rgba(0,194,168,0.2),transparent)' : 'linear-gradient(90deg,transparent,rgba(0,150,130,0.25),transparent)' }} />
  </>
  );
};

/* ════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════ */
const AnimatedBackground = ({ variant = 'hero' }) => {
  const map = { hero: HeroBg, features: FeaturesBg, security: SecurityBg, ticketing: TicketingBg, cta: CTABg };
  const Bg = map[variant] ?? HeroBg;
  return (
    <>
      <style>{css}</style>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', isolation:'isolate', zIndex:0 }}>
        <Bg />
      </div>
    </>
  );
};

export default AnimatedBackground;
