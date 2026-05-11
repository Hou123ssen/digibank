import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Shield, Zap, Users, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import logo from '../../images/logo digi.png';
import AuthBackground from '../../components/layout/AuthBackground';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../components/landing/ThemeContext';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/i18n/LanguageSwitcher';

const RegisterPage = ({ addToast }) => {
  const [showPassword, setShowPassword]         = useState(false);
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Weak', color: 'bg-rose-500' });
  const { register: registerUser } = useAuth();
  const { dark, toggle } = useTheme();
  const { t } = useTranslation(['auth', 'common']);

  const { register, handleSubmit, watch, setError: setFormFieldError, formState: { errors } } = useForm();
  const password = watch('password', '');
  const nameVal  = watch('fullName', '');
  const emailVal = watch('email', '');
  const passVal  = watch('password', '');
  const confVal  = watch('confirmPassword', '');
  const hasInput = [nameVal, emailVal, passVal, confVal].some(v => v?.length > 0);

  useEffect(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1)       setPasswordStrength({ score: 25,  label: t('auth:register.weak'),     color: 'bg-rose-500' });
    else if (score === 2) setPasswordStrength({ score: 50,  label: t('auth:register.medium'),   color: 'bg-amber-500' });
    else if (score >= 3)  setPasswordStrength({ score: 100, label: t('auth:register.strong'),   color: 'bg-[#00C2A8]' });
    else                  setPasswordStrength({ score: 0,   label: t('auth:register.tooShort'), color: 'bg-slate-700' });
  }, [password, t]);

  const onSubmit = async (data) => {
    setIsLoading(true); setError(null);
    try {
      await registerUser({ name: data.fullName, email: data.email, password: data.password, password_confirmation: data.confirmPassword });
      addToast(t('auth:register.success'));
    } catch (err) {
      const be = err.response?.data;
      if (be?.errors) {
        const keyMap = { name: 'fullName', password_confirmation: 'confirmPassword' };
        Object.keys(be.errors).forEach(k => setFormFieldError(keyMap[k] || k, { message: be.errors[k][0] }));
      } else setError(be?.message || t('common:errors.generic'));
    } finally { setIsLoading(false); }
  };

  const cardBg   = dark ? 'rgba(10,15,13,0.95)'  : 'rgba(255,255,255,0.98)';
  const titleCol = dark ? '#ffffff'               : '#001a15';
  const subCol   = dark ? 'rgba(148,163,184,1)'   : 'rgba(0,64,48,0.65)';
  const rightBg  = hasInput
    ? (dark ? 'linear-gradient(160deg,#001F1C,#002D27,#001a17)' : 'linear-gradient(160deg,#dff9f6,#e8fbf8,#d4f6f2)')
    : (dark ? '#0a0f0d' : '#f0fffe');
  const borderBg = hasInput
    ? 'linear-gradient(135deg,rgba(0,194,168,0.5),rgba(0,224,200,0.2),rgba(0,194,168,0.5))'
    : (dark ? 'linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))' : 'linear-gradient(135deg,rgba(0,160,135,0.35),rgba(0,194,168,0.15))');
  const boxShadow = hasInput
    ? '0 0 40px rgba(0,194,168,0.25), 0 0 80px rgba(0,194,168,0.1), 0 30px 60px rgba(0,0,0,0.15)'
    : (dark ? '0 0 0 1px rgba(255,255,255,0.05), 0 30px 60px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,160,135,0.12), 0 2px 8px rgba(0,160,135,0.08)');

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden">

      {/* LEFT */}
      <AuthBackground hasInput={hasInput} dark={dark}>
        <div>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="flex items-center justify-between gap-3 mb-16">
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
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="max-w-xl">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: dark ? '#fff' : '#002920' }}>
              {t('auth:register.heroTitle').split('\n').slice(0, 2).map(line => <React.Fragment key={line}>{line}<br /></React.Fragment>)}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#00C2A8,#00E0C8)' }}>{t('auth:register.heroAccent')}</span>
            </h1>
            <p className="text-lg font-medium italic" style={{ color: dark ? 'rgba(0,194,168,0.65)' : 'rgba(0,80,65,0.7)' }}>
              La banque digitale marocaine de nouvelle génération.
            </p>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 lg:mt-0">
          {[
            { Icon: Shield, title: 'Sécurisé',     sub: 'Protection biométrique avancée' },
            { Icon: Zap,    title: 'Instantané',    sub: 'Virements en temps réel' },
            { Icon: Users,  title: 'Communautaire', sub: 'Gestion de comptes joints' },
          ].map(({ Icon, title, sub }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }} className="flex items-start gap-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(0,194,168,0.12)', border: '1px solid rgba(0,194,168,0.25)', color: '#00C2A8' }}><Icon size={22} /></div>
              <div>
                <h4 className="font-semibold" style={{ color: dark ? '#fff' : '#002920' }}>{title}</h4>
                <p className="text-sm" style={{ color: dark ? 'rgba(0,194,168,0.55)' : 'rgba(0,80,65,0.6)' }}>{sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AuthBackground>

      {/* RIGHT */}
      <motion.div
        animate={{ background: rightBg }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
        className="w-full lg:w-[40%] flex items-start lg:items-center justify-center min-h-screen lg:min-h-0 p-4 sm:p-6 lg:p-12"
      >
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ borderRadius: '1.25rem', padding: '2px', background: borderBg, boxShadow, transition: 'box-shadow 0.7s ease, background 0.7s ease' }}
          >
            <div style={{ background: cardBg, borderRadius: '1.15rem', padding: '2rem' }}>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-6 relative">
                <h2 className="text-2xl font-bold" style={{ color: titleCol }}>{t('auth:register.title')}</h2>
                <p className="mt-1 text-sm" style={{ color: subCol }}>{t('auth:register.subtitle')}</p>

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
                  className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500 text-sm">
                  <AlertCircle size={18} /><p>{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.25 }}>
                  <Input label={t('auth:register.fullName')} placeholder="Mohamed Alami" leftIcon={User}
                    light={!dark}
                    error={errors.fullName?.message} disabled={isLoading}
                    {...register('fullName', { required: t('auth:validation.fullNameRequired') })} />
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                  <Input label={t('auth:register.email')} type="email" placeholder="mohamed@alami.ma" leftIcon={Mail}
                    light={!dark}
                    error={errors.email?.message} disabled={isLoading}
                    {...register('email', { required: t('auth:validation.emailRequired'), pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: t('auth:validation.emailInvalid') } })} />
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="relative">
                  <Input label={t('auth:register.password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••" leftIcon={Lock}
                    light={!dark}
                    error={errors.password?.message} disabled={isLoading}
                    {...register('password', { required: t('auth:validation.passwordRequired'), minLength: { value: 8, message: t('auth:validation.passwordMin8') } })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-9.5 transition-colors" style={{ color: dark ? 'rgba(148,163,184,1)' : 'rgba(0,64,48,0.6)' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,160,135,0.12)' }}>
                        <div className={cn('h-full transition-all duration-500', passwordStrength.color)} style={{ width: `${passwordStrength.score}%` }} />
                      </div>
                      <p className="text-[10px] text-right font-medium uppercase tracking-wider" style={{ color: subCol }}>
                        {t('auth:register.strength')}: <span style={{ color: passwordStrength.score === 100 ? '#00C2A8' : undefined }}
                          className={passwordStrength.score < 100 ? passwordStrength.color.replace('bg-', 'text-') : ''}>
                          {passwordStrength.label}
                        </span>
                      </p>
                    </div>
                  )}
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                  <Input label={t('auth:register.confirmPassword')} type="password" placeholder="••••••••" leftIcon={Lock}
                    light={!dark}
                    error={errors.confirmPassword?.message} disabled={isLoading}
                    {...register('confirmPassword', { required: t('auth:validation.confirmRequired'), validate: val => watch('password') !== val ? t('auth:validation.passwordMismatch') : true })} />
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45 }}>
                  <label className="flex items-start gap-2 cursor-pointer pt-1">
                    <input type="checkbox" className="mt-1 w-4 h-4 rounded transition-all cursor-pointer" style={{ accentColor: '#00C2A8' }}
                      {...register('terms', { required: t('auth:validation.termsRequired') })} />
                    <span className="text-xs leading-relaxed" style={{ color: subCol }}>
                      {t('auth:register.terms', { terms: '', privacy: '' }).trim()}{' '}
                      <Link to="/terms" style={{ color: '#00C2A8' }}>{t('auth:register.termsLink')}</Link>{' '}
                      <Link to="/privacy" style={{ color: '#00C2A8' }}>{t('auth:register.privacyLink')}</Link>
                    </span>
                  </label>
                  {errors.terms && <p className="text-[10px] text-rose-500 mt-1">{errors.terms.message}</p>}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
                  <Button type="submit" className="w-full mt-2" isLoading={isLoading} variant="primary">{t('auth:register.submit')}</Button>
                </motion.div>
              </form>

              <p className="mt-6 text-center text-sm" style={{ color: subCol }}>
                {t('auth:register.already')}{' '}
                <Link to="/login" className="font-semibold" style={{ color: '#00C2A8' }}>{t('auth:register.signin')}</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
