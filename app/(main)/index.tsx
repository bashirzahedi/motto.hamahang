import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSyncedSlogan } from '../../hooks/useSyncedSlogan';
import { useCityPeaks } from '../../hooks/useCityPeaks';
import { useSloganVote } from '../../hooks/useSloganVote';
import { useAppSettings } from '../../hooks/useAppSettings';
import { usePresence } from '../../hooks/usePresence';
import { LocationService } from '../../lib/location';
import { SloganDisplay } from '../../components/SloganDisplay';
import { CrowdInfo } from '../../components/CrowdInfo';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { SkeletonLoader, SkeletonCard } from '../../components/ui/SkeletonLoader';
import { colors, fonts, spacing } from '../../lib/theme';

export default function SloganHomeScreen() {
  const { t } = useTranslation();
  const { state, isLoading, error, refetch } = useSyncedSlogan();
  const cityPeaks = useCityPeaks();
  const { votes, vote } = useSloganVote();
  const { votingEnabled } = useAppSettings();
  usePresence();

  // Track user's own city for filtering
  const [myCity, setMyCity] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const check = () => {
      const city = LocationService.getInstance().getCity();
      setMyCity(city);
      if (city && timer) {
        // City detected — no need to keep polling
        clearInterval(timer);
      }
    };
    check();
    // Poll at 500ms until city is detected
    timer = setInterval(check, 500);
    return () => clearInterval(timer);
  }, []);

  // Show only the user's own city
  const myPeaks = useMemo(
    () => myCity ? cityPeaks.peaks.filter(p => p.city === myCity) : [],
    [cityPeaks.peaks, myCity],
  );

  // Sticky state: keep last valid slogan even if hook temporarily returns null
  const stickyStateRef = useRef(state);
  if (state) stickyStateRef.current = state;
  const displayState = stickyStateRef.current;

  // Sticky offline: once detected, stay for 5 seconds minimum
  const [isOffline, setIsOffline] = useState(false);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (error) {
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
      setIsOffline(true);
    } else {
      offlineTimerRef.current = setTimeout(() => setIsOffline(false), 5000);
    }
    return () => { if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current); };
  }, [error]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.08)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContent}>
          <SkeletonLoader width={200} height={28} style={{ marginBottom: 24 }} />
          <SkeletonLoader width={100} height={80} borderRadius={14} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="70%" height={6} style={{ marginBottom: 32 }} />
          <SkeletonCard style={{ width: '90%' }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.08)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <Text style={styles.title}>{t('home.title')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.crowdInfoContainer}>
          <CrowdInfo
            peaks={myPeaks}
            peaksLoading={cityPeaks.isLoading}
          />
        </Animated.View>

        {isOffline && !displayState && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.offlineBanner}>
            <GlassCard strong>
              <View style={styles.offlineBannerContent}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={32}
                  color={colors.textDim}
                />
                <View style={styles.offlineBannerText}>
                  <Text style={styles.errorTitle}>{t('home.offline')}</Text>
                  <Text style={styles.errorDetail}>{t('home.offline_hint')}</Text>
                </View>
              </View>
              <View style={{ marginTop: 12 }}>
                <GradientButton title={t('home.retry')} onPress={refetch} />
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {displayState ? (
          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.sloganContainer}>
            {isOffline && (
              <View style={styles.offlineDotRow}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineDotText}>{t('home.offline')}</Text>
              </View>
            )}
            <SloganDisplay
              state={displayState}
              voteScore={votes.get(displayState.slang.id)?.score ?? 0}
              userVote={votes.get(displayState.slang.id)?.userVote ?? null}
              onVote={votingEnabled ? vote : undefined}
            />
          </Animated.View>
        ) : !isOffline ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
            <GlassCard>
              <Text style={styles.emptyText}>{t('home.no_slogans')}</Text>
            </GlassCard>
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: colors.text,
    fontFamily: fonts.familyBold,
  },
  subtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textDim,
    fontFamily: fonts.family,
    marginTop: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  crowdInfoContainer: {
    marginBottom: spacing.xs,
  },
  sloganContainer: {
    flex: 1,
  },
  offlineBanner: {
    marginBottom: spacing.lg,
  },
  offlineBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offlineBannerText: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorTitle: {
    color: colors.text,
    fontSize: fonts.sizes.lg,
    fontWeight: '600',
    fontFamily: fonts.family,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDetail: {
    color: colors.textDim,
    fontSize: fonts.sizes.sm,
    fontFamily: fonts.family,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textDim,
    fontSize: fonts.sizes.lg,
    fontFamily: fonts.family,
    textAlign: 'center',
  },
  offlineDotRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    zIndex: 1,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  offlineDotText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontFamily: fonts.family,
  },
});
