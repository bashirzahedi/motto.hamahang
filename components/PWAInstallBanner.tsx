import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { colors, glass, accent, radius, spacing, fonts } from '../lib/theme';

export function PWAInstallBanner() {
  const { t } = useTranslation();
  const { visible, platform, install, dismiss } = usePWAInstall();

  if (Platform.OS !== 'web' || !visible) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(400)}
      exiting={FadeOutDown.duration(300)}
      style={styles.container}
    >
      <View style={styles.banner}>
        <Pressable onPress={dismiss} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>

        <View style={styles.iconRow}>
          <View style={styles.appIcon}>
            <Ionicons name="download-outline" size={28} color={accent.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{t('pwa.install_title')}</Text>
            <Text style={styles.subtitle}>{t('pwa.install_subtitle')}</Text>
          </View>
        </View>

        {platform === 'ios-safari' ? (
          <View style={styles.iosInstructions}>
            <Text style={styles.instructionText}>{t('pwa.ios_step1')}</Text>
            <View style={styles.instructionStep}>
              <Ionicons name="share-outline" size={18} color={accent.primary} />
              <Text style={styles.instructionStepText}>{t('pwa.ios_step2')}</Text>
            </View>
            <View style={styles.instructionStep}>
              <Ionicons name="add-circle-outline" size={18} color={accent.primary} />
              <Text style={styles.instructionStepText}>{t('pwa.ios_step3')}</Text>
            </View>
          </View>
        ) : platform === 'ios-other' ? (
          <View style={styles.iosInstructions}>
            <View style={styles.instructionStep}>
              <Ionicons name="compass-outline" size={18} color={accent.primary} />
              <Text style={styles.instructionStepText}>{t('pwa.ios_open_safari')}</Text>
            </View>
          </View>
        ) : (
          <Pressable onPress={install} style={styles.installButton}>
            <Text style={styles.installButtonText}>{t('pwa.install_button')}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as any,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  banner: {
    backgroundColor: glass.bgStrong,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: glass.borderStrong,
    padding: spacing.lg,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any)
      : {}),
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
    zIndex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    fontFamily: fonts.family,
  },
  subtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    fontFamily: fonts.family,
    marginTop: 2,
  },
  iosInstructions: {
    marginTop: spacing.xs,
  },
  instructionText: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    fontFamily: fonts.family,
    marginBottom: spacing.sm,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  instructionStepText: {
    fontSize: fonts.sizes.sm,
    color: colors.text,
    fontFamily: fonts.family,
  },
  installButton: {
    backgroundColor: accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  installButtonText: {
    color: '#ffffff',
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold,
    fontFamily: fonts.family,
  },
});
