import { StyleSheet, Platform, I18nManager } from 'react-native';

// Web-compatible RTL check.
// react-native-web's I18nManager.forceRTL() does NOT update I18nManager.isRTL —
// it stays false. On web, we read from document.dir which we set during i18n init.
// On native, I18nManager.isRTL works correctly and persists across restarts.
export function isRTL(): boolean {
  if (Platform.OS === 'web') {
    return typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  }
  return I18nManager.isRTL;
}

// Colors - shadcn zinc palette
export const colors = {
  // Background
  bg: '#09090b',        // zinc-950
  bgCard: '#18181b',    // zinc-900
  bgHover: '#27272a',   // zinc-800
  bgMuted: '#3f3f46',   // zinc-700

  // Text
  text: '#fafafa',      // zinc-50
  textMuted: '#a1a1aa', // zinc-400
  textDim: '#71717a',   // zinc-500

  // Border
  border: '#27272a',    // zinc-800
  borderLight: '#3f3f46', // zinc-700

  // Status colors
  success: '#166534',
  successText: '#bbf7d0',

  warning: '#854d0e',
  warningText: '#fef08a',

  destructive: '#7f1d1d',
  destructiveText: '#fca5a5',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.8)',
};

// Glassmorphism tokens
export const glass = {
  bg: 'rgba(255, 255, 255, 0.05)',
  bgStrong: 'rgba(255, 255, 255, 0.08)',
  bgHover: 'rgba(255, 255, 255, 0.12)',
  border: 'rgba(255, 255, 255, 0.1)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  blur: 20,
};

// Accent gradient colors (purple-blue)
export const accent = {
  primary: '#8b5cf6',       // violet-500
  primaryDim: '#6d28d9',    // violet-700
  secondary: '#3b82f6',     // blue-500
  gradient: ['#8b5cf6', '#3b82f6'] as [string, string],
  glow: 'rgba(139, 92, 246, 0.3)',
};

// Typography
export const fonts = {
  family: undefined as string | undefined,
  familyBold: undefined as string | undefined,
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

// Direction-aware text alignment.
// On native, I18nManager.isRTL persists across restarts so this is correct at module load.
// On web, I18nManager.isRTL is always false at module load — use undefined to let
// CSS dir="rtl" handle alignment and writing direction automatically.
export const rtlTextAlign = Platform.OS === 'web'
  ? undefined
  : (I18nManager.isRTL ? 'right' as const : 'left' as const);
export const rtlWritingDirection = Platform.OS === 'web'
  ? undefined
  : (I18nManager.isRTL ? 'rtl' as const : 'ltr' as const);

// Border radius - more rounded for glassmorphism
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

// Shared styles
export const sharedStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Glass cards
  glassCard: {
    backgroundColor: glass.bg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  glassCardStrong: {
    backgroundColor: glass.bgStrong,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: glass.borderStrong,
    padding: spacing.lg,
    overflow: 'hidden',
  },

  // Legacy cards
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  // Typography
  heading: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    fontFamily: fonts.family,
    textAlign: rtlTextAlign,
  },
  title: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    fontFamily: fonts.family,
  },
  text: {
    fontSize: fonts.sizes.sm,
    color: colors.text,
    fontFamily: fonts.family,
  },
  textMuted: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    fontFamily: fonts.family,
  },
  textDim: {
    fontSize: fonts.sizes.sm,
    color: colors.textDim,
    fontFamily: fonts.family,
  },

  // Buttons
  btnPrimary: {
    backgroundColor: colors.bgMuted,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  btnPrimaryText: {
    color: colors.text,
    fontWeight: fonts.weights.medium,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  btnOutlineText: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
    fontFamily: fonts.family,
  },
  btnSuccess: {
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.md,
  },
  btnSuccessText: {
    color: colors.successText,
    fontSize: fonts.sizes.sm,
    fontFamily: fonts.family,
    fontWeight: fonts.weights.medium,
  },
  btnDestructive: {
    backgroundColor: colors.destructive,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  btnDestructiveText: {
    color: colors.destructiveText,
    fontSize: fonts.sizes.sm,
    fontFamily: fonts.family,
  },
  btnDestructiveOutline: {
    borderColor: colors.destructive,
  },
  btnDisabled: {
    backgroundColor: colors.border,
  },

  // Gradient button container
  gradientButton: {
    borderRadius: radius.md,
    overflow: 'hidden' as const,
  },
  gradientButtonInner: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  gradientButtonText: {
    color: '#ffffff',
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold,
    fontFamily: fonts.family,
  },

  // Badges
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.medium,
    fontFamily: fonts.family,
  },
  badgeSuccess: {
    backgroundColor: colors.success,
  },
  badgeSuccessText: {
    color: colors.successText,
  },
  badgeWarning: {
    backgroundColor: colors.warning,
  },
  badgeWarningText: {
    color: colors.warningText,
  },
  badgeDestructive: {
    backgroundColor: colors.destructive,
  },
  badgeDestructiveText: {
    color: colors.destructiveText,
  },
  badgeMuted: {
    backgroundColor: colors.border,
  },
  badgeMutedText: {
    color: colors.textDim,
  },

  // Form inputs
  input: {
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fonts.sizes.sm,
    fontFamily: fonts.family,
  },
  inputRTL: {
    textAlign: rtlTextAlign,
  },
  label: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
    marginBottom: spacing.sm,
    fontFamily: fonts.family,
    textAlign: rtlTextAlign,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: glass.bgStrong,
    borderRadius: radius['2xl'],
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: glass.border,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    fontFamily: fonts.family,
    textAlign: rtlTextAlign,
    marginBottom: spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing['3xl'],
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: fonts.family,
    marginTop: spacing.md,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  emptyText: {
    color: colors.textDim,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
  },

  // Row layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowEnd: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Meta info
  metaDot: {
    color: colors.borderLight,
    marginHorizontal: spacing.sm,
  },

  // Glow shadow
  glowShadow: Platform.select({
    ios: {
      shadowColor: accent.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }) as any,
});

// Placeholder color for inputs
export const placeholderColor = '#52525b';
