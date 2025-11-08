# Cal.com Companion App

A cross-platform companion app for Cal.com built with Expo React Native, supporting mobile (iOS/Android), web, and Chrome extension deployment.

## Overview

The companion app provides a native mobile experience and web interface for managing your Cal.com scheduling, with the web UI wrapped in a Chrome extension for easy access.

## Features

- **Cross-platform**: Runs on iOS, Android, and Web
- **Chrome Extension**: Web UI packaged as a Chrome extension using wxt.dev
- **Shared Codebase**: Maximum code sharing between mobile and web platforms
- **Native Components**: Uses React Native components for optimal performance
- **Bottom Navigation**: Four main sections:
  - **Event Types** (Link Icon): Manage your event types and scheduling configurations
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

- Integration with Cal.com API for real data
- Authentication and user management
- Push notifications for booking updates
- Offline support with local data caching
- Calendar synchronization
- Real-time booking updates

## Contributing

This is part of the Cal.com monorepo. Please follow the main repository's contribution guidelines.

## License

MIT License - see the main Cal.com repository for details.
