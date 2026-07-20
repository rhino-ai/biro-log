# Android (Capacitor) build & release guide

This project is a React + Vite web app wrapped with **Capacitor 8** to produce a
native Android app publishable to the Google Play Store. All existing
Supabase auth, storage, RLS, edge functions, chat, video, and E2EE features
work unchanged — the Android shell simply hosts the same web bundle plus
native plugins (push, camera, share, clipboard, network, deep links, etc.).

---

## 0. One-time prerequisites (on your machine)

- Node 18+ and either `npm` or `bun`
- **Android Studio** (latest stable) with SDK Platform 34 and Build-Tools 34+
- JDK 17 (bundled with Android Studio)
- Set `ANDROID_HOME` / `JAVA_HOME` if the CLI can't find them

---

## 1. Get the code locally

In Lovable click **GitHub → Connect / Export**, then on your machine:

```bash
git clone <your-repo>
cd <your-repo>
npm install        # or: bun install
```

---

## 2. Add the Android platform

The `capacitor.config.ts` file is already committed. Add the native
Android project (only needed once):

```bash
npx cap add android
npx cap update android
```

This creates the `android/` folder — an Android Studio project.

---

## 3. Development (hot-reload from Lovable sandbox)

`capacitor.config.ts` includes a `server.url` pointing at the Lovable
preview so you can iterate live on-device:

```bash
npm run build
npx cap sync android
npx cap run android          # runs on a connected device / emulator
# or:
npx cap open android         # opens the project in Android Studio
```

---

## 4. Production build (bundled offline assets)

For a Play Store release the app must load its own bundled `dist/`, **not**
the Lovable preview URL. Before building the release AAB, remove (or
comment out) the `server` block in `capacitor.config.ts`:

```ts
// server: { url: '...', cleartext: true, androidScheme: 'https' },
```

Then:

```bash
npm run build              # vite production build -> dist/
npx cap sync android       # copies dist/ + plugins into android/
```

---

## 5. App identity

- `appId`  = `app.lovable.0c774921ede04ae78a9e613a154bfa58`
- `appName` = `biro-log`

To ship under your own package name (recommended for Play Store), change
`appId` in `capacitor.config.ts` and rename the Android package via
Android Studio → **Refactor → Rename** on `android/app/src/main/java/...`,
then update `applicationId` in `android/app/build.gradle`.

---

## 6. App icon & splash screen

Place a 1024×1024 `icon.png` and a 2732×2732 `splash.png` in
`resources/`, then generate all densities:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --android
```

This produces adaptive icons + splash resources in `android/app/src/main/res`.

---

## 7. Firebase Cloud Messaging (FCM) push

`@capacitor/push-notifications` is installed and wired in `src/lib/native.ts`
— on Android it requests permission (Android 13+ POST_NOTIFICATIONS is
handled by the plugin), registers with FCM, and stores the token in the
existing `push_subscriptions` table with `endpoint = fcm:<token>`.

To enable FCM:

1. Create a Firebase project → add an Android app with your `appId`.
2. Download `google-services.json` and drop it into `android/app/`.
3. In `android/build.gradle` (project-level) add inside `dependencies`:
   ```gradle
   classpath 'com.google.gms:google-services:4.4.2'
   ```
4. In `android/app/build.gradle` add at the bottom:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```
5. Add the Firebase server key / service account to your Supabase edge
   function that sends pushes. The existing `send-push` function should be
   extended to detect `endpoint.startsWith('fcm:')` and forward via the FCM
   HTTP v1 API. Web push (VAPID) continues to work unchanged for browsers.

---

## 8. Permissions

`AndroidManifest.xml` (generated inside `android/app/src/main/`) needs the
following — Capacitor plugins add most of them automatically, but verify:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.VIBRATE" />
```

---

## 9. Deep links / App Links

Inside `<activity>` in `AndroidManifest.xml` add an `intent-filter`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="biro-log.lovable.app" />
</intent-filter>
```

Also host `/.well-known/assetlinks.json` on `biro-log.lovable.app` with your
app's SHA-256 signing fingerprint so Android verifies the link. The
`initNative()` bootstrap already routes `appUrlOpen` events into React
Router, so `https://biro-log.lovable.app/join/ABC123` will open the
invite screen inside the installed app.

---

## 10. Signing & release AAB

### Create an upload keystore (once)

```bash
keytool -genkey -v -keystore biro-log-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Store the keystore **outside** the repo. Never commit it.

### Wire it into Gradle

Create `android/keystore.properties` (git-ignored):

```
storeFile=/absolute/path/to/biro-log-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

Edit `android/app/build.gradle`:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
  keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
  signingConfigs {
    release {
      storeFile file(keystoreProperties['storeFile'])
      storePassword keystoreProperties['storePassword']
      keyAlias keystoreProperties['keyAlias']
      keyPassword keystoreProperties['keyPassword']
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
```

### Build the AAB

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 11. Publishing to Google Play

1. Create app in Play Console → **All apps → Create app**.
2. Fill store listing (name = "Biro-log", short/long description, screenshots
   1080×1920, 512×512 icon, feature graphic 1024×500).
3. **Setup → App integrity → App signing** → let Play manage the app-signing
   key (upload your upload keystore's cert).
4. **Production → Create new release** → upload `app-release.aab`.
5. Fill content rating, target audience, data safety (declare Supabase,
   Firebase, camera, mic, storage, notifications).
6. Complete privacy policy URL + link Telegram support (`@biro1_a`).
7. Roll out to internal testing first, then production.

---

## 12. Native features already wired

| Feature | Where |
|---|---|
| Push (FCM) permission + token registration | `src/lib/native.ts` → `registerPush()` |
| Splash screen auto-hide | `SplashScreen.hide()` on boot |
| Status bar (dark, black) | `StatusBar.setStyle` |
| Deep links / App Links | `CapApp.addListener('appUrlOpen', ...)` |
| Hardware back button | `CapApp.addListener('backButton', ...)` → history/exit |
| Network detection | `@capacitor/network` (import as needed) |
| Camera / image picker | `@capacitor/camera` (already usable from any page) |
| File system | `@capacitor/filesystem` |
| Share intent | `@capacitor/share` (`Share.share({...})`) |
| Clipboard | `@capacitor/clipboard` |
| External URLs in in-app browser | `@capacitor/browser` (`Browser.open`) |
| Offline caching | Existing PWA `sw.js` + hybrid local Zustand store |

---

## 13. Environment variables

Vite inlines `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` at build
time. Make sure your `.env` is present when running `npm run build`
locally, otherwise the packaged APK will point at `undefined`. No
`service_role` key must ever ship in the Android bundle — it stays inside
Supabase Edge Functions only.

---

## 14. Quick command cheat-sheet

```bash
# First time
npx cap add android

# Every release
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease   # produces app-release.aab

# Debug on device
npx cap run android

# Open in Android Studio
npx cap open android
```

Read the Lovable mobile blog post for extra tips:
<https://lovable.dev/blog>
