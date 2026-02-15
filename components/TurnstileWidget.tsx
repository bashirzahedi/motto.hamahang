import { useEffect, useRef, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ siteKey, onVerify, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<any>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !siteKey) return;

    const existing = document.getElementById('cf-turnstile-script');
    if (existing) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'cf-turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, [siteKey]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !scriptLoaded || !siteKey) return;

    const tryRender = () => {
      const turnstile = (window as any).turnstile;
      const node = containerRef.current;
      if (!turnstile || !node || widgetIdRef.current) return false;

      widgetIdRef.current = turnstile.render(node, {
        sitekey: siteKey,
        callback: onVerify,
        'expired-callback': () => onExpire?.(),
        theme: 'dark',
        size: 'invisible',
      });
      return true;
    };

    if (!tryRender()) {
      const interval = setInterval(() => {
        if (tryRender()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }

    return () => {
      if (widgetIdRef.current) {
        try { (window as any).turnstile?.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey, onVerify, onExpire]);

  if (Platform.OS !== 'web' || !siteKey) return null;

  return <View ref={containerRef} style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    height: 0,
    overflow: 'hidden',
  },
});
