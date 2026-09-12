'use client';

import { useState } from 'react';
import { INITIAL_EXPERTS, ExpertWithDossier } from '../../lib/mock-admin-data';

export default function ExpertsPage() {
  const [experts, setExperts] = useState<ExpertWithDossier[]>(INITIAL_EXPERTS);
  const [selectedExpert, setSelectedExpert] = useState<ExpertWithDossier | null>(INITIAL_EXPERTS[1]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleApprove = (expertId: string) => {
    setExperts(prev => prev.map(e => {
      if (e.profile.id === expertId) {
        return {
          ...e,
          document: {
            ...e.document,
            verification_status: 'APPROVED' as const,
            reviewed_at: new Date().toISOString()
          }
        };
      }
      return e;
    }));
    setFeedbackMessage('Expert approuvé avec succès ! Le badge Expert vérifié est actif.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleReject = () => {
    if (!selectedExpert || rejectionReason.trim().length < 5) return;

    setExperts(prev => prev.map(e => {
      if (e.profile.id === selectedExpert.profile.id) {
        return {
          ...e,
          document: {
            ...e.document,
            verification_status: 'REJECTED' as const,
            rejection_reason: rejectionReason,
            reviewed_at: new Date().toISOString()
          }
        };
      }
      return e;
    }));

    setShowRejectModal(false);
    setRejectionReason('');
    setFeedbackMessage('Expert rejeté avec motif explicite enregistré.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleSuspend = (expertId: string) => {
    setExperts(prev => prev.map(e => {
      if (e.profile.id === expertId) {
        return {
          ...e,
          document: {
            ...e.document,
            verification_status: 'SUSPENDED' as const,
            reviewed_at: new Date().toISOString()
          }
        };
      }
      return e;
    }));
    setFeedbackMessage('Expert suspendu temporairement.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Vérification des Candidatures Experts</h1>
        <p className="text-sm text-slate-400 mt-1">Examen strict des pièces d identité et des registres de commerce avant mise en ligne.</p>
      </div>

      {feedbackMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-medium">
          {feedbackMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 px-2">Candidats</h2>
          {experts.map((e) => {
            const isSelected = selectedExpert?.profile.id === e.profile.id;
            return (
              <div
                key={e.profile.id}
                onClick={() => setSelectedExpert(e)}
                className={p-4 rounded-lg cursor-pointer border transition }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{e.profile.full_name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{e.expertProfile.wilaya} • {e.expertProfile.commune}</p>
                  </div>
                  <span className={	ext-[10px] font-bold px-2 py-0.5 rounded border uppercase }>
                    {e.document.verification_status}
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Spécialité : <span className="text-slate-200 capitalize font-medium">{e.expertProfile.specialties.join(', ')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {selectedExpert && (
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{selectedExpert.profile.full_name}</h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase bg-slate-800 text-slate-300">
                    {selectedExpert.document.verification_status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Téléphone : {selectedExpert.profile.phone} • Zone : {selectedExpert.expertProfile.wilaya}</p>
              </div>

              <div className="flex items-center gap-2">
                {selectedExpert.document.verification_status !== 'APPROVED' && (
                  <button
                    onClick={() => handleApprove(selectedExpert.profile.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Approuver
                  </button>
                )}
                {selectedExpert.document.verification_status !== 'REJECTED' && (
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="bg-rose-600/20 text-rose-300 border border-rose-600/40 hover:bg-rose-600/30 text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Rejeter
                  </button>
                )}
                {selectedExpert.document.verification_status === 'APPROVED' && (
                  <button
                    onClick={() => handleSuspend(selectedExpert.profile.id)}
                    className="bg-amber-600/20 text-amber-300 border border-amber-600/40 hover:bg-amber-600/30 text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Suspendre
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Pièce d Identité</span>
              <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                <div><span className="text-slate-400">Type :</span> {selectedExpert.document.identity_document_type}</div>
                <div><span className="text-slate-400">Numéro :</span> {selectedExpert.document.identity_document_number}</div>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Registre de Commerce (RC)</span>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div><span className="text-slate-400">Raison :</span> {selectedExpert.document.business_name}</div>
                <div><span className="text-slate-400">Numéro RC :</span> {selectedExpert.document.business_registration_number}</div>
              </div>
              <div className="text-xs">
                <span className="text-slate-400">Activité déclarée :</span>
                <p className="text-white bg-slate-900/60 p-2 rounded border border-slate-800 mt-1 font-medium">
                  {selectedExpert.document.business_activity}
                </p>
              </div>

              <div className="text-xs p-3 rounded bg-slate-900/80 border border-slate-700/60">
                <span className="font-semibold text-slate-300">Contrôle de cohérence :</span>
                <p className="text-emerald-400 mt-1 font-medium">Cohérence validée avec l inspection automobile.</p>
              </div>
            </div>

            {selectedExpert.document.rejection_reason && (
              <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-lg text-xs">
                <span className="font-bold text-rose-400">Motif du refus enregistré :</span>
                <p className="text-rose-200 mt-1">{selectedExpert.document.rejection_reason}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Rejeter le dossier professionnel</h3>
            <p className="text-xs text-slate-400">
              Un motif clair d au moins 5 caractères est obligatoire.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex : Le registre de commerce fourni ne correspond pas à l'activité automobile..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={rejectionReason.trim().length < 5}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}