# SmartCare Mobile App

React Native mobile application for SmartCare health management system.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- Android Studio với Android SDK
- Java JDK 11+

### Installation

```bash
# Install dependencies
npm install

# Create .env file (copy from .env.example)
# Add USE_MOCK_API and DEBUG_LOGS if needed
```

### Running the App

**Option 1: Manual (Recommended)**
```bash
# Terminal 1: Start Metro
npm start

# Terminal 2: Build Android
npm run android:short
```

**Option 2: Automatic**
```bash
npm run android:run
```

## 📁 Project Structure

```
mobile/
├── src/
│   ├── components/     # Reusable components
│   ├── contexts/       # React contexts (Auth, etc.)
│   ├── hooks/          # Custom hooks
│   ├── navigation/     # Navigation setup
│   ├── screens/        # Screen components
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilities (logger, api-wrapper, etc.)
│   └── mocks/          # Mock data for offline mode
├── android/            # Android native code
└── App.tsx             # App entry point
```

## 🔧 Environment Variables

Create `.env` file:

```env
API_BASE_URL=http://10.0.2.2:4000
EMERGENCY_PHONE=115
MAP_PROVIDER=osm
USE_MOCK_API=false      # Set true to use mock data
DEBUG_LOGS=true         # Set true for detailed logging
```

## 📱 Available Scripts

- `npm start` - Start Metro bundler
- `npm run android` - Build and run Android app
- `npm run android:short` - Build with short path (Windows)
- `npm run android:run` - Auto start Metro + build
- `npm run fix:cache` - Clear all caches

## 🛠️ Key Features

- ✅ API wrapper with timeout, retry, and error handling
- ✅ Mock data system for offline/backend unavailable scenarios
- ✅ Error boundary for global error handling
- ✅ Logger with tags ([API], [AUTH], [ERROR], etc.)
- ✅ Safe imports and fallbacks

## 📝 Notes

- Metro bundler must be running when app is running
- Use `USE_MOCK_API=true` for offline development
- Use `DEBUG_LOGS=true` to see detailed logs

