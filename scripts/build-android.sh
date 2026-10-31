#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  📱 Building KNITE Medico Android (Play Store) App"
echo "=========================================================="

cd /home/knite-server/Documents/Medical\ saas/client

echo "1. Building Web Assets..."
npm run build

echo "2. Syncing with Capacitor Android platform..."
npx cap sync android

echo "3. Building Release APK / AAB Bundle..."
cd android
if command -v ./gradlew &> /dev/null; then
  ./gradlew assembleDebug
  echo "✅ Debug APK built at: client/android/app/build/outputs/apk/debug/app-debug.apk"
  echo "👉 For Google Play Store release: run './gradlew bundleRelease' inside client/android"
else
  echo "⚠️ Android SDK / Gradle wrapper not in path. Open client/android in Android Studio to build Play Store AAB with one click!"
fi
