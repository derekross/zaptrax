# Zaptrax Android App

This is an Android WebView wrapper application for [https://zaptrax.app](https://zaptrax.app).

## App Specifications

- **Package Name**: `app.zaptrax`
- **Website URL**: `https://zaptrax.app`
- **Min SDK**: Android 7.0 (API 24)
- **Target SDK**: Android 14 (API 34)
- **Compile SDK**: API 34

## Features

- ✅ Full WebView implementation with JavaScript enabled
- ✅ Hardware acceleration for smooth performance
- ✅ Progress bar for page loading
- ✅ Back button navigation within WebView
- ✅ Network connectivity checking
- ✅ Error handling and user feedback
- ✅ Deep linking support for zaptrax.app URLs
- ✅ HTTPS security with network security configuration
- ✅ ProGuard optimization for release builds
- ✅ External link handling (opens in browser)

## Prerequisites

Before building the app, ensure you have:

1. **Android Studio** (Arctic Fox or later recommended)
2. **Java Development Kit (JDK)** 11 or higher
3. **Android SDK** with API 34 installed
4. **Gradle** 8.2 or higher (included in wrapper)

## Project Structure

```
android-webview-app/
├── app/
│   ├── src/main/
│   │   ├── java/app/zaptrax/
│   │   │   └── MainActivity.java          # Main WebView activity
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   │   └── activity_main.xml      # Main layout
│   │   │   ├── values/
│   │   │   │   ├── strings.xml            # App strings
│   │   │   │   ├── colors.xml             # Color palette
│   │   │   │   └── styles.xml             # App themes
│   │   │   ├── xml/
│   │   │   │   └── network_security_config.xml
│   │   │   └── mipmap-*/                  # App icons (to be added)
│   │   └── AndroidManifest.xml            # App configuration
│   ├── build.gradle                       # App-level build config
│   └── proguard-rules.pro                 # ProGuard rules
├── gradle/wrapper/
│   └── gradle-wrapper.properties          # Gradle wrapper config
├── build.gradle                           # Project-level build config
├── settings.gradle                        # Project settings
└── gradle.properties                      # Gradle properties
```

## Building the App

### Option 1: Using Android Studio

1. **Open the project**:
   ```bash
   cd /home/raven/Projects/zaptrax/android-webview-app
   ```
   Then open this directory in Android Studio (File > Open)

2. **Sync Gradle**:
   - Wait for Gradle sync to complete
   - If prompted, accept SDK licenses

3. **Build Debug APK**:
   - Build > Build Bundle(s) / APK(s) > Build APK(s)
   - APK location: `app/build/outputs/apk/debug/app-debug.apk`

4. **Build Release APK** (requires signing):
   - Build > Generate Signed Bundle / APK
   - Follow the signing wizard

### Option 2: Using Command Line

1. **Navigate to project directory**:
   ```bash
   cd /home/raven/Projects/zaptrax/android-webview-app
   ```

2. **Make gradlew executable** (Linux/Mac):
   ```bash
   chmod +x gradlew
   ```

3. **Clean build**:
   ```bash
   ./gradlew clean
   ```

4. **Build Debug APK**:
   ```bash
   ./gradlew assembleDebug
   ```
   - Output: `app/build/outputs/apk/debug/app-debug.apk`

5. **Build Release APK** (unsigned):
   ```bash
   ./gradlew assembleRelease
   ```
   - Output: `app/build/outputs/apk/release/app-release-unsigned.apk`

## APK Signing (For Release)

### Generate Keystore

```bash
keytool -genkey -v -keystore zaptrax-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias zaptrax-key
```

Follow the prompts to set passwords and enter certificate information.

### Configure Signing in build.gradle

Uncomment and configure the signing config in `app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file("../zaptrax-keystore.jks")
            storePassword "your-keystore-password"
            keyAlias "zaptrax-key"
            keyPassword "your-key-password"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ... other settings
        }
    }
}
```

**Security Note**: Never commit keystore files or passwords to version control!

### Build Signed Release APK

```bash
./gradlew assembleRelease
```

The signed APK will be at: `app/build/outputs/apk/release/app-release.apk`

## Installing the App

### Install via ADB

1. **Connect Android device** with USB debugging enabled

2. **Check device connection**:
   ```bash
   adb devices
   ```

3. **Install debug APK**:
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Install release APK**:
   ```bash
   adb install app/build/outputs/apk/release/app-release.apk
   ```

5. **Update existing installation**:
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

### Install via Android Studio

1. Connect device or start emulator
2. Click "Run" button (green play icon)
3. Select target device
4. App will build and install automatically

## Testing Checklist

Before releasing, verify the following:

### Basic Functionality
- [ ] App launches without crashing
- [ ] Website loads correctly (https://zaptrax.app)
- [ ] Progress bar shows during page load
- [ ] JavaScript features work properly
- [ ] Page navigation works (clicking links)
- [ ] Back button navigates within WebView
- [ ] Back button exits app when at root page

### Network & Connectivity
- [ ] App detects when no internet connection
- [ ] Error message displays for connectivity issues
- [ ] App recovers when connection restored
- [ ] HTTPS connections work properly
- [ ] Mixed content is handled correctly

### External Links
- [ ] External links (non-zaptrax.app) open in browser
- [ ] Deep links to zaptrax.app open in app

### Device Testing
- [ ] Test on Android 7.0 (API 24) - minimum supported
- [ ] Test on Android 14 (API 34) - target version
- [ ] Test on various screen sizes (phone, tablet)
- [ ] Test in portrait and landscape orientations
- [ ] Test with different network conditions (WiFi, 4G, 5G)

### Performance
- [ ] App responds quickly to user interactions
- [ ] Smooth scrolling performance
- [ ] No memory leaks during extended use
- [ ] Battery usage is reasonable

### Security
- [ ] Only HTTPS connections allowed
- [ ] SSL certificate validation works
- [ ] File access is properly restricted
- [ ] No console security warnings

## Debugging

### View Logs

```bash
# View all logs
adb logcat

# Filter for WebView logs
adb logcat | grep WebView

# Filter for app logs
adb logcat | grep zaptrax

# Clear logs
adb logcat -c
```

### Common Issues

**Issue**: Gradle build fails with "SDK not found"
- **Solution**: Set `ANDROID_HOME` environment variable or configure in `local.properties`

**Issue**: WebView shows blank screen
- **Solution**: Check internet permission in AndroidManifest.xml and JavaScript enabled in MainActivity

**Issue**: App crashes on older devices
- **Solution**: Ensure minSdk is set correctly and test on target API levels

**Issue**: External links not opening
- **Solution**: Verify `shouldOverrideUrlLoading` implementation in WebViewClient

**Issue**: SSL/Certificate errors
- **Solution**: Check network_security_config.xml configuration

## Adding Custom App Icon

The app currently uses default Android icons. To add custom icons:

1. **Using Android Studio**:
   - Right-click `res` folder
   - New > Image Asset
   - Select "Launcher Icons"
   - Upload your icon (512x512 px recommended)
   - Click Next and Finish

2. **Manual Method**:
   - Create icons for each density:
     - `mipmap-mdpi`: 48x48 px
     - `mipmap-hdpi`: 72x72 px
     - `mipmap-xhdpi`: 96x96 px
     - `mipmap-xxhdpi`: 144x144 px
     - `mipmap-xxxhdpi`: 192x192 px
   - Name them `ic_launcher.png`
   - Place in respective mipmap folders

3. **Online Tools**:
   - [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)
   - [Icon Kitchen](https://icon.kitchen/)

## Publishing to Google Play Store

1. **Prepare Release Build**:
   - Sign APK with production keystore
   - Test thoroughly on multiple devices
   - Optimize APK size if needed

2. **Create Google Play Console Account**:
   - Visit [Google Play Console](https://play.google.com/console)
   - Pay one-time $25 registration fee

3. **Create App Listing**:
   - App details (name, description, category)
   - Screenshots (phone and tablet)
   - Feature graphic (1024x500 px)
   - App icon (512x512 px)
   - Privacy policy URL

4. **Upload APK/AAB**:
   - Production > Create new release
   - Upload signed APK or AAB (recommended)
   - Complete content rating questionnaire
   - Set pricing and distribution

5. **Review and Publish**:
   - Review all information
   - Submit for review
   - Wait for Google approval (typically 1-3 days)

## Optimization Tips

### Reduce APK Size
- Enable ProGuard/R8 (already configured)
- Remove unused resources
- Use WebP format for images
- Enable APK splits by ABI

### Improve Performance
- Enable hardware acceleration (already enabled)
- Implement caching strategies
- Optimize WebView settings
- Use lazy loading for heavy content

### Add Features
- Pull-to-refresh functionality
- Offline page support
- Dark mode detection and support
- File upload support
- Push notifications
- Share functionality

## Troubleshooting Build Issues

### Gradle Sync Failed
```bash
# Clear Gradle cache
./gradlew clean
rm -rf .gradle/
./gradlew build --refresh-dependencies
```

### OutOfMemoryError during build
Add to `gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=1024m
```

### Dependency Resolution Issues
```bash
# Force refresh dependencies
./gradlew build --refresh-dependencies

# View dependency tree
./gradlew app:dependencies
```

## Development Workflow

1. Make code changes in Android Studio
2. Test on emulator/device: `./gradlew installDebug`
3. View logs: `adb logcat | grep zaptrax`
4. Build release: `./gradlew assembleRelease`
5. Test release build thoroughly
6. Sign and publish

## Support & Resources

- [Android Developer Documentation](https://developer.android.com/)
- [WebView Guide](https://developer.android.com/develop/ui/views/layout/webapps/webview)
- [Gradle User Guide](https://docs.gradle.org/current/userguide/userguide.html)
- [ProGuard Manual](https://www.guardsquare.com/manual/home)

## License

This WebView wrapper is for the Zaptrax application. Ensure you have rights to wrap the website in a mobile app.

## Version History

- **v1.0** (Initial Release)
  - Basic WebView implementation
  - Network error handling
  - Deep linking support
  - ProGuard optimization
