import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../components/ui/GlassCard';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { supabase, type ExternalLink } from '../../lib/supabase';
import { colors, accent, fonts, spacing, glass, radius, rtlTextAlign, isRTL } from '../../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MenuItem({ item, index }: { item: { label: string; subtitle: string; icon: string; route?: string; onPress?: () => void }; index: number }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      router.push(item.route as any);
    }
  }, [item]);

  const chevronName = isRTL() ? 'chevron-back' : 'chevron-forward';

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(index * 80)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
      >
        <GlassCard>
          <View style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon as any} size={22} color={accent.primary} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name={chevronName} size={18} color={colors.textDim} />
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function MoreScreen() {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);

  useEffect(() => {
    supabase
      .from('external_links')
      .select('*')
      .eq('is_visible', true)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (data) setExternalLinks(data);
      });
  }, []);

  const staticItems = [
    {
      label: t('more.suggest_slogan'),
      subtitle: t('more.suggest_slogan_desc'),
      icon: 'add-circle-outline',
      route: '/(main)/suggest',
    },
    {
      label: t('more.about'),
      subtitle: t('more.about_desc'),
      icon: 'information-circle-outline',
      route: '/(main)/about',
    },
    {
      label: t('more.privacy'),
      subtitle: t('more.privacy_desc'),
      icon: 'shield-checkmark-outline',
      route: '/(main)/privacy',
    },
  ];

  const dynamicItems = externalLinks.map((link) => ({
    label: language === 'en' && link.title_en ? link.title_en : link.title,
    subtitle: language === 'en' && link.subtitle_en ? link.subtitle_en : link.subtitle,
    icon: link.icon || 'link-outline',
    onPress: () => Linking.openURL(link.url),
  }));

  const menuItems = [...staticItems, ...dynamicItems];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.06)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => changeLanguage(language === 'fa' ? 'en' : 'fa')}
            activeOpacity={0.7}
          >
            <Ionicons name="language-outline" size={20} color={accent.primary} />
            <Text style={styles.langLabel}>{language === 'fa' ? 'EN' : 'FA'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('more.title')}</Text>
          <Text style={styles.subtitle}>{t('more.subtitle')}</Text>
        </Animated.View>

        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <MenuItem key={`${item.icon}-${index}`} item={item} index={index} />
          ))}
        </View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('more.version')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
    position: 'relative',
  },
  langButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: glass.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: glass.border,
    zIndex: 1,
  },
  langLabel: {
    fontSize: fonts.sizes.xs,
    color: accent.primary,
    fontWeight: '600',
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
  menuList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: glass.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: fonts.sizes.md,
    color: colors.text,
    fontFamily: fonts.familyBold,
    textAlign: rtlTextAlign,
  },
  menuSubtitle: {
    fontSize: fonts.sizes.xs,
    color: colors.textDim,
    fontFamily: fonts.family,
    textAlign: rtlTextAlign,
    marginTop: 2,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerText: {
    fontSize: fonts.sizes.xs,
    color: colors.textDim,
    fontFamily: fonts.family,
  },
});
