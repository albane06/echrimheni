/**
 * P7.1 — Design tokens EchriMheni (spec UI/UX §2).
 * Source unique de vérité visuelle : aucune couleur/taille/espacement
 * en dur dans les composants — tout passe par ces tokens.
 */

export const colors = {
  primary: {
    50: '#EEF3FC',
    100: '#D9E4F8',
    500: '#1F5AC8',
    600: '#1246A8',
    700: '#0D3580',
    900: '#071C45',
  },
  secondary: {
    50: '#E6F8F5',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
  },
  accent: { 500: '#F97316', 600: '#EA580C', 700: '#C2410C' },
  bg: { app: '#F4F6FA', card: '#FFFFFF', subtle: '#EAEEF5' },
  border: { default: '#E3E8F0', strong: '#CBD5E1' },
  text: {
    primary: '#0F1B2D',
    secondary: '#5B6B82',
    muted: '#64748B',
    onDark: '#FFFFFF',
  },
  success: { main: '#16A34A', bg: '#DCFCE7', text: '#166534' },
  warning: { main: '#D97706', bg: '#FEF3C7', text: '#92400E' },
  danger: { main: '#DC2626', bg: '#FEE2E2', text: '#991B1B' },
} as const;

export const brandGradient = {
  from: '#071C45',
  to: '#1246A8',
  angleDeg: 135,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  screen: 20,
  cardGap: 12,
  cardPadding: 16,
} as const;

export const radius = {
  input: 12,
  button: 14,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const font = {
  heading: 'PlusJakartaSans_700Bold',
  headingXL: 'PlusJakartaSans_800ExtraBold',
  semibold: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

export const type = {
  display: { fontFamily: font.headingXL, fontSize: 32, lineHeight: 40 },
  h1: { fontFamily: font.heading, fontSize: 26, lineHeight: 34 },
  h2: { fontFamily: font.heading, fontSize: 20, lineHeight: 28 },
  h3: { fontFamily: font.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: font.bodySemibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: font.heading, fontSize: 16, lineHeight: 20 },
  buttonLarge: { fontFamily: font.heading, fontSize: 18, lineHeight: 22 },
  badge: { fontFamily: font.bodySemibold, fontSize: 12, lineHeight: 16 },
} as const;

/** Cibles tactiles minimales (spec §1.6 / §7). */
export const touch = {
  min: 48,
  buttonHeight: 52,
  buttonCompactHeight: 40,
  badgeHeight: 28,
  tabBarHeight: 64,
  headerHeight: 56,
} as const;

/** Limite d'échelle de police système (spec §2.2 : badges et tab bar). */
export const maxFontSizeMultiplier = 1.3;
