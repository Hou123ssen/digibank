import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Camera, 
  FileText, 
  ShieldCheck, 
  Image as ImageIcon,
  ChevronRight,
  Info,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import kycService from '../../services/kycService';

const KYCPage = ({ addToast }) => {
  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('not_submitted'); // not_submitted, pending, approved, rejected

  // Form state
  const [form, setForm] = useState({
    national_id_number: '',
    full_name: '',
    birth_date: ''
  });

  const [files, setFiles] = useState({
    front: null,
    back: null
  });

  const [previews, setPreviews] = useState({
    front: null,
    back: null
  });

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      setLoading(true);
      const res = await kycService.getMyKyc();
      const kyc = res?.kyc_verification || res;
      
      if (kyc) {
        setKycData(kyc);
        setStatus(kyc.status);
        setForm({
          national_id_number: kyc.national_id_number || '',
          full_name: kyc.full_name || '',
          birth_date: kyc.birth_date || ''
        });
      } else {
        setStatus('not_submitted');
      }
    } catch (err) {
      console.error('Error fetching KYC:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('Le fichier est trop volumineux (max 5MB)', 'error');
      return;
    }

    setFiles(prev => ({ ...prev, [side]: file }));
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, [side]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.front || !files.back) {
      addToast('Veuillez télécharger les deux faces de votre CIN', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('cin_front', files.front);
      formData.append('cin_back', files.back);
      formData.append('national_id_number', form.national_id_number);
      formData.append('full_name', form.full_name);
      formData.append('birth_date', form.birth_date);

      await kycService.submitKyc(formData);
      addToast('KYC soumis avec succès !', 'success');
      fetchKycStatus();
    } catch (err) {
      console.error('KYC Submission error:', err);
      const msg = err.response?.data?.message || 'Erreur lors de la soumission.';
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'pending': return <Badge variant="warning" leftIcon={Clock}>En attente</Badge>;
      case 'approved': return <Badge variant="success" leftIcon={CheckCircle2}>Approuvé</Badge>;
      case 'rejected': return <Badge variant="danger" leftIcon={XCircle}>Rejeté</Badge>;
      default: return <Badge variant="neutral">Non soumis</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-white/5 rounded-lg" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-white/5 rounded-3xl" />
          <div className="h-96 bg-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  const isLocked = status === 'pending' || status === 'approved';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Vérification d'identité (KYC)" 
        subtitle="Vérifiez votre identité pour débloquer toutes les fonctionnalités de votre compte."
        breadcrumbs={["Accueil", "KYC"]}
        actions={getStatusBadge()}
      />

      {status === 'pending' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4 text-amber-500"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <h4 className="font-bold">Documents en cours d'examen</h4>
            <p className="text-sm opacity-80">Vos documents sont en cours de vérification. Temps moyen : 24h.</p>
          </div>
        </motion.div>
      )}

      {status === 'approved' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4 text-emerald-500"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="font-bold">Compte Vérifié ✓</h4>
            <p className="text-sm opacity-80">Votre identité a été validée le {new Date(kycData.reviewed_at).toLocaleDateString('fr-FR')}.</p>
          </div>
        </motion.div>
      )}

      {status === 'rejected' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4 text-rose-500"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0">
            <XCircle size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold">Vérification Rejetée</h4>
            <p className="text-sm opacity-80">Raison : {kycData.rejection_reason || 'Documents invalides ou illisibles.'}</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setStatus('not_submitted')}>Re-soumettre</Button>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Upload Form */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 space-y-8">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-500" />
              <h3 className="text-xl font-bold text-white">Soumettre vos documents</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Text Fields */}
              <div className="grid md:grid-cols-2 gap-6">
                <Input 
                  label="Nom complet (tel que sur la CIN)"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleInputChange}
                  disabled={isLocked}
                  placeholder="Ex: Mohamed Idrissi"
                  className="bg-white/5 border-white/10"
                  required
                />
                <Input 
                  label="Numéro de CIN"
                  name="national_id_number"
                  value={form.national_id_number}
                  onChange={handleInputChange}
                  disabled={isLocked}
                  placeholder="Ex: AB123456"
                  className="bg-white/5 border-white/10"
                  required
                />
                <Input 
                  label="Date de naissance"
                  name="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={handleInputChange}
                  disabled={isLocked}
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>

              {/* Upload Dropzones */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Front Side */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">CIN — Recto</label>
                  <div 
                    onClick={() => !isLocked && frontInputRef.current.click()}
                    className={`aspect-[1.6/1] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer overflow-hidden relative group ${
                      previews.front 
                        ? 'border-emerald-500/50 bg-emerald-500/5' 
                        : 'border-white/10 bg-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5'
                    } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input 
                      type="file" 
                      ref={frontInputRef} 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, 'front')}
                      accept="image/*,.pdf"
                      disabled={isLocked}
                    />
                    
                    {previews.front ? (
                      <>
                        <img src={previews.front} alt="Front preview" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                        <div className="relative z-10 space-y-2">
                          <CheckCircle2 className="mx-auto text-emerald-500" size={32} />
                          <p className="text-xs text-white font-medium">{files.front?.name}</p>
                          {!isLocked && <p className="text-[10px] text-emerald-400">Cliquer pour remplacer</p>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="text-slate-400" size={24} />
                        </div>
                        <p className="text-sm font-bold text-white">Recto de la CIN</p>
                        <p className="text-xs text-slate-500 mt-1">Glissez-déposez ou cliquez</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Back Side */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">CIN — Verso</label>
                  <div 
                    onClick={() => !isLocked && backInputRef.current.click()}
                    className={`aspect-[1.6/1] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer overflow-hidden relative group ${
                      previews.back 
                        ? 'border-emerald-500/50 bg-emerald-500/5' 
                        : 'border-white/10 bg-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5'
                    } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input 
                      type="file" 
                      ref={backInputRef} 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, 'back')}
                      accept="image/*,.pdf"
                      disabled={isLocked}
                    />
                    
                    {previews.back ? (
                      <>
                        <img src={previews.back} alt="Back preview" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                        <div className="relative z-10 space-y-2">
                          <CheckCircle2 className="mx-auto text-emerald-500" size={32} />
                          <p className="text-xs text-white font-medium">{files.back?.name}</p>
                          {!isLocked && <p className="text-[10px] text-emerald-400">Cliquer pour remplacer</p>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="text-slate-400" size={24} />
                        </div>
                        <p className="text-sm font-bold text-white">Verso de la CIN</p>
                        <p className="text-xs text-slate-500 mt-1">Glissez-déposez ou cliquez</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full h-14 text-lg font-bold" 
                disabled={isLocked || !files.front || !files.back || !form.national_id_number}
                isLoading={isSubmitting}
                type="submit"
              >
                Soumettre pour vérification
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Guidelines */}
        <div className="space-y-8">
          <Card className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <ImageIcon className="text-emerald-500" size={20} />
              <h3 className="text-lg font-bold text-white">Conseils photo</h3>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Bon éclairage, texte lisible', icon: Check, color: 'text-emerald-500' },
                { label: 'Les 4 coins de la CIN visibles', icon: Check, color: 'text-emerald-500' },
                { label: 'Pas de reflets ou d\'éblouissement', icon: X, color: 'text-rose-500' },
                { label: 'CIN en cours de validité', icon: Check, color: 'text-emerald-500' },
              ].map((rule, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className={`w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center ${rule.color}`}>
                    <rule.icon size={14} />
                  </div>
                  <span className="text-sm text-slate-300">{rule.label}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex gap-3">
              <Info className="text-emerald-500 shrink-0" size={18} />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Vos données sont chiffrées et traitées uniquement à des fins de conformité bancaire. DigiBank ne partage jamais vos informations personnelles.
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-bg-card to-emerald-900/10 border-emerald-500/10">
            <div className="space-y-4">
              <ShieldCheck className="text-emerald-500" size={32} />
              <div className="space-y-1">
                <h4 className="font-bold text-white">Sécurité Maximale</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Notre système de vérification est conforme aux normes bancaires internationales et à la protection des données (Loi 09-08).
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* History Table */}
      <Card className="p-1 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-bold text-white">Historique de vérification</h3>
        </div>
        {kycData ? (
          <Table 
            headers={["Date", "Action", "Examinateur", "Statut", "Commentaire"]}
            data={[[
              new Date(kycData.updated_at).toLocaleDateString('fr-FR'),
              status === 'not_submitted' ? 'Soumission initiale' : 'Mise à jour statut',
              kycData.reviewer?.name || 'Système',
              getStatusBadge(),
              kycData.rejection_reason || '-'
            ]]}
          />
        ) : (
          <div className="p-12 text-center text-slate-500 text-sm">
            Aucun historique disponible pour le moment.
          </div>
        )}
      </Card>
    </div>
  );
};

export default KYCPage;
