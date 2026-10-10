import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { StatusBadge } from '../components/ui/Cards';
import { ListingSourceSection } from '../components/ListingSourceSection';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { formatPrice } from '../theme/format';
import { useLanguage } from '../i18n';
import {
  ItemStatus,
  SeverityLevel,
  calculateInspectionScore,
  validateRequiredItemsCompleted,
  InspectionItem,
  AnswerWithItem,
} from '@echrimheni/shared';
import {
  loadDynamicChecklist,
  getMyExpertBookings,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  canTransitionLocal,
  openDispute,
  EXPERT_DISPUTABLE_STATUSES,
  startInspection,
  saveInspectionAnswers,
  finalizeAndPublishReport,
  uploadInspectionMedia,
  getSessionMedia,
  getAdminNotifications,
  markNotificationAsRead,
  getExpertReviews,
  classifySupabaseError,
} from '@echrimheni/database';
import * as ImagePicker from 'expo-image-picker';
import { ConversationView } from '../components/ConversationView';
import { ProfileScreen } from './ProfileScreen';
import { formatUserErrorMessage } from '../utils/errors';

function errText(err: unknown, t?: (k: string) => string): string {
  if (t) return formatUserErrorMessage(t, err);
  const kind = classifySupabaseError(err);
  switch (kind) {
    case 'NETWORK': return 'Erreur réseau : vérifiez votre connexion puis réessayez.';
    case 'AUTH': return 'Session expirée. Reconnectez-vous.';
    case 'FORBIDDEN': return 'Action non autorisée.';
    case 'NOT_FOUND': return 'Élément introuvable.';
    case 'VALIDATION': return 'Vérifiez les champs saisis.';
    case 'BUSINESS': return 'Opération impossible selon les règles de la plateforme.';
    default: return 'Une erreur est survenue. Réessayez dans un instant.';
  }
}

export function ExpertScreen({
  expertId,
  initialVerificationStatus,
}: {
  expertId: string;
  initialVerificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}) {
  const { t, lang } = useLanguage();
  const [verificationStatus] = useState(initialVerificationStatus);
  const [missions, setMissions] = useState<any[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionsError, setMissionsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [session, setSession] = useState<any | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { status: ItemStatus; severity?: SeverityLevel; comment: string }>>({});
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [notifsError, setNotifsError] = useState<string | null>(null);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  const loadMissions = useCallback(async () => {
    setMissionsLoading(true);
    setMissionsError(null);
    try {
      // expert_id dérivé de la session par le service (filtrage serveur/RLS).
      setMissions((await getMyExpertBookings()) || []);
    } catch (err: unknown) {
      setMissionsError(errText(err));
    } finally {
      setMissionsLoading(false);
    }
  }, []);

  const loadNotifs = useCallback(async () => {
    setNotifsError(null);
    try {
      // Notifications serveur de la session (RLS : soi uniquement).
      setNotifs((await getAdminNotifications()) || []);
    } catch (err: unknown) {
      setNotifsError(errText(err));
    }
  }, []);

  useEffect(() => {
    if (verificationStatus === 'APPROVED') {
      void loadMissions();
      void loadNotifs();
      void (async () => {
        try {
          setMyReviews((await getExpertReviews(expertId)) || []);
        } catch {
          setMyReviews([]);
        }
      })();
    } else {
      setMissionsLoading(false);
    }
  }, [verificationStatus, loadMissions, loadNotifs, expertId]);

  const selected = missions.find(m => m.id === selectedId) || null;

  const handleAccept = async () => {
    if (!selected) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await acceptBooking(selected.id);
      await loadMissions();
    } catch (err: unknown) {
      setActionError(errText(err));
    } finally {
      setActionBusy(false);
    }
  };

  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeBox, setShowDisputeBox] = useState(false);

  const handleReject = async () => {
    if (!selected) return;
    setActionBusy(true);
    setActionError(null);
    try {
      // BOOKING_REQUESTED → REJECTED, motif optionnel via p_notes.
      await rejectBooking(selected.id, rejectReason || null);
      setRejectReason('');
      setShowRejectBox(false);
      await loadMissions();
    } catch (err: unknown) {
      setActionError(errText(err));
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    setActionBusy(true);
    setActionError(null);
    try {
      // Seule la RPC tranche (statut éligible + participation).
      await cancelBooking(selected.id);
      await loadMissions();
    } catch (err: unknown) {
      setActionError(errText(err));
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!selected) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await openDispute(selected.id, disputeReason || null);
      setDisputeReason('');
      setShowDisputeBox(false);
      await loadMissions();
    } catch (err: unknown) {
      setActionError(errText(err));
    } finally {
      setActionBusy(false);
    }
  };

  const handleStart = async () => {
    if (!selected) return;
    setActionBusy(true);
    setActionError(null);
    try {
      // expertId de session : le service refuse toute divergence.
      const s = await startInspection(selected.id);
      setSession(s);
      await loadMedia(s.id);
      await loadChecklist(selected.service_id);
      await loadMissions();
    } catch (err: unknown) {
      setActionError(errText(err));
    } finally {
      setActionBusy(false);
    }
  };

  const loadChecklist = async (serviceId: string) => {
    setChecklistLoading(true);
    setActionError(null);
    try {
      // Template déterminé par le service réel du booking, aucun fallback.
      const data = await loadDynamicChecklist(serviceId);
      if (!data?.sections || data.sections.length === 0) {
        throw new Error('Checklist vide : aucun modèle actif pour ce service.');
      }
      setSections(data.sections);
      const initial: Record<string, any> = {};
      data.sections.forEach(sec => {
        sec.items.forEach((it: any) => {
          initial[it.id] = { status: 'BON', comment: '' };
        });
      });
      setAnswers(initial);
    } catch (err: unknown) {
      setSections([]);
      setActionError(errText(err));
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleSetStatus = (itemId: string, status: ItemStatus) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || { comment: '' }), status },
    }));
  };

  const handleSetComment = (itemId: string, comment: string) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || { status: 'BON' }), comment },
    }));
  };

  const allItems: InspectionItem[] = sections.flatMap(s => s.items);

  const handleSave = async () => {
    if (!session) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const rows = Object.entries(answers).map(([item_id, val]) => ({
        item_id,
        status: val.status,
        severity: val.severity,
        comment: val.comment,
      }));
      await saveInspectionAnswers(session.id, rows);
    } catch (err: unknown) {
      setActionError(errText(err));
    } finally {
      setActionBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (!session || !selected) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const formatted = Object.entries(answers).map(([item_id, val]) => ({
        item_id,
        status: val.status,
      }));
      const check = validateRequiredItemsCompleted(allItems, formatted);
      if (!check.isValid) {
        setActionError(`[VALIDATION] ${check.missingItems.length} point(s) obligatoire(s) non vérifié(s).`);
        return;
      }
      const answersWithItems: AnswerWithItem[] = allItems.map(item => ({
        item,
        status: answers[item.id]?.status || 'BON',
        severity: answers[item.id]?.severity,
        comment: answers[item.id]?.comment,
      }));
      const result = calculateInspectionScore(answersWithItems);
      await finalizeAndPublishReport({
        bookingId: selected.id,
        sessionId: session.id,
        expertId,
        summary: 'Inspection réalisée sur site conformément à la grille.',
        answersWithItems,
      });
      setFinalScore(result.score);
      await loadMissions();
    } catch (err: unknown) {
      setActionError(errText(err));
    } finally {
      setActionBusy(false);
    }
  };

  const loadMedia = async (sessionId: string) => {
    setMediaBusy(true);
    try {
      setMedia((await getSessionMedia(sessionId)) || []);
    } catch (err: unknown) {
      setActionError(errText(err));
    } finally {
      setMediaBusy(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!session) return;
    setActionError(null);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (picked.canceled || !picked.assets || picked.assets.length === 0) return;
      const asset = picked.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const res = await fetch(asset.uri);
      const buffer = await res.arrayBuffer();
      setMediaBusy(true);
      await uploadInspectionMedia({
        sessionId: session.id,
        fileName: asset.fileName || 'inspection.jpg',
        mimeType,
        data: buffer,
      });
      await loadMedia(session.id);
    } catch (err: unknown) {
      setActionError(errText(err));
    } finally {
      setMediaBusy(false);
    }
  };

  const handleNotifRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    } catch (err: unknown) {
      setNotifsError(errText(err));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.rowBetween}>
          <Text style={styles.headerBadge}>{t('expert.appBadge')}</Text>
          <StatusBadge
            status={
              verificationStatus === 'APPROVED'
                ? 'confirmed'
                : verificationStatus === 'REJECTED' || verificationStatus === 'SUSPENDED'
                  ? 'failed'
                  : 'pending'
            }
          />
        </View>
        <Text style={styles.headerTitle}>{t('expert.missions')}</Text>
        <TouchableOpacity onPress={() => setShowProfile(v => !v)} style={{ marginTop: 8, minHeight: 40, justifyContent: 'center' }}>
          <Text style={styles.backLink}>{showProfile ? t('expert.backToMissionsPlain') : t('expert.myProfileLink')}</Text>
        </TouchableOpacity>
      </View>

      {showProfile ? (
        <ProfileScreen />
      ) : verificationStatus !== 'APPROVED' ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>
            {verificationStatus === 'PENDING'
              ? t('expert.pendingTitle')
              : verificationStatus === 'REJECTED'
                ? t('expert.rejectedTitle')
                : t('expert.suspendedTitle')}
          </Text>
          <Text style={styles.warningText}>
            {verificationStatus === 'PENDING'
              ? t('expert.pendingMsg')
              : verificationStatus === 'REJECTED'
                ? t('expert.rejectedMsg')
                : t('expert.suspendedMsg')}
          </Text>
        </View>
      ) : (
        <>
          {actionError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{actionError}</Text>
            </View>
          )}

          {!selected ? (
            <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('expert.myMissions')}</Text>              {missionsLoading ? (
                <ActivityIndicator color="#38bdf8" />
              ) : missionsError ? (
                <Text style={styles.errorText}>{missionsError}</Text>
              ) : missions.length === 0 ? (
                <Text style={styles.emptyText}>{t('expert.noMission')}</Text>
              ) : (
                missions.map(m => (
                  <TouchableOpacity key={m.id} style={styles.missionBox} onPress={() => { setSelectedId(m.id); setSession(null); setSections([]); setFinalScore(null); setActionError(null); setShowDisputeBox(false); setDisputeReason(''); }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.missionTitle}>{m.listings?.title || t('expert.missionFallback')}</Text>
                      <StatusBadge status={m.status} />
                    </View>
                    <Text style={styles.missionMeta}>
                      {m.services?.name || ''} • {m.listings?.location_wilaya || ''} • {formatPrice(m.price_total, lang)}
                    </Text>
                    {m.scheduled_at ? (
                      <Text style={styles.missionMeta}>
                        {t('expert.wantedDate')} : {new Date(m.scheduled_at).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} • {t('expert.wantedTime')} :{' '}
                        {String(new Date(m.scheduled_at).getHours()).padStart(2, '0')}:{String(new Date(m.scheduled_at).getMinutes()).padStart(2, '0')}
                      </Text>
                    ) : (
                      <Text style={styles.missionMeta}>{t('expert.dateNA')}</Text>
                    )}
                    {m.reports && m.reports.length > 0 && (
                      <Text style={styles.scoreText}>{t('expert.reportPublished', { score: m.reports[0].score, suffix: m.reports[0].is_published ? t('expert.reportPublishedSuffix') : '' })}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('expert.notifications')}</Text>
              {notifsError ? (
                <Text style={styles.errorText}>{notifsError}</Text>
              ) : notifs.length === 0 ? (
                <Text style={styles.emptyText}>{t('expert.noNotif')}</Text>
              ) : (
                notifs.slice(0, 10).map(n => (
                  <TouchableOpacity key={n.id} style={styles.missionBox} onPress={() => void handleNotifRead(n.id)}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.missionTitle}>{n.title}</Text>
                      {!n.read_at && <Text style={styles.statusTag}>{t('expert.newLabel')}</Text>}
                    </View>
                    <Text style={styles.missionMeta}>{n.message}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('expert.myReviews')}</Text>
              {myReviews.length === 0 ? (
                <Text style={styles.emptyText}>{t('expert.noReviews')}</Text>
              ) : (
                myReviews.map(r => (
                  <View key={r.id} style={styles.missionBox}>
                    <Text style={styles.missionTitle}>{t('expert.ratingLine', { rating: r.rating })}</Text>
                    {r.comment ? <Text style={styles.missionMeta}>{r.comment}</Text> : null}
                  </View>
                ))
              )}
            </View>
            </>
          ) : (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => { setSelectedId(null); setSession(null); setSections([]); setFinalScore(null); }} accessibilityRole="button" accessibilityLabel={t('expert.backToMissionsPlain')} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={styles.backLink}>{t('expert.backToMissionsPlain')}</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>{selected.listings?.title || t('expert.missionFallback')}</Text>
              <StatusBadge status={selected.status} />
              <ListingSourceSection
                source={(selected.listings as { source_platform?: string } | undefined)?.source_platform}
                url={(selected.listings as { listing_url?: string } | undefined)?.listing_url}
              />
              <Text style={styles.missionMeta}>{selected.services?.name || ''} • {selected.price_total} DZD</Text>
              {selected.scheduled_at ? (
                <Text style={styles.missionMeta}>
                  {t('expert.wantedDate')} : {new Date(selected.scheduled_at).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} • {t('expert.wantedTime')} :{' '}
                  {String(new Date(selected.scheduled_at).getHours()).padStart(2, '0')}:{String(new Date(selected.scheduled_at).getMinutes()).padStart(2, '0')}
                </Text>
              ) : (
                <Text style={styles.missionMeta}>{t('expert.dateNA')}</Text>
              )}
              <Text style={[styles.sectionTitle, { marginTop: 12, fontSize: 13 }]}>{t('expert.messages')}</Text>
              <ConversationView bookingId={selected.id} />

              {selected.status === 'BOOKING_REQUESTED' && (
                <TouchableOpacity style={styles.primaryButton} onPress={() => void handleAccept()} disabled={actionBusy}>
                  {actionBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('expert.accept')}</Text>}
                </TouchableOpacity>
              )}

              {selected.status === 'BOOKING_REQUESTED' && !showRejectBox && (
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowRejectBox(true)} disabled={actionBusy}>
                  <Text style={styles.secondaryButtonText}>{t('expert.refuseMission')}</Text>
                </TouchableOpacity>
              )}

              {selected.status === 'BOOKING_REQUESTED' && showRejectBox && (
                <View style={styles.itemBox}>
                  <Text style={styles.itemName}>{t('expert.refuseReasonTitle')}</Text>
                  <TextInput
                    style={[styles.commentInput, { marginTop: 8 }]}
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    placeholder={t('expert.refuseReasonPh')}
                    placeholderTextColor="#64748b"
                  />
                  <View style={styles.rowBetween}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => { setShowRejectBox(false); setRejectReason(''); }}>
                      <Text style={styles.secondaryButtonText}>{t('expert.keep')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryButton, { borderColor: '#ef4444' }]} onPress={() => void handleReject()} disabled={actionBusy}>
                      {actionBusy ? <ActivityIndicator color="#f87171" /> : <Text style={[styles.secondaryButtonText, { color: '#f87171' }]}>{t('expert.refuse')}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {canTransitionLocal(selected.status, 'CANCELLED') && selected.status !== 'BOOKING_REQUESTED' && (
                <TouchableOpacity style={[styles.secondaryButton, { borderColor: '#ef4444' }]} onPress={() => void handleCancel()} disabled={actionBusy}>
                  {actionBusy ? <ActivityIndicator color="#f87171" /> : <Text style={[styles.secondaryButtonText, { color: '#f87171' }]}>{t('expert.cancel')}</Text>}
                </TouchableOpacity>
              )}

              {(EXPERT_DISPUTABLE_STATUSES as readonly string[]).includes(selected.status) && !showDisputeBox && (
                <TouchableOpacity style={[styles.secondaryButton, { borderColor: '#f59e0b' }]} onPress={() => setShowDisputeBox(true)} disabled={actionBusy}>
                  <Text style={[styles.secondaryButtonText, { color: '#f59e0b' }]}>{t('expert.dispute')}</Text>
                </TouchableOpacity>
              )}

              {showDisputeBox && (
                <View style={styles.itemBox}>
                  <Text style={styles.itemName}>{t('expert.disputeReasonTitle')}</Text>
                  <TextInput
                    style={[styles.commentInput, { marginTop: 8 }]}
                    value={disputeReason}
                    onChangeText={setDisputeReason}
                    placeholder={t('expert.disputeReasonPh')}
                    placeholderTextColor="#64748b"
                  />
                  <View style={styles.rowBetween}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => { setShowDisputeBox(false); setDisputeReason(''); }}>
                      <Text style={styles.secondaryButtonText}>{t('expert.keep')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryButton, { borderColor: '#f59e0b' }]} onPress={() => void handleOpenDispute()} disabled={actionBusy}>
                      {actionBusy ? <ActivityIndicator color="#f59e0b" /> : <Text style={[styles.secondaryButtonText, { color: '#f59e0b' }]}>{t('expert.disputeConfirm')}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {selected.status === 'SCHEDULED' && !session && (
                <TouchableOpacity style={styles.primaryButton} onPress={() => void handleStart()} disabled={actionBusy}>
                  {actionBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('expert.startInspection')}</Text>}
                </TouchableOpacity>
              )}

              {(selected.status === 'IN_PROGRESS' || session) && sections.length === 0 && !checklistLoading && (
                <TouchableOpacity style={styles.primaryButton} onPress={() => void loadChecklist(selected.service_id)} disabled={actionBusy}>
                  <Text style={styles.buttonText}>{t('expert.loadChecklist')}</Text>
                </TouchableOpacity>
              )}

              {checklistLoading && <ActivityIndicator color="#38bdf8" />}

              {sections.length > 0 && (
                <>
                  <View style={[styles.rowBetween, { marginBottom: 12, alignItems: 'center' }]}>
                    <Text style={{ fontSize: 13, color: '#5B6B82', fontWeight: '600' }}>
                      {Object.keys(answers).length}/{allItems.length} vérifiés
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const allCollapsed = sections.every(s => collapsedSections[s.id]);
                        const next: Record<string, boolean> = {};
                        sections.forEach(s => { next[s.id] = !allCollapsed; });
                        setCollapsedSections(next);
                      }}
                      style={{ paddingVertical: 4, paddingHorizontal: 8 }}
                      accessibilityRole="button"
                    >
                      <Text style={{ fontSize: 12, color: '#1246A8', fontWeight: 'bold' }}>
                        {sections.every(s => collapsedSections[s.id]) ? 'Tout déplier' : 'Tout replier'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {sections.map(section => {
                    const isCollapsed = Boolean(collapsedSections[section.id]);
                    const completedInSection = section.items.filter((it: any) => answers[it.id]?.status).length;
                    return (
                    <View key={section.id} style={styles.sectionBlock}>
                      <TouchableOpacity
                        onPress={() => setCollapsedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                        style={[styles.rowBetween, { paddingVertical: 6, minHeight: 44, alignItems: 'center' }]}
                        accessibilityRole="button"
                        accessibilityLabel={`${section.title}, ${completedInSection} sur ${section.items.length}`}
                      >
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.sectionHeading}>{section.title}</Text>
                          <Text style={{ fontSize: 12, color: completedInSection === section.items.length ? '#16A34A' : '#5B6B82', fontWeight: '600' }}>
                            ({completedInSection}/{section.items.length})
                          </Text>
                        </View>
                        {isCollapsed ? (
                          <ChevronDown size={18} color="#1246A8" />
                        ) : (
                          <ChevronUp size={18} color="#1246A8" />
                        )}
                      </TouchableOpacity>
                      {!isCollapsed && section.items.map((item: any) => {
                        const current = answers[item.id] || { status: 'BON', comment: '' };
                        return (
                          <View key={item.id} style={styles.itemBox}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              {item.is_required && <Text style={styles.requiredTag}>{t('expert.required')}</Text>}
                            </View>
                            <View style={styles.statusRow}>
                              {(['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'] as ItemStatus[]).map(st => (
                                <TouchableOpacity
                                  key={st}
                                  onPress={() => handleSetStatus(item.id, st)}
                                  style={[styles.statusBtn, current.status === st && styles.statusBtnActive]}
                                >
                                  <Text style={[styles.statusBtnText, current.status === st && styles.statusBtnTextActive]}>{st}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <TextInput
                              style={styles.commentInput}
                              value={current.comment}
                              onChangeText={txt => handleSetComment(item.id, txt)}
                              placeholder={t('expert.commentPh')}
                              placeholderTextColor="#64748b"
                            />
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => void handleSave()} disabled={actionBusy}>
                    <Text style={styles.secondaryButtonText}>{t('expert.saveAnswers')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={() => void handleFinalize()} disabled={actionBusy}>
                    {actionBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('expert.finalize')}</Text>}
                  </TouchableOpacity>
                </>
              )}

              {finalScore !== null && (
                <Text style={styles.scoreText}>{t('expert.finalScore', { score: finalScore })}</Text>
              )}

              {session && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('expert.photosTitle', { count: media.length })}</Text>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => void handlePickPhoto()} disabled={mediaBusy || actionBusy}>
                    <Text style={styles.secondaryButtonText}>{t('expert.addPhoto')}</Text>
                  </TouchableOpacity>
                  {media.map(m => (
                    <Text key={m.id} style={styles.missionMeta}>
                      • {m.media_type} — {new Date(m.created_at).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR')}
                    </Text>
                  ))}
                </>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA', padding: 20 },
  header: { marginBottom: 20 },
  headerBadge: { color: '#1246A8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#0F1B2D', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E3E8F0', marginBottom: 24 },
  sectionTitle: { color: '#0F1B2D', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verifiedTag: { backgroundColor: '#DCFCE7', color: '#166534', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pendingTag: { backgroundColor: '#FEF3C7', color: '#92400E' },
  rejectedTag: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  warningBox: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#D97706', padding: 16, borderRadius: 16, marginTop: 16 },
  warningTitle: { color: '#92400E', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  warningText: { color: '#5B6B82', fontSize: 12, lineHeight: 18 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#DC2626' },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: 'bold' },
  emptyText: { color: '#8A97AB', fontSize: 12, fontStyle: 'italic' },
  missionBox: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E3E8F0' },
  missionTitle: { color: '#0F1B2D', fontSize: 13, fontWeight: 'bold' },
  missionMeta: { color: '#5B6B82', fontSize: 12, marginTop: 4 },
  statusTag: { color: '#1246A8', fontSize: 11, fontWeight: 'bold' },
  scoreText: { color: '#166534', fontSize: 13, fontWeight: 'bold', marginTop: 8 },
  backLink: { color: '#1246A8', fontSize: 12, marginBottom: 8 },
  primaryButton: { backgroundColor: '#EA580C', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16, minHeight: 48, justifyContent: 'center' },
  buttonText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, alignItems: 'center', marginTop: 12, borderWidth: 1.5, borderColor: '#1246A8', minHeight: 48, justifyContent: 'center' },
  secondaryButtonText: { color: '#1246A8', fontSize: 12, fontWeight: '600' },
  sectionBlock: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E3E8F0', paddingBottom: 12 },
  sectionHeading: { color: '#1246A8', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  itemBox: { backgroundColor: '#F4F6FA', padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E3E8F0' },
  itemName: { color: '#0F1B2D', fontSize: 12, fontWeight: '600' },
  requiredTag: { color: '#C2410C', fontSize: 9, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 6 },
  statusBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6, backgroundColor: '#EAEEF5', minHeight: 40, justifyContent: 'center' },
  statusBtnActive: { backgroundColor: '#1246A8' },
  statusBtnText: { color: '#5B6B82', fontSize: 10, fontWeight: 'bold' },
  statusBtnTextActive: { color: '#ffffff' },
  commentInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10, color: '#0F1B2D', fontSize: 11, borderWidth: 1, borderColor: '#E3E8F0' },
});

