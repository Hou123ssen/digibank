import React, { useEffect, useState } from 'react';
import { Bell, Calendar, CreditCard, Globe2, KeyRound, Mail, Phone, Save, Shield, User } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const fmtDate = value => value
  ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  : 'Non fourni';

const roleLabel = role => ({
  admin: 'Administrateur',
  employee: 'Employé',
  user: 'Client',
}[role] || role || 'Non fourni');

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
      <Icon size={13} /> {label}
    </div>
    <div className="text-right text-sm font-medium text-white">{value || 'Non fourni'}</div>
  </div>
);

const Input = ({ label, ...props }) => (
  <label className="block space-y-1.5">
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    <input
      {...props}
      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500/40"
    />
  </label>
);

const SettingsPage = () => {
  const { user, updateProfile } = useAuth();
  const { addToast } = useOutletContext() || {};
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('digibank_language_preference') || 'fr');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      password: '',
      password_confirmation: '',
    });
  }, [user]);

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        phone: form.phone || null,
      };

      if (form.password) {
        payload.password = form.password;
        payload.password_confirmation = form.password_confirmation;
      }

      await updateProfile(payload);
      localStorage.setItem('digibank_language_preference', language);
      setForm(prev => ({ ...prev, password: '', password_confirmation: '' }));
      addToast?.('Paramètres enregistrés', 'success');
    } catch (error) {
      const message = error.response?.data?.message
        || Object.values(error.response?.data?.errors || {})?.flat()?.[0]
        || 'Impossible d’enregistrer les paramètres';
      addToast?.(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const account = user?.account;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-400">Gérez les préférences liées à votre compte DigiBank.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/5 bg-bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">Compte</p>
              <p className="mt-1 text-xs text-slate-500">Informations authentifiées depuis votre session.</p>
            </div>
            <Badge variant={user?.status === 'inactive' ? 'danger' : 'success'}>{user?.status || 'active'}</Badge>
          </div>

          <div className="space-y-3">
            <InfoRow icon={User} label="Nom" value={user?.name} />
            <InfoRow icon={Mail} label="Email" value={user?.email} />
            <InfoRow icon={Phone} label="Téléphone" value={user?.phone} />
            <InfoRow icon={Shield} label="Rôle" value={roleLabel(user?.role)} />
            {user?.role === 'employee' && <InfoRow icon={Shield} label="Département" value={user?.department} />}
            <InfoRow icon={Calendar} label="Créé le" value={fmtDate(user?.created_at)} />
            {account && (
              <InfoRow icon={CreditCard} label="Compte bancaire" value={account.account_number || account.status || 'Actif'} />
            )}
          </div>
        </section>

        <form onSubmit={saveSettings} className="rounded-2xl border border-white/5 bg-bg-card p-5 space-y-5">
          <div>
            <p className="text-lg font-semibold text-white">Préférences du profil</p>
            <p className="mt-1 text-xs text-slate-500">Mettez à jour vos informations et votre mot de passe.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nom" value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} required />
            <Input label="Téléphone" value={form.phone} onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))} />
          </div>

          <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Globe2 size={15} className="text-emerald-400" /> Langue préférée
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'fr', label: 'Français' },
                { value: 'ar', label: 'العربية' },
                { value: 'en', label: 'English' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLanguage(option.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    language === option.value
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <KeyRound size={15} className="text-emerald-400" /> Changement du mot de passe
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nouveau mot de passe" type="password" value={form.password} onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))} autoComplete="new-password" />
              <Input label="Confirmation" type="password" value={form.password_confirmation} onChange={event => setForm(prev => ({ ...prev, password_confirmation: event.target.value }))} autoComplete="new-password" />
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Bell size={15} className="text-emerald-400" /> Préférences de notification
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Aucune préférence de notification enregistrée pour ce compte.
            </p>
          </div>

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Enregistrement...' : <><Save size={14} className="mr-2" /> Enregistrer les paramètres</>}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
