# Building BlockGlass as an Android APK

This guide explains how to build the BlockGlass game as an Android APK using Capacitor.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js and npm** (v14 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

2. **Android Studio**
   - Download from: https://developer.android.com/studio
   - During installation, make sure to install:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (for testing)

3. **Java Development Kit (JDK) 11**
   - Often bundled with Android Studio
   - Verify: `java --version`

## Setup Steps

### 1. Install Capacitor

Open a terminal in the BlockGlass directory and run:

```powershell
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2. Initialize Capacitor (if not already done)

```powershell
npx cap init
```

When prompted:
- App name: **BlockGlass**
- App ID: **com.blockglass.app**
- Web asset directory: **.** (current directory)

### 3. Add Android Platform

```powershell
npx cap add android
```

This creates an `android/` directory with the Android project.

### 4. Sync Web Assets

Whenever you make changes to your HTML/CSS/JS files, sync them:

```powershell
npx cap sync
```

### 5. Open in Android Studio

```powershell
npx cap open android
```

This opens the Android project in Android Studio.

## Building the APK

### Option 1: Build via Android Studio (Recommended)

1. In Android Studio, click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for the build to complete
3. Click "locate" in the notification to find your APK
4. The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Build via Command Line

In the Android project directory:

```powershell
cd android
gradlew.bat assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Release Build (Production APK)

For a production/release APK:

1. **Generate a signing key:**
   ```powershell
   keytool -genkey -v -keystore blockglass-release.keystore -alias blockglass -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing** in `android/app/build.gradle`:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('path/to/blockglass-release.keystore')
               storePassword 'your-password'
               keyAlias 'blockglass'
               keyPassword 'your-password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled false
               proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

3. **Build release APK:**
   ```powershell
   cd android
   gradlew.bat assembleRelease
   ```

The release APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Installing on Android Device

### Via USB:
1. Enable Developer Options and USB Debugging on your Android device
2. Connect device to computer
3. Run: `adb install path/to/app-debug.apk`

### Via File Transfer:
1. Transfer the APK file to your Android device
2. Open the APK file on your device
3. Allow installation from unknown sources if prompted
4. Install the app

## Troubleshooting

**Build fails with "Android SDK not found":**
- Set ANDROID_HOME environment variable to your Android SDK location
- Example: `C:\Users\YourName\AppData\Local\Android\Sdk`

**Gradle sync fails:**
- Try: `cd android && gradlew.bat clean`
- Then rebuild

**App doesn't update:**
- Run `npx cap sync` to copy latest web assets
- Rebuild the APK

**White screen on launch:**
- Check that `webDir` in `capacitor.config.json` points to the correct directory
- Ensure all assets are being copied correctly

## Testing

Test the APK on:
- Physical Android devices (recommended)
- Android emulator in Android Studio

## Notes

- Debug APKs are signed with a debug certificate and should not be published
- Release APKs require proper signing for Google Play Store distribution
- The app will work offline since it's a static web app
- Audio context may require user interaction on first launch

## Version Updates

When releasing a new version:
1. Update version in `android/app/build.gradle`
2. Run `npx cap sync`
3. Build new APK
4. Test thoroughly before distribution
