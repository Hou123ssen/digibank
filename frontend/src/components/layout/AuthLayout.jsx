import React from 'react';
import { Wallet, Shield, Zap, Users } from 'lucide-react';
import ZelligePattern from '../ui/ZelligePattern';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-bg-dark flex flex-col lg:flex-row">
      {/* Left Column */}
      <div className="relative w-full lg:w-[60%] p-8 lg:p-16 flex flex-col justify-between overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#001F1C 0%,#002D27 40%,#001a17 100%)' }}>

        <ZelligePattern className="absolute inset-0" style={{ color: '#00C2A8' }} opacity={0.08} />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 to-transparent lg:hidden" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl"
              style={{ background: 'rgba(0,194,168,0.15)', border: '1px solid rgba(0,194,168,0.3)' }}>
              <Wallet size={28} style={{ color: '#00C2A8' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">DigiBank</h2>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: '#00C2A8' }}>System Bank</p>
            </div>
          </div>

          <div className="max-w-xl">
            <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-6">
              {title || 'Your money. Your rules. Your bank.'}
            </h1>
            <p className="text-xl font-medium italic" style={{ color: 'rgba(0,194,168,0.65)' }}>
              {subtitle || 'La banque digitale marocaine de nouvelle génération.'}
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 lg:mt-0">
          {[
            { Icon: Shield, title: 'Sécurisé',     sub: 'Protection biométrique avancée' },
            { Icon: Zap,    title: 'Instantané',    sub: 'Virements en temps réel' },
            { Icon: Users,  title: 'Communautaire', sub: 'Gestion de comptes joints' },
          ].map(({ Icon, title, sub }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="p-3 rounded-xl backdrop-blur-md"
                style={{ background: 'rgba(0,194,168,0.1)', border: '1px solid rgba(0,194,168,0.2)', color: '#00C2A8' }}>
                <Icon size={24} />
              </div>
              <div>
                <h4 className="text-white font-semibold">{title}</h4>
                <p className="text-sm" style={{ color: 'rgba(0,194,168,0.5)' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-[40%] bg-bg-dark flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
