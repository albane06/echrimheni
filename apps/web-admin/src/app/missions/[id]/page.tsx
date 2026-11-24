'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAllMissions, transitionBooking, canTransitionLocal, logDisputeResolution, getBookingRefund, markRefundDue } from '@echrimheni/database';
import { Card, CardTitle, Button, LoadingState, ErrorState } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/Modal';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { Timeline } from '@/components/ui/Timeline';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, FileText, CreditCard, User, UserCheck, MapPin, Home, Building2, Layers, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface MissionDetail {
  id: string;
  title: string;
  buyer_name: string;
  expert_name: string;
  status: string;
  score: number | null;
  price_total: number;
  commission_platform: number;
  expert_payout: number;
  created_at: string;
  scheduled_at: string | null;
  location: string;
  wilaya: string;
  notes: string | null;
  category_code?: string | null;
  category_name?: string | null;
  service_name?: string | null;
  real_estate?: {
    domain: 'TERRAIN' | 'IMMOBILIER';
    property_type: string;
    surface_m2: number;
    cadastral_ref?: string | null;
    property_paper_declared?: string | null;
    gps_lat?: number | null;
    gps_lng?: number | null;
    gps_address_note?: string | null;
    topography?: string | null;
    road_access?: string | null;
    access_road_type?: string | null;
    utilities?: {
      water?: boolean;
      electricity?: boolean;
      gas?: boolean;
      sewage?: boolean;
      sanitation_type?: string;
    } | null;
    rooms?: number | null;
    rooms_count?: number | null;
    floors?: number | null;
    floor_number?: number | null;
    total_floors?: number | null;
    condition?: string | null;
    building_condition?: string | null;
    construction_year?: number | null;
    parking_spaces?: number | null;
    has_elevator?: boolean | null;
    boundary_fenced?: boolean | null;
    soil_type?: string | null;
    zoning?: string | null;
    notes?: string | null;
  } | null;
}

export default function MissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.id as string;
  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refund, setRefund] = useState<any | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => { loadMission(); }, [missionId]);

  const loadMission = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMissions();
      const found = data.find((m: any) => m.id === missionId);
      if (found) {
        const realEstate = Array.isArray(found.listings?.listing_real_estate)
          ? found.listings.listing_real_estate[0]
          : found.listings?.listing_real_estate || null;
        const categoryCode = found.listings?.categories?.code || (realEstate?.domain ? String(realEstate.domain).toLowerCase() : null);
        const categoryName = found.listings?.categories?.name || (categoryCode === 'terrain' ? 'Terrain & Foncier' : categoryCode === 'immobilier' ? 'Immobilier & Bâti' : 'Automobile');
        const serviceName = found.services?.name || null;

        setMission({
          id: found.id,
          title: found.listings?.title || `${found.listings?.make || ''} ${found.listings?.model || ''}`.trim() || 'Mission sans titre',
          buyer_name: found.buyer?.full_name || 'Acheteur',
          expert_name: found.expert?.profiles?.full_name || 'Expert',
          status: found.status,
          score: found.reports?.[0]?.score ?? null,
          price_total: found.price_total || 0,
          commission_platform: found.commission_platform || 0,
          expert_payout: found.expert_payout || 0,
          created_at: found.created_at,
          scheduled_at: found.scheduled_at,
          location: found.location_address || '',
          wilaya: found.listings?.location_wilaya || '',
          notes: found.notes || null,
          category_code: categoryCode,
          category_name: categoryName,
          service_name: serviceName,
          real_estate: realEstate,
        });
        // P6.5-B — état du marquage « dû » si annulée après paiement.
        if (found.status === 'CANCELLED' && (found.price_total || 0) > 0) {
          try {
            setRefund(await getBookingRefund(found.id));
          } catch {
            setRefund(null);
          }
        } else {
          setRefund(null);
        }
      } else {
        setError('Mission introuvable.');
      }
    } catch (err: any) {
      console.error('[Mission Detail] Erreur :', err.message);
      setError('Impossible de charger la mission.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Chargement de la mission..." />;
  if (error || !mission) return <ErrorState title="Mission introuvable" message={error || ''} onRetry={() => router.push('/missions')} />;

  const handleCancel = async () => {
    if (!mission) return;
    setActionLoading(true);
    setActionError(null);
    try {
      // Seule la RPC tranche (admin bypass partie, machine serveur exigée).
      await transitionBooking(mission.id, 'CANCELLED');
      setShowCancelModal(false);
      await loadMission();
    } catch (err: any) {
      setActionError(err?.message || 'Annulation impossible.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkRefund = async () => {
    if (!mission) return;
    setRefundLoading(true);
    setActionError(null);
    try {
      // RPC admin-only : montant serveur, idempotente, tracée. Jamais d'exécution bancaire.
      await markRefundDue(mission.id);
      setRefund(await getBookingRefund(mission.id));
    } catch (err: any) {
      setActionError(err?.message || 'Marquage impossible.');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleResolve = async (target: 'COMPLETED' | 'CANCELLED') => {    if (!mission) return;
    setActionLoading(true);
    setActionError(null);
    try {
      // Résolution admin : RPC autoritative puis traçage best-effort.
      await transitionBooking(mission.id, target);
      try {
        await logDisputeResolution({ bookingId: mission.id, resolution: target, reason: mission.notes });
      } catch (logErr: any) {
        console.warn('[Mission] Traçage résolution :', logErr?.message || logErr);
      }
      await loadMission();
    } catch (err: any) {
      setActionError(err?.message || 'Résolution impossible.');
    } finally {
      setActionLoading(false);
    }
  };

  const timelineEvents = [
    { id: '1', title: 'Demande créée', description: `par ${mission.buyer_name}`, timestamp: mission.created_at, variant: 'info' as const },
    { id: '2', title: 'Expert assigné', description: mission.expert_name, timestamp: mission.created_at, variant: 'info' as const },
    ...(mission.status !== 'DRAFT' && mission.status !== 'BOOKING_REQUESTED' ? [
      { id: '3', title: 'Paiement confirmé', description: formatCurrency(mission.price_total), timestamp: mission.created_at, variant: 'success' as const },
    ] : []),
    ...(mission.status === 'IN_PROGRESS' || mission.status === 'COMPLETED' ? [
      { id: '4', title: 'Inspection démarrée', timestamp: mission.scheduled_at || mission.created_at, variant: 'info' as const },
    ] : []),
    ...(mission.status === 'COMPLETED' ? [
      { id: '5', title: 'Inspection terminée', description: mission.score !== null ? `Score : ${mission.score}/100` : undefined, timestamp: mission.scheduled_at || mission.created_at, variant: 'success' as const },
      { id: '6', title: 'Rapport publié', timestamp: mission.scheduled_at || mission.created_at, variant: 'success' as const },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/missions')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition">
        <ArrowLeft className="h-4 w-4" /> Retour aux missions
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900">{mission.title}</h2>
            <BookingStatusBadge status={mission.status as any} />
            {mission.category_name && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {mission.category_name}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {mission.location ? `${mission.location} • ` : ''}{mission.wilaya || 'Wilaya non précisée'}
            {mission.service_name && <span className="ml-2 font-medium text-slate-700">| Service : {mission.service_name}</span>}
          </p>
          {actionError && <p className="text-sm text-red-600 mt-2">{actionError}</p>}
        </div>
        <div className="flex items-center gap-3">
          {canTransitionLocal(mission.status, 'CANCELLED') && mission.status !== 'DISPUTED' && (
            <Button variant="danger" size="sm" onClick={() => setShowCancelModal(true)}>
              Annuler la mission
            </Button>
          )}
          {mission.status === 'DISPUTED' && (
            <>
              <Button variant="primary" size="sm" onClick={() => void handleResolve('COMPLETED')} loading={actionLoading}>
                Résoudre — terminer
              </Button>
              <Button variant="danger" size="sm" onClick={() => void handleResolve('CANCELLED')} loading={actionLoading}>
                Résoudre — annuler
              </Button>
            </>
          )}
          {mission.score !== null && (
          <div className="text-center">
            <div className={`text-4xl font-black ${mission.score >= 75 ? 'text-emerald-600' : mission.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {mission.score}<span className="text-lg text-slate-400">/100</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Score d&apos;inspection</p>
          </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3 mb-3"><User className="h-5 w-5 text-blue-600" /><CardTitle>Acheteur</CardTitle></div>
            <p className="text-sm font-medium text-slate-900">{mission.buyer_name}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-3"><UserCheck className="h-5 w-5 text-emerald-600" /><CardTitle>Expert Assigné</CardTitle></div>
            <p className="text-sm font-medium text-slate-900">{mission.expert_name}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-3"><CreditCard className="h-5 w-5 text-purple-600" /><CardTitle>Détail Financier</CardTitle></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold text-slate-900">{formatCurrency(mission.price_total)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Commission (15%)</span><span className="font-medium text-emerald-600">{formatCurrency(mission.commission_platform)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-500">Expert (85%)</span><span className="font-medium text-slate-900">{formatCurrency(mission.expert_payout)}</span></div>
              {mission.status === 'CANCELLED' && mission.price_total > 0 && (
                <div className="border-t border-slate-100 pt-2">
                  <div className="flex justify-between"><span className="text-slate-500">Commission finale</span><span className="font-medium text-slate-900">{formatCurrency(0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Part expert</span><span className="font-medium text-slate-900">Non due</span></div>
                  {refund ? (
                    <p className="text-xs text-amber-700 mt-2">Remboursement dû : {formatCurrency(refund.amount)} (sandbox — traitement manuel, non exécuté).</p>
                  ) : (
                    <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => void handleMarkRefund()} loading={refundLoading}>
                      Marquer remboursement dû
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
          {mission.status === 'DISPUTED' && (
            <Card className="border-amber-200 bg-amber-50">
              <CardTitle className="text-amber-800">Motif du litige</CardTitle>
              <p className="text-sm text-amber-900 mt-2">{mission.notes || 'Motif non renseigné.'}</p>
            </Card>
          )}
          {mission.status === 'COMPLETED' && (
            <Link href={`/reports/${mission.id}`}>
              <Button variant="primary" className="w-full" icon={<FileText className="h-4 w-4" />}>Consulter le rapport</Button>
            </Link>
          )}
        </div>
        <div className="lg:col-span-2 space-y-6">
          {mission.real_estate && (
            <Card>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {mission.real_estate.domain === 'TERRAIN' ? (
                    <MapPin className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Home className="h-5 w-5 text-blue-600" />
                  )}
                  <CardTitle>Spécificités du bien — {mission.real_estate.domain === 'TERRAIN' ? 'Terrain & Foncier' : 'Immobilier & Bâti'}</CardTitle>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                  {mission.real_estate.property_type}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Surface déclarée</span>
                  <span className="font-semibold text-slate-900 text-base">{mission.real_estate.surface_m2} m²</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Titre / Papiers déclarés</span>
                  <span className="font-medium text-slate-900">{mission.real_estate.property_paper_declared || 'Non déclaré'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Référence cadastrale</span>
                  <span className="font-medium text-slate-900">{mission.real_estate.cadastral_ref || 'Non renseignée'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Accès routier</span>
                  <span className="font-medium text-slate-900">{mission.real_estate.road_access || mission.real_estate.access_road_type || 'Non renseigné'}</span>
                </div>
                {mission.real_estate.topography && (
                  <div>
                    <span className="text-xs text-slate-400 block">Topographie</span>
                    <span className="font-medium text-slate-900">{mission.real_estate.topography}</span>
                  </div>
                )}
                {mission.real_estate.gps_lat != null && mission.real_estate.gps_lng != null && (
                  <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-red-500" /> Coordonnées GPS certifiées
                      </span>
                      <a
                        href={`https://maps.google.com/?q=${mission.real_estate.gps_lat},${mission.real_estate.gps_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        Voir sur la carte <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="font-mono text-xs text-slate-800 mt-1">
                      {mission.real_estate.gps_lat}, {mission.real_estate.gps_lng}
                    </p>
                    {mission.real_estate.gps_address_note && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        Note : {mission.real_estate.gps_address_note}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Viabilisation & Réseaux */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                  Réseaux & Viabilisation
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className={`flex items-center gap-1.5 p-2 rounded ${mission.real_estate.utilities?.electricity ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
                    {mission.real_estate.utilities?.electricity ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-400" />}
                    <span>Électricité</span>
                  </div>
                  <div className={`flex items-center gap-1.5 p-2 rounded ${mission.real_estate.utilities?.water ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
                    {mission.real_estate.utilities?.water ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-400" />}
                    <span>Eau potable</span>
                  </div>
                  <div className={`flex items-center gap-1.5 p-2 rounded ${mission.real_estate.utilities?.gas ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
                    {mission.real_estate.utilities?.gas ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-400" />}
                    <span>Gaz naturel</span>
                  </div>
                  <div className={`flex items-center gap-1.5 p-2 rounded ${mission.real_estate.utilities?.sewage ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
                    {mission.real_estate.utilities?.sewage ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-400" />}
                    <span>Assainissement</span>
                  </div>
                </div>
              </div>

              {/* Spécificités Bâti si Immobilier */}
              {mission.real_estate.domain === 'IMMOBILIER' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                    Caractéristiques du Bâti
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Pièces</span>
                      <span className="font-medium text-slate-800">{mission.real_estate.rooms_count ?? mission.real_estate.rooms ?? 'Non précisé'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Étages</span>
                      <span className="font-medium text-slate-800">{mission.real_estate.floors ?? 'Non précisé'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Année construction</span>
                      <span className="font-medium text-slate-800">{mission.real_estate.construction_year ?? 'Non précisée'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">État général</span>
                      <span className="font-medium text-slate-800">{mission.real_estate.building_condition ?? mission.real_estate.condition ?? 'Non précisé'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Ascenseur</span>
                      <span className="font-medium text-slate-800">{mission.real_estate.has_elevator ? 'Oui' : 'Non'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Parking</span>
                      <span className="font-medium text-slate-800">{mission.real_estate.parking_spaces != null ? `${mission.real_estate.parking_spaces} place(s)` : 'Non précisé'}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card>
            <CardTitle>Chronologie de la mission</CardTitle>
            <div className="mt-6"><Timeline events={timelineEvents} /></div>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Annuler cette mission ?"
        description={`La réservation passera à CANCELLED. Cette action est définitive.`}
        confirmLabel="Annuler la mission"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
