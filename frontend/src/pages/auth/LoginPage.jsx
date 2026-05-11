import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield, Zap, Users, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import logo from '../../images/logo digi.png';
import AuthBackground from '../../components/layout/AuthBackground';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../components/landing/ThemeContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/i18n/LanguageSwitcher';

const LoginPage = ({ addToast }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState(null);
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const { t } = useTranslation(['auth', 'common']);

  const { register, handleSubmit, watch, setError: setFormFieldError, clearErrors, formState: { errors } } = useForm();
  const emailVal = watch('email', '');
  const passVal  = watch('password', '');
  const hasInput = emailVal?.length > 0 || passVal?.length > 0;

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    clearErrors();

    try {
      await login({
        email: data.email,
        password: data.password,
      });
      addToast(t('auth:login.success'));
    } catch (err) {
      console.error('Login error:', err);
      const backendError = err.response?.data;

      const fieldErrors = backendError?.errors;
      const hasFieldErrors = fieldErrors && typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0;

      if (hasFieldErrors) {
        Object.entries(fieldErrors).forEach(([key, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : messages;
          if (message) {
            setFormFieldError(key, { type: 'server', message });
          }
        });
      } else {
        setError(backendError?.message || t('auth:validation.invalidCredentials'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // right panel colors
  const rightBg  = hasInput
    ? (dark ? 'linear-gradient(160deg,#001F1C,#002D27,#001a17)' : 'linear-gradient(160deg,#c8f5ee,#e0faf5,#b8f0e8)')
    : (dark ? '#0a0f0d' : '#f0fffe');
  const cardBg   = dark ? 'rgba(10,15,13,0.95)' : 'rgba(255,255,255,0.92)';
  const titleCol = dark ? '#ffffff' : '#002920';
  const subCol   = dark ? 'rgba(148,163,184,1)' : 'rgba(0,41,32,0.55)';
  const borderBg = hasInput
    ? 'linear-gradient(135deg,rgba(0,194,168,0.5),rgba(0,224,200,0.2),rgba(0,194,168,0.5))'
    : dark ? 'linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))'
           : 'linear-gradient(135deg,rgba(0,194,168,0.3),rgba(0,194,168,0.1))';
  const boxShadow = hasInput
    ? '0 0 40px rgba(0,194,168,0.25), 0 0 80px rgba(0,194,168,0.1), 0 30px 60px rgba(0,0,0,0.12)'
    : dark ? '0 0 0 1px rgba(255,255,255,0.05), 0 30px 60px rgba(0,0,0,0.5)'
           : '0 4px 40px rgba(0,194,168,0.18), 0 1px 0 rgba(0,194,168,0.25)';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">

      {/* LEFT — animated background */}
      <AuthBackground hasInput={hasInput} dark={dark}>
        <div>
          {/* logo + toggle */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xl">
                <img src={logo} alt="DigiBank" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight" style={{ color: dark ? '#fff' : '#002920' }}>DigiBank</h2>
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: '#00C2A8' }}>System Bank</p>
              </div>
            </div>
            <LanguageSwitcher accent="emerald" />
            {/* theme toggle */}
            <motion.button
              onClick={toggle}
              whileHover={{ scale: 1.12, boxShadow: '0 0 18px rgba(0,194,168,0.4)' }}
              whileTap={{ scale: 0.93 }}
              className="w-9 h-9 rounded-full flex items-center justify-center border"
              style={{
                background:   dark ? 'rgba(0,194,168,0.08)' : 'rgba(255,255,255,0.6)',
                borderColor:  dark ? 'rgba(0,194,168,0.25)' : 'rgba(0,194,168,0.35)',
                color: '#00C2A8',
                backdropFilter: 'blur(8px)',
              }}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </motion.button>
          </motion.div>

          {/* headline */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="max-w-xl">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: dark ? '#fff' : '#002920' }}>
              {t('auth:login.heroTitle').split('\n').slice(0, 2).map(line => <React.Fragment key={line}>{line}<br /></React.Fragment>)}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#00C2A8,#00E0C8)' }}>
                {t('auth:login.heroAccent')}
              </span>
            </h1>
            <p className="text-lg font-medium italic" style={{ color: dark ? 'rgba(0,194,168,0.65)' : 'rgba(0,80,65,0.7)' }}>
              La banque digitale marocaine de nouvelle génération.
            </p>
          </motion.div>
        </div>

        {/* features */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 lg:mt-0">
          {[
            { Icon: Shield, title: 'Sécurisé',     sub: 'Protection biométrique avancée' },
            { Icon: Zap,    title: 'Instantané',    sub: 'Virements en temps réel' },
            { Icon: Users,  title: 'Communautaire', sub: 'Gestion de comptes joints' },
          ].map(({ Icon, title, sub }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }} className="flex items-start gap-4">
              <div className="p-3 rounded-xl shrink-0"
                style={{ background: !dark ? 'rgba(0,194,168,0.15)' : 'rgba(0,194,168,0.1)', border: '1px solid rgba(0,194,168,0.25)', color: '#00C2A8' }}>
                <Icon size={22} />
              </div>
              <div>
                <h4 className="font-semibold" style={{ color: dark ? '#fff' : '#002920' }}>{title}</h4>
                <p className="text-sm" style={{ color: dark ? 'rgba(0,194,168,0.55)' : 'rgba(0,80,65,0.6)' }}>{sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AuthBackground>

      {/* RIGHT — form */}
      <motion.div
        animate={{ background: rightBg }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
        className="w-full lg:w-[40%] flex items-center justify-center p-6 lg:p-12"
      >
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ borderRadius: '1.25rem', padding: '2px', background: borderBg, boxShadow, transition: 'box-shadow 0.7s ease, background 0.7s ease' }}
          >
            <div style={{ background: cardBg, borderRadius: '1.15rem', padding: '2rem', backdropFilter: 'blur(20px)' }}>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-8 relative">
                <h2 className="text-2xl font-bold" style={{ color: titleCol }}>{t('auth:login.title')}</h2>
                <p className="mt-1 text-sm" style={{ color: subCol }}>{t('auth:login.subtitle')}</p>

                {/* Theme toggle button */}
                <motion.button
                  onClick={toggle}
                  whileHover={{ scale: 1.12, boxShadow: '0 0 18px rgba(0,194,168,0.35)' }}
                  whileTap={{ scale: 0.93 }}
                  className="absolute top-0 right-0 w-9 h-9 rounded-full flex items-center justify-center border"
                  style={{
                    background: dark ? 'rgba(0,194,168,0.08)' : 'rgba(0,150,130,0.08)',
                    borderColor: dark ? 'rgba(0,194,168,0.2)' : 'rgba(0,150,130,0.2)',
                    color: '#00C2A8',
                  }}
                >
                  {dark ? <Sun size={15} /> : <Moon size={15} />}
                </motion.button>
              </motion.div>

              {error && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500 text-sm">
                  <AlertCircle size={18} /><p>{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                  <Input light={!dark} label={t('auth:login.email')} type="email" placeholder="name@company.com" leftIcon={Mail}
                    error={errors.email?.message} disabled={isLoading}
                    {...register('email', { required: t('auth:validation.emailRequired'), pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: t('auth:validation.emailInvalid') } })} />
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="relative">
                  <Input light={!dark} label={t('auth:login.password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••" leftIcon={Lock}
                    error={errors.password?.message} disabled={isLoading}
                    {...register('password', { required: t('auth:validation.passwordRequired'), minLength: { value: 6, message: t('auth:validation.passwordMin6') } })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-9.5 transition-colors"
                    style={{ color: !dark ? 'rgba(0,41,32,0.4)' : 'rgba(100,116,139,1)' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
                  className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: '#00C2A8' }} />
                    <span className="text-sm" style={{ color: subCol }}>{t('auth:login.remember')}</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm font-medium" style={{ color: '#00C2A8' }}>{t('auth:login.forgot')}</Link>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }}>
                  <Button type="submit" className="w-full" isLoading={isLoading} variant="primary">{t('auth:login.submit')}</Button>
                </motion.div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: !dark ? 'rgba(0,41,32,0.08)' : 'rgba(255,255,255,0.05)' }} />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2" style={{ background: cardBg, color: subCol }}>{t('auth:login.or')}</span>
                  </div>
                </div>

                <button type="button" disabled={isLoading} className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all"
                  style={{
                    borderColor: !dark ? 'rgba(0,194,168,0.3)' : 'rgba(255,255,255,0.1)',
                    color:       !dark ? '#007a6a' : '#fff',
                    background:  !dark ? 'rgba(0,194,168,0.06)' : 'rgba(255,255,255,0.05)',
                  }}>
                  {t('auth:login.guest')}
                </button>
              </form>

              <p className="mt-8 text-center text-sm" style={{ color: subCol }}>
                {t('auth:login.new')}{' '}
                <Link to="/register" className="font-semibold" style={{ color: '#00C2A8' }}>{t('auth:login.create')}</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
