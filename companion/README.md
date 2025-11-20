# Cal.com Companion App

A cross-platform companion app for Cal.com built with Expo React Native, supporting mobile (iOS/Android), web, and Chrome extension deployment.

## Overview

The companion app provides a native mobile experience and web interface for managing your Cal.com scheduling, with the web UI wrapped in a Chrome extension for easy access.

## Features

- **Cross-platform**: Runs on iOS, Android, and Web
- **Chrome Extension**: Web UI packaged as a Chrome extension using wxt.dev
- **Shared Codebase**: Maximum code sharing between mobile and web platforms
- **Native Components**: Uses React Native components for optimal performance
- **Cal.com API v2 Integration**: Fetches real data from your Cal.com account
- **Bottom Navigation**: Four main sections:
  - **Event Types** (Link Icon): View and manage your event types with real-time data from Cal.com API v2
  - **Bookings** (Calendar Icon): View and manage your bookings
  - **Availability** (Clock Icon): Configure your availability schedules
  - **More** (Three Dots Icon): Additional settings and options

## Project Structure

```
companion/
├── src/
│   ├── screens/           # Screen components
│   │   ├── EventTypesScreen.tsx
│   │   ├── BookingsScreen.tsx
│   │   ├── AvailabilityScreen.tsx
│   │   └── MoreScreen.tsx
│   └── navigation/        # Navigation configuration
│       └── BottomTabNavigator.tsx
├── extension/             # Chrome extension wrapper (wxt.dev)
│   ├── src/
│   │   └── entrypoints/
│   │       ├── popup.html
│   │       └── popup.tsx
│   ├── wxt.config.ts
│   └── package.json
├── App.tsx               # Main app entry point
├── app.json              # Expo configuration
└── package.json          # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI
- For iOS development: macOS with Xcode
- For Android development: Android Studio

### Installation

```bash
cd companion
npm install
```

### API Configuration

The companion app integrates with Cal.com API v2 to fetch your event types, bookings, and availability data.

#### Getting Your API Key

1. Log in to your Cal.com account at https://app.cal.com
2. Navigate to Settings → Developer → API Keys
3. Create a new API key with appropriate permissions
4. Copy the generated API key

#### Configuring the API Key

Currently, the API key needs to be configured in the source code. In a future update, this will be moved to environment variables and app settings.

**For Development:**

Edit `src/services/calApi.ts` and add your API key:

```typescript
const API_KEY = 'cal_live_your_api_key_here';
```

**Note:** Never commit your API key to version control. This is a temporary solution for development purposes.

### Development

#### Mobile Development

```bash
# Start Expo development server
npm start

# Run on iOS (requires macOS)
npm run ios

# Run on Android
npm run android
```

#### Web Development

```bash
# Run web version
npm run web
```

#### Chrome Extension Development

```bash
cd extension
npm install
npm run dev
```

The extension will be built in `extension/.output/chrome-mv3`. Load this directory as an unpacked extension in Chrome:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/.output/chrome-mv3` directory

## Building for Production

### Mobile Apps

```bash
# Build for iOS
npx expo build:ios

# Build for Android
npx expo build:android
```

### Web

```bash
npm run web
```

### Chrome Extension

```bash
cd extension
npm run build
npm run zip
```

The packaged extension will be in `extension/.output/companion-extension-X.X.X-chrome.zip`, ready for Chrome Web Store submission.

## Technology Stack

- **Expo**: React Native framework for cross-platform development
- **React Navigation**: Navigation library with bottom tabs
- **react-native-web**: Enables React Native components to run on web
- **wxt.dev**: Modern web extension framework for Chrome extension packaging
- **TypeScript**: Type-safe development

## Code Sharing

The app is designed to maximize code sharing between platforms:
- **Screens**: Shared across all platforms using React Native components
- **Navigation**: Uses React Navigation for consistent navigation experience
- **Styling**: StyleSheet API works across mobile and web
- **Business Logic**: All business logic is platform-agnostic

## Future Enhancements

- ✅ Integration with Cal.com API v2 for event types (completed)
- Environment variable configuration for API keys
- Secure storage for API credentials
- Authentication and user management
- Push notifications for booking updates
- Offline support with local data caching
- Calendar synchronization
- Real-time booking updates
- Complete API integration for bookings and availability screens

## Contributing

This is part of the Cal.com monorepo. Please follow the main repository's contribution guidelines.

## License

MIT License - see the main Cal.com repository for details.
