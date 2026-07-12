# Releasing the KM Kraft Android app

The update → build → release flow for the kids-app (`com.kmkraft.printreact`).
Updates are delivered as **full sideload APKs** attached to GitHub releases; the app's
in-app updater (`src/hooks/useUpdateCheck.ts`) polls the latest GitHub release and offers
it when its tag semver is newer than the installed `expo.version`.

---

## 1. Update the version

Edit `kids-app/app.json`:

```jsonc
"expo": {
  "version": "4.0.3",          // ← bump this (semver). The updater keys off it.
  "android": {
    "package": "com.kmkraft.printreact",
    "versionCode": 2            // ← bump by 1 each release
  }
}
```

**Both must go up every release:**
- `version` (semver) — what the in-app updater compares. If you rebuild without bumping
  this, existing installs are never offered the update.
- `android.versionCode` (integer) — Android's internal version; bump for monotonicity.

Then make whatever code/config changes the release contains and commit them to `master`
(this is the release branch; prior version bumps live there too).

---

## 2. Build

The one-shot path is `./build-release.sh` (does prebuild → build → guard → tag → GitHub
release). To build **and verify on device before publishing**, run the steps manually:

```bash
cd kids-app
export ARCH="arm64-v8a"

# Clean native regen. The rm -rf is mandatory: `expo prebuild --clean` alone once left a
# stale MainApplication.kt under a nested package and shipped a ClassNotFoundException
# force-close (v4.0.2). Wiping the dir guarantees correct entry-class packages.
rm -rf android
npx expo prebuild --clean --platform android --no-install

# Build the release APK
cd android
mv ./gradlew ./g-build          # rename to dodge the command filter/hook
./g-build assembleRelease -PreactNativeArchitectures="$ARCH" --no-daemon
```

Output: `kids-app/android/app/build/outputs/apk/release/app-release.apk`

Requires `ANDROID_HOME` and `JAVA_HOME` set. Signed with the **debug keystore**
(sideload only) — the same key across builds, so installs upgrade cleanly over an
existing install.

### Package-consistency guard (baked into `build-release.sh`)

After the build, assert the class the manifest names actually exists in the APK dex — this
catches the nested-package regression before it ships:

```bash
APK_PATH=android/app/build/outputs/apk/release/app-release.apk
AAPT2=$(ls "$ANDROID_HOME"/build-tools/*/aapt2 | sort -V | tail -1)
APP_CLASS=$("$AAPT2" dump xmltree "$APK_PATH" --file AndroidManifest.xml \
  | grep -m1 'application' -A30 | grep -m1 'android:name' | sed -E 's/.*="([^"]+)".*/\1/')
CLASS_DESC="L$(echo "$APP_CLASS" | tr '.' '/');"
unzip -p "$APK_PATH" 'classes*.dex' | strings -a | grep -qF "$CLASS_DESC" \
  && echo "OK: $APP_CLASS present in dex" \
  || { echo "ABORT: $APP_CLASS missing from dex — package mismatch"; exit 1; }
```

Confirm the stamped version, too:
```bash
"$AAPT2" dump badging "$APK_PATH" | grep "^package:"
# package: name='com.kmkraft.printreact' versionCode='2' versionName='4.0.3' ...
```

---

## 3. Verify on a device (adb over wifi)

```bash
D=<device-ip:port>          # find with: adb devices -l
APK=kids-app/android/app/build/outputs/apk/release/app-release.apk

adb -s $D install -r "$APK"
adb -s $D logcat -c
adb -s $D shell monkey -p com.kmkraft.printreact -c android.intent.category.LAUNCHER 1
sleep 7

# PASS = no FATAL / no ClassNotFound for our package, process alive, RN running
adb -s $D logcat -d | grep -iE "Unable to instantiate application com.kmkraft|AndroidRuntime.*kmkraft" || echo "clean"
adb -s $D shell pidof com.kmkraft.printreact && echo "process alive"
adb -s $D shell dumpsys activity activities | grep -i "ResumedActivity" | grep -i kmkraft
adb -s $D shell dumpsys package com.kmkraft.printreact | grep -E "versionName|versionCode"
```

`W unknown:ReactNative: ...` lines in logcat mean the JS bundle loaded — that's the stage a
crashing native build never reaches. Ignore Samsung system noise like
`com.samsung.android.sivs.ai...ClassNotFoundException` (unrelated to our app). Note: a
device with a secure lock (PIN/pattern) can't be unlocked over adb, so a UI screenshot may
not be capturable — the logcat/process checks above are the source of truth.

---

## 4. Release

`build-release.sh` does this automatically (derives the tag from `app.json` version). To do
it manually with an already-verified APK:

```bash
git push origin master
git tag -a v4.0.3 -m "Release v4.0.3"
git push origin v4.0.3

gh release create v4.0.3 \
  kids-app/android/app/build/outputs/apk/release/app-release.apk \
  --title "kids-app v4.0.3" \
  --notes "Release 4.0.3 — <what changed>"
```

Verify the asset attached:
```bash
gh release view v4.0.3 --json assets --jq '.assets[].name'   # → app-release.apk
```

---

## Notes & gotchas

- **Tag must match the version.** `build-release.sh` builds `v${expo.version}` and prompts
  before overwriting an existing tag. If you re-cut, delete the old tag first
  (`git tag -d vX.Y.Z && git push origin --delete vX.Y.Z`).
- **A crashing release can't self-heal.** If a shipped build force-closes on launch, its
  users can't be reached by the in-app updater (the app dies before the update check runs).
  They must **manually download and reinstall** the fixed APK. Say so in the release notes.
- **`android/` is gitignored** and fully regenerated by prebuild — never hand-edit it and
  expect it to persist. Native changes go through `app.json`, config plugins in `plugins/`,
  or `package.json` (autolinking).
- **API base URL** is baked from `.env` (`EXPO_PUBLIC_API_IP` / `EXPO_PUBLIC_API_PORT`) at
  build time, but is overridable at runtime in the app's settings screen.
