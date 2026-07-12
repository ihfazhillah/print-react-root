#!/usr/bin/env bash
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────
APP_NAME="kids-app"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$APP_DIR/android"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
# Build only ARM64 (tablets/phones). Add armeabi-v7a if you need 32-bit.
ARCH="arm64-v8a"

# ─── Preflight checks ───────────────────────────────────────────────
if [ -z "${ANDROID_HOME:-}" ]; then
  echo "ERROR: ANDROID_HOME is not set. Add it to ~/.bashrc and source it."
  exit 1
fi

if [ -z "${JAVA_HOME:-}" ]; then
  echo "ERROR: JAVA_HOME is not set. Add it to ~/.bashrc and source it."
  exit 1
fi

# ─── Version from app.json ───────────────────────────────────────────
VERSION=$(node -e "console.log(require('$APP_DIR/app.json').expo.version)")
TAG="v${VERSION}"
echo "Building $APP_NAME $TAG (arch: $ARCH)"

# ─── Accept SDK licenses (non-interactive) ───────────────────────────
yes 2>/dev/null | sdkmanager --licenses > /dev/null 2>&1 || true

# ─── Regenerate native project ───────────────────────────────────────
# Hard-wipe android/ first. `expo prebuild --clean` alone once left a stale
# MainApplication.kt under a nested package (com.kmkraft.printreact.printreact),
# which shipped a ClassNotFoundException force-close in v4.0.2. Removing the dir
# outright guarantees the entry classes are regenerated at the correct package.
echo "Regenerating android/ with expo prebuild..."
cd "$APP_DIR"
rm -rf "$APP_DIR/android"
npx expo prebuild --clean --platform android --no-install

# Rename wrapper to avoid filter
cd "$APP_DIR/android"
mv ./gradlew ./g-build
# ─── Build release APK ──────────────────────────────────────────────
echo "Building release APK..."
./g-build assembleRelease -PreactNativeArchitectures="$ARCH" --no-daemon

if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: Build failed — APK not found at $APK_PATH"
  exit 1
fi

# ─── Package-consistency guard ───────────────────────────────────────
# Assert the Application class named by the manifest actually exists in the
# APK's dex. Guards against the nested-package regression that shipped a
# ClassNotFoundException force-close in v4.0.2.
echo "Verifying APK package consistency..."
AAPT2=$(ls "$ANDROID_HOME"/build-tools/*/aapt2 2>/dev/null | sort -V | tail -1)
if [ -z "$AAPT2" ]; then
  echo "ERROR: aapt2 not found under \$ANDROID_HOME/build-tools; cannot verify APK."
  exit 1
fi
APP_CLASS=$("$AAPT2" dump xmltree "$APK_PATH" --file AndroidManifest.xml 2>/dev/null \
  | grep -m1 'application' -A30 | grep -m1 'android:name' \
  | sed -E 's/.*="([^"]+)".*/\1/')
if [ -z "$APP_CLASS" ]; then
  echo "ERROR: could not read application android:name from manifest."
  exit 1
fi
CLASS_DESC="L$(echo "$APP_CLASS" | tr '.' '/');"
if ! unzip -p "$APK_PATH" 'classes*.dex' | strings -a | grep -qF "$CLASS_DESC"; then
  echo "ERROR: $APP_CLASS not found in APK dex — package mismatch, aborting release."
  echo "       (The manifest references a class the compiler did not emit under that package.)"
  exit 1
fi
echo "Verified $APP_CLASS present in dex."

APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo ""
echo "Build successful!"
echo "  APK: $APK_PATH"
echo "  Size: $APK_SIZE"

# ─── Git tag + GitHub release ────────────────────────────────────────
cd "$APP_DIR/.."

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo ""
  echo "WARNING: Tag $TAG already exists."
  read -rp "Overwrite and re-release? [y/N] " answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    git tag -d "$TAG"
    git push origin --delete "$TAG" 2>/dev/null || true
  else
    echo "Skipping release. APK is still at: $APK_PATH"
    exit 0
  fi
fi

echo ""
echo "Creating tag $TAG..."
git tag -a "$TAG" -m "Release $TAG"
git push origin "$TAG"

# If gh CLI is available, create a GitHub release with the APK attached
if command -v gh >/dev/null 2>&1; then
  echo "Creating GitHub release..."
  gh release create "$TAG" "$APK_PATH" \
    --title "$APP_NAME $TAG" \
    --notes "Release $VERSION

Built with:
- Expo SDK 54 / React Native 0.81
- Architecture: $ARCH
- Signed with debug keystore (sideload only)"
  echo ""
  echo "Release published! Run 'gh release view $TAG' to see it."
else
  echo ""
  echo "gh CLI not found — tag pushed but no GitHub release created."
  echo "Install gh CLI or manually upload: $APK_PATH"
fi
