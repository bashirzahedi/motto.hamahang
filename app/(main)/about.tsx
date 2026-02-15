import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../components/ui/GlassCard';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import HtmlRenderer from '../../components/ui/HtmlRenderer';
import { supabase } from '../../lib/supabase';
import i18n from '../../lib/i18n';
import { colors, fonts, spacing, glass, isRTL } from '../../lib/theme';

export default function AboutScreen() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('about_page')
          .select('content, content_en')
          .limit(1)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        if (data?.content) {
          setContent(i18n.language === 'en' && data.content_en ? data.content_en : data.content);
        }
      } catch (err) {
        console.error('Error fetching about:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        <Text style={styles.headerTitle}>{t('about.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContent}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : content ? (
          <Animated.View entering={FadeIn.duration(400)}>
            <GlassCard>
              <HtmlRenderer html={content} />
            </GlassCard>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
            <Ionicons name="information-circle-outline" size={48} color={colors.textDim} />
            <Text style={styles.emptyText}>{t('about.no_content')}</Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  scrollContent: {
    padding: spacing.lg,
  },
  loadingContent: {
    gap: spacing.md,
  },
  contentText: {
    fontSize: fonts.sizes.md,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 28,
    fontFamily: fonts.family,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: fonts.sizes.md,
    fontFamily: fonts.family,
  },
});
