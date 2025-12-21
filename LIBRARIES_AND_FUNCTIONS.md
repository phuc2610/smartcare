# THƯ VIỆN VÀ CHỨC NĂNG TRONG SMARTCARE

Tài liệu này liệt kê tất cả các thư viện được sử dụng trong dự án SmartCare và giải thích chức năng của từng thư viện trong ứng dụng.

---

## 📦 BACKEND (SERVER) - Dependencies

### 1. **express** (^4.18.2)
**Chức năng:** Framework web server chính
- Xây dựng RESTful API
- Xử lý HTTP requests/responses
- Routing và middleware
- **Dùng trong:** Tất cả API endpoints, middleware, route handlers

### 2. **mongoose** (^8.0.3)
**Chức năng:** ODM (Object Document Mapper) cho MongoDB
- Kết nối và tương tác với MongoDB database
- Định nghĩa schemas và models (User, Medication, Reminder, HealthLog, Appointment, etc.)
- Validation, indexing, relationships
- **Dùng trong:** Tất cả models trong `server/src/models/`, database operations

### 3. **dotenv** (^16.3.1)
**Chức năng:** Quản lý biến môi trường
- Load các biến từ file `.env`
- Bảo mật secrets (API keys, database URI, JWT secret)
- **Dùng trong:** `server/src/config/`, load MONGODB_URI, OPENAI_API_KEY, JWT_SECRET, CLOUDINARY config

### 4. **bcryptjs** (^2.4.3)
**Chức năng:** Hash và so sánh mật khẩu
- Hash mật khẩu trước khi lưu vào database (không lưu plain text)
- So sánh mật khẩu khi đăng nhập
- **Dùng trong:** `server/src/utils/hash.js`, `auth.controller.js` (register, login, changePassword, resetPassword)

### 5. **jsonwebtoken** (^9.0.2)
**Chức năng:** Tạo và verify JWT tokens
- Tạo JWT token sau khi đăng nhập/xác thực OTP
- Verify token trong middleware để authenticate requests
- **Dùng trong:** `server/src/utils/jwt.js`, `server/src/middleware/auth.js`, tất cả protected routes

### 6. **cloudinary** (^1.41.0)
**Chức năng:** Cloud storage và image processing
- Upload ảnh (avatar, medication images) lên cloud
- Trả về URL ảnh để lưu vào database
- **Dùng trong:** `server/src/controllers/upload.controller.js`, `server/src/config/cloudinary.js`

### 7. **multer** (^1.4.5-lts.1)
**Chức năng:** Middleware xử lý multipart/form-data (file upload)
- Parse file upload từ requests
- Lưu file vào memory trước khi upload lên Cloudinary
- **Dùng trong:** `server/src/controllers/upload.controller.js` (uploadMiddleware)

### 8. **openai** (^4.20.1)
**Chức năng:** OpenAI API client
- Chat với AI (tư vấn sức khỏe)
- Phân tích đơn thuốc từ ảnh (vision)
- Ước tính calo cho món ăn/vận động
- Nhận diện tình trạng bệnh lý
- Phân tích báo cáo sức khỏe
- **Dùng trong:** `server/src/controllers/ai.controller.js`, `server/src/config/openai.js`

### 9. **zod** (^3.22.4)
**Chức năng:** Schema validation cho TypeScript/JavaScript
- Validate request body/query/params
- Type-safe validation với error messages rõ ràng
- **Dùng trong:** Tất cả controllers (registerSchema, loginSchema, createMedicationSchema, etc.), `server/src/middleware/validate.js`

### 10. **cors** (^2.8.5)
**Chức năng:** Cross-Origin Resource Sharing middleware
- Cho phép React Native app gọi API từ domain khác
- Cấu hình allowed origins, methods, headers
- **Dùng trong:** `server/src/app.js` (global middleware)

### 11. **helmet** (^7.1.0)
**Chức năng:** Security middleware
- Set các HTTP security headers
- Bảo vệ khỏi XSS, clickjacking, MIME type sniffing
- **Dùng trong:** `server/src/app.js` (global middleware)

### 12. **express-rate-limit** (^7.1.5)
**Chức năng:** Rate limiting middleware
- Giới hạn số lượng requests từ một IP
- Bảo vệ API khỏi abuse, DDoS
- **Dùng trong:** `server/src/app.js` (global middleware, giới hạn requests)

### 13. **pdfkit** (^0.14.0)
**Chức năng:** Tạo file PDF
- Tạo báo cáo sức khỏe dạng PDF
- Format text, tables, headers, footers
- **Dùng trong:** `server/src/controllers/report.controller.js` (exportPDF function)

---

## 📦 BACKEND (SERVER) - DevDependencies

### 1. **nodemon** (^3.0.2)
**Chức năng:** Development tool
- Tự động restart server khi code thay đổi
- **Dùng trong:** Script `npm run dev` để development

---

## 📱 MOBILE (REACT NATIVE) - Dependencies

### 1. **react** (18.2.0)
**Chức năng:** Core React library
- UI framework, component-based architecture
- State management (useState, useEffect, useContext)
- **Dùng trong:** Tất cả components, screens, contexts

### 2. **react-native** (0.73.0)
**Chức năng:** React Native framework
- Build native mobile apps (Android/iOS)
- Core components (View, Text, ScrollView, etc.)
- **Dùng trong:** Tất cả screens và components

### 3. **@react-navigation/native** (^6.1.9)
**Chức năng:** Navigation library core
- Điều hướng giữa các màn hình
- Navigation context và hooks
- **Dùng trong:** `mobile/src/navigation/RootNavigator.tsx`, tất cả navigation setup

### 4. **@react-navigation/native-stack** (^6.9.17)
**Chức năng:** Stack navigator
- Navigation kiểu stack (push/pop screens)
- Header, transitions
- **Dùng trong:** `mobile/src/navigation/RootNavigator.tsx` (AuthStack, MainStack)

### 5. **@react-navigation/bottom-tabs** (^6.5.11)
**Chức năng:** Bottom tab navigator
- Tab bar ở dưới màn hình
- Chuyển đổi giữa các tab (Dashboard, Health, Medication, Chat, Profile)
- **Dùng trong:** `mobile/src/navigation/TabsNavigator.tsx`

### 6. **axios** (^1.6.2)
**Chức năng:** HTTP client
- Gọi API từ mobile app đến backend
- Interceptors (thêm JWT token, xử lý errors)
- Retry logic
- **Dùng trong:** `mobile/src/utils/api-wrapper.ts`, tất cả service files

### 7. **@notifee/react-native** (^7.8.0)
**Chức năng:** Local notifications
- Tạo và schedule notifications
- Hiển thị thông báo nhắc nhở (thuốc, bữa ăn, vận động)
- Multi-stage notifications (15m, 10m, 5m, 0m trước)
- **Dùng trong:** `mobile/src/services/notification.service.ts`, `mobile/App.tsx`, `mobile/index.js`

### 8. **@react-native-async-storage/async-storage** (^1.21.0)
**Chức năng:** Local storage (key-value)
- Lưu JWT token, user data
- Offline data sync queue
- **Dùng trong:** `mobile/src/services/auth.service.ts`, `mobile/src/services/sync.service.ts`, `mobile/src/contexts/AuthContext.tsx`

### 9. **@react-native-community/geolocation** (^3.4.0)
**Chức năng:** Lấy vị trí GPS
- Lấy tọa độ (latitude, longitude)
- Dùng cho SOS, location tracking
- **Dùng trong:** `mobile/src/services/database.service.ts` (SOS), `mobile/src/utils/permissions.ts`

### 10. **@react-native-voice/voice** (^3.2.4)
**Chức năng:** Voice recognition
- Nhận diện giọng nói (speech-to-text)
- **Dùng trong:** `mobile/src/components/VoiceCommandButton.tsx` (tính năng điều khiển bằng giọng nói)

### 11. **react-native-image-picker** (^7.0.3)
**Chức năng:** Chọn ảnh từ gallery hoặc chụp ảnh
- Chọn ảnh từ thư viện
- Chụp ảnh bằng camera
- **Dùng trong:** `mobile/src/screens/Profile/ProfileScreen.tsx` (đổi avatar), `mobile/src/screens/Medication/AddMedicationScreen.tsx` (quét đơn thuốc - TODO)

### 12. **react-native-maps** (0.31.1)
**Chức năng:** Hiển thị bản đồ
- Google Maps/Apple Maps integration
- Hiển thị vị trí, markers
- **Dùng trong:** `mobile/src/screens/Map/MapScreen.tsx` (nếu có), tìm kiếm địa điểm

### 13. **react-native-paper** (^5.11.3)
**Chức năng:** Material Design component library
- UI components (Button, Card, TextInput, etc.)
- Theme system
- **Dùng trong:** Một số components (có thể không dùng nhiều, app chủ yếu dùng custom components)

### 14. **react-native-reanimated** (3.15.0)
**Chức năng:** Animation library
- Smooth animations, gestures
- Performance tốt hơn Animated API
- **Dùng trong:** `mobile/src/ui/Fab.tsx`, các animated components

### 15. **react-native-safe-area-context** (4.7.4)
**Chức năng:** Safe area handling
- Xử lý notch, status bar, bottom bar
- Đảm bảo UI không bị che bởi system UI
- **Dùng trong:** Root component, navigation setup

### 16. **react-native-screens** (3.25.0)
**Chức năng:** Native screen management
- Tối ưu performance cho navigation
- Native screen transitions
- **Dùng trong:** Navigation setup (required bởi React Navigation)

### 17. **react-native-sensors** (^7.3.0)
**Chức năng:** Đọc cảm biến thiết bị
- Accelerometer (phát hiện té ngã)
- Gyroscope, Magnetometer
- **Dùng trong:** `mobile/src/hooks/useFallDetection.ts` (phát hiện té ngã)

### 18. **react-native-svg** (^13.14.0)
**Chức năng:** Render SVG graphics
- Icons, charts, graphics
- **Dùng trong:** Icons, Victory Native charts

### 19. **react-native-track-player** (^4.0.1)
**Chức năng:** Audio player
- Phát nhạc thư giãn (Chill, Rain, Forest, Sea)
- Background playback
- **Dùng trong:** `mobile/src/hooks/useAudioPlayer.ts`, `mobile/src/screens/Wellness/WellnessScreen.tsx`

### 20. **react-native-tts** (^4.1.0)
**Chức năng:** Text-to-Speech
- Đọc text thành giọng nói
- **Dùng trong:** Có thể dùng cho accessibility hoặc đọc thông báo

### 21. **react-native-vector-icons** (^10.0.3)
**Chức năng:** Icon library
- Icons từ FontAwesome, MaterialIcons, Ionicons, etc.
- **Dùng trong:** Các components cần icons

### 22. **react-native-webview** (^13.16.0)
**Chức năng:** WebView component
- Hiển thị web content trong app
- **Dùng trong:** Có thể dùng cho help pages, terms, hoặc external content

### 23. **victory-native** (^36.9.2)
**Chức năng:** Chart library
- Vẽ biểu đồ (line, bar, pie charts)
- Thống kê, visualizations
- **Dùng trong:** `mobile/src/screens/Report/ReportScreen.tsx` (biểu đồ calo, adherence rate)

### 24. **react-native-gesture-handler** (2.12.1)
**Chức năng:** Gesture handling
- Swipe, pan, pinch gestures
- Required bởi React Navigation và Reanimated
- **Dùng trong:** Navigation, custom gestures

---

## 📱 MOBILE (REACT NATIVE) - DevDependencies

### 1. **@babel/core** (^7.23.5)
**Chức năng:** JavaScript compiler
- Transpile ES6+ và JSX
- **Dùng trong:** Build process

### 2. **@babel/preset-env** (^7.23.5)
**Chức năng:** Babel preset cho modern JavaScript
- **Dùng trong:** Build configuration

### 3. **@babel/runtime** (^7.23.5)
**Chức năng:** Babel runtime helpers
- **Dùng trong:** Build process

### 4. **@react-native/eslint-config** (^0.73.1)
**Chức năng:** ESLint config cho React Native
- Code linting rules
- **Dùng trong:** `npm run lint`

### 5. **@react-native/metro-config** (^0.73.2)
**Chức năng:** Metro bundler configuration
- JavaScript bundler cho React Native
- **Dùng trong:** Build và development server

### 6. **@tsconfig/react-native** (^3.0.2)
**Chức năng:** TypeScript config cho React Native
- TypeScript compiler options
- **Dùng trong:** TypeScript compilation

### 7. **@types/jest** (^29.5.12)
**Chức năng:** TypeScript types cho Jest
- Type definitions cho testing
- **Dùng trong:** Testing setup

### 8. **@types/react** (^18.3.0)
**Chức năng:** TypeScript types cho React
- Type definitions cho React
- **Dùng trong:** TypeScript development

### 9. **@types/react-native-vector-icons** (^6.4.18)
**Chức năng:** TypeScript types cho react-native-vector-icons
- **Dùng trong:** TypeScript development

### 10. **@types/react-test-renderer** (^18.0.7)
**Chức năng:** TypeScript types cho React Test Renderer
- **Dùng trong:** Testing

### 11. **babel-jest** (^29.7.0)
**Chức năng:** Babel transformer cho Jest
- **Dùng trong:** Testing setup

### 12. **babel-plugin-module-resolver** (^5.0.0)
**Chức năng:** Babel plugin để resolve modules
- Alias paths (ví dụ: `@/components`)
- **Dùng trong:** Build configuration

### 13. **eslint** (^8.54.0)
**Chức năng:** Code linter
- Kiểm tra code quality, errors, warnings
- **Dùng trong:** `npm run lint`

### 14. **jest** (^29.7.0)
**Chức năng:** Testing framework
- Unit tests, integration tests
- **Dùng trong:** `npm test`

### 15. **metro-react-native-babel-preset** (0.77.0)
**Chức năng:** Babel preset cho Metro bundler
- **Dùng trong:** Build configuration

### 16. **patch-package** (^8.0.1)
**Chức năng:** Patch node_modules
- Sửa lỗi trong dependencies
- **Dùng trong:** Post-install script

### 17. **postinstall-postinstall** (^2.1.0)
**Chức năng:** Run scripts sau khi install
- **Dùng trong:** Post-install hooks

### 18. **prettier** (^3.1.0)
**Chức năng:** Code formatter
- Format code tự động
- **Dùng trong:** Code formatting

### 19. **react-test-renderer** (18.2.0)
**Chức năng:** Render React components cho testing
- **Dùng trong:** Component testing

### 20. **typescript** (^5.3.3)
**Chức năng:** TypeScript compiler
- Type safety, better IDE support
- **Dùng trong:** Tất cả TypeScript files (.ts, .tsx)

---

## 📊 TÓM TẮT THEO CHỨC NĂNG

### 🔐 Authentication & Security
- **bcryptjs**: Hash mật khẩu
- **jsonwebtoken**: JWT authentication
- **helmet**: Security headers
- **express-rate-limit**: Rate limiting
- **cors**: CORS protection

### 💾 Database & Storage
- **mongoose**: MongoDB ODM
- **@react-native-async-storage/async-storage**: Local storage
- **cloudinary**: Cloud image storage
- **multer**: File upload handling

### 🤖 AI & Machine Learning
- **openai**: OpenAI API (chat, vision, analysis)

### 📱 Mobile Core
- **react**: UI framework
- **react-native**: Mobile framework
- **@react-navigation/native**: Navigation
- **@react-navigation/native-stack**: Stack navigation
- **@react-navigation/bottom-tabs**: Tab navigation

### 🔔 Notifications
- **@notifee/react-native**: Local notifications

### 🌐 Networking
- **axios**: HTTP client
- **express**: Web server

### 📸 Media & Files
- **react-native-image-picker**: Image picker
- **react-native-track-player**: Audio player
- **react-native-tts**: Text-to-speech

### 📍 Location & Sensors
- **@react-native-community/geolocation**: GPS location
- **react-native-sensors**: Device sensors (accelerometer)

### 🎨 UI & Animation
- **react-native-reanimated**: Animations
- **react-native-gesture-handler**: Gestures
- **react-native-vector-icons**: Icons
- **react-native-svg**: SVG graphics
- **victory-native**: Charts

### 📄 Documents
- **pdfkit**: PDF generation

### ✅ Validation
- **zod**: Schema validation

### 🗺️ Maps
- **react-native-maps**: Maps integration

### 🧪 Development Tools
- **nodemon**: Auto-restart server
- **typescript**: Type safety
- **eslint**: Code linting
- **prettier**: Code formatting
- **jest**: Testing

---

## 📝 GHI CHÚ

- Tất cả các thư viện được cài đặt qua `npm install` hoặc `yarn add`
- Version numbers có thể thay đổi khi update
- Một số thư viện có thể không được sử dụng trực tiếp nhưng là dependencies của thư viện khác (peer dependencies)
- DevDependencies chỉ dùng trong development, không có trong production build

---

**Cập nhật lần cuối:** Dựa trên codebase hiện tại của SmartCare

