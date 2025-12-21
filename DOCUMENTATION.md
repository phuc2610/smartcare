# SmartCare - Tài Liệu Kỹ Thuật Chi Tiết

**Version:** 1.0.0  
**Ngày tạo:** 2024  
**Tác giả:** Senior Full-Stack Engineer

---

## Mục Lục

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Kiến Trúc Hệ Thống](#2-kiến-trúc-hệ-thống)
3. [Mobile (React Native)](#3-mobile-react-native)
4. [Server (Node.js/Express)](#4-server-nodejsexpress)
5. [Database (MongoDB)](#5-database-mongodb)
6. [Admin Panel (Đề Xuất)](#6-admin-panel-đề-xuất)
7. [Bảng Mapping Chi Tiết](#7-bảng-mapping-chi-tiết)
8. [Luồng Nghiệp Vụ](#8-luồng-nghiệp-vụ)
9. [Chất Lượng & Rủi Ro](#9-chất-lượng--rủi-ro)
10. [TODO/Backlog](#10-todobacklog)
11. [Quick Start](#11-quick-start)

---

## 1. Tổng Quan Dự Án

**SmartCare** là một ứng dụng quản lý sức khỏe toàn diện cho người bệnh và người thân (caregiver), được xây dựng với:

- **Frontend Mobile:** React Native (TypeScript) cho iOS và Android
- **Backend:** Node.js + Express + MongoDB
- **Realtime:** WebSocket (Socket.io) cho chat
- **Notifications:** Notifee cho local push notifications
- **AI:** OpenAI GPT cho phân tích và tư vấn sức khỏe
- **Storage:** Cloudinary cho upload ảnh

### Chức Năng Chính

1. **Quản lý thuốc:** Thêm thuốc, lên lịch nhắc nhở, đánh dấu đã uống
2. **Theo dõi sức khỏe:** Ghi nhận bữa ăn, vận động, triệu chứng
3. **Báo cáo:** Tổng hợp dữ liệu ngày/tuần/tháng, xuất PDF
4. **Caregiver Plus:** Người thân theo dõi và quản lý nhiều bệnh nhân
5. **Chat:** Nhắn tin giữa bệnh nhân và người thân
6. **AI Assistant:** Tư vấn sức khỏe, phân tích calories, nhận diện triệu chứng
7. **Notifications:** Nhắc nhở đa giai đoạn (15p, 10p, 5p, 0p)

---

## 2. Kiến Trúc Hệ Thống

### 2.1. Sơ Đồ Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Screens  │  │ Services │  │ Contexts│  │  Utils   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │              │          │
│       └─────────────┴──────────────┴──────────────┘          │
│                          │                                    │
│                    API Wrapper (Axios)                        │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │ HTTPS/REST API
                           │ JWT Authentication
┌──────────────────────────┼────────────────────────────────────┐
│                    Express Server (Node.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Routes   │→ │Controllers│→ │ Models   │→ │ MongoDB  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │             │              │                          │
│       └─────────────┴──────────────┘                          │
│                          │                                    │
│  ┌────────────────────────────────────────────┐             │
│  │ Middleware: auth, validate, error, rate-limit│             │
│  └────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐
   │MongoDB  │      │  Cloudinary │    │  OpenAI   │
   │Database │      │  (Images)   │    │   (AI)    │
   └─────────┘      └─────────────┘    └──────────┘
```

### 2.2. Cấu Trúc Thư Mục

#### Mobile (`mobile/`)
```
mobile/
├── src/
│   ├── screens/          # Các màn hình chính
│   │   ├── Auth/         # Đăng nhập, đăng ký, OTP
│   │   ├── Dashboard/    # Trang chủ
│   │   ├── Medication/   # Quản lý thuốc
│   │   ├── Health/       # Theo dõi sức khỏe
│   │   ├── Caregiver/    # Dashboard người thân
│   │   ├── CaregiverPlus/# Chi tiết bệnh nhân cho người thân
│   │   ├── Chat/         # Chat giữa bệnh nhân và người thân
│   │   ├── AI/           # Chat với AI
│   │   └── ...
│   ├── components/       # Components tái sử dụng
│   ├── services/        # API service layer
│   ├── contexts/        # React Context (Auth, Alert)
│   ├── navigation/      # Navigation setup
│   ├── ui/              # UI primitives (Button, Input, Card...)
│   ├── utils/           # Utilities (logger, api-wrapper, permissions)
│   ├── types/           # TypeScript types
│   └── theme/           # Design tokens
├── App.tsx              # Entry point
└── index.js             # Root registration
```

#### Server (`server/`)
```
server/
├── src/
│   ├── app.js           # Express app setup
│   ├── server.js        # Server bootstrap
│   ├── routes/          # API routes
│   ├── controllers/     # Business logic
│   ├── models/          # Mongoose schemas
│   ├── middleware/      # auth, validate, error
│   ├── config/          # db, cloudinary, openai
│   └── utils/           # jwt, hash
```

---

## 3. Mobile (React Native)

### 3.1. Entry Points

#### `App.tsx`
**File:** `mobile/App.tsx`  
**Vai trò:** Root component, khởi tạo app và kiểm tra quyền thông báo  
**Module:** Core  
**Luồng liên quan:** Authentication, Notifications

**Logic:**
1. Kiểm tra quyền thông báo khi app khởi động
2. Nếu chưa có quyền → hiển thị `NotificationPermissionScreen`
3. Nếu đã có quyền → khởi tạo `AuthProvider` và `RootNavigator`
4. Setup `notifee.onForegroundEvent` để xử lý notifications khi app đang mở
5. Sync pending operations khi app mở hoặc trở lại foreground

#### `index.js`
**File:** `mobile/index.js`  
**Vai trò:** Entry point của React Native app  
**Module:** Core  
**Luồng liên quan:** Background notifications, TrackPlayer

**Logic:**
- Đăng ký app component với AppRegistry
- Đăng ký TrackPlayer service cho background playback
- Đăng ký `notifee.onBackgroundEvent` để xử lý notifications khi app ở background

#### `RootNavigator.tsx`
**File:** `mobile/src/navigation/RootNavigator.tsx`  
**Vai trò:** Điều hướng chính, quyết định hiển thị Auth hay Main  
**Module:** Navigation  
**Luồng liên quan:** Authentication flow

**Logic:**
- Sử dụng `useAuth()` để lấy `user` và `isLoading`
- Nếu `isLoading` → hiển thị loading spinner
- Nếu `user` tồn tại → hiển thị `TabsNavigator` (Main app)
- Nếu `user` null → hiển thị `AuthScreen`

#### `AuthContext.tsx`
**File:** `mobile/src/contexts/AuthContext.tsx`  
**Vai trò:** Quản lý state authentication toàn app  
**Module:** Context/Auth  
**Luồng liên quan:** Tất cả luồng liên quan đến auth

**State:**
- `user: User | null` - User hiện tại
- `isLoading: boolean` - Đang kiểm tra auth

**Methods:**
- `signIn(phone, password)` - Đăng nhập
- `signUp(data)` - Đăng ký
- `verify(phone, otp)` - Xác thực OTP
- `signOut()` - Đăng xuất
- `updateProfile(updatedUser)` - Cập nhật profile

**Logic:**
- Khi mount: gọi `getCurrentUser()` từ AsyncStorage
- Khi login/verify: lưu token và user vào AsyncStorage
- Khi logout: xóa token và user khỏi AsyncStorage

### 3.2. Screens

#### Auth Screens

**`AuthScreen.tsx`**
- **Mục đích:** Đăng nhập, đăng ký, xác thực OTP
- **UI chính:** Form đăng nhập/đăng ký, OTP input, role selector
- **State:** `phone`, `password`, `name`, `role`, `otpCode`, `otpCountdown`, `otpLoading`
- **Services:** `auth.service.ts` → `register()`, `login()`, `verifyOTP()`, `requestOTP()`
- **Luồng:**
  1. User nhập thông tin → gọi `register()` hoặc `login()`
  2. Nếu đăng ký → hiển thị OTP input → gọi `verifyOTP()`
  3. Nếu đăng nhập thành công → `AuthContext.signIn()` → navigate to Main

**`ForgotPasswordScreen.tsx`**
- **Mục đích:** Quên mật khẩu, reset bằng OTP
- **Services:** `auth.service.ts` → `forgotPassword()`, `resetPassword()`

#### Dashboard Screens

**`DashboardScreen.tsx`**
- **Mục đích:** Hiển thị reminders hôm nay, đánh dấu đã uống thuốc
- **UI chính:** List reminders, button "Đã uống", "Bỏ qua"
- **State:** `reminders`, `loading`
- **Services:** `medication.service.ts` → `getTodayReminders()`, `updateReminderStatus()`
- **Luồng:**
  1. Load reminders khi mount
  2. User click "Đã uống" → gọi `updateReminderStatus(id, 'TAKEN')`
  3. Nếu offline → queue operation → sync sau

**`CaregiverDashboardScreen.tsx`**
- **Mục đích:** Dashboard cho người thân, hiển thị danh sách bệnh nhân
- **UI chính:** List patients, filter (all, needsAttention, recentUpdate)
- **Services:** `caregiverPlus.service.ts` → `getPatients()`

#### Medication Screens

**`AddMedicationScreen.tsx`**
- **Mục đích:** Thêm thuốc mới với lịch uống
- **UI chính:** Form (name, dosage, unit, frequency, times, startDate)
- **Services:** `medication.service.ts` → `createMedication()`
- **Luồng:**
  1. User nhập thông tin → gọi `createMedication()`
  2. Backend tạo Medication và Reminders → trả về
  3. Frontend schedule notifications cho mỗi reminder

#### Health Tracking Screens

**`HealthTrackingScreen.tsx`**
- **Mục đích:** Ghi nhận bữa ăn, vận động, triệu chứng
- **UI chính:** Tabs (Bữa ăn, Vận động, Triệu chứng), form input, AI analysis button
- **Services:** 
  - `health.service.ts` → `createHealthLog()`
  - `ai.service.ts` → `estimateCalories()` (cho bữa ăn/vận động)
- **Luồng:**
  1. User chọn loại (meal/exercise/symptom)
  2. Nhập thông tin → có thể dùng AI để phân tích calories
  3. AI trả về calories + tên món ăn/loại vận động đã chuẩn hóa (tiếng Việt có dấu)
  4. Gọi `createHealthLog()` → backend lưu vào HealthLog collection

#### CaregiverPlus Screens

**`PatientListScreen.tsx`**
- **Mục đích:** Danh sách bệnh nhân được liên kết
- **Services:** `caregiverPlus.service.ts` → `getPatients()`

**`PatientDetailScreen.tsx`**
- **Mục đích:** Chi tiết một bệnh nhân: thuốc, bữa ăn, vận động, triệu chứng hôm nay
- **Services:** 
  - `caregiverPlus.service.ts` → `getTodayHealthLogs(patientId)`
  - `medication.service.ts` → `getTodayReminders(patientId)`

**`MedicationDetailScreen.tsx`**
- **Mục đích:** Chi tiết timeline thuốc của bệnh nhân
- **Services:** `caregiverPlus.service.ts` → `getMedicationTimeline(patientId)`

**`MealDetailScreen.tsx`**
- **Mục đích:** Chi tiết bữa ăn theo ngày (sáng, trưa, chiều, tối)
- **Services:** `caregiverPlus.service.ts` → `getTodayHealthLogs(patientId, 'meal')`

**`AlertsCenterScreen.tsx`**
- **Mục đích:** Trung tâm cảnh báo (thuốc trễ, triệu chứng nghiêm trọng, SOS)
- **Services:** `caregiverPlus.service.ts` → `getAlerts()`

**`ReportsAnalyticsScreen.tsx`**
- **Mục đích:** Báo cáo và phân tích cho bệnh nhân
- **Services:** `report.service.ts` → `getComprehensiveReport()`, `exportPDF()`

**`CaregiverAppointmentsScreen.tsx`**
- **Mục đích:** Quản lý lịch hẹn cho bệnh nhân
- **UI chính:** List appointments, form thêm appointment (DatePicker, TimePicker)
- **Services:** `caregiverPlus.service.ts` → `createAppointment(patientId, data)`

#### Chat Screens

**`ConversationListScreen.tsx`**
- **Mục đích:** Danh sách cuộc trò chuyện
- **Services:** `chat.service.ts` → `getConversations()`

**`ChatDetailScreen.tsx`**
- **Mục đích:** Chat giữa bệnh nhân và người thân
- **Services:** `chat.service.ts` → `getMessages(otherUserId)`, `sendMessage()`

#### AI Screens

**`ChatAIScreen.tsx`**
- **Mục đích:** Chat với AI assistant
- **Services:** `ai.service.ts` → `chatWithAI()`

### 3.3. Services

#### `api.ts` / `api-wrapper.ts`
**File:** `mobile/src/utils/api-wrapper.ts`  
**Vai trò:** Wrapper cho Axios, xử lý token, retry, error handling  
**Module:** Core/API

**Features:**
- Auto-attach JWT token từ AsyncStorage
- Retry logic với exponential backoff
- Handle 401 → clear auth storage
- Mock mode support (USE_MOCK_API)

#### `auth.service.ts`
**File:** `mobile/src/services/auth.service.ts`  
**Vai trò:** Authentication API calls  
**Functions:**
- `register(data)` → `POST /api/auth/register`
- `login(data)` → `POST /api/auth/login`
- `verifyOTP(phone, otp)` → `POST /api/auth/otp/verify`
- `requestOTP(phone)` → `POST /api/auth/otp/request`
- `logout()` → Clear AsyncStorage
- `getCurrentUser()` → Get từ AsyncStorage

#### `medication.service.ts`
**File:** `mobile/src/services/medication.service.ts`  
**Vai trò:** Medication và Reminder API calls  
**Functions:**
- `createMedication(data)` → `POST /api/medications`
- `getTodayReminders(userId?)` → `GET /api/medications/today`
- `updateReminderStatus(id, status)` → `PATCH /api/medications/:id/take`
- `getMedications()` → `GET /api/medications`
- `deleteMedication(id)` → `DELETE /api/medications/:id`

**Offline Support:**
- Nếu API fail → queue operation vào `sync.service.ts`

#### `health.service.ts`
**File:** `mobile/src/services/health.service.ts`  
**Vai trò:** Health logs API calls  
**Functions:**
- `createHealthLog(data)` → `POST /api/health/logs`
- `getTodayHealthLogs(userId?)` → `GET /api/health/today`
- `getScheduledTasks(userId?)` → `GET /api/health/scheduled`
- `updateHealthLog(id, data)` → `PATCH /api/health/logs/:id`

#### `notification.service.ts`
**File:** `mobile/src/services/notification.service.ts`  
**Vai trò:** Local push notifications với Notifee  
**Functions:**
- `scheduleMedicationReminder(title, body, scheduledTime, reminderId)` → Schedule 4 notifications (15p, 10p, 5p, 0p)
- `scheduleHealthLogReminder(...)` → Tương tự cho health logs
- `scheduleAppointmentReminder(...)` → Cho appointments
- `cancelNotification(id)` → Hủy một notification
- `cancelNotifications(ids)` → Hủy nhiều notifications

**Logic:**
- Tạo channel với `AndroidImportance.HIGH`, vibration, bypassDnd
- Schedule trigger notifications với `type: 0` (TIMESTAMP)
- Lưu notification IDs vào Reminder/HealthLog model để có thể cancel sau

#### `sync.service.ts`
**File:** `mobile/src/services/sync.service.ts`  
**Vai trò:** Offline sync queue  
**Functions:**
- `queueOperation(operation)` → Lưu vào AsyncStorage
- `syncPendingOperations()` → Sync tất cả pending operations lên server

**Storage Keys:**
- `@smartcare_pending_medications`
- `@smartcare_pending_health_logs`
- `@smartcare_pending_reminders`

### 3.4. Components

#### UI Primitives (`ui/`)

**`Button.tsx`**
- Props: `title`, `onPress`, `variant` (primary/secondary/outline/ghost), `size`, `loading`, `disabled`
- Animation: Scale và opacity với Reanimated

**`Input.tsx`**
- Props: `label`, `value`, `onChangeText`, `placeholder`, `error`, `secureTextEntry`
- Support label và error message

**`DatePicker.tsx`**
- Props: `value`, `onChange`, `label`
- Sử dụng React Native DatePicker

**`TimePicker.tsx`**
- Props: `value`, `onChange`, `label`
- Custom time picker UI

**`BottomSheet.tsx`**
- Props: `visible`, `onClose`, `height`, `children`
- ScrollView support cho nội dung dài

#### Reusable Components (`components/`)

**`AppHeader.tsx`**
- Header với title, back button, actions

**`EmptyState.tsx`**
- Empty state với icon, title, description

**`CustomAlert.tsx`**
- Custom alert dialog với types: success, error, warning, info

**`Logo.tsx`**
- Logo component với size options

### 3.5. Types

**File:** `mobile/src/types/index.ts`

**Các types quan trọng:**
- `User` - User object với role (PATIENT/CAREGIVER)
- `Medication` - Thuốc với frequency, times
- `Reminder` - Reminder với status (PENDING/TAKEN/SKIPPED), notificationIds
- `HealthLog` - Health log với type (meal/exercise/symptom), details, notificationIds
- `Appointment` - Lịch hẹn với doctorName, appointmentDate, appointmentTime
- `Alert` - Cảnh báo cho caregiver
- `PatientSummary` - Tóm tắt bệnh nhân cho caregiver

---

## 4. Server (Node.js/Express)

### 4.1. Bootstrap

#### `server.js`
**File:** `server/src/server.js`  
**Vai trò:** Entry point, khởi động server  
**Logic:**
1. Load `.env` với `dotenv`
2. Connect MongoDB với `connectDB()`
3. Start Express app trên PORT (default 4000)

#### `app.js`
**File:** `server/src/app.js`  
**Vai trò:** Express app setup, middleware, routes  
**Middleware:**
- `helmet()` - Security headers
- `cors()` - CORS
- `express.json()` - Parse JSON body (limit 10mb)
- `express.urlencoded()` - Parse URL-encoded
- Request logger
- Rate limiting (có thể disable qua env)

**Routes:**
- `/health` - Health check
- `/api/auth` - Authentication
- `/api/users` - User management
- `/api/medications` - Medications
- `/api/health` - Health logs
- `/api/reports` - Reports
- `/api/ai` - AI services
- `/api/upload` - File upload
- `/api/caregiver` - Caregiver features
- `/api/wellness` - Wellness logs
- `/api/settings` - Settings
- `/api/custom-reminders` - Custom reminders
- `/api/appointments` - Appointments
- `/api/chat` - Chat

### 4.2. Middleware

#### `auth.js`
**File:** `server/src/middleware/auth.js`  
**Vai trò:** JWT authentication  
**Logic:**
1. Extract token từ `Authorization: Bearer <token>`
2. Verify token với `verifyToken()`
3. Load user từ DB
4. Attach `req.user`

#### `validate.js`
**File:** `server/src/middleware/validate.js`  
**Vai trò:** Validate request body với Zod  
**Logic:**
- Nhận Zod schema
- Parse và validate `req.body`
- Nếu lỗi → trả 400 với error details

#### `error.js`
**File:** `server/src/middleware/error.js`  
**Vai trò:** Global error handler  
**Logic:**
- Catch tất cả errors
- Log error
- Trả JSON error response

### 4.3. Controllers

#### `auth.controller.js`
**File:** `server/src/controllers/auth.controller.js`  
**Vai trò:** Authentication logic

**Functions:**
- `register(req, res)` → Tạo user mới, generate OTP, trả về phone
- `requestOTP(req, res)` → Generate OTP mới cho user
- `verifyOTP(req, res)` → Verify OTP, set `isVerified: true`, trả về token
- `login(req, res)` → Verify password, trả về token
- `forgotPassword(req, res)` → Generate OTP cho reset password
- `resetPassword(req, res)` → Verify OTP, update password
- `changePassword(req, res)` → Verify current password, update password

**OTP Logic:**
- Generate 4-digit OTP: `Math.floor(1000 + Math.random() * 9000)`
- Expires sau 5 phút
- Log OTP ra console (demo, không gửi SMS thật)

#### `medication.controller.js`
**File:** `server/src/controllers/medication.controller.js`  
**Vai trò:** Medication và Reminder logic

**Functions:**
- `createMedication(req, res)` → Tạo Medication, generate Reminders cho mỗi time trong `times[]`
- `getTodayReminders(req, res)` → Lấy reminders hôm nay, có thể filter theo `userId` (cho caregiver)
- `updateReminderStatus(req, res)` → Update status (TAKEN/SKIPPED), set `takenAt`
- `getMedications(req, res)` → Lấy tất cả medications của user
- `deleteMedication(req, res)` → Xóa medication và tất cả reminders liên quan
- `getMissedMedications(req, res)` → Lấy reminders đã trễ (status PENDING, scheduledTime < now)

**Reminder Generation:**
- Với mỗi `time` trong `times[]`:
  - Nếu `frequency === 'DAILY'` → Tạo reminder cho mỗi ngày từ `startDate` đến 30 ngày sau
  - Nếu `frequency === 'EVERY_OTHER_DAY'` → Tạo reminder cách ngày

#### `health.controller.js`
**File:** `server/src/controllers/health.controller.js`  
**Vai trò:** Health logs logic

**Functions:**
- `createHealthLog(req, res)` → Tạo health log (meal/exercise/symptom)
- `getTodayHealthLogs(req, res)` → Lấy health logs hôm nay, có thể filter theo `userId` (cho caregiver)
- `getScheduledTasks(req, res)` → Lấy scheduled tasks chưa hoàn thành
- `updateHealthLog(req, res)` → Update health log (có thể mark `isCompleted: true`)
- `getHealthSummary(req, res)` → Tổng hợp calories, exercise minutes, symptoms

**Access Control:**
- Nếu `targetUserId !== req.user._id` → Kiểm tra caregiver có linked với patient không

#### `caregiver.controller.js`
**File:** `server/src/controllers/caregiver.controller.js`  
**Vai trò:** Caregiver features logic

**Functions:**
- `requestLink(req, res)` → Patient tạo link code để caregiver liên kết
- `acceptLink(req, res)` → Caregiver nhập code, tạo Link record
- `getPatients(req, res)` → Lấy danh sách patients được linked
- `getPatientDetail(req, res)` → Chi tiết một patient
- `getAlerts(req, res)` → Lấy alerts (medication missed, symptoms, SOS)
- `getMedicationTimeline(req, res)` → Timeline thuốc của patient
- `getMedicationWeekHistory(req, res)` → Lịch sử tuần của medication adherence
- `getDailyHealthSummary(req, res)` → Tổng hợp sức khỏe hôm nay
- `getAppointments(req, res)` → Lấy appointments của patient
- `getCareNotes(req, res)` → Lấy care notes
- `createCareNote(req, res)` → Tạo care note
- `getLocationStatus(req, res)` → Trạng thái vị trí (nếu có)
- `getEmergencyContacts(req, res)` → Danh sách liên hệ khẩn cấp
- `getPatientTasks(req, res)` → Tasks của patient (reminders + health logs scheduled)

#### `appointment.controller.js`
**File:** `server/src/controllers/appointment.controller.js`  
**Vai trò:** Appointment logic

**Functions:**
- `createAppointment(req, res)` → Tạo appointment
  - Nếu `req.body.userId` tồn tại và user là CAREGIVER → Tạo cho patient
  - Kiểm tra caregiver có linked với patient không
- `getAppointments(req, res)` → Lấy appointments của user hoặc patient
- `updateAppointment(req, res)` → Update appointment
- `deleteAppointment(req, res)` → Xóa appointment

#### `chat.controller.js`
**File:** `server/src/controllers/chat.controller.js`  
**Vai trò:** Chat logic

**Functions:**
- `sendMessage(req, res)` → Gửi tin nhắn
  - Kiểm tra quyền: patient ↔ caregiver phải linked hoặc có pending request
- `getConversations(req, res)` → Lấy danh sách conversations
- `getMessages(req, res)` → Lấy messages với một user
- `markAsRead(req, res)` → Đánh dấu đã đọc
- `getUnreadCount(req, res)` → Đếm tin nhắn chưa đọc

#### `report.controller.js`
**File:** `server/src/controllers/report.controller.js`  
**Vai trò:** Report và PDF export

**Functions:**
- `getComprehensiveReport(req, res)` → Tổng hợp báo cáo (medication adherence, health stats, wellness)
- `exportPDF(req, res)` → Xuất PDF (có thể dùng token trong query param)

#### `ai.controller.js`
**File:** `server/src/controllers/ai.controller.js`  
**Vai trò:** AI services với OpenAI

**Functions:**
- `estimateCalories(req, res)` → Phân tích calories từ ảnh hoặc text
  - Type: 'food' hoặc 'exercise'
  - AI trả về: `{ calories, foodName }` hoặc `{ calories, exerciseType }`
  - `foodName` và `exerciseType` được chuẩn hóa thành tiếng Việt có dấu
- `identifyDisease(req, res)` → Nhận diện bệnh từ triệu chứng
- `chatWithAI(req, res)` → Chat với AI assistant

### 4.4. Models

#### `User.js`
**Schema:**
```javascript
{
  name: String (required),
  phone: String (required, unique),
  passwordHash: String (required),
  role: String (enum: ['PATIENT', 'CAREGIVER']),
  caregiverId: ObjectId (ref: 'User'),
  caregiverPhone: String,
  email: String,
  isVerified: Boolean (default: false),
  medicalCondition: String (default: 'Normal', null for CAREGIVER),
  height: Number,
  weight: Number,
  otpCode: String,
  otpExpiresAt: Date,
  notificationSettings: {
    medicationReminderBefore: Number (default: 15),
    mealReminderBefore: Number (default: 15),
    exerciseReminderBefore: Number (default: 15),
    medicationEnabled: Boolean (default: true),
    mealEnabled: Boolean (default: true),
    exerciseEnabled: Boolean (default: true),
  },
  avatar: String,
  linkCode: String (unique, sparse), // Chỉ cho PATIENT
  timestamps: true
}
```

**Indexes:**
- `phone` (unique)

#### `Medication.js`
**Schema:**
```javascript
{
  userId: ObjectId (ref: 'User', required),
  name: String (required),
  dosage: String (required),
  unit: String (default: 'mg'),
  notes: String (default: ''),
  frequency: String (enum: ['DAILY', 'EVERY_OTHER_DAY']),
  times: [String], // Array of "HH:mm"
  startDate: Date (required),
  timestamps: true
}
```

#### `Reminder.js`
**Schema:**
```javascript
{
  medicationId: ObjectId (ref: 'Medication', required),
  medicationName: String (required),
  dosage: String (required),
  unit: String (required),
  scheduledTime: Date (required),
  status: String (enum: ['PENDING', 'TAKEN', 'SKIPPED'], default: 'PENDING'),
  takenAt: Date,
  isSynced: Boolean (default: true),
  lastUpdated: Date (default: Date.now),
  notificationIds: [String], // Array of notification IDs
  timestamps: true
}
```

**Indexes:**
- `{ medicationId: 1, scheduledTime: 1 }`

#### `HealthLog.js`
**Schema:**
```javascript
{
  userId: ObjectId (ref: 'User', required),
  date: Date (required),
  type: String (enum: ['meal', 'exercise', 'symptom']),
  scheduledDate: Date,
  scheduledTime: String, // "HH:mm"
  isCompleted: Boolean (default: false),
  notificationIds: [String],
  details: {
    foodName: String,
    calories: Number,
    exerciseType: String,
    durationMinutes: Number,
    caloriesBurned: Number,
    symptomName: String,
    severity: Number,
    note: String,
  },
  timestamps: true
}
```

**Indexes:**
- `{ userId: 1, date: -1 }`
- `{ userId: 1, scheduledDate: 1, scheduledTime: 1 }`

#### `Appointment.js`
**Schema:**
```javascript
{
  userId: ObjectId (ref: 'User', required),
  doctorName: String (required),
  doctorSpecialty: String (default: ''),
  hospitalName: String (default: ''),
  appointmentDate: Date (required),
  appointmentTime: String (default: ''), // "HH:mm"
  notes: String (default: ''),
  reminderBefore: Number (default: 24), // hours
  isCompleted: Boolean (default: false),
  notificationId: String,
  timestamps: true
}
```

**Indexes:**
- `{ userId: 1, appointmentDate: 1 }`
- `{ userId: 1, isCompleted: 1 }`

#### `Link.js`
**Schema:**
```javascript
{
  code: String (required, unique),
  patientId: ObjectId (ref: 'User', required),
  expiresAt: Date (required),
  timestamps: true
}
```

**Indexes:**
- `{ code: 1, expiresAt: 1 }`

#### `Message.js` (Chat)
**Schema:**
```javascript
{
  senderId: ObjectId (ref: 'User', required),
  receiverId: ObjectId (ref: 'User', required),
  content: String (required),
  messageType: String (enum: ['text', 'image', 'file']),
  imageUrl: String,
  isRead: Boolean (default: false),
  timestamps: true
}
```

**Indexes:**
- `{ senderId: 1, receiverId: 1, createdAt: -1 }`
- `{ receiverId: 1, isRead: 1 }`

#### `ChatMessage.js` (AI Chat)
**Schema:**
```javascript
{
  userId: ObjectId (ref: 'User', required),
  message: String (required),
  response: String (required),
  sender: String (enum: ['user', 'bot']),
  timestamp: Date (default: Date.now),
  timestamps: true
}
```

**Indexes:**
- `{ userId: 1, timestamp: -1 }`

### 4.5. Routes

Tất cả routes đều có prefix `/api/` và sử dụng `authenticate` middleware (trừ auth routes).

**Auth Routes** (`/api/auth`):
- `POST /register` - Đăng ký
- `POST /login` - Đăng nhập
- `POST /otp/request` - Yêu cầu OTP
- `POST /otp/verify` - Xác thực OTP
- `POST /forgot-password` - Quên mật khẩu
- `POST /reset-password` - Reset mật khẩu
- `POST /change-password` - Đổi mật khẩu (authenticate required)

**Medication Routes** (`/api/medications`):
- `POST /` - Tạo medication
- `GET /today` - Lấy reminders hôm nay
- `GET /missed` - Lấy reminders đã trễ
- `GET /` - Lấy tất cả medications
- `PATCH /:id/take` - Đánh dấu đã uống
- `PATCH /reminders/:id` - Update reminder
- `DELETE /reminders/:id` - Xóa reminder
- `DELETE /:id` - Xóa medication

**Health Routes** (`/api/health`):
- `POST /logs` - Tạo health log
- `GET /summary` - Tổng hợp sức khỏe
- `GET /scheduled` - Lấy scheduled tasks
- `GET /today` - Lấy health logs hôm nay
- `PATCH /logs/:id` - Update health log
- `DELETE /logs/:id` - Xóa health log

**Caregiver Routes** (`/api/caregiver`):
- `POST /link/request` - Tạo link code
- `POST /link/accept` - Chấp nhận link
- `GET /requests` - Lấy caregiver requests
- `POST /requests/respond` - Phản hồi request
- `GET /patients` - Lấy danh sách patients
- `GET /patients/:patientId` - Chi tiết patient
- `GET /alerts` - Lấy alerts
- `PATCH /alerts/:alertId/read` - Đánh dấu alert đã đọc
- `GET /patients/:patientId/medications/timeline` - Timeline thuốc
- `GET /patients/:patientId/medications/week-history` - Lịch sử tuần
- `GET /patients/:patientId/medications/adherence` - Tỷ lệ tuân thủ
- `GET /patients/:patientId/health/daily` - Tổng hợp sức khỏe hôm nay
- `GET /patients/:patientId/appointments` - Lịch hẹn
- `GET /patients/:patientId/notes` - Care notes
- `POST /patients/:patientId/notes` - Tạo care note
- `GET /patients/:patientId/location` - Trạng thái vị trí
- `GET /patients/:patientId/emergency-contacts` - Liên hệ khẩn cấp
- `GET /patients/:patientId/tasks` - Tasks
- `POST /patients/:patientId/tasks/:taskId/notify` - Gửi thông báo task

**Appointment Routes** (`/api/appointments`):
- `POST /` - Tạo appointment
- `GET /` - Lấy appointments
- `PATCH /:id` - Update appointment
- `DELETE /:id` - Xóa appointment

**Chat Routes** (`/api/chat`):
- `POST /send` - Gửi tin nhắn
- `GET /conversations` - Lấy conversations
- `GET /messages/:otherUserId` - Lấy messages
- `PATCH /messages/:messageId/read` - Đánh dấu đã đọc
- `GET /unread-count` - Đếm tin nhắn chưa đọc

**Report Routes** (`/api/reports`):
- `GET /overview` - Tổng hợp báo cáo
- `GET /export-pdf` - Xuất PDF (có thể dùng token trong query)

**AI Routes** (`/api/ai`):
- `POST /estimate-calories` - Phân tích calories
- `POST /identify-disease` - Nhận diện bệnh
- `POST /chat` - Chat với AI

---

## 5. Database (MongoDB)

### 5.1. Collections

1. **users** - Người dùng (PATIENT, CAREGIVER)
2. **medications** - Thuốc
3. **reminders** - Reminders (lịch uống thuốc)
4. **healthlogs** - Health logs (bữa ăn, vận động, triệu chứng)
5. **appointments** - Lịch hẹn
6. **links** - Link codes để liên kết caregiver-patient
7. **messages** - Tin nhắn giữa users
8. **chatmessages** - Tin nhắn với AI
9. **caregiverrequests** - Yêu cầu liên kết caregiver
10. **carenotes** - Ghi chú chăm sóc
11. **emergencycontacts** - Liên hệ khẩn cấp
12. **wellnesslogs** - Wellness logs (breathing, music)
13. **customreminders** - Nhắc nhở tùy chỉnh
14. **aireports** - Báo cáo AI
15. **alerts** - Cảnh báo

### 5.2. Quan Hệ

```
User (PATIENT)
  ├── caregiverId → User (CAREGIVER)
  └── linkCode → Link

User (CAREGIVER)
  └── caregiverId → User (PATIENT) [via Link]

Medication
  └── userId → User
  └── reminders[] → Reminder

Reminder
  └── medicationId → Medication

HealthLog
  └── userId → User

Appointment
  └── userId → User

Message
  ├── senderId → User
  └── receiverId → User

Link
  └── patientId → User
```

### 5.3. DBML Schema

```dbml
Table users {
  _id ObjectId [pk]
  name String
  phone String [unique]
  passwordHash String
  role Enum ['PATIENT', 'CAREGIVER']
  caregiverId ObjectId [ref: > users._id]
  caregiverPhone String
  email String
  isVerified Boolean
  medicalCondition String
  height Number
  weight Number
  otpCode String
  otpExpiresAt Date
  notificationSettings Object
  avatar String
  linkCode String [unique, sparse]
  createdAt Date
  updatedAt Date
}

Table medications {
  _id ObjectId [pk]
  userId ObjectId [ref: > users._id]
  name String
  dosage String
  unit String
  notes String
  frequency Enum ['DAILY', 'EVERY_OTHER_DAY']
  times String[]
  startDate Date
  createdAt Date
  updatedAt Date
}

Table reminders {
  _id ObjectId [pk]
  medicationId ObjectId [ref: > medications._id]
  medicationName String
  dosage String
  unit String
  scheduledTime Date
  status Enum ['PENDING', 'TAKEN', 'SKIPPED']
  takenAt Date
  isSynced Boolean
  lastUpdated Date
  notificationIds String[]
  createdAt Date
  updatedAt Date
}

Table healthlogs {
  _id ObjectId [pk]
  userId ObjectId [ref: > users._id]
  date Date
  type Enum ['meal', 'exercise', 'symptom']
  scheduledDate Date
  scheduledTime String
  isCompleted Boolean
  notificationIds String[]
  details Object
  createdAt Date
  updatedAt Date
}

Table appointments {
  _id ObjectId [pk]
  userId ObjectId [ref: > users._id]
  doctorName String
  doctorSpecialty String
  hospitalName String
  appointmentDate Date
  appointmentTime String
  notes String
  reminderBefore Number
  isCompleted Boolean
  notificationId String
  createdAt Date
  updatedAt Date
}

Table links {
  _id ObjectId [pk]
  code String [unique]
  patientId ObjectId [ref: > users._id]
  expiresAt Date
  createdAt Date
  updatedAt Date
}

Table messages {
  _id ObjectId [pk]
  senderId ObjectId [ref: > users._id]
  receiverId ObjectId [ref: > users._id]
  content String
  messageType Enum ['text', 'image', 'file']
  imageUrl String
  isRead Boolean
  createdAt Date
  updatedAt Date
}
```

---

## 6. Admin Panel (Đề Xuất)

### 6.1. Hiện Trạng

**Chưa có Admin Panel.** Hệ thống hiện chỉ có:
- Mobile app cho PATIENT và CAREGIVER
- Backend API

### 6.2. Đề Xuất Stack

**Option 1: Next.js + Ant Design**
- **Ưu điểm:** SSR, SEO tốt, Ant Design component library phong phú
- **Tech:** Next.js 14, Ant Design, TypeScript, Tailwind CSS

**Option 2: React + Material-UI**
- **Ưu điểm:** Material Design, component library lớn
- **Tech:** React 18, Material-UI (MUI), TypeScript, Vite

**Option 3: Vue.js + Element Plus**
- **Ưu điểm:** Dễ học, Element Plus đẹp
- **Tech:** Vue 3, Element Plus, TypeScript, Vite

**Khuyến nghị:** Option 1 (Next.js + Ant Design) vì:
- SSR tốt cho SEO
- Ant Design phù hợp với admin dashboard
- TypeScript support tốt

### 6.3. Modules Đề Xuất

1. **User Management**
   - Danh sách users (PATIENT, CAREGIVER)
   - Filter, search, pagination
   - Xem chi tiết user
   - Ban/unban user
   - Reset password

2. **Medication Management**
   - Xem tất cả medications
   - Xem reminders
   - Thống kê adherence rate

3. **Health Logs**
   - Xem tất cả health logs
   - Thống kê calories, exercise, symptoms

4. **Reports & Analytics**
   - Dashboard tổng quan
   - Charts: medication adherence, health trends
   - Export reports

5. **Chat Moderation**
   - Xem conversations
   - Xóa tin nhắn vi phạm
   - Ban users

6. **System Logs**
   - API logs
   - Error logs
   - User activity logs

7. **Settings**
   - System settings
   - Feature flags
   - Notification templates

### 6.4. API Routes Cần Thêm

```
GET    /api/admin/users              - Danh sách users
GET    /api/admin/users/:id          - Chi tiết user
PATCH  /api/admin/users/:id          - Update user
DELETE /api/admin/users/:id          - Ban user
GET    /api/admin/medications        - Tất cả medications
GET    /api/admin/health-logs        - Tất cả health logs
GET    /api/admin/reports            - Reports tổng hợp
GET    /api/admin/logs               - System logs
GET    /api/admin/analytics          - Analytics data
```

### 6.5. Authentication

- Admin login riêng (không dùng chung với user)
- Role-based access control (RBAC)
- JWT token với role `ADMIN`

---

## 7. Bảng Mapping Chi Tiết

### 7.1. Mobile Screen → Service → API Endpoint → Model

| Screen | Service Function | API Endpoint | Model | Response Shape |
|--------|-----------------|--------------|-------|----------------|
| `AuthScreen` | `register()` | `POST /api/auth/register` | User | `{ message, phone }` |
| `AuthScreen` | `login()` | `POST /api/auth/login` | User | `{ user, token }` |
| `AuthScreen` | `verifyOTP()` | `POST /api/auth/otp/verify` | User | `{ user, token }` |
| `DashboardScreen` | `getTodayReminders()` | `GET /api/medications/today` | Reminder[] | `{ reminders }` |
| `DashboardScreen` | `updateReminderStatus()` | `PATCH /api/medications/:id/take` | Reminder | `{ reminder }` |
| `AddMedicationScreen` | `createMedication()` | `POST /api/medications` | Medication | `{ medication }` |
| `HealthTrackingScreen` | `createHealthLog()` | `POST /api/health/logs` | HealthLog | `{ healthLog }` |
| `HealthTrackingScreen` | `estimateCalories()` | `POST /api/ai/estimate-calories` | - | `{ calories, foodName? }` |
| `PatientListScreen` | `getPatients()` | `GET /api/caregiver/patients` | PatientSummary[] | `{ patients }` |
| `PatientDetailScreen` | `getTodayHealthLogs()` | `GET /api/health/today?userId=...` | HealthLog[] | `{ healthLogs }` |
| `MedicationDetailScreen` | `getMedicationTimeline()` | `GET /api/caregiver/patients/:id/medications/timeline` | MedicationTimelineItem[] | `{ timeline }` |
| `AlertsCenterScreen` | `getAlerts()` | `GET /api/caregiver/alerts` | Alert[] | `{ alerts }` |
| `ReportsAnalyticsScreen` | `getComprehensiveReport()` | `GET /api/reports/overview` | ReportSummary | `{ report }` |
| `CaregiverAppointmentsScreen` | `createAppointment()` | `POST /api/appointments` | Appointment | `{ appointment }` |
| `ConversationListScreen` | `getConversations()` | `GET /api/chat/conversations` | Conversation[] | `{ conversations }` |
| `ChatDetailScreen` | `getMessages()` | `GET /api/chat/messages/:otherUserId` | Message[] | `{ messages }` |
| `ChatDetailScreen` | `sendMessage()` | `POST /api/chat/send` | Message | `{ message }` |
| `ChatAIScreen` | `chatWithAI()` | `POST /api/ai/chat` | ChatMessage | `{ response }` |

### 7.2. API Endpoint → Controller → Model → Response Example

| Endpoint | Controller | Model | Response Example |
|----------|-----------|-------|-----------------|
| `POST /api/auth/register` | `auth.controller.register` | User | `{ message: "Đăng ký thành công...", phone: "0912345678" }` |
| `POST /api/auth/login` | `auth.controller.login` | User | `{ user: { _id, name, phone, role, ... }, token: "..." }` |
| `POST /api/medications` | `medication.controller.createMedication` | Medication | `{ medication: { _id, name, dosage, times, ... } }` |
| `GET /api/medications/today` | `medication.controller.getTodayReminders` | Reminder[] | `{ reminders: [{ _id, medicationName, scheduledTime, status, ... }] }` |
| `PATCH /api/medications/:id/take` | `medication.controller.updateReminderStatus` | Reminder | `{ reminder: { _id, status: "TAKEN", takenAt: "..." } }` |
| `POST /api/health/logs` | `health.controller.createHealthLog` | HealthLog | `{ healthLog: { _id, type, details, date, ... } }` |
| `GET /api/caregiver/patients` | `caregiver.controller.getPatients` | User[] | `{ patients: [{ _id, name, phone, adherenceRate, ... }] }` |
| `GET /api/caregiver/alerts` | `caregiver.controller.getAlerts` | Alert[] | `{ alerts: [{ _id, type, severity, title, message, ... }] }` |
| `GET /api/reports/overview` | `report.controller.getComprehensiveReport` | ReportSummary | `{ medicationAdherence: {...}, healthStats: {...}, ... }` |
| `POST /api/chat/send` | `chat.controller.sendMessage` | Message | `{ message: { _id, senderId, receiverId, content, ... } }` |

---

## 8. Luồng Nghiệp Vụ

### 8.1. Flow Đăng Nhập + OTP

```
1. User mở app → RootNavigator kiểm tra user
2. Nếu chưa login → hiển thị AuthScreen
3. User chọn "Đăng ký" → nhập name, phone, password, role
4. Frontend gọi register() → POST /api/auth/register
5. Backend:
   - Validate input (Zod)
   - Check phone đã tồn tại chưa
   - Hash password
   - Generate OTP (4 digits)
   - Set otpExpiresAt = now + 5 minutes
   - Tạo User với isVerified: false
   - Log OTP ra console (demo)
   - Trả về { message, phone }
6. Frontend hiển thị OTP input
7. User nhập OTP → gọi verifyOTP(phone, otp)
8. Backend:
   - Tìm User theo phone
   - Check OTP đúng không
   - Check OTP hết hạn chưa
   - Set isVerified: true
   - Generate JWT token
   - Trả về { user, token }
9. Frontend:
   - Lưu token và user vào AsyncStorage
   - AuthContext.setUser(user)
   - Navigate to Main (TabsNavigator)

Flow OTP sai:
- Backend trả về error: "Mã OTP không đúng hoặc đã hết hạn"
- Frontend hiển thị error message
- User có thể request OTP lại
```

### 8.2. Flow Liên Kết Caregiver Bằng Mã

```
1. PATIENT vào Profile → tạo link code
   - Frontend: gọi requestLink() → POST /api/caregiver/link/request
   - Backend:
     - Generate unique code (6-8 ký tự)
     - Tạo Link record với expiresAt = now + 7 days
     - Trả về { code, expiresAt }
   - Frontend hiển thị code cho user

2. CAREGIVER vào LinkAccountScreen → nhập code
   - Frontend: gọi acceptLink(code) → POST /api/caregiver/link/accept
   - Backend:
     - Tìm Link theo code
     - Check code hết hạn chưa
     - Check CAREGIVER chưa linked với PATIENT này
     - Set CAREGIVER.caregiverId = PATIENT._id
     - Set PATIENT.caregiverId = CAREGIVER._id (optional, nếu cần)
     - Xóa Link record
     - Trả về { success: true }
   - Frontend: Navigate to PatientListScreen
```

### 8.3. Flow Quản Lý Thuốc + Reminder + Đánh Dấu Đã Uống

```
1. User thêm thuốc (AddMedicationScreen):
   - Nhập: name, dosage, unit, frequency, times[], startDate
   - Frontend: gọi createMedication() → POST /api/medications
   - Backend:
     - Validate input
     - Tạo Medication record
     - Với mỗi time trong times[]:
       - Nếu frequency === 'DAILY':
         - Tạo Reminder cho mỗi ngày từ startDate đến 30 ngày sau
       - Nếu frequency === 'EVERY_OTHER_DAY':
         - Tạo Reminder cách ngày
     - Trả về { medication }
   - Frontend:
     - Với mỗi Reminder được tạo:
       - Gọi scheduleMedicationReminder()
       - Schedule 4 notifications: 15p, 10p, 5p, 0p trước scheduledTime
       - Lưu notificationIds vào Reminder (qua API)

2. User xem reminders hôm nay (DashboardScreen):
   - Frontend: gọi getTodayReminders() → GET /api/medications/today
   - Backend:
     - Query Reminders với:
       - scheduledTime >= start of today
       - scheduledTime < start of tomorrow
       - status = 'PENDING'
     - Trả về { reminders }
   - Frontend hiển thị list reminders

3. User đánh dấu đã uống:
   - Click "Đã uống" → gọi updateReminderStatus(id, 'TAKEN')
   - Frontend: PATCH /api/medications/:id/take { status: 'TAKEN' }
   - Backend:
     - Update Reminder: status = 'TAKEN', takenAt = now
     - Cancel tất cả notifications còn lại (nếu có)
     - Trả về { reminder }
   - Frontend:
     - Cancel notifications: cancelNotifications(reminder.notificationIds)
     - Refresh list reminders
```

### 8.4. Flow Health Logs (Meal/Exercise/Symptom)

```
1. User ghi nhận bữa ăn (HealthTrackingScreen):
   - Chọn tab "Bữa ăn"
   - Nhập tên món ăn (hoặc chụp ảnh)
   - Có thể dùng AI phân tích:
     - Gọi estimateCalories(image hoặc text) → POST /api/ai/estimate-calories
     - Backend:
       - Gửi ảnh/text đến OpenAI
       - AI trả về: { calories, foodName } (foodName đã chuẩn hóa tiếng Việt có dấu)
     - Frontend tự động điền calories và foodName
   - Nhập scheduledDate, scheduledTime (nếu muốn nhắc nhở)
   - Click "Lưu" → gọi createHealthLog()
   - Frontend: POST /api/health/logs { type: 'meal', details: { foodName, calories }, scheduledDate, scheduledTime }
   - Backend:
     - Tạo HealthLog record
     - Nếu có scheduledDate/scheduledTime:
       - Schedule notifications (15p, 10p, 5p, 0p trước)
       - Lưu notificationIds vào HealthLog
     - Trả về { healthLog }
   - Frontend: Hiển thị success message

2. User ghi nhận vận động:
   - Tương tự bữa ăn, nhưng type = 'exercise'
   - AI trả về: { calories, exerciseType } (exerciseType đã chuẩn hóa)

3. User ghi nhận triệu chứng:
   - Type = 'symptom'
   - Nhập: symptomName, severity (1-10), note
   - Không có AI analysis
```

### 8.5. Flow Báo Cáo Ngày/Tuần/Tháng + Export PDF

```
1. User xem báo cáo (ReportScreen):
   - Chọn period: day/week/month
   - Frontend: gọi getComprehensiveReport(period) → GET /api/reports/overview?period=...
   - Backend:
     - Tính startDate và endDate dựa trên period
     - Query:
       - Reminders trong khoảng thời gian → tính adherence rate
       - HealthLogs → tổng hợp calories, exercise, symptoms
       - WellnessLogs → tổng hợp breathing/music sessions
     - Generate AI notes (nếu có OpenAI)
     - Trả về ReportSummary
   - Frontend hiển thị:
     - Medication adherence rate
     - Calories in/out chart
     - Exercise stats
     - Symptoms timeline
     - AI notes

2. User export PDF:
   - Click "Xuất PDF" → gọi exportPDF(period)
   - Frontend: GET /api/reports/export-pdf?period=...&token=...
   - Backend:
     - Generate PDF với PDFKit
     - Include: medication adherence, health stats, charts
     - Trả về PDF file
   - Frontend: Download và mở PDF
```

### 8.6. Flow Chat Realtime

```
1. User mở ConversationListScreen:
   - Frontend: gọi getConversations() → GET /api/chat/conversations
   - Backend:
     - Query Messages với senderId hoặc receiverId = currentUser
     - Group by otherUserId
     - Lấy tin nhắn cuối cùng và unread count
     - Trả về { conversations }
   - Frontend hiển thị list conversations

2. User mở ChatDetailScreen với một user:
   - Frontend: gọi getMessages(otherUserId) → GET /api/chat/messages/:otherUserId
   - Backend:
     - Query Messages với:
       - (senderId = currentUser AND receiverId = otherUserId) OR
       - (senderId = otherUserId AND receiverId = currentUser)
     - Sort by createdAt DESC
     - Trả về { messages }
   - Frontend hiển thị messages (có thể dùng FlatList với inverted)

3. User gửi tin nhắn:
   - Nhập content → gọi sendMessage()
   - Frontend: POST /api/chat/send { receiverId, content }
   - Backend:
     - Kiểm tra quyền: currentUser và receiverId phải linked hoặc có pending request
     - Tạo Message record
     - (Nếu có WebSocket) Emit event đến receiverId
     - Trả về { message }
   - Frontend: Thêm message vào list (optimistic update)

4. Realtime updates (nếu có WebSocket):
   - Khi có tin nhắn mới → Backend emit 'newMessage' event
   - Frontend listen event → Update messages list
```

### 8.7. Flow Push Notification

```
1. Khi tạo Reminder/HealthLog/Appointment:
   - Backend tạo record và trả về
   - Frontend nhận được response
   - Frontend gọi scheduleMedicationReminder() hoặc scheduleHealthLogReminder()
   - Notification service:
     - Tạo notification channel (nếu chưa có)
     - Schedule 4 trigger notifications:
       - 15 phút trước: title = "Nhắc nhở", body = "..."
       - 10 phút trước: title = "Nhắc nhở", body = "..."
       - 5 phút trước: title = "Nhắc nhở", body = "..."
       - 0 phút (đúng giờ): title = "⚠️ Trễ hẹn", body = "Bạn trễ hẹn! ..."
     - Mỗi notification có:
       - data: { reminderId, notificationType, minutesBefore }
       - android: { channelId, importance: HIGH, vibration, smallIcon }
     - Trigger type: 0 (TIMESTAMP), timestamp = notificationTime.getTime()
   - Lưu notificationIds vào Reminder/HealthLog model

2. Khi notification được trigger:
   - Nếu app đang mở (foreground):
     - notifee.onForegroundEvent được gọi
     - Notification vẫn hiển thị tự động
   - Nếu app ở background:
     - notifee.onBackgroundEvent được gọi (trong index.js)
     - Notification hiển thị trong notification tray

3. User click vào notification:
   - Event type = PRESS
   - Frontend có thể navigate đến screen tương ứng dựa trên data.notificationType

4. Khi user đánh dấu đã hoàn thành:
   - Frontend gọi cancelNotifications(notificationIds)
   - Hủy tất cả notifications còn lại
```

---

## 9. Chất Lượng & Rủi Ro

### 9.1. Security

#### ✅ Đã Có
- JWT authentication
- Password hashing với bcryptjs
- Rate limiting (có thể disable)
- Helmet cho security headers
- CORS configuration
- Input validation với Zod

#### ⚠️ Rủi Ro & Đề Xuất

**P0 (Critical):**
1. **OTP được log ra console** - Rủi ro: OTP có thể bị lộ trong logs
   - **Fix:** Không log OTP, chỉ log "OTP sent to phone: XXX"
   - **Hoặc:** Tích hợp SMS service thật (Twilio, AWS SNS)

2. **JWT secret có thể bị hardcode** - Rủi ro: Secret bị lộ
   - **Fix:** Đảm bảo JWT_SECRET trong `.env`, không commit `.env`

3. **Không có refresh token** - Rủi ro: Token hết hạn phải login lại
   - **Fix:** Implement refresh token mechanism

**P1 (High):**
4. **Rate limiting có thể disable** - Rủi ro: DDoS
   - **Fix:** Không cho disable trong production

5. **Không có input sanitization cho XSS** - Rủi ro: XSS trong chat/content
   - **Fix:** Sanitize user input, escape HTML

6. **File upload không validate file type/size** - Rủi ro: Upload malicious files
   - **Fix:** Validate file type, size, scan với antivirus

**P2 (Medium):**
7. **Không có CSRF protection** - Rủi ro: CSRF attacks
   - **Fix:** Implement CSRF tokens (nếu có web admin)

8. **Không có audit logging** - Rủi ro: Khó trace security incidents
   - **Fix:** Log tất cả sensitive operations (login, password change, etc.)

### 9.2. Reliability

#### ✅ Đã Có
- Offline sync queue với AsyncStorage
- Retry logic trong api-wrapper
- Error handling với try-catch
- Error boundary trong React Native

#### ⚠️ Rủi Ro & Đề Xuất

**P0:**
1. **Sync queue không có conflict resolution** - Rủi ro: Data conflict khi sync
   - **Fix:** Implement conflict resolution (last-write-wins hoặc merge)

2. **Không có database transactions** - Rủi ro: Partial updates khi có lỗi
   - **Fix:** Dùng MongoDB transactions cho operations phức tạp

**P1:**
3. **Không có health check cho MongoDB** - Rủi ro: App crash nếu DB down
   - **Fix:** Health check endpoint kiểm tra DB connection

4. **Notifications có thể bị miss nếu app bị kill** - Rủi ro: User không nhận được nhắc nhở
   - **Fix:** Dùng server-side push notifications (FCM) làm backup

**P2:**
5. **Không có retry cho failed sync operations** - Rủi ro: Data loss
   - **Fix:** Implement exponential backoff retry cho sync

### 9.3. Performance

#### ✅ Đã Có
- Indexes trên MongoDB (userId, scheduledTime, etc.)
- Pagination support (một số endpoints)
- Lazy loading screens trong RootNavigator

#### ⚠️ Rủi Ro & Đề Xuất

**P1:**
1. **Không có pagination cho một số endpoints** - Rủi ro: Slow với nhiều data
   - **Fix:** Thêm pagination cho: getMedications, getHealthLogs, getMessages

2. **Không có caching** - Rủi ro: Query DB nhiều lần
   - **Fix:** Cache user data, medications (với TTL)

3. **N+1 queries trong một số controllers** - Rủi ro: Slow queries
   - **Fix:** Dùng populate() hoặc aggregation để giảm queries

**P2:**
4. **Không có database connection pooling** - Rủi ro: Connection exhaustion
   - **Fix:** Configure Mongoose connection pool

5. **Large payloads không được compress** - Rủi ro: Slow network
   - **Fix:** Enable gzip compression trong Express

### 9.4. Maintainability

#### ✅ Đã Có
- TypeScript cho mobile
- Folder structure rõ ràng
- Separation of concerns (services, controllers, models)

#### ⚠️ Rủi Ro & Đề Xuất

**P1:**
1. **Code duplication** - Rủi ro: Khó maintain
   - **Fix:** Extract common logic vào utils/helpers

2. **Không có unit tests** - Rủi ro: Khó refactor
   - **Fix:** Viết tests cho controllers, services

3. **Inconsistent error handling** - Rủi ro: Khó debug
   - **Fix:** Standardize error format, dùng custom Error classes

**P2:**
4. **Không có API documentation (Swagger)** - Rủi ro: Khó onboard dev mới
   - **Fix:** Thêm Swagger/OpenAPI documentation

5. **Magic numbers/strings** - Rủi ro: Khó maintain
   - **Fix:** Extract vào constants file

---

## 10. TODO/Backlog

### P0 (Critical - Phải làm ngay)

1. **Security:**
   - [ ] Không log OTP ra console
   - [ ] Tích hợp SMS service thật (Twilio/AWS SNS)
   - [ ] Implement refresh token
   - [ ] Input sanitization cho XSS
   - [ ] Validate file upload (type, size)

2. **Reliability:**
   - [ ] Conflict resolution cho sync queue
   - [ ] MongoDB transactions cho complex operations
   - [ ] Health check endpoint cho DB

3. **Performance:**
   - [ ] Pagination cho tất cả list endpoints
   - [ ] Caching cho user data, medications

### P1 (High - Nên làm sớm)

4. **Features:**
   - [ ] WebSocket cho realtime chat
   - [ ] Server-side push notifications (FCM) làm backup
   - [ ] Admin panel (Next.js + Ant Design)

5. **Code Quality:**
   - [ ] Unit tests cho controllers
   - [ ] Integration tests cho API
   - [ ] E2E tests cho critical flows

6. **Documentation:**
   - [ ] Swagger/OpenAPI documentation
   - [ ] API usage examples
   - [ ] Deployment guide

### P2 (Medium - Có thể làm sau)

7. **Features:**
   - [ ] Voice commands
   - [ ] Fall detection improvements
   - [ ] Location tracking với geofencing
   - [ ] Video call giữa patient và caregiver

8. **Performance:**
   - [ ] Database connection pooling optimization
   - [ ] Gzip compression
   - [ ] CDN cho static assets

9. **Monitoring:**
   - [ ] Error tracking (Sentry)
   - [ ] Analytics (Mixpanel/Amplitude)
   - [ ] Performance monitoring (New Relic)

---

## 11. Quick Start

### 11.1. Server

```bash
cd server
npm install
cp "exam env" .env
# Chỉnh sửa .env với MongoDB URI, JWT_SECRET, OpenAI API key, Cloudinary credentials
npm run dev  # Development với nodemon
# hoặc
npm start    # Production
```

**Environment Variables:**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret cho JWT
- `OPENAI_API_KEY` - OpenAI API key
- `CLOUDINARY_URL` - Cloudinary credentials
- `PORT` - Server port (default: 4000)
- `RATE_LIMIT_DISABLED` - Disable rate limiting (default: false)
- `RATE_LIMIT_WINDOW_MINUTES` - Rate limit window (default: 15)
- `RATE_LIMIT_MAX` - Max requests per window (default: 100)

### 11.2. Mobile

```bash
cd mobile
npm install
cp "example env" .env
# Chỉnh sửa .env với API_BASE_URL (ví dụ: http://10.0.2.2:4000 cho Android emulator)
npm run android  # Chạy trên Android
# hoặc
npm run ios      # Chạy trên iOS
```

**Environment Variables:**
- `API_BASE_URL` - Backend API URL (ví dụ: `http://10.0.2.2:4000` cho Android emulator, `http://localhost:4000` cho iOS simulator)
- `USE_MOCK_API` - Sử dụng mock API (default: false)

### 11.3. Database Setup

1. Tạo MongoDB database (local hoặc MongoDB Atlas)
2. Update `MONGODB_URI` trong server `.env`
3. Server sẽ tự động tạo collections khi chạy lần đầu

### 11.4. Testing

**Test OTP:**
- Khi đăng ký, OTP được log ra console
- Nhập OTP đó vào app để verify

**Test Offline Sync:**
1. Tắt server
2. Tạo medication trong app
3. Bật server lại
4. App sẽ tự động sync khi mở lại

---

## Kết Luận

Tài liệu này cung cấp cái nhìn toàn diện về kiến trúc, code structure, và luồng nghiệp vụ của SmartCare. Để phát triển tiếp, nên ưu tiên các task P0 và P1, đặc biệt là security và reliability improvements.

**Liên hệ:** Nếu có câu hỏi hoặc cần clarification, vui lòng liên hệ team lead hoặc senior engineer.

---

**Chú ý:** Tài liệu này được tạo tự động từ codebase. Nếu code thay đổi, cần cập nhật tài liệu tương ứng.

