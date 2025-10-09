# Building Authenticator Apps for iOS

Both admin and staff authenticator apps now support iOS. Follow these instructions to build them.

## Prerequisites

- macOS computer with Xcode installed
- Apple Developer account (for testing on physical devices)
- Node.js and npm installed
- CocoaPods installed (`sudo gem install cocoapods`)

## Building Admin Authenticator App

### 1. Navigate to the app directory
```bash
cd authenticator-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add iOS platform
```bash
npx cap add ios
```

### 4. Sync the project
```bash
npx cap sync ios
```

### 5. Open in Xcode
```bash
npx cap open ios
```

### 6. Build and Run
- In Xcode, select your target device (simulator or physical device)
- Click the "Run" button (Play icon) or press Cmd+R
- For physical devices, you'll need to configure signing with your Apple Developer account

## Building Staff Authenticator App

### 1. Navigate to the app directory
```bash
cd staff-authenticator-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add iOS platform
```bash
npx cap add ios
```

### 4. Sync the project
```bash
npx cap sync ios
```

### 5. Open in Xcode
```bash
npx cap open ios
```

### 6. Build and Run
- In Xcode, select your target device (simulator or physical device)
- Click the "Run" button (Play icon) or press Cmd+R
- For physical devices, you'll need to configure signing with your Apple Developer account

## Updating TOTP Secrets

Before building, make sure to update the secrets in both apps:

### Admin App
Edit `authenticator-app/index.html` and `authenticator-app/www/index.html`:
```javascript
const SECRETS = {
    admin: 'YOUR_ADMIN_SECRET_HERE',
    librarian: 'YOUR_STAFF_SECRET_HERE'
};
```

### Staff App
Edit `staff-authenticator-app/index.html` and `staff-authenticator-app/www/index.html`:
```javascript
const SECRET = 'YOUR_STAFF_SECRET_HERE';
```

After updating secrets, run `npx cap sync ios` again before building.

## Troubleshooting

### CocoaPods Issues
If you encounter pod installation errors:
```bash
cd ios/App
pod install --repo-update
cd ../..
```

### Code Signing Issues
- Open the project in Xcode
- Go to Signing & Capabilities
- Select your development team
- Xcode will automatically create necessary provisioning profiles

### Build Errors
- Clean build folder: Product > Clean Build Folder (Shift+Cmd+K)
- Restart Xcode
- Run `npx cap sync ios` again

## Features

Both apps support:
- ✓ Offline TOTP code generation
- ✓ 30-second code refresh
- ✓ Native iOS experience
- ✓ Secure authentication
- ✓ No internet connection required
