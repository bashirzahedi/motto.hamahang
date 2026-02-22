import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Primary Meta Tags */}
        <title>شعارهای همآهنگ | Hamahang Mottos</title>
        <meta name="title" content="شعارهای همآهنگ | Hamahang Mottos" />
        <meta name="description" content="شعارهای همآهنگ - با هم یکصدا" />
        <meta name="keywords" content="همآهنگ, hamahang, ایران, شعار, iran" />
        <meta name="author" content="Hamahang" />
        <meta name="theme-color" content="#09090b" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.hamahang.org/" />
        <meta property="og:title" content="شعارهای همآهنگ | Hamahang Mottos" />
        <meta property="og:description" content="شعارهای همآهنگ - با هم یکصدا" />
        <meta property="og:image" content="https://www.hamahang.org/og-image.png?v=3" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="fa_IR" />
        <meta property="og:site_name" content="شعارهای همآهنگ" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.hamahang.org/" />
        <meta name="twitter:title" content="شعارهای همآهنگ | Hamahang Mottos" />
        <meta name="twitter:description" content="شعارهای همآهنگ - با هم یکصدا" />
        <meta name="twitter:image" content="https://www.hamahang.org/og-image.png?v=3" />

        {/* Apple */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="شعارهای همآهنگ" />
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Capture beforeinstallprompt early, before React mounts */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__pwaInstallPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaInstallPrompt = e;
          });
        `}} />

        {/* Disable body scrolling on web */}
        <ScrollViewStyleReset />

        {/* Custom styles for dark background */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background-color: #09090b;
          }
          #root {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
