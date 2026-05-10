import React, { useEffect, useState } from 'react';
import { Calendar, Mail, Phone, Save, Shield, User } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';

const fmtDate = value => value
  ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  : 'Non fourni';

const roleLabel = role => ({
  admin: 'Administrateur',
  employee: 'Employé',
  user: 'Client',
}[role] || role || 'Non fourni');

const Field = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      <Icon size={12} /> {label}
    </p>
    <p className="mt-1 text-sm font-medium text-white">{value || 'Non fourni'}</p>
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

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const { addToast } = useOutletContext() || {};
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      password: '',
      password_confirmation: '',
    });
  }, [user]);

  const submit = async (event) => {
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
      setForm(prev => ({ ...prev, password: '', password_confirmation: '' }));
      addToast?.('Profil mis à jour', 'success');
    } catch (error) {
      const message = error.response?.data?.message
        || Object.values(error.response?.data?.errors || {})?.flat()?.[0]
        || 'Impossible de mettre à jour le profil';
      addToast?.(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mon Profil</h1>
        <p className="mt-1 text-sm text-slate-400">Consultez et mettez à jour vos informations personnelles.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-bg-card p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">{user?.name || 'Utilisateur'}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
            <Badge variant={user?.status === 'inactive' ? 'danger' : 'success'}>
              {user?.status || 'active'}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field icon={User} label="Nom" value={user?.name} />
            <Field icon={Mail} label="Email" value={user?.email} />
            <Field icon={Phone} label="Téléphone" value={user?.phone} />
            <Field icon={Shield} label="Rôle" value={roleLabel(user?.role)} />
            {user?.role === 'employee' && (
              <Field icon={Shield} label="Département" value={user?.department} />
            )}
            <Field icon={Calendar} label="Créé le" value={fmtDate(user?.created_at)} />
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-white/5 bg-bg-card p-5 space-y-4">
          <div>
            <p className="text-lg font-semibold text-white">Modifier le profil</p>
            <p className="mt-1 text-xs text-slate-500">Le mot de passe reste inchangé si les champs sont vides.</p>
          </div>

          <Input
            label="Nom"
            value={form.name}
            onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
            required
          />
          <Input
            label="Téléphone"
            value={form.phone}
            onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))}
            placeholder="Non fourni"
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={form.password}
            onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
            autoComplete="new-password"
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            value={form.password_confirmation}
            onChange={event => setForm(prev => ({ ...prev, password_confirmation: event.target.value }))}
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Enregistrement...' : <><Save size={14} className="mr-2" /> Enregistrer</>}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
