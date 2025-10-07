# Library Admin Authenticator App

A standalone mobile authenticator app for Admin access to the Library System. Shows codes for both Administrator and Library Staff roles. Works completely offline.

## Features
- ✓ Generates 6-digit TOTP codes every 30 seconds
- ✓ Works completely offline (no internet required)
- ✓ Supports both Admin and Library Staff roles
- ✓ Visual timer and progress bar
- ✓ One-tap code copying

## Building for Android

### Prerequisites
1. Install [Node.js](https://nodejs.org/) (v16 or higher)
2. Install [Android Studio](https://developer.android.com/studio)
3. Set up Android SDK in Android Studio

### Build Steps

```bash
# 1. Navigate to the authenticator-app directory
cd authenticator-app

# 2. Install dependencies
npm install

# 3. Add Android platform
npx cap add android

# 4. Sync the project
npx cap sync android

# 5. Open in Android Studio
npx cap open android
```

### In Android Studio:
1. Wait for Gradle sync to complete
2. Connect your Android phone via USB (enable USB debugging)
3. Click "Run" (green play button) or press Shift+F10
4. Select your device and the app will install

### Build APK for manual installation:
1. In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
2. Once built, find the APK at: `android/app/build/outputs/apk/debug/app-debug.apk`
3. Transfer to your phone and install

## Building for iOS

### Prerequisites
1. macOS with Xcode installed
2. Apple Developer account (for device installation)

### Build Steps

```bash
# 1. Navigate to the authenticator-app directory
cd authenticator-app

# 2. Install dependencies
npm install

# 3. Add iOS platform
npx cap add ios

# 4. Sync the project
npx cap sync ios

# 5. Open in Xcode
npx cap open ios
```

### In Xcode:
1. Select your development team in signing settings
2. Connect your iPhone via USB
3. Select your device as the target
4. Click "Run" (play button) or press Cmd+R

## Configuration

### Updating TOTP Secrets
The default secrets in `index.html` are:
- Admin: `JBSWY3DPEHPK3PXP`
- Librarian: `JBSWY3DPEHPK3PXQ`

**IMPORTANT**: These should match the secrets in your Supabase database. To update:

1. Query your secrets from Supabase:
```sql
SELECT role, secret FROM totp_secrets;
```

2. Update the `SECRETS` object in `index.html`:
```javascript
const SECRETS = {
    admin: 'YOUR_ADMIN_SECRET',
    librarian: 'YOUR_LIBRARIAN_SECRET'
};
```

3. Rebuild the app after changes

## Troubleshooting

### Android
- If Gradle sync fails, try: File > Invalidate Caches / Restart
- Ensure USB debugging is enabled on your phone
- Check that Android SDK is properly installed

### iOS
- If signing fails, check your Apple Developer account status
- Ensure device is trusted (Settings > General > Device Management)
- Try cleaning build folder: Product > Clean Build Folder

## Security Notes
- The secrets are stored in the app code (client-side)
- This is acceptable for TOTP as the algorithm is public
- Keep your secrets confidential and regenerate them if compromised
- The app works offline by design - no data is transmitted
