import React from 'react';
import { Wallet, Shield, Zap, Users } from 'lucide-react';
import ZelligePattern from '../ui/ZelligePattern';
import { cn } from '../../utils/cn';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-bg-dark flex flex-col lg:flex-row">
      {/* Left Column: Branding & Features */}
      <div className="relative w-full lg:w-[60%] bg-gradient-to-br from-emerald-900 via-emerald-800 to-bg-dark p-8 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Background Overlay */}
        <ZelligePattern className="absolute inset-0 text-emerald-400" opacity={0.08} />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 to-transparent lg:hidden" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-900/40">
              <Wallet size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">DigiBank</h2>
              <p className="text-[10px] text-emerald-400 font-semibold tracking-[0.2em] uppercase">System Bank</p>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-xl">
            <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-6">
              {title || "Your money. Your rules. Your bank."}
            </h1>
            <p className="text-xl text-emerald-100/70 font-medium italic">
              {subtitle || "La banque digitale marocaine de nouvelle génération."}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 lg:mt-0">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md text-emerald-400">
              <Shield size={24} />
            </div>
            <div>
              <h4 className="text-white font-semibold">Sécurisé</h4>
              <p className="text-sm text-emerald-100/50">Protection biométrique avancée</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md text-emerald-400">
              <Zap size={24} />
            </div>
            <div>
              <h4 className="text-white font-semibold">Instantané</h4>
              <p className="text-sm text-emerald-100/50">Virements en temps réel</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md text-emerald-400">
              <Users size={24} />
            </div>
            <div>
              <h4 className="text-white font-semibold">Communautaire</h4>
              <p className="text-sm text-emerald-100/50">Gestion de comptes joints</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="w-full lg:w-[40%] bg-bg-dark flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
