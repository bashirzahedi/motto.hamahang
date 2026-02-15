import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { getAnonymousId } from '../../lib/anonymousId';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { supabase } from '../../lib/supabase';
import { calculateChantDuration } from '../../lib/chantDuration';
import { colors, accent, fonts, spacing, glass, radius, placeholderColor, rtlTextAlign, isRTL } from '../../lib/theme';

const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '';

export default function SuggestScreen() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [repeatCount, setRepeatCount] = useState('3');
  const [secondsPer, setSecondsPer] = useState('5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleTextChange = (newText: string) => {
    setText(newText);
    const calculatedSeconds = calculateChantDuration(newText);
    setSecondsPer(String(calculatedSeconds));
  };

  const handleSubmit = async () => {
    if (honeypot) { setSubmitted(true); return; }
    if (!text.trim()) {
      Alert.alert(t('suggest.error'), t('suggest.error_empty'));
      return;
    }
    const repeatNum = parseInt(repeatCount, 10) || 3;
    const secondsNum = parseInt(secondsPer, 10) || 5;
    if (repeatNum < 1 || repeatNum > 10) {
      Alert.alert(t('suggest.error'), t('suggest.error_repeat_range'));
      return;
    }
    if (secondsNum < 2 || secondsNum > 15) {
      Alert.alert(t('suggest.error'), t('suggest.error_seconds_range'));
      return;
    }

    setIsSubmitting(true);
    try {
      const deviceId = await getAnonymousId();
      const { data: result, error } = await supabase.rpc('submit_suggestion', {
        p_text: text.trim(),
        p_repeat_count: repeatNum,
        p_seconds_per: secondsNum,
        p_device_id: deviceId,
        p_turnstile_token: turnstileToken,
      });
      if (error) throw error;

      if (result === 'rate_limited') {
        Alert.alert(t('suggest.rate_limit_title'), t('suggest.rate_limit_text'));
        return;
      }
      if (result === 'captcha_failed') {
        Alert.alert(t('suggest.error'), t('suggest.error_submit'));
        return;
      }
      if (result !== 'ok') {
        Alert.alert(t('suggest.error'), t('suggest.error_submit'));
        return;
      }

      setSubmitted(true);
      setText('');
      setRepeatCount('3');
      setSecondsPer('5');
      setTurnstileToken(null);
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      Alert.alert(t('suggest.error'), t('suggest.error_submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.08)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View entering={FadeIn.duration(400)} style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={64} color={accent.primary} />
          <Text style={styles.successTitle}>{t('suggest.success_title')}</Text>
          <Text style={styles.successText}>
            {t('suggest.success_text')}
          </Text>
          <GradientButton
            title={t('suggest.suggest_another')}
            onPress={() => setSubmitted(false)}
          />
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.06)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name={isRTL() ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{t('suggest.title')}</Text>
            <View style={styles.backButton} />
          </View>

          <Text style={styles.subtitle}>
            {t('suggest.description')}
          </Text>

          {Platform.OS === 'web' && (
            <View style={styles.honeypot}>
              <TextInput
                value={honeypot}
                onChangeText={setHoneypot}
                placeholder="Leave empty"
                autoComplete="off"
              />
            </View>
          )}

          <Animated.View entering={FadeInUp.duration(400)}>
            <GlassCard style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>{t('suggest.text_label')}</Text>
              <TextInput
                style={styles.textInput}
                value={text}
                onChangeText={handleTextChange}
                placeholder={t('suggest.text_placeholder')}
                placeholderTextColor={placeholderColor}
                multiline
                textAlign={rtlTextAlign}
                maxLength={100}
              />
              <Text style={styles.charCount}>{text.length}/100</Text>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(80)}>
            <GlassCard style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>{t('suggest.repeat_label')}</Text>
              <TextInput
                style={styles.numberInput}
                value={repeatCount}
                onChangeText={setRepeatCount}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
              <Text style={styles.hint}>
                {t('suggest.repeat_hint')}
              </Text>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(160)}>
            <GlassCard style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>{t('suggest.seconds_label')}</Text>
              <TextInput
                style={styles.numberInput}
                value={secondsPer}
                onChangeText={setSecondsPer}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
              <Text style={styles.hint}>
                {t('suggest.seconds_hint')}
              </Text>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(240)}>
            <GlassCard strong style={{ marginBottom: spacing['2xl'] }}>
              <Text style={styles.previewLabel}>{t('suggest.preview_label')}</Text>
              <Text style={styles.previewText}>
                {t('suggest.preview_text', { seconds: (parseInt(repeatCount, 10) || 3) * (parseInt(secondsPer, 10) || 5) })}
              </Text>
            </GlassCard>
          </Animated.View>

          {Platform.OS === 'web' && TURNSTILE_SITE_KEY ? (
            <TurnstileWidget
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
            />
          ) : null}

          <GradientButton
            title={t('suggest.submit')}
            onPress={handleSubmit}
            disabled={isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  honeypot: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
    height: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
    marginBottom: spacing['2xl'],
  },
  label: {
    fontSize: fonts.sizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: rtlTextAlign,
    fontFamily: fonts.family,
  },
  textInput: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: fonts.sizes.lg,
    color: colors.text,
    borderWidth: 1,
    borderColor: glass.border,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: fonts.family,
  },
  numberInput: {
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    borderWidth: 1,
    borderColor: glass.border,
    width: 100,
    alignSelf: 'center',
    fontFamily: fonts.family,
  },
  charCount: {
    fontSize: fonts.sizes.xs,
    color: colors.textDim,
    textAlign: 'right',
    marginTop: spacing.xs,
    fontFamily: fonts.family,
  },
  hint: {
    fontSize: fonts.sizes.xs,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontFamily: fonts.family,
  },
  previewLabel: {
    fontSize: fonts.sizes.sm,
    color: colors.textDim,
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontFamily: fonts.family,
  },
  previewText: {
    fontSize: fonts.sizes.md,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: fonts.family,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  successTitle: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: fonts.family,
  },
  successText: {
    fontSize: fonts.sizes.md,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: fonts.family,
  },
});
