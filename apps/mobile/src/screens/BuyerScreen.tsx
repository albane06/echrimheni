import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { LEGAL_DISCLAIMER } from '@echrimheni/shared';
import {
  getCategories,
  getAutomobileServices,
  getActiveServices,
  getApprovedExperts,
  createVehicleListing,
  createBookingRequest,
  cancelBooking,
  canTransitionLocal,
  openDispute,
  BUYER_DISPUTABLE_STATUSES,
  transitionBooking,
  resolveFinancialState,
  getExpiryInfo,
  getBuyerReport,
  getMyListings,
  getMyBookings,
  processPayment,
  uploadListingPhoto,
  removeListingPhoto,
  getListingPhotoSignedUrl,
  submitReview,
  getBookingReview,
  getReportPdfSignedUrl,
  getAdminNotifications,
  markNotificationAsRead,
  classifySupabaseError,
} from '@echrimheni/database';
import { useBuyerAuth } from '../auth/BuyerAuthContext';
import { useLanguage } from '../i18n';
import { ConversationView } from '../components/ConversationView';
import { ProfileScreen } from './ProfileScreen';
import * as ImagePicker from 'expo-image-picker';

type Tab = 'catalogue' | 'listings' | 'bookings' | 'notifs' | 'profil';

type TranslateFn = (path: string, vars?: Record<string, string | number>) => string;

function errorLabel(t: TranslateFn, kind: string, message?: string): string {
  switch (kind) {
    case 'AUTH':
      return t('errors.session');
    case 'FORBIDDEN':
      return t('errors.unauthorized');
    case 'NOT_FOUND':
      return t('errors.notFound');
    case 'VALIDATION':
      return t('errors.validation');
    case 'BUSINESS':
      return t('errors.business');
    case 'NETWORK':
      return t('errors.network');
    default:
      if (message && !message.includes('SupabaseError') && !message.includes('PGRST') && !message.includes('violates') && !message.includes('database')) {
        return message;
      }
      return t('errors.generic');
  }
}

export function BuyerScreen({ initialTab = 'catalogue' }: { initialTab?: Tab } = {}) {
  const { t, lang } = useLanguage();
  const { sessionEmail } = useBuyerAuth();
  const [tab, setTab] = useState<Tab>(initialTab);

  const [services, setServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);

  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  const [experts, setExperts] = useState<any[]>([]);
  const [expertsError, setExpertsError] = useState<string | null>(null);
  const [expertsLoading, setExpertsLoading] = useState(false);
  // P6.4-B — recherche/filtres/tri experts (serveur, jamais de statut client).
  const [expertSearch, setExpertSearch] = useState('');
  const [expertWilaya, setExpertWilaya] = useState('');
  const [expertSpecialty, setExpertSpecialty] = useState<string | null>(null);
  const [expertSort, setExpertSort] = useState<'rating' | 'price' | null>(null);

  const [reports, setReports] = useState<Record<string, any | null>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string[]>>({});
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, any | null>>({});
  const [ratingInput, setRatingInput] = useState<Record<string, number>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  // Listing form
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [bookingBusy, setBookingBusy] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<Record<string, string>>({});
  const [showDisputeBox, setShowDisputeBox] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  // P6.3 — choix explicite du service + date souhaitée, par annonce.
  const [servicePick, setServicePick] = useState<Record<string, string>>({});
  const [schedDate, setSchedDate] = useState<Record<string, string>>({});
  const [schedTime, setSchedTime] = useState<Record<string, string>>({});
  // P6.3 — notifications du buyer connecté (système existant réutilisé).
  const [notifs, setNotifs] = useState<any[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [notifsError, setNotifsError] = useState<string | null>(null);

  const fail = (err: unknown, set: (m: string | null) => void) => {
    const message = err instanceof Error ? err.message : t('buyer.unknownError');
    set(errorLabel(t, classifySupabaseError(err), message));
  };

  const loadCatalogue = useCallback(async () => {
    setCatalogueLoading(true);
    setCatalogueError(null);
    try {
      const [cats, svcs, all] = await Promise.all([getCategories(), getAutomobileServices(), getActiveServices()]);
      setCategories(cats || []);
      setServices(svcs || []);
      setAllServices(all || []);
      if ((svcs || []).length > 0 && !categoryId) {
        setCategoryId((svcs[0] as any).category_id || null);
      }
    } catch (err: unknown) {
      fail(err, setCatalogueError);
    } finally {
      setCatalogueLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    setListingsError(null);
    try {
      setListings(await getMyListings());
    } catch (err: unknown) {
      fail(err, setListingsError);
    } finally {
      setListingsLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      setBookings(await getMyBookings());
    } catch (err: unknown) {
      fail(err, setBookingsError);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const loadExperts = useCallback(async (filters?: { search?: string; wilaya?: string; specialty?: string | null; sort?: 'rating' | 'price' | null }) => {
    setExpertsLoading(true);
    setExpertsError(null);
    try {
      // Filtres appliqués côté service (requête paramétrée) ; APPROVED imposé serveur.
      setExperts((await getApprovedExperts({
        search: filters?.search,
        wilaya: filters?.wilaya,
        specialty: filters?.specialty || undefined,
        sort: filters?.sort || undefined,
      })) || []);
    } catch (err: unknown) {
      fail(err, setExpertsError);
    } finally {
      setExpertsLoading(false);
    }
  }, []);

  const applyExpertFilters = () => {
    void loadExperts({ search: expertSearch, wilaya: expertWilaya, specialty: expertSpecialty, sort: expertSort });
  };

  const resetExpertFilters = () => {
    setExpertSearch('');
    setExpertWilaya('');
    setExpertSpecialty(null);
    setExpertSort(null);
    void loadExperts({});
  };

  const loadNotifs = useCallback(async () => {
    setNotifsLoading(true);
    setNotifsError(null);
    try {
      // Notifications strictement celles du buyer connecté (RLS : user_id = session).
      setNotifs((await getAdminNotifications()) || []);
    } catch (err: unknown) {
      fail(err, setNotifsError);
    } finally {
      setNotifsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalogue();
    void loadListings();
    void loadBookings();
    void loadExperts();
    void loadNotifs();
  }, [loadCatalogue, loadListings, loadBookings, loadExperts, loadNotifs]);

  const handleCreateListing = async () => {
    setFormError(null);
    const yearNum = parseInt(year, 10);
    if (!categoryId || !title.trim() || !make.trim() || !model.trim() || !yearNum || !wilaya.trim() || !commune.trim()) {
      setFormError(t('buyer.formRequired'));
      return;
    }
    setCreating(true);
    try {
      // buyer_id dérivé de la session par le service (jamais fourni par l'écran).
      await createVehicleListing({
        categoryId,
        title: title.trim(),
        make: make.trim(),
        model: model.trim(),
        year: yearNum,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        askingPrice: askingPrice ? parseInt(askingPrice, 10) : undefined,
        locationWilaya: wilaya.trim(),
        locationCommune: commune.trim(),
      });
      setTitle('');
      setMake('');
      setModel('');
      setYear('');
      setMileage('');
      setAskingPrice('');
      await loadListings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.createError');
      setFormError(errorLabel(t, classifySupabaseError(err), message));
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBooking = async (listingId: string) => {
    setActionError(null);
    const serviceId = servicePick[listingId];
    if (!serviceId) {
      setActionError(t('buyer.chooseService'));
      return;
    }
    const datePart = (schedDate[listingId] || '').trim();
    const timePart = (schedTime[listingId] || '').trim() || '09:00';
    if (!datePart) {
      setActionError(t('buyer.dateRequiredBooking'));
      return;
    }
    setBookingBusy(listingId + serviceId);
    try {
      // expertId = sélection d'un expert réellement APPROVED, ou mission non assignée.
      // Service explicite (catégorie vérifiée serveur), prix = base_price serveur,
      // date souhaitée ISO future. Le serveur reste l'autorité.
      await createBookingRequest({
        listingId,
        expertId: selectedExpertId || undefined,
        serviceId,
        locationAddress: `${wilaya}, ${commune}`,
        scheduledAt: `${datePart}T${timePart}:00`,
      });
      await loadBookings();
      setTab('bookings');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.bookingError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    } finally {
      setBookingBusy(null);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    setActionError(null);
    setPayingId(bookingId);
    try {
      // Seul l'acheteur accepte le rapport (règle serveur P6.5-B).
      await transitionBooking(bookingId, 'COMPLETED');
      await loadBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.closeError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    } finally {
      setPayingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {    Alert.alert(
      t('buyer.cancelTitle'),
      t('buyer.cancelMsg'),
      [
        { text: t('buyer.keep'), style: 'cancel' },
        {
          text: t('buyer.cancelConfirm'),
          style: 'destructive',
          onPress: () => void (async () => {
            setActionError(null);
            setCancellingId(bookingId);
            try {
              // Seule la RPC tranche (statut éligible + participation).
              await cancelBooking(bookingId);
              await loadBookings();
              await loadNotifs();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : t('buyer.cancelError');
              setActionError(errorLabel(t, classifySupabaseError(err), message));
            } finally {
              setCancellingId(null);
            }
          })(),
        },
      ]
    );
  };

  const handleOpenDispute = async (bookingId: string) => {
    setActionError(null);
    setDisputingId(bookingId);
    try {
      // Motif obligatoire (≥ 5 caractères), transition via RPC uniquement.
      await openDispute(bookingId, disputeReason[bookingId] || null);
      setDisputeReason(prev => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      setShowDisputeBox(prev => ({ ...prev, [bookingId]: false }));
      await loadBookings();
      await loadNotifs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.disputeError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    } finally {
      setDisputingId(null);
    }
  };

  const handleMarkNotifRead = async (id: string) => {    try {
      await markNotificationAsRead(id);
      setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.markError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    }
  };

  const handlePay = async (bookingId: string) => {
    setActionError(null);
    setPayingId(bookingId);
    try {
      // Montant autoritatif dérivé du service par processPayment ; la RPC
      // recalcule commission et reversement côté serveur.
      await processPayment({
        bookingId,
        method: 'SANDBOX',
        transactionRef: `TX-P3-${bookingId}-${Date.now()}`,
      });
      await loadBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.payError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    } finally {
      setPayingId(null);
    }
  };

  const handleLoadReport = async (bookingId: string) => {
    setActionError(null);
    try {
      const report = await getBuyerReport(bookingId);
      setReports(prev => ({ ...prev, [bookingId]: report }));
      if (!report) {
        setActionError(t('buyer.reportNA'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.reportLoadError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    }
  };

  const handleAddPhoto = async (listingId: string) => {
    setActionError(null);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (picked.canceled || !picked.assets || picked.assets.length === 0) return;
      const asset = picked.assets[0];
      const res = await fetch(asset.uri);
      const buffer = await res.arrayBuffer();
      setPhotoBusy(listingId);
      await uploadListingPhoto({
        listingId,
        fileName: asset.fileName || 'annonce.jpg',
        mimeType: asset.mimeType || 'image/jpeg',
        data: buffer,
      });
      await loadListings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.uploadError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    } finally {
      setPhotoBusy(null);
    }
  };

  const handleRemovePhoto = async (listingId: string, photoUrl: string) => {
    setActionError(null);
    try {
      setPhotoBusy(listingId);
      await removeListingPhoto({ listingId, photoUrl });
      await loadListings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.removeError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    } finally {
      setPhotoBusy(null);
    }
  };

  const handleTogglePhotos = async (listingId: string, photos: string[]) => {
    try {
      if (photoUrls[listingId]) {
        setPhotoUrls(prev => {
          const next = { ...prev };
          delete next[listingId];
          return next;
        });
        return;
      }
      const urls: string[] = [];
      for (const p of photos) {
        const signed = await getListingPhotoSignedUrl(p);
        if (signed) urls.push(signed);
      }
      setPhotoUrls(prev => ({ ...prev, [listingId]: urls }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.photosReadError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    }
  };

  const handleLoadReview = async (bookingId: string) => {
    try {
      const review = await getBookingReview(bookingId);
      setReviews(prev => ({ ...prev, [bookingId]: review }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.reviewError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    }
  };

  const handleSubmitReview = async (bookingId: string) => {
    setActionError(null);
    try {
      await submitReview({
        bookingId,
        rating: ratingInput[bookingId] || 5,
        comment: commentInput[bookingId] || null,
      });
      await handleLoadReview(bookingId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.reviewSubmitError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    }
  };

  const handleOpenPdf = async (bookingId: string) => {
    setActionError(null);
    setPdfBusy(bookingId);
    try {
      const report = reports[bookingId] || (await getBuyerReport(bookingId));
      if (!report) {
        setActionError(t('buyer.reportNA'));
        return;
      }
      setReports(prev => ({ ...prev, [bookingId]: report }));
      const pdfUrl = (report as any).pdf_url as string | null;
      if (!pdfUrl) {
        setActionError(t('buyer.pdfNotGenerated'));
        return;
      }
      const signed = await getReportPdfSignedUrl(pdfUrl);
      if (!signed) {
        setActionError(t('buyer.pdfLinkNA'));
        return;
      }
      await Linking.openURL(signed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('buyer.pdfOpenError');
      setActionError(errorLabel(t, classifySupabaseError(err), message));
    } finally {
      setPdfBusy(null);
    }
  };

  const unreadCount = notifs.filter(n => !n.read_at).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerBadge}>{t('buyer.spaceBadge')}</Text>
        <Text style={styles.headerTitle}>{t('buyer.inspectionTitle')}</Text>
        {sessionEmail && <Text style={styles.headerSubtitle}>{sessionEmail}</Text>}
      </View>

      <View style={styles.tabs}>
        {(['catalogue', 'listings', 'bookings', 'notifs', 'profil'] as Tab[]).map(tb => (
          <TouchableOpacity key={tb} style={[styles.tab, tab === tb && styles.tabActive]} onPress={() => setTab(tb)}>
            <Text style={[styles.tabText, tab === tb && styles.tabTextActive]}>
              {tb === 'catalogue' ? t('buyer.tabCatalogue') : tb === 'listings' ? t('buyer.tabListings', { count: listings.length }) : tb === 'bookings' ? t('buyer.tabBookings', { count: bookings.length }) : tb === 'notifs' ? (unreadCount > 0 ? t('buyer.tabNotifsUnread', { count: unreadCount }) : t('buyer.tabNotifs')) : t('buyer.tabProfile')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {actionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      )}

      {tab === 'catalogue' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('buyer.servicesTitle')}</Text>
          {catalogueLoading ? (
            <ActivityIndicator color="#34d399" />
          ) : catalogueError ? (
            <Text style={styles.errorText}>{catalogueError}</Text>
          ) : services.length === 0 ? (
            <Text style={styles.emptyText}>{t('buyer.noServices')}</Text>
          ) : (
            services.map(s => (
              <View key={s.id} style={styles.serviceRow}>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.serviceMeta}>
                  {(s.categories?.code || categories.find(c => c.id === s.category_id)?.code || '')} • {s.base_price} DZD • {s.estimated_duration_minutes}{t('buyer.minSuffix')}
                </Text>
                {s.description ? <Text style={styles.serviceDesc}>{s.description}</Text> : null}
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'listings' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('buyer.newRequest')}</Text>
          <Text style={styles.label}>{t('buyer.fTitle')}</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t('buyer.fTitlePh')} placeholderTextColor="#64748b" />
          <View style={styles.row}>
            <View style={{ flex: 1, marginEnd: 8 }}>
              <Text style={styles.label}>{t('buyer.fMake')}</Text>
              <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder={t('buyer.fMakePh')} placeholderTextColor="#64748b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('buyer.fModel')}</Text>
              <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder={t('buyer.fModelPh')} placeholderTextColor="#64748b" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, marginEnd: 8 }}>
              <Text style={styles.label}>{t('buyer.fYear')}</Text>
              <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="numeric" placeholderTextColor="#64748b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('buyer.fMileage')}</Text>
              <TextInput style={styles.input} value={mileage} onChangeText={setMileage} keyboardType="numeric" placeholderTextColor="#64748b" />
            </View>
          </View>
          <Text style={styles.label}>{t('buyer.fPrice')}</Text>
          <TextInput style={styles.input} value={askingPrice} onChangeText={setAskingPrice} keyboardType="numeric" placeholderTextColor="#64748b" />
          <View style={styles.row}>
            <View style={{ flex: 1, marginEnd: 8 }}>
              <Text style={styles.label}>{t('buyer.fWilaya')}</Text>
              <TextInput style={styles.input} value={wilaya} onChangeText={setWilaya} placeholder={t('buyer.fWilayaPh')} placeholderTextColor="#64748b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('buyer.fCommune')}</Text>
              <TextInput style={styles.input} value={commune} onChangeText={setCommune} placeholder={t('buyer.fCommunePh')} placeholderTextColor="#64748b" />
            </View>
          </View>
          {formError && <Text style={[styles.errorText, { marginTop: 8 }]}>{formError}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreateListing} disabled={creating}>
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('buyer.createRequest')}</Text>}
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('buyer.myListings')}</Text>
          {listingsLoading ? (
            <ActivityIndicator color="#34d399" />
          ) : listingsError ? (
            <Text style={styles.errorText}>{listingsError}</Text>
          ) : listings.length === 0 ? (
            <Text style={styles.emptyText}>{t('buyer.noListings')}</Text>
          ) : (
            listings.map(l => {
              // P6.3 — services compatibles avec la catégorie de l'annonce uniquement.
              const compatible = allServices.filter(s => s.category_id === l.category_id);
              const pickedId = servicePick[l.id] || null;
              const picked = compatible.find(s => s.id === pickedId) || null;
              return (
              <View key={l.id} style={styles.itemBox}>
                <Text style={styles.itemTitle}>{l.title}</Text>
                <Text style={styles.itemMeta}>{l.make} {l.model} ({l.year}) • {l.location_wilaya}</Text>
                <Text style={styles.itemMeta}>{t('buyer.photosCount', { count: (l.photos || []).length })}</Text>
                {(photoUrls[l.id] || []).map(uri => (
                  <Image key={uri} source={{ uri }} style={styles.thumb} />
                ))}
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1, marginEnd: 4 }]}
                    onPress={() => void handleTogglePhotos(l.id, l.photos || [])}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {photoUrls[l.id] ? t('buyer.togglePhotosHide') : t('buyer.togglePhotosShow')} {t('buyer.togglePhotosSuffix')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1, marginStart: 4 }]}
                    onPress={() => void handleAddPhoto(l.id)}
                    disabled={photoBusy !== null}
                  >
                    <Text style={styles.secondaryButtonText}>{t('buyer.addPhoto')}</Text>
                  </TouchableOpacity>
                </View>
                {(l.photos || []).map((p: string) => (
                  <TouchableOpacity key={p} onPress={() => void handleRemovePhoto(l.id, p)}>
                    <Text style={styles.removeLink}>{t('buyer.removePhoto')}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={[styles.sectionTitle, { marginTop: 12, fontSize: 13 }]}>{t('buyer.serviceWanted')}</Text>
                {compatible.length === 0 ? (
                  <Text style={styles.emptyText}>{t('buyer.noCompatService')}</Text>
                ) : (
                  compatible.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.expertPick, pickedId === s.id && styles.expertPickActive]}
                      onPress={() => setServicePick(prev => ({ ...prev, [l.id]: s.id }))}
                    >
                      <Text style={styles.expertPickText}>{s.name} • {s.base_price} DZD</Text>
                    </TouchableOpacity>
                  ))
                )}
                <Text style={styles.label}>{t('buyer.dateWanted')}</Text>
                <TextInput
                  style={styles.input}
                  value={schedDate[l.id] || ''}
                  onChangeText={txt => setSchedDate(prev => ({ ...prev, [l.id]: txt }))}
                  placeholder="2026-12-01"
                  placeholderTextColor="#64748b"
                />
                <Text style={styles.label}>{t('buyer.timeWanted')}</Text>
                <TextInput
                  style={styles.input}
                  value={schedTime[l.id] || ''}
                  onChangeText={txt => setSchedTime(prev => ({ ...prev, [l.id]: txt }))}
                  placeholder="09:00"
                  placeholderTextColor="#64748b"
                />
                {picked && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => void handleCreateBooking(l.id)}
                    disabled={bookingBusy !== null}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {t('buyer.bookNow')} — {picked.name} ({picked.base_price} DZD{experts.length === 0 ? t('buyer.bookNoExpert') : ''})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              );
            })
          )}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('buyer.expertsTitle')}</Text>
          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            value={expertSearch}
            onChangeText={setExpertSearch}
            placeholder={t('buyer.searchNamePh')}
            placeholderTextColor="#64748b"
          />
          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            value={expertWilaya}
            onChangeText={setExpertWilaya}
            placeholder={t('buyer.wilayaFilterPh')}
            placeholderTextColor="#64748b"
          />
          <Text style={styles.label}>{t('buyer.specialty')}</Text>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            <TouchableOpacity
              style={[styles.expertPick, expertSpecialty === null && styles.expertPickActive, { marginEnd: 6 }]}
              onPress={() => setExpertSpecialty(null)}
            >
              <Text style={styles.expertPickText}>{t('buyer.all')}</Text>
            </TouchableOpacity>
            {categories.filter(c => (c as any).is_active !== false).map(c => (
              <TouchableOpacity
                key={(c as any).id}
                style={[styles.expertPick, expertSpecialty === (c as any).code && styles.expertPickActive, { marginEnd: 6 }]}
                onPress={() => setExpertSpecialty((c as any).code)}
              >
                <Text style={styles.expertPickText}>{(c as any).name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>{t('buyer.sortBy')}</Text>
          <View style={styles.row}>
            {([
              { value: null, label: t('buyer.sortRel') },
              { value: 'rating', label: t('buyer.sortRating') },
              { value: 'price', label: t('buyer.sortPrice') },
            ] as const).map(o => (
              <TouchableOpacity
                key={String(o.value)}
                style={[styles.expertPick, expertSort === o.value && styles.expertPickActive, { flex: 1, marginEnd: 6 }]}
                onPress={() => setExpertSort(o.value)}
              >
                <Text style={styles.expertPickText}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1, marginEnd: 4 }]}
              onPress={applyExpertFilters}
              disabled={expertsLoading}
            >
              {expertsLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('buyer.search')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1, marginStart: 4, marginTop: 16 }]}
              onPress={resetExpertFilters}
              disabled={expertsLoading}
            >
              <Text style={styles.secondaryButtonText}>{t('buyer.reset')}</Text>
            </TouchableOpacity>
          </View>
          {expertsError ? (
            <Text style={[styles.errorText, { marginTop: 8 }]}>{expertsError}</Text>
          ) : experts.length === 0 ? (
            <Text style={styles.emptyText}>{t('buyer.noExperts')}</Text>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.expertPick, selectedExpertId === null && styles.expertPickActive]}
                onPress={() => setSelectedExpertId(null)}
              >
                <Text style={styles.expertPickText}>{t('buyer.noExpertAssigned')}</Text>
              </TouchableOpacity>
              {experts.map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.expertPick, selectedExpertId === e.id && styles.expertPickActive]}
                  onPress={() => setSelectedExpertId(e.id)}
                >
                  <Text style={styles.expertPickText}>{e.full_name} • {e.wilaya}</Text>
                  <Text style={styles.itemMeta}>
                    {(e.specialties || []).join(', ') || '—'}
                    {typeof e.rating_avg === 'number' || typeof e.rating_avg === 'string'
                      ? ` • ★ ${Number(e.rating_avg).toFixed(2)} ${t('buyer.reviewsCount', { count: e.rating_count ?? 0 })}` : ''}
                    {e.fixed_rate ? ` • ${e.fixed_rate} DZD` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      )}

      {tab === 'bookings' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('buyer.myBookings')}</Text>
          {bookingsLoading ? (
            <ActivityIndicator color="#34d399" />
          ) : bookingsError ? (
            <Text style={styles.errorText}>{bookingsError}</Text>
          ) : bookings.length === 0 ? (
            <Text style={styles.emptyText}>{t('buyer.noBookings')}</Text>
          ) : (
            bookings.map(b => {
              const report = reports[b.id];
              const review = reviews[b.id];
              const rating = ratingInput[b.id] || 5;
              return (
                <View key={b.id} style={styles.itemBox}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.itemTitle}>{b.listings?.title || t('buyer.bookingFallback')}</Text>
                    <Text style={styles.statusTag}>{b.status}</Text>
                  </View>
                  {b.status === 'BOOKING_REQUESTED' && b.created_at && (
                    <Text style={styles.itemMeta}>
                      {t('buyer.expiresIn', { date: new Date(getExpiryInfo(b.created_at).expiresAt).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR') })}
                    </Text>
                  )}
                  <Text style={styles.itemMeta}>
                    {t('buyer.totalsLine', { total: b.price_total, comm: b.commission_platform, payout: b.expert_payout })}
                  </Text>
                  {(() => {
                    const fin = resolveFinancialState({
                      status: b.status,
                      price_total: b.price_total || 0,
                      commission_platform: b.commission_platform || 0,
                      expert_payout: b.expert_payout || 0,
                    });
                    if (b.status === 'CANCELLED' && fin.refundEntitlement > 0) {
                      return (
                        <Text style={styles.itemMeta}>
                          {t('buyer.refundDue', { amount: fin.refundEntitlement })}
                        </Text>
                      );
                    }
                    if (b.status !== 'COMPLETED') {
                      return (
                        <Text style={styles.itemMeta}>{t('buyer.commissionPending')}</Text>
                      );
                    }
                    return null;
                  })()}
                  {b.status === 'REPORT_READY' && (
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => void handleCompleteBooking(b.id)}
                      disabled={payingId !== null}
                    >
                      <Text style={styles.buttonText}>{t('buyer.acceptReport')}</Text>
                    </TouchableOpacity>
                  )}
                  {b.status === 'PAYMENT_PENDING' && (
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => void handlePay(b.id)}
                      disabled={payingId !== null}
                    >
                      {payingId === b.id ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>{t('buyer.paySandbox', { amount: b.price_total })}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {canTransitionLocal(b.status, 'CANCELLED') && (
                    <TouchableOpacity
                      style={[styles.secondaryButton, { borderColor: '#ef4444' }]}
                      onPress={() => void handleCancelBooking(b.id)}
                      disabled={cancellingId !== null}
                    >
                      {cancellingId === b.id ? (
                        <ActivityIndicator color="#f87171" />
                      ) : (
                        <Text style={[styles.secondaryButtonText, { color: '#f87171' }]}>{t('buyer.cancelBooking')}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {(BUYER_DISPUTABLE_STATUSES as readonly string[]).includes(b.status) && !showDisputeBox[b.id] && (
                    <TouchableOpacity
                      style={[styles.secondaryButton, { borderColor: '#f59e0b' }]}
                      onPress={() => setShowDisputeBox(prev => ({ ...prev, [b.id]: true }))}
                      disabled={disputingId !== null}
                    >
                      <Text style={[styles.secondaryButtonText, { color: '#f59e0b' }]}>{t('buyer.dispute')}</Text>
                    </TouchableOpacity>
                  )}
                  {showDisputeBox[b.id] && (
                    <View style={styles.reportBox}>
                      <Text style={styles.itemMeta}>{t('buyer.disputeReason')}</Text>
                      <TextInput
                        style={[styles.input, { marginTop: 8 }]}
                        value={disputeReason[b.id] || ''}
                        onChangeText={txt => setDisputeReason(prev => ({ ...prev, [b.id]: txt }))}
                        placeholder={t('buyer.disputeReasonPh')}
                        placeholderTextColor="#64748b"
                        multiline
                      />
                      <View style={styles.row}>
                        <TouchableOpacity
                          style={[styles.secondaryButton, { flex: 1, marginEnd: 4 }]}
                          onPress={() => setShowDisputeBox(prev => ({ ...prev, [b.id]: false }))}
                        >
                          <Text style={styles.secondaryButtonText}>{t('buyer.keep')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.secondaryButton, { flex: 1, marginStart: 4, borderColor: '#f59e0b' }]}
                          onPress={() => void handleOpenDispute(b.id)}
                          disabled={disputingId !== null}
                        >
                          {disputingId === b.id ? (
                            <ActivityIndicator color="#f59e0b" />
                          ) : (
                            <Text style={[styles.secondaryButtonText, { color: '#f59e0b' }]}>{t('buyer.confirmDispute')}</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => void handleLoadReport(b.id)}>
                    <Text style={styles.secondaryButtonText}>{t('buyer.viewReport')}</Text>
                  </TouchableOpacity>
                  {report !== undefined && (
                    report ? (
                      <View style={styles.reportBox}>
                        <Text style={styles.scoreText}>{t('buyer.scoreOf', { score: report.score })}</Text>
                        <Text style={styles.itemMeta}>{report.summary}</Text>
                        <Text style={styles.disclaimer}>{LEGAL_DISCLAIMER}</Text>
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={() => void handleOpenPdf(b.id)}
                          disabled={pdfBusy !== null}
                        >
                          <Text style={styles.secondaryButtonText}>
                            {pdfBusy === b.id ? t('buyer.openingPdf') : t('buyer.openPdf')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>{t('buyer.reportNA')}</Text>
                    )
                  )}
                  <Text style={[styles.sectionTitle, { marginTop: 12, fontSize: 13 }]}>{t('buyer.messages')}</Text>
                  <ConversationView bookingId={b.id} />
                  {b.status === 'COMPLETED' && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 12, fontSize: 13 }]}>{t('buyer.reviewTitle')}</Text>
                      {review === undefined ? (
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={() => void handleLoadReview(b.id)}
                        >
                          <Text style={styles.secondaryButtonText}>{t('buyer.seeReview')}</Text>
                        </TouchableOpacity>
                      ) : review ? (
                        <Text style={styles.itemMeta}>
                          {t('buyer.ratingOf', { rating: review.rating })}{review.comment ? ` — ${review.comment}` : ''}
                        </Text>
                      ) : (
                        <>
                          <View style={styles.row}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <TouchableOpacity
                                key={n}
                                style={[styles.rateBtn, rating === n && styles.rateBtnActive]}
                                onPress={() => setRatingInput(prev => ({ ...prev, [b.id]: n }))}
                              >
                                <Text style={styles.rateText}>{n}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TextInput
                            style={[styles.input, { marginTop: 8 }]}
                            value={commentInput[b.id] || ''}
                            onChangeText={txt => setCommentInput(prev => ({ ...prev, [b.id]: txt }))}
                            placeholder={t('buyer.commentPh')}
                            placeholderTextColor="#64748b"
                            maxLength={1000}
                          />
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => void handleSubmitReview(b.id)}
                          >
                            <Text style={styles.secondaryButtonText}>{t('buyer.sendReview')}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {tab === 'notifs' && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>{t('buyer.myNotifs')}</Text>
            <TouchableOpacity onPress={() => void loadNotifs()}>
              <Text style={styles.secondaryButtonText}>{t('buyer.refresh')}</Text>
            </TouchableOpacity>
          </View>
          {notifsLoading ? (
            <ActivityIndicator color="#34d399" />
          ) : notifsError ? (
            <Text style={styles.errorText}>{notifsError}</Text>
          ) : notifs.length === 0 ? (
            <Text style={styles.emptyText}>{t('buyer.noNotifs')}</Text>
          ) : (
            notifs.map(n => (
              <TouchableOpacity key={n.id} style={styles.itemBox} onPress={() => void handleMarkNotifRead(n.id)}>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemTitle}>{n.title}</Text>
                  {!n.read_at && <Text style={styles.statusTag}>{t('buyer.isNew')}</Text>}
                </View>
                <Text style={styles.itemMeta}>{n.type}</Text>
                <Text style={styles.itemMeta}>{n.message}</Text>
                <Text style={styles.itemMeta}>{new Date(n.created_at).toLocaleString('fr-FR')}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {tab === 'profil' && <ProfileScreen />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 16 },
  header: { marginBottom: 16 },
  headerBadge: { color: '#34d399', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  headerSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 8, padding: 3, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#059669' },
  tabText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
  tabTextActive: { color: '#ffffff' },
  card: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 24 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  label: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 10, color: '#ffffff', fontSize: 13 },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primaryButton: { backgroundColor: '#059669', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#334155' },
  secondaryButtonText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  serviceRow: { backgroundColor: '#020617', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  serviceName: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  serviceMeta: { color: '#34d399', fontSize: 12, marginTop: 2 },
  serviceDesc: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  itemBox: { backgroundColor: '#020617', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  itemTitle: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  itemMeta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  statusTag: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
  emptyText: { color: '#64748b', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  errorBanner: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444', padding: 10, borderRadius: 8, marginBottom: 12 },
  errorText: { color: '#f87171', fontSize: 12, fontWeight: 'bold' },
  reportBox: { marginTop: 8, padding: 10, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  expertPick: { backgroundColor: '#020617', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#334155' },
  expertPickActive: { borderColor: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.15)' },
  expertPickText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  scoreText: { color: '#34d399', fontSize: 13, fontWeight: 'bold' },
  disclaimer: { color: '#64748b', fontSize: 10, marginTop: 6, fontStyle: 'italic' },
  thumb: { width: 72, height: 72, borderRadius: 8, marginTop: 8, marginEnd: 8 },
  removeLink: { color: '#f87171', fontSize: 11, marginTop: 4 },
  rateBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1e293b', marginEnd: 4 },
  rateBtnActive: { backgroundColor: '#059669' },
  rateText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
});


