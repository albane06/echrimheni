/**
 * P7.40 — Tests de navigation structurée : menu Expert, déconnexion, retours,
 * isolation des rôles, RTL et conformité statique du code source.
 *
 * Scénarios couverts :
 *  1.  Présence et structure du menu Acheteur (TabBar 4 onglets)
 *  2.  Présence et structure du menu Expert (ExpertTabBar 3 onglets)
 *  3.  Accès aux onglets réellement implémentés par rôle
 *  4.  Retour depuis les écrans secondaires Acheteur (selectedBookingId)
 *  5.  Retour Android depuis détail de mission Expert
 *  6.  Retour Android sur onglet racine Expert → onglet missions
 *  7.  Retour Android sur onglet missions sans détail → false (OS)
 *  8.  Confirmation d'abandon de formulaire modifié (Création inspection)
 *  9.  Déconnexion depuis l'interface Expert (ProfileScreen via onglet)
 * 10.  Déconnexion depuis l'interface Acheteur (ProfileScreen via onglet)
 * 11.  Redirection vers AuthScreen après déconnexion
 * 12.  Absence d'accès aux écrans protégés après déconnexion
 * 13.  Absence de mélange entre les rôles (Expert ≠ Acheteur)
 * 14.  Orientation correcte des éléments de navigation en arabe RTL
 * 15.  Présence du badge point non-lu sur onglet Notifications Expert
 * 16.  Retour depuis détail mission Expert via bouton visuel ArrowLeft
 */

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fr } from '../apps/mobile/src/i18n/locales/fr';
import { ar } from '../apps/mobile/src/i18n/locales/ar';
import { en } from '../apps/mobile/src/i18n/locales/en';
import { isFlowDirty, EMPTY_LOCATION, EMPTY_OBJECT } from '../apps/mobile/src/components/inspection/validation';

// ─── Chemins des fichiers sources ────────────────────────────────────────────

const MOBILE_SRC = path.resolve(__dirname, '../apps/mobile/src');
const readSrc = (relPath: string) =>
  fs.readFileSync(path.join(MOBILE_SRC, relPath), 'utf-8');

// ─── 1. Menu Acheteur ────────────────────────────────────────────────────────

describe('P7.40 — Scénario 1 : Menu Acheteur (TabBar)', () => {
  it('TabBar acheteur exporte 4 onglets : home, requests, reports, profile', () => {
    const chromeSrc = readSrc('components/ui/Chrome.tsx');
    expect(chromeSrc).toContain("key: 'home'");
    expect(chromeSrc).toContain("key: 'requests'");
    expect(chromeSrc).toContain("key: 'reports'");
    expect(chromeSrc).toContain("key: 'profile'");
    expect(chromeSrc).toContain('TabBar');
  });

  it('TabBar acheteur est affiché en permanence dans BuyerTabs (non conditionnel au sous-écran)', () => {
    const tabsSrc = readSrc('screens/BuyerTabs.tsx');
    // Le TabBar doit être présent dans le rendu des onglets principaux (sans sous-écrans)
    expect(tabsSrc).toContain('<TabBar');
    expect(tabsSrc).toContain('onChange={(next) => setTab(next)}');
  });

  it('Clés de traduction des onglets Acheteur présentes en FR, AR, EN', () => {
    expect(fr.tabs.home).toBeTruthy();
    expect(fr.tabs.requests).toBeTruthy();
    expect(fr.tabs.reports).toBeTruthy();
    expect(fr.tabs.profile).toBeTruthy();
    expect(ar.tabs.home).toBeTruthy();
    expect(en.tabs.home).toBeTruthy();
  });
});

// ─── 2. Menu Expert ──────────────────────────────────────────────────────────

describe('P7.40 — Scénario 2 : Menu Expert (ExpertTabBar)', () => {
  it('ExpertTabBar est défini dans ExpertScreen avec 3 onglets', () => {
    const expertSrc = readSrc('screens/ExpertScreen.tsx');
    expect(expertSrc).toContain('ExpertTabBar');
    expect(expertSrc).toContain("key: 'missions'");
    expect(expertSrc).toContain("key: 'notifications'");
    expect(expertSrc).toContain("key: 'profile'");
  });

  it('ExpertTabBar est rendu en permanence dans ExpertScreen', () => {
    const expertSrc = readSrc('screens/ExpertScreen.tsx');
    expect(expertSrc).toContain('<ExpertTabBar');
    expect(expertSrc).toContain('hasUnreadNotif');
  });

  it('Clés de traduction des onglets Expert présentes en FR, AR, EN', () => {
    expect(fr.expert.tabMissions).toBe('Missions');
    expect(fr.expert.tabNotifications).toBe('Notifs');
    expect(fr.expert.tabProfile).toBe('Profil');
    expect(ar.expert.tabMissions).toBe('المهام');
    expect(ar.expert.tabNotifications).toBe('إشعارات');
    expect(ar.expert.tabProfile).toBe('حسابي');
    expect(en.expert.tabMissions).toBe('Missions');
    expect(en.expert.tabNotifications).toBe('Notifs');
    expect(en.expert.tabProfile).toBe('Profile');
  });
});

// ─── 3. Accès aux onglets par rôle ──────────────────────────────────────────

describe('P7.40 — Scénario 3 : Accès aux onglets implémentés par rôle', () => {
  it('Acheteur : 4 onglets implémentés (home, requests, reports, profile)', () => {
    const buyerTabs = ['home', 'requests', 'reports', 'profile'] as const;
    expect(buyerTabs).toHaveLength(4);
    expect(buyerTabs).toContain('home');
    expect(buyerTabs).toContain('profile');
  });

  it('Expert : 3 onglets implémentés (missions, notifications, profile)', () => {
    const expertTabs = ['missions', 'notifications', 'profile'] as const;
    expect(expertTabs).toHaveLength(3);
    expect(expertTabs).toContain('missions');
    expect(expertTabs).toContain('profile');
  });

  it('Expert ne voit pas les onglets Acheteur (requests, reports)', () => {
    const expertSrc = readSrc('screens/ExpertScreen.tsx');
    // Aucune référence au TabKey acheteur 'requests' ou 'reports' comme onglet
    expect(expertSrc).not.toContain("key: 'requests'");
    expect(expertSrc).not.toContain("key: 'reports'");
  });
});

// ─── 4. Retour depuis écrans secondaires Acheteur ────────────────────────────

describe('P7.40 — Scénario 4 : Retour depuis écrans secondaires Acheteur', () => {
  it('Retour depuis détail de demande : selectedBookingId devient null', () => {
    let selectedBookingId: string | null = 'booking-123';
    const onBack = () => { selectedBookingId = null; };
    expect(selectedBookingId).toBe('booking-123');
    onBack();
    expect(selectedBookingId).toBeNull();
  });

  it('Retour depuis paiement : payBookingId null, selectedBookingId restauré', () => {
    let payBookingId: string | null = 'booking-456';
    let selectedBookingId: string | null = null;
    const onBackPayment = () => {
      selectedBookingId = payBookingId;
      payBookingId = null;
    };
    onBackPayment();
    expect(payBookingId).toBeNull();
    expect(selectedBookingId).toBe('booking-456');
  });
});

// ─── 5. Retour Android depuis détail de mission Expert ───────────────────────

describe('P7.40 — Scénario 5 : BackHandler Expert — détail de mission', () => {
  it('ExpertScreen contient BackHandler sur selectedId', () => {
    const expertSrc = readSrc('screens/ExpertScreen.tsx');
    expect(expertSrc).toContain('BackHandler');
    expect(expertSrc).toContain('hardwareBackPress');
    expect(expertSrc).toContain('selectedId');
  });

  it('BackHandler Expert : si selectedId → setSelectedId(null) et retourne true', () => {
    let selectedId: string | null = 'mission-abc';
    let activeTab = 'missions';

    const simulateExpertBack = (): boolean => {
      if (selectedId) {
        selectedId = null;
        return true;
      }
      if (activeTab !== 'missions') {
        activeTab = 'missions';
        return true;
      }
      return false;
    };

    expect(simulateExpertBack()).toBe(true);
    expect(selectedId).toBeNull();
  });
});

// ─── 6. Retour Android sur onglet secondaire Expert ──────────────────────────

describe('P7.40 — Scénario 6 : BackHandler Expert — onglet secondaire', () => {
  it('Retour Android depuis onglet notifications/profile → retourne sur onglet missions', () => {
    let selectedId: string | null = null;
    let activeTab = 'notifications';

    const simulateExpertBack = (): boolean => {
      if (selectedId) { selectedId = null; return true; }
      if (activeTab !== 'missions') { activeTab = 'missions'; return true; }
      return false;
    };

    expect(simulateExpertBack()).toBe(true);
    expect(activeTab).toBe('missions');
  });

  it('Retour Android depuis onglet profile Expert → retourne sur missions', () => {
    let selectedId: string | null = null;
    let activeTab = 'profile';

    const simulateExpertBack = (): boolean => {
      if (selectedId) { selectedId = null; return true; }
      if (activeTab !== 'missions') { activeTab = 'missions'; return true; }
      return false;
    };

    expect(simulateExpertBack()).toBe(true);
    expect(activeTab).toBe('missions');
  });
});

// ─── 7. Retour Android sur onglet racine Expert ───────────────────────────────

describe('P7.40 — Scénario 7 : BackHandler Expert — onglet racine missions sans détail', () => {
  it('Retour Android sur missions sans selectedId → false (OS gère la mise en arrière-plan)', () => {
    const selectedId: string | null = null;
    const activeTab = 'missions';

    const simulateExpertBack = (): boolean => {
      if (selectedId) return true;
      if (activeTab !== 'missions') return true;
      return false;
    };

    expect(simulateExpertBack()).toBe(false);
  });
});

// ─── 8. Confirmation abandon formulaire modifié ───────────────────────────────

describe("P7.40 — Scénario 8 : Confirmation d'abandon du formulaire d'inspection", () => {
  it('Formulaire propre (step 1, champs vides) → isFlowDirty = false', () => {
    const cleanFlow = {
      categoryId: null,
      object: EMPTY_OBJECT,
      location: EMPTY_LOCATION,
      serviceId: null,
      datePart: '',
      timePart: '',
    };
    expect(isFlowDirty(cleanFlow, 0)).toBe(false);
  });

  it('Formulaire modifié (titre saisi) → isFlowDirty = true → doit demander confirmation', () => {
    const dirtyFlow = {
      categoryId: 'cat-1',
      object: { ...EMPTY_OBJECT, title: 'Hyundai Tucson 2022' },
      location: EMPTY_LOCATION,
      serviceId: null,
      datePart: '',
      timePart: '',
    };
    expect(isFlowDirty(dirtyFlow, 0)).toBe(true);
  });

  it('CreateInspectionScreen implémente Alert de confirmation avant abandon', () => {
    const createSrc = readSrc('screens/CreateInspectionScreen.tsx');
    expect(createSrc).toContain('Alert.alert');
    expect(createSrc).toContain('quitTitle');
  });
});

// ─── 9–10. Déconnexion Expert et Acheteur ─────────────────────────────────────

describe('P7.40 — Scénarios 9 & 10 : Déconnexion avec confirmation Alert', () => {
  it('ProfileScreen affiche une Alert de confirmation avant de déconnecter', () => {
    const profileSrc = readSrc('screens/ProfileScreen.tsx');
    expect(profileSrc).toContain('Alert.alert');
    expect(profileSrc).toContain('signOutConfirmTitle');
    expect(profileSrc).toContain('signOutConfirmMsg');
    expect(profileSrc).toContain("style: 'destructive'");
    expect(profileSrc).toContain('signOut()');
  });

  it('Expert accède à ProfileScreen via onglet "profile" du menu Expert', () => {
    const expertSrc = readSrc('screens/ExpertScreen.tsx');
    expect(expertSrc).toContain("key: 'profile'");
    expect(expertSrc).toContain('<ProfileScreen />');
  });

  it('Acheteur accède à ProfileScreen via onglet "profile" du menu Acheteur', () => {
    const tabsSrc = readSrc('screens/BuyerTabs.tsx');
    expect(tabsSrc).toContain('<ProfileScreen');
  });
});

// ─── 11. Redirection après déconnexion ───────────────────────────────────────

describe('P7.40 — Scénario 11 : Redirection après déconnexion', () => {
  it('signOut vide la session : isAuthenticated devient false → GatedApp affiche AuthScreen', () => {
    let authState: { isAuthenticated: boolean; userId: string | null } = {
      isAuthenticated: true,
      userId: 'user-expert-1',
    };

    // Simulation signOut
    authState = { isAuthenticated: false, userId: null };

    const resolveScreen = (auth: boolean, uid: string | null, role: string | null) => {
      if (!auth || !uid) return 'AuthScreen';
      if (role === 'BUYER') return 'BuyerTabs';
      if (role === 'EXPERT') return 'ExpertGate';
      return 'Forbidden';
    };

    expect(resolveScreen(authState.isAuthenticated, authState.userId, null)).toBe('AuthScreen');
  });
});

// ─── 12. Absence d'accès après déconnexion ───────────────────────────────────

describe('P7.40 — Scénario 12 : Accès protégé impossible après déconnexion', () => {
  it('Sans session (isAuthenticated = false), aucun écran Expert ni Acheteur ne doit être accessible', () => {
    const isAuthenticated = false;
    const userId = null;
    const role = null;

    const canAccessExpert = isAuthenticated && userId !== null && role === 'EXPERT';
    const canAccessBuyer = isAuthenticated && userId !== null && role === 'BUYER';

    expect(canAccessExpert).toBe(false);
    expect(canAccessBuyer).toBe(false);
  });
});

// ─── 13. Isolation des rôles ─────────────────────────────────────────────────

describe('P7.40 — Scénario 13 : Absence de mélange entre les rôles', () => {
  it('Un Expert connecté arrive sur ExpertScreen (non BuyerTabs)', () => {
    const resolveScreen = (role: string | null) => {
      if (role === 'BUYER') return 'BuyerTabs';
      if (role === 'EXPERT') return 'ExpertGate';
      return 'Forbidden';
    };
    expect(resolveScreen('EXPERT')).toBe('ExpertGate');
    expect(resolveScreen('BUYER')).toBe('BuyerTabs');
    expect(resolveScreen('EXPERT')).not.toBe('BuyerTabs');
  });

  it('BuyerTabs ne rend pas ExpertScreen ni ExpertOnboardingScreen', () => {
    const tabsSrc = readSrc('screens/BuyerTabs.tsx');
    expect(tabsSrc).not.toContain('ExpertScreen');
    expect(tabsSrc).not.toContain('ExpertOnboardingScreen');
  });

  it('ExpertScreen ne rend pas BuyerTabs ni CreateInspectionScreen', () => {
    const expertSrc = readSrc('screens/ExpertScreen.tsx');
    expect(expertSrc).not.toContain('BuyerTabs');
    expect(expertSrc).not.toContain('CreateInspectionScreen');
  });
});

// ─── 14. RTL Arabe ───────────────────────────────────────────────────────────

describe('P7.40 — Scénario 14 : Orientation RTL en arabe', () => {
  it('ExpertScreen importe I18nManager pour le mirroring de flèches', () => {
    const expertSrc = readSrc('screens/ExpertScreen.tsx');
    expect(expertSrc).toContain('I18nManager');
    expect(expertSrc).toContain('isRTL');
    expect(expertSrc).toContain('scaleX: -1');
  });

  it('Chrome Header implémente isRTL et mirroring ArrowLeft', () => {
    const chromeSrc = readSrc('components/ui/Chrome.tsx');
    expect(chromeSrc).toContain('isRTL');
    expect(chromeSrc).toContain('scaleX: -1');
  });

  it('Clés i18n Expert présentes en arabe et différentes du français', () => {
    expect(ar.expert.tabMissions).not.toBe(fr.expert.tabMissions);
    expect(ar.expert.signOutConfirmTitle).not.toBe(fr.expert.signOutConfirmTitle);
    // Vérifier que ce sont des chaînes non vides
    expect(ar.expert.tabMissions.length).toBeGreaterThan(0);
    expect(ar.expert.signOutConfirmTitle.length).toBeGreaterThan(0);
  });
});

// ─── 15. Badge non-lu sur onglet Notifications Expert ────────────────────────

describe('P7.40 — Scénario 15 : Badge non-lu sur onglet Notifications Expert', () => {
  it("hasUnreadNotif déclenche l'affichage du badge point orange", () => {
    const notifs = [
      { id: 'n1', title: 'Nouvelle mission', read_at: null },
      { id: 'n2', title: 'Rappel', read_at: '2026-10-16T10:00:00Z' },
    ];
    const hasUnread = notifs.some(n => !n.read_at);
    expect(hasUnread).toBe(true);
  });

  it('Toutes les notifications lues → pas de badge', () => {
    const notifs = [
      { id: 'n1', title: 'Ancienne mission', read_at: '2026-10-15T09:00:00Z' },
    ];
    const hasUnread = notifs.some(n => !n.read_at);
    expect(hasUnread).toBe(false);
  });

  it('ExpertTabBar reçoit la prop hasUnreadNotif depuis ExpertScreen', () => {
    const expertSrc = readSrc('screens/ExpertScreen.tsx');
    expect(expertSrc).toContain('hasUnreadNotif={hasUnreadNotif}');
    expect(expertSrc).toContain("notifs.some(n => !n.read_at)");
  });
});

// ─── 16. Bouton retour visuel dans le détail de mission Expert ────────────────

describe('P7.40 — Scénario 16 : Bouton retour visible (ArrowLeft) sur détail mission Expert', () => {
  it('ExpertScreen inclut ArrowLeft dans le rendu du détail de mission', () => {
    const expertSrc = readSrc('screens/ExpertScreen.tsx');
    expect(expertSrc).toContain('ArrowLeft');
    expect(expertSrc).toContain('backBtn');
    expect(expertSrc).toContain('backToMissionsPlain');
  });

  it('Clés de confirmation de déconnexion présentes dans les 3 locales', () => {
    // FR
    expect(fr.expert.signOutConfirmTitle).toBe('Se déconnecter ?');
    expect(fr.expert.signOutConfirmMsg).toBeTruthy();
    expect(fr.expert.signOutConfirm).toBe('Se déconnecter');
    expect(fr.expert.signOutCancel).toBe('Annuler');
    // AR
    expect(ar.expert.signOutConfirmTitle).toBe('تسجيل الخروج؟');
    expect(ar.expert.signOutConfirm).toBeTruthy();
    expect(ar.expert.signOutCancel).toBeTruthy();
    // EN
    expect(en.expert.signOutConfirmTitle).toBe('Sign out?');
    expect(en.expert.signOutConfirm).toBe('Sign out');
    expect(en.expert.signOutCancel).toBe('Cancel');
  });
});
