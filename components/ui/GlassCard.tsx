import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { glass, radius } from '../../lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
  style?: ViewStyle;
  strong?: boolean;
}

export function GlassCard({ children, intensity = glass.blur, style, strong }: GlassCardProps) {
  return (
    <View style={[styles.container, strong && styles.containerStrong, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: glass.border,
    overflow: 'hidden',
    backgroundColor: glass.bg,
  },
  containerStrong: {
    backgroundColor: glass.bgStrong,
    borderColor: glass.borderStrong,
  },
  content: {
    padding: 16,
  },
});
