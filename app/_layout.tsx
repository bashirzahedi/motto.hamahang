import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, I18nManager, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Analytics } from '@vercel/analytics/react';
import { initI18n } from '../lib/i18n';
import { LanguageProvider } from '../lib/i18n/LanguageContext';
import { startNetworkMonitoring } from '../lib/networkStatus';
import { PWAInstallBanner } from '../components/PWAInstallBanner';

// Enable RTL support
I18nManager.allowRTL(true);

// Import global CSS
require('../global.css');

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    startNetworkMonitoring();

    // Register service worker for PWA installability
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    initI18n().then(() => {
      const i18n = require('../lib/i18n').default;
      const shouldBeRTL = i18n.language === 'fa';

      document.documentElement.setAttribute('dir', shouldBeRTL ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', i18n.language);
      I18nManager.forceRTL(shouldBeRTL);

      setI18nReady(true);
    }).catch(() => {
      setI18nReady(true);
    });
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (i18nReady) {
      await SplashScreen.hideAsync();
    }
  }, [i18nReady]);

  if (!i18nReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar style="light" />
          <Analytics />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000000' },
            }}
          />
          <PWAInstallBanner />
        </View>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
