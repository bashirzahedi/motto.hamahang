import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CityPresence } from '../hooks/useCityPeaks';
import { getCityDisplayName } from '../lib/cityNames';
import { GlassCard } from './ui/GlassCard';
import { colors, accent, fonts, spacing, glass } from '../lib/theme';

interface CrowdInfoProps {
  peaks: CityPresence[];
  peaksLoading: boolean;
}

export function CrowdInfo({ peaks, peaksLoading }: CrowdInfoProps) {
  const { t } = useTranslation();

  if (peaksLoading || peaks.length === 0) return null;

  return (
    <GlassCard>
      {peaks.map((peak, index) => (
        <View key={peak.city} style={[styles.peakRow, index < peaks.length - 1 && styles.peakRowBorder]}>
          <Text style={styles.cityName}>{getCityDisplayName(peak.city)}</Text>
          <Text style={styles.peakCount}>{peak.visitor_count} {t('city.people')}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  peakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  peakRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: glass.border,
  },
  cityName: {
    fontSize: fonts.sizes.sm,
    color: colors.text,
    fontFamily: fonts.family,
  },
  peakCount: {
    fontSize: fonts.sizes.sm,
    color: accent.primary,
    fontFamily: fonts.family,
    fontWeight: '600',
  },
});
