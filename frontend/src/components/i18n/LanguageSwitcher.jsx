import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { changeLanguage, languageOptions, normalizeLanguage } from '../../i18n/helpers';

const accentClass = {
  emerald: 'bg-emerald-500/20 text-emerald-400 shadow-emerald-950/20',
  violet: 'bg-violet-500/20 text-violet-400 shadow-violet-950/20',
  amber: 'bg-amber-500/20 text-amber-400 shadow-amber-950/20',
};

const LanguageSwitcher = ({ accent = 'emerald', compact = false }) => {
  const { i18n, t } = useTranslation('common');
  const current = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-1"
      role="group"
      aria-label={t('language.select')}
    >
      {!compact && <Languages size={13} className="mx-1 text-slate-500" />}
      {languageOptions.map(language => {
        const active = current === language.code;
        return (
          <button
            key={language.code}
            type="button"
            onClick={() => changeLanguage(language.code)}
            className={cn(
              'relative rounded-md px-2 py-1 text-[11px] font-bold transition-colors',
              active ? accentClass[accent] : 'text-slate-500 hover:text-slate-300'
            )}
            title={language.label}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId={`lang-active-${accent}`}
                className="absolute inset-0 rounded-md bg-current opacity-0"
                transition={{ duration: 0.18 }}
              />
            )}
            <span className="relative">{language.short}</span>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
