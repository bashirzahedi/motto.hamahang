import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../components/ui/GlassCard';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { supabase, type Slang, type Notice } from '../../lib/supabase';
import { useSloganVote } from '../../hooks/useSloganVote';
import { useAppSettings } from '../../hooks/useAppSettings';
import i18n from '../../lib/i18n';
import { colors, accent, fonts, spacing, glass, radius, rtlTextAlign, isRTL } from '../../lib/theme';

export default function SlangsListScreen() {
  const { t } = useTranslation();
  const [slangs, setSlangs] = useState<Slang[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'active' | 'newest' | 'most_votes'>('active');
  const { votes, vote } = useSloganVote();
  const { votingEnabled } = useAppSettings();

  const fetchNotice = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setNotice(data);
    } catch (error) {
      console.error('Error fetching notice:', error);
    }
  };

  const fetchSlangs = async () => {
    try {
      const { data, error } = await supabase
        .from('slangs')
        .select('*')
        .order('vote_score', { ascending: false });
      if (error) throw error;
      setSlangs(data || []);
    } catch (error) {
      console.error('Error fetching slangs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSlangs();
    fetchNotice();

    const slangsSub = supabase
      .channel('slangs-list-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slangs' },
        () => { fetchSlangs(); },
      )
      .subscribe();

    const noticesSub = supabase
      .channel('notices-list-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notices' },
        () => { fetchNotice(); },
      )
      .subscribe();

    return () => {
      slangsSub.unsubscribe();
      noticesSub.unsubscribe();
    };
  }, []);

  const getNetVotes = useCallback((id: string) => {
    const v = votes.get(id);
    return (v?.likes ?? 0) - (v?.dislikes ?? 0);
  }, [votes]);

  const getIsActive = useCallback((id: string, slang: Slang) => {
    if (slang.admin_override) return slang.is_active;
    const v = votes.get(id);
    const likes = v?.likes ?? 0;
    const dislikes = v?.dislikes ?? 0;
    const hasVotes = likes > 0 || dislikes > 0;
    return hasVotes ? (likes - dislikes) >= 0 : slang.is_active;
  }, [votes]);

  const sortedSlangs = useMemo(() => {
    const sorted = [...slangs];
    switch (sortBy) {
      case 'active':
        sorted.sort((a, b) => {
          const aActive = getIsActive(a.id, a) ? 1 : 0;
          const bActive = getIsActive(b.id, b) ? 1 : 0;
          return bActive - aActive || getNetVotes(b.id) - getNetVotes(a.id);
        });
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'most_votes':
        sorted.sort((a, b) => getNetVotes(b.id) - getNetVotes(a.id));
        break;
    }
    return sorted;
  }, [slangs, sortBy, votes, getNetVotes, getIsActive]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSlangs();
    fetchNotice();
  }, []);

  const renderSlang = ({ item, index }: { item: Slang; index: number }) => {
    const voteInfo = votes.get(item.id);
    const likes = voteInfo?.likes ?? 0;
    const dislikes = voteInfo?.dislikes ?? 0;
    const userVote = voteInfo?.userVote ?? null;
    // Use actual vote counts as source of truth (cached vote_score can be stale)
    const hasAnyVotes = likes > 0 || dislikes > 0;
    const netVotes = likes - dislikes;
    // Admin override → use DB; otherwise votes decide (fallback to DB if no votes)
    const isActive = item.admin_override ? item.is_active : (hasAnyVotes ? netVotes >= 0 : item.is_active);

    return (
      <Animated.View entering={FadeInUp.duration(300).delay(index * 50)}>
        <GlassCard style={{ marginBottom: spacing.md, opacity: isActive ? 1 : 0.5 }}>
          <Text style={[styles.slangText, !isActive && styles.inactiveText]}>{item.text}</Text>
          <View style={styles.slangFooter}>
            <View style={styles.slangMeta}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{item.repeat_count} {t('slangs.repeat')}</Text>
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{item.seconds_per} {t('slangs.seconds')}</Text>
              </View>
            </View>
            {votingEnabled && (
              <View style={styles.votePill}>
                <TouchableOpacity
                  onPress={() => vote(item.id, 1)}
                  style={[styles.voteButton, userVote === 1 && styles.voteButtonActive]}
                >
                  <Ionicons
                    name={userVote === 1 ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={16}
                    color={userVote === 1 ? accent.primary : colors.textDim}
                  />
                </TouchableOpacity>
                <Text style={[styles.voteCount, styles.voteCountPositive]}>
                  {likes}
                </Text>
                <View style={styles.voteDivider} />
                <Text style={[styles.voteCount, styles.voteCountNegative]}>
                  {dislikes}
                </Text>
                <TouchableOpacity
                  onPress={() => vote(item.id, -1)}
                  style={[styles.voteButton, userVote === -1 && styles.voteButtonActive]}
                >
                  <Ionicons
                    name={userVote === -1 ? 'thumbs-down' : 'thumbs-down-outline'}
                    size={16}
                    color={userVote === -1 ? colors.destructiveText : colors.textDim}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.06)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name={isRTL() ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('slangs.title')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = () => (
    <View>
      {notice?.text ? (
        <Animated.View entering={FadeIn.duration(400)}>
          <GlassCard strong style={{ marginBottom: spacing.lg }}>
            <Text style={styles.noticeText}>{i18n.language === 'en' && notice.text_en ? notice.text_en : notice.text}</Text>
          </GlassCard>
        </Animated.View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.06)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isRTL() ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('slangs.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.subtitle}>
        {t('slangs.check_first')}
      </Text>

      <View style={styles.sortRow}>
        {(['most_votes', 'active', 'newest'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setSortBy(key)}
            style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
          >
            <Text style={[styles.sortChipText, sortBy === key && styles.sortChipTextActive]}>
              {t(`slangs.sort_${key}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={sortedSlangs}
        renderItem={renderSlang}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('slangs.empty')}</Text>
          </Animated.View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContent: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: glass.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fonts.sizes.lg,
    color: colors.text,
    fontFamily: fonts.familyBold,
  },
  subtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textDim,
    textAlign: 'center',
    fontFamily: fonts.family,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
  },
  sortChipActive: {
    backgroundColor: accent.primary,
    borderColor: accent.primary,
  },
  sortChipText: {
    fontSize: fonts.sizes.xs,
    fontFamily: fonts.family,
    color: colors.textDim,
  },
  sortChipTextActive: {
    color: '#fff',
    fontFamily: fonts.familyBold,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  slangText: {
    fontSize: fonts.sizes.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: rtlTextAlign,
    lineHeight: 26,
    fontFamily: fonts.family,
    marginBottom: spacing.sm,
  },
  slangMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  metaBadge: {
    backgroundColor: glass.bg,
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: glass.border,
  },
  metaBadgeText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontFamily: fonts.family,
  },
  slangFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  votePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.bg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: glass.border,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  voteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.full,
  },
  voteButtonActive: {
    backgroundColor: glass.bgStrong,
  },
  voteCount: {
    fontSize: fonts.sizes.xs,
    fontFamily: fonts.family,
    minWidth: 16,
    textAlign: 'center',
  },
  voteCountPositive: {
    color: accent.primary,
  },
  voteCountNegative: {
    color: colors.destructiveText,
  },
  voteDivider: {
    width: 1,
    height: 14,
    backgroundColor: glass.border,
  },
  noticeText: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: rtlTextAlign,
    lineHeight: 26,
    fontFamily: fonts.family,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: fonts.sizes.md,
    fontFamily: fonts.family,
  },
  inactiveText: {
    color: colors.textDim,
  },
});
