# Library Staff Authenticator App

Mobile authenticator app for library staff authentication.

## Setup Instructions

### For Android

1. Navigate to the staff-authenticator-app directory:
```bash
cd staff-authenticator-app
```

2. Install dependencies:
```bash
npm install
```

3. Add Android platform:
```bash
npx cap add android
```

4. Sync the project:
```bash
npx cap sync android
```

5. Open in Android Studio:
```bash
npx cap open android
```

6. In Android Studio, click the "Run" button to build and install on your device or emulator.

### For iOS

1. Navigate to the staff-authenticator-app directory:
```bash
cd staff-authenticator-app
```

2. Install dependencies:
```bash
npm install
```

3. Add iOS platform:
```bash
npx cap add ios
```

4. Sync the project:
```bash
npx cap sync ios
```

5. Open in Xcode:
```bash
npx cap open ios
```

6. In Xcode, select your device and click the "Run" button.

## Features

- ✓ Offline TOTP code generation
- ✓ 30-second code refresh
- ✓ Staff-only access
- ✓ Native mobile app experience
- ✓ Secure authentication

## Security Notes

- Update the `SECRET` constant in index.html to match your database TOTP secret
- Never commit actual secrets to version control
- Use environment variables or secure configuration management in production
