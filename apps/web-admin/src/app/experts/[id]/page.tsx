'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getExpertsAdmin, verifyExpertDossier } from '@echrimheni/database';
import { Card, CardTitle, Button, Badge, LoadingState, ErrorState } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { ExpertStatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getInitials } from '@/lib/utils';
import { ArrowLeft, CheckCircle, XCircle, PauseCircle, ShieldCheck, AlertTriangle, FileText, Building2 } from 'lucide-react';
import type { ExpertVerificationStatus } from '@echrimheni/shared';

interface ExpertDetail {
  id: string;
  full_name: string;
  phone: string;
  wilaya: string;
  commune: string;
  specialties: string[];
  identity_document_type: string;
  identity_document_number: string;
  business_name: string;
  business_registration_number: string;
  business_activity: string;
  verification_status: ExpertVerificationStatus;
  rejection_reason?: string;
  created_at: string;
}

function normalizeExpert(data: any): ExpertDetail {
  return {
    id: data.expert_id || data.id,
    full_name: data.profiles?.full_name || 'Expert',
    phone: data.profiles?.phone || '',
    wilaya: data.expert_profiles?.wilaya || '',
    commune: data.expert_profiles?.commune || '',
    specialties: data.expert_profiles?.specialties || [],
    identity_document_type: data.identity_document_type || 'CNI',
    identity_document_number: data.identity_document_number || '',
    business_name: data.business_name || '',
    business_registration_number: data.business_registration_number || '',
    business_activity: data.business_activity || '',
    verification_status: (data.verification_status || 'PENDING') as ExpertVerificationStatus,
    rejection_reason: data.rejection_reason,
    created_at: data.created_at,
  };
}

export default function ExpertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const expertId = params.id as string;

  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadExpert();
  }, [expertId]);

  const loadExpert = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpertsAdmin();
      const found = data.find((e: any) => (e.expert_id || e.id) === expertId);
      if (found) {
        setExpert(normalizeExpert(found));
      } else {
        setError('Aucun dossier trouvé pour cet identifiant.');
      }
    } catch (err: any) {
      console.error('[Expert Detail] Erreur :', err.message);
      setError('Impossible de charger le dossier expert.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!expert) return;
    setActionLoading(true);
    try {
      await verifyExpertDossier(expert.id, 'APPROVED');
      toast('success', 'Expert approuvé avec succès ! Badge Expert Vérifié attribué.');
      setExpert(prev => prev ? { ...prev, verification_status: 'APPROVED' } : null);
    } catch (err: any) {
      toast('error', 'Erreur lors de l\'approbation : ' + err.message);
    }
    setShowApproveModal(false);
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!expert || rejectionReason.trim().length < 5) return;
    setActionLoading(true);
    try {
      await verifyExpertDossier(expert.id, 'REJECTED', rejectionReason);
      toast('success', 'Dossier rejeté. Motif notifié au candidat.');
      setExpert(prev => prev ? { ...prev, verification_status: 'REJECTED', rejection_reason: rejectionReason } : null);
    } catch (err: any) {
      toast('error', 'Erreur lors du refus : ' + err.message);
    }
    setShowRejectModal(false);
    setRejectionReason('');
    setActionLoading(false);
  };

  const handleSuspend = async () => {
    if (!expert) return;
    setActionLoading(true);
    try {
      await verifyExpertDossier(expert.id, 'SUSPENDED');
      toast('warning', 'Expert suspendu. Ses missions sont gelées.');
      setExpert(prev => prev ? { ...prev, verification_status: 'SUSPENDED' } : null);
    } catch (err: any) {
      toast('error', 'Erreur lors de la suspension : ' + err.message);
    }
    setShowSuspendModal(false);
    setActionLoading(false);
  };

  const checkCoherence = (activity: string, specialties: string[]): { valid: boolean; message: string } => {
    const actLower = activity.toLowerCase();
    const hasAuto = specialties.includes('automobile') && (actLower.includes('auto') || actLower.includes('mécani') || actLower.includes('mecani') || actLower.includes('diagnostic'));
    const hasTelephone = specialties.includes('telephone') && (actLower.includes('téléph') || actLower.includes('teleph') || actLower.includes('electron') || actLower.includes('mobile'));
    const hasElectro = specialties.includes('electromenager') && (actLower.includes('électro') || actLower.includes('electro') || actLower.includes('ménager') || actLower.includes('menager'));

    if (hasAuto || hasTelephone || hasElectro) {
      return { valid: true, message: 'Cohérence validée : l\'activité RC correspond à la spécialité déclarée.' };
    }
    return { valid: false, message: 'Incohérence potentielle : vérification manuelle du code d\'activité requise.' };
  };

  if (loading) return <LoadingState message="Chargement du dossier expert..." />;
  if (error || !expert) return <ErrorState title="Expert introuvable" message={error || 'Dossier non trouvé.'} onRetry={() => router.push('/experts')} />;

  const coherence = checkCoherence(expert.business_activity, expert.specialties);

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/experts')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition">
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-lg font-bold text-emerald-700">{getInitials(expert.full_name)}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{expert.full_name}</h2>
              <ExpertStatusBadge status={expert.verification_status} />
            </div>
            <p className="text-sm text-slate-500">{expert.phone} • {expert.wilaya}, {expert.commune}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expert.verification_status !== 'APPROVED' && (
            <Button variant="primary" size="sm" icon={<CheckCircle className="h-4 w-4" />} onClick={() => setShowApproveModal(true)}>Approuver</Button>
          )}
          {expert.verification_status !== 'REJECTED' && (
            <Button variant="danger" size="sm" icon={<XCircle className="h-4 w-4" />} onClick={() => setShowRejectModal(true)}>Rejeter</Button>
          )}
          {expert.verification_status === 'APPROVED' && (
            <Button variant="warning" size="sm" icon={<PauseCircle className="h-4 w-4" />} onClick={() => setShowSuspendModal(true)}>Suspendre</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><FileText className="h-5 w-5 text-blue-600" /></div>
            <CardTitle>Pièce d&apos;Identité</CardTitle>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-slate-500">Type</p><p className="font-medium text-slate-900">{expert.identity_document_type}</p></div>
              <div><p className="text-slate-500">Numéro</p><p className="font-medium text-slate-900 font-mono">{expert.identity_document_number}</p></div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <ShieldCheck className="h-4 w-4 inline mr-1" />Document privé stocké en Storage sécurisé. Non exposé publiquement.
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center"><Building2 className="h-5 w-5 text-purple-600" /></div>
            <CardTitle>Registre de Commerce</CardTitle>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-slate-500">Raison sociale</p><p className="font-medium text-slate-900">{expert.business_name}</p></div>
              <div><p className="text-slate-500">Numéro RC</p><p className="font-medium text-slate-900 font-mono">{expert.business_registration_number}</p></div>
            </div>
            <div><p className="text-sm text-slate-500">Activité déclarée</p><p className="text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1">{expert.business_activity}</p></div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Contrôle de Cohérence RC / Spécialité</CardTitle>
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2 text-sm text-slate-600">
            Spécialité(s) déclarée(s) : <Badge variant="info">{expert.specialties.join(', ') || '—'}</Badge>
          </div>
          <div className={`p-4 rounded-lg border ${coherence.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2">
              {coherence.valid ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
              <p className={`text-sm font-medium ${coherence.valid ? 'text-emerald-800' : 'text-amber-800'}`}>{coherence.message}</p>
            </div>
          </div>
        </div>
      </Card>

      {expert.rejection_reason && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-2"><XCircle className="h-5 w-5 text-red-600" /><CardTitle className="text-red-800">Motif du refus</CardTitle></div>
          <p className="text-sm text-red-700">{expert.rejection_reason}</p>
        </Card>
      )}

      <ConfirmModal open={showApproveModal} onClose={() => setShowApproveModal(false)} onConfirm={handleApprove}
        title="Approuver cet expert ?" description={`Vous vous apprêtez à approuver ${expert.full_name}. Le badge Expert Vérifié sera activé.`}
        confirmLabel="Approuver" variant="primary" loading={actionLoading} />

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Rejeter le dossier</h2>
              <p className="text-sm text-slate-500 mt-1">Un motif d&apos;au moins 5 caractères est obligatoire.</p>
            </div>
            <div className="p-6">
              <Textarea label="Motif du refus" rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex : Le registre de commerce ne correspond pas à l'activité automobile..."
                error={rejectionReason.length > 0 && rejectionReason.length < 5 ? 'Minimum 5 caractères' : undefined} />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Annuler</Button>
              <Button variant="danger" loading={actionLoading} disabled={rejectionReason.trim().length < 5} onClick={handleReject}>Confirmer le refus</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={showSuspendModal} onClose={() => setShowSuspendModal(false)} onConfirm={handleSuspend}
        title="Suspendre cet expert ?" description={`${expert.full_name} sera temporairement suspendu. Ses missions actives seront gelées.`}
        confirmLabel="Suspendre" variant="warning" loading={actionLoading} />
    </div>
  );
}
