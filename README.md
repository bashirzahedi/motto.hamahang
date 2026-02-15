# همآهنگ | Hamahang

**با هم یکصدا — The unified voice of the Iranian people.**

Hamahang is a cross-platform app that synchronizes protest chants across large crowds. Everyone sees the same slogan at the same time, with a shared countdown, so thousands of people can chant in unison.

Dedicated to the people of Iran.

## Features

- **Synchronized Chanting** — A shared slogan with repeat countdown and progress bar. All devices stay in sync.
- **Automatic Rotation** — Slogans rotate randomly after their duration expires.
- **Community Suggestions** — Users can propose new slogans. Admins review and approve them.
- **Nearby Crowd Count (BLE)** — Privacy-preserving count of nearby participants using Bluetooth Low Energy. No GPS tracking.
- **Admin Dashboard** — Web-only panel for managing slogans, reviewing suggestions, and posting notices.
- **Real-Time Updates** — Changes propagate instantly to all connected devices.
- **Bilingual** — Full support for Farsi and English with RTL layout.
- **PWA Support** — Installable as a Progressive Web App on mobile browsers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 + React Native 0.81 |
| Language | TypeScript |
| Routing | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| BLE | react-native-ble-advertiser |
| i18n | i18next + react-i18next |
| Platforms | iOS, Android, Web |

## Quick Start

### Prerequisites

- Node.js >= 18
- Expo CLI (`npm install -g expo-cli`)
- A [Supabase](https://supabase.com) project

### Install

```bash
git clone https://github.com/bashirzahedi/hamahang.git
cd hamahang
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials. See [.env.example](.env.example) for all required variables.

### Run (Web)

```bash
npm run web
```

### Run on Mobile

BLE features require a native build — Expo Go will not work.

```bash
# Generate native projects
npx expo prebuild

# iOS (requires Xcode + physical device)
npx expo run:ios --device

# Android (requires Android Studio + physical device)
npx expo run:android
```

For standalone builds (no Metro needed):

```bash
# iOS release
npx expo run:ios --device --configuration Release

# Android release
npx expo run:android --device --variant release
```

See the [Expo documentation](https://docs.expo.dev/get-started/set-up-your-environment/) for detailed setup instructions.

## BLE Crowd Counting

Hamahang uses Bluetooth Low Energy to count nearby participants without collecting any personal data.

### How It Works

1. Each device advertises a random BLE beacon with a rotating token
2. Each device scans for other Hamahang beacons within ~10-50m
3. Unique tokens seen in the last 2 minutes are counted
4. An approximate count is displayed to the user
5. BLE range naturally groups people by physical location — no GPS needed

### Privacy

| What | Status |
|------|--------|
| Device ID | Never used |
| GPS / Location | City name only (approximate); exact coordinates never stored or sent |
| User identity | Never collected |
| BLE token | Random, in-memory only, rotates every 15 min |
| Data sent to server | City name + approximate count + date only |
| Persistent storage | Nothing written to disk |

## Project Structure

```
hamahang/
  app/
    (main)/           Main user-facing screens
      index.tsx       Homepage + nearby count + drawer menu
      slogan.tsx      Slogan display + crowd count
      slangs.tsx      Browse all slogans
      suggest.tsx     Submit a suggestion
    admin/            Web-only admin panel
  api/                Vercel serverless functions (admin auth)
  components/         Reusable UI components
  hooks/              React hooks (sync, BLE, voting, etc.)
  lib/                Core logic (Supabase client, sync engine, i18n, BLE)
  assets/             Fonts, icons, images
  public/             PWA manifest, service worker, web fonts
  plugins/            Expo config plugins
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)

This project is dedicated to the people of Iran.
