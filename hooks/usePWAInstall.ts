import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

type InstallPlatform = 'android' | 'ios-safari' | 'ios-other' | 'desktop' | null;

const DISMISSED_KEY = 'hamahang_pwa_install_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function detectPlatform(): InstallPlatform {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent.toLowerCase();

  // Already running as installed PWA
  if (window.matchMedia?.('(display-mode: standalone)').matches) return null;
  if ((navigator as any).standalone === true) return null; // iOS PWA

  if (/iphone|ipad|ipod/.test(ua)) {
    // Only Safari supports Add to Home Screen on iOS.
    // Chrome=CriOS, Edge=EdgiOS, Firefox=FxiOS, Opera=OPiOS
    const isNonSafari = /crios|edgios|fxios|opios/.test(ua);
    return isNonSafari ? 'ios-other' : 'ios-safari';
  }
  if (/android/.test(ua)) return 'android';

  // Desktop browsers (Chrome, Edge support beforeinstallprompt)
  return 'desktop';
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const timestamp = parseInt(raw, 10);
    if (Date.now() - timestamp < DISMISS_DURATION_MS) return true;
    localStorage.removeItem(DISMISSED_KEY);
    return false;
  } catch {
    return false;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<InstallPlatform>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isDismissed()) return;

    const detectedPlatform = detectPlatform();
    if (!detectedPlatform) return;
    setPlatform(detectedPlatform);

    if (detectedPlatform === 'ios-safari' || detectedPlatform === 'ios-other') {
      setVisible(true);
      return;
    }

    // Android/Desktop Chrome/Edge: check if beforeinstallprompt was captured early
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
      setVisible(true);
      return;
    }

    // Listen for future beforeinstallprompt events
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    } catch {}
  }, []);

  return { visible, platform, install, dismiss };
}
