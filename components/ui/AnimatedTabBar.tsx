import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { accent, glass, colors, fonts, radius, spacing, isRTL } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Filter out hidden routes (href: null) — expo-router doesn't pass href
  // to descriptors, so we check if tabBarIcon is defined instead
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return options.tabBarIcon != null;
  });

  const tabCount = visibleRoutes.length;
  const tabWidth = SCREEN_WIDTH / tabCount;

  // Find the visible index of the focused tab
  const visibleIndex = visibleRoutes.findIndex((r) => r.key === state.routes[state.index]?.key);
  const getIndicatorX = (i: number) =>
    // On web, CSS dir="rtl" reverses flex items but left:0 stays physical.
    // On native, left:0 is auto-swapped to right:0 in RTL.
    Platform.OS === 'web'
      ? (isRTL() ? (tabCount - 1 - i) : i) * tabWidth
      : (isRTL() ? -1 : 1) * i * tabWidth;
  const indicatorX = useSharedValue(getIndicatorX(visibleIndex >= 0 ? visibleIndex : 0));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleTabPress = useCallback(
    (vIndex: number, route: any, isFocused: boolean) => {
      indicatorX.value = withSpring(getIndicatorX(vIndex), { damping: 18, stiffness: 200 });

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    },
    [indicatorX, tabWidth, navigation, getIndicatorX],
  );

  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Sliding gradient indicator */}
      <Animated.View style={[styles.indicatorContainer, { width: tabWidth }, indicatorStyle]}>
        <View style={styles.indicatorInner}>
          <LinearGradient
            colors={accent.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.indicator}
          />
        </View>
      </Animated.View>

      {/* Tab buttons */}
      {visibleRoutes.map((route, vIndex) => {
        const { options } = descriptors[route.key];
        const isFocused = route.key === state.routes[state.index]?.key;

        return (
          <Pressable
            key={route.key}
            onPress={() => handleTabPress(vIndex, route, isFocused)}
            style={styles.tab}
          >
            {options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? accent.primary : colors.textDim,
              size: 24,
            })}
            <Text
              style={[
                styles.label,
                isFocused && styles.labelActive,
              ]}
            >
              {typeof options.title === 'string' ? options.title : route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: glass.bgStrong,
    borderTopWidth: 1,
    borderTopColor: glass.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 4,
  },
  label: {
    fontSize: fonts.sizes.xs,
    color: colors.textDim,
    fontFamily: Platform.OS === 'web' ? undefined : fonts.family,
  },
  labelActive: {
    color: accent.primary,
  },
  indicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    alignItems: 'center',
  },
  indicatorInner: {
    width: '50%',
    height: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  indicator: {
    flex: 1,
  },
});
