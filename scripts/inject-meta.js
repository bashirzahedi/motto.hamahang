const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/index.html');

const metaTags = `
    <meta name="title" content="شعارهای همآهنگ | Hamahang Mottos" />
    <meta name="keywords" content="همآهنگ, hamahang, ایران, شعار, iran" />
    <meta name="author" content="Hamahang" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.hamahang.org/" />
    <meta property="og:title" content="شعارهای همآهنگ | Hamahang Mottos" />
    <meta property="og:description" content="شعارهای همآهنگ - با هم یکصدا" />
    <meta property="og:image" content="https://www.hamahang.org/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="fa_IR" />
    <meta property="og:site_name" content="شعارهای همآهنگ" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://www.hamahang.org/" />
    <meta name="twitter:title" content="شعارهای همآهنگ | Hamahang Mottos" />
    <meta name="twitter:description" content="شعارهای همآهنگ - با هم یکصدا" />
    <meta name="twitter:image" content="https://www.hamahang.org/og-image.png" />

    <!-- Apple -->
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="شعارهای همآهنگ" />
    <link rel="apple-touch-icon" href="/icon.png" />

    <!-- PWA -->
    <link rel="manifest" href="/manifest.json" />
`;

let html = fs.readFileSync(indexPath, 'utf8');

// Inject meta tags after the title tag
html = html.replace('</title>', '</title>' + metaTags);

// Add dir="rtl" to html tag if not present
html = html.replace('<html lang="fa">', '<html lang="fa" dir="rtl">');

// Inject beforeinstallprompt capture script before </head>
const pwaScript = `
    <script>
      window.__pwaInstallPrompt = null;
      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        window.__pwaInstallPrompt = e;
      });
    </script>`;
html = html.replace('</head>', pwaScript + '\n  </head>');

fs.writeFileSync(indexPath, html);

console.log('Meta tags injected successfully!');
