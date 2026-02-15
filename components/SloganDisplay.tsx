import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { CurrentSlangState } from '../lib/syncEngine';
import { GlassCard } from './ui/GlassCard';
import { colors, accent, fonts, spacing, glass, radius } from '../lib/theme';

interface SloganDisplayProps {
  state: CurrentSlangState;
  voteScore?: number;
  userVote?: number | null;
  onVote?: (slangId: string, direction: 1 | -1) => void;
}

export function SloganDisplay({ state, voteScore = 0, userVote = null, onVote }: SloganDisplayProps) {
  const { t } = useTranslation();
  const { slang, currentRepeat, secondsRemaining } = state;
  const progress = secondsRemaining / slang.seconds_per;

  return (
    <View style={styles.container}>
      <GlassCard style={styles.sloganCard}>
        <Text style={styles.sloganText}>{slang.text}</Text>
      </GlassCard>

      <View style={styles.bottomSection}>
        <View style={styles.repeatContainer}>
          <Text style={styles.repeatNumber}>{currentRepeat}</Text>
          <Text style={styles.repeatLabel}>{t('slogan.repeat')}</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={accent.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBar, { width: `${progress * 100}%` }]}
          />
        </View>

        <Text style={styles.secondsText}>{secondsRemaining} {t('slogan.seconds')}</Text>

        {onVote && (
          <View style={styles.voteRow}>
            <TouchableOpacity
              onPress={() => onVote(slang.id, 1)}
              style={[styles.voteBtn, userVote === 1 && styles.voteBtnActive]}
            >
              <Ionicons
                name={userVote === 1 ? 'thumbs-up' : 'thumbs-up-outline'}
                size={18}
                color={userVote === 1 ? accent.primary : colors.textDim}
              />
            </TouchableOpacity>
            <Text style={[
              styles.voteScoreText,
              voteScore > 0 && styles.voteScorePos,
              voteScore < 0 && styles.voteScoreNeg,
            ]}>
              {voteScore}
            </Text>
            <TouchableOpacity
              onPress={() => onVote(slang.id, -1)}
              style={[styles.voteBtn, userVote === -1 && styles.voteBtnActive]}
            >
              <Ionicons
                name={userVote === -1 ? 'thumbs-down' : 'thumbs-down-outline'}
                size={18}
                color={userVote === -1 ? colors.destructiveText : colors.textDim}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomSection: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: spacing.lg,
  },
  sloganCard: {
    marginBottom: 32,
    width: '100%',
  },
  sloganText: {
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
    fontFamily: fonts.familyBold,
    lineHeight: 40,
  },
  repeatContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  repeatNumber: {
    fontSize: 80,
    fontWeight: '200',
    color: colors.text,
    fontFamily: fonts.family,
    minWidth: 100,
    textAlign: 'center',
  },
  repeatLabel: {
    fontSize: fonts.sizes.md,
    color: colors.textDim,
    fontFamily: fonts.family,
  },
  progressBarContainer: {
    width: '80%',
    height: 5,
    backgroundColor: glass.bg,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: glass.border,
  },
  progressBar: {
    height: '100%',
    borderRadius: radius.full,
  },
  secondsText: {
    fontSize: fonts.sizes.xs,
    color: colors.textDim,
    fontFamily: fonts.family,
    minWidth: 80,
    textAlign: 'center',
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: glass.bg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: glass.border,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  voteBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.full,
  },
  voteBtnActive: {
    backgroundColor: glass.bgStrong,
  },
  voteScoreText: {
    fontSize: fonts.sizes.md,
    fontFamily: fonts.family,
    color: colors.textMuted,
    minWidth: 24,
    textAlign: 'center',
  },
  voteScorePos: {
    color: accent.primary,
  },
  voteScoreNeg: {
    color: colors.destructiveText,
  },
});
