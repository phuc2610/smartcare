# SmartCare - Phân Tích Chức Năng Backend
# SmartCare - Phân Tích Chức Năng Backend

**Version:** 1.0.0  
**Ngày tạo:** 2024  
**Tác giả:** Senior Backend Engineer + Solution Architect

---

## Mục Lục

1. [Tổng Quan Backend](#1-tổng-quan-backend)
2. [Sơ Đồ Luồng Đi Tổng Thể](#2-sơ-đồ-luồng-đi-tổng-thể)
3. [Phân Tích Theo Từng Thư Mục](#3-phân-tích-theo-từng-thư-mục)
4. [API Map](#4-api-map)
5. [Model / Database Map](#5-model--database-map)
6. [Middleware & Security](#6-middleware--security)
7. [Realtime & Notification](#7-realtime--notification)
8. [Chạy Dự Án & Cấu Hình Môi Trường](#8-chạy-dự-án--cấu-hình-môi-trường)
9. [Tổng Kết + Backlog Cải Thiện](#9-tổng-kết--backlog-cải-thiện)

---

## 1. Tổng Quan Backend

### 1.1. Stack Công Nghệ

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Validation:** Zod
- **File Upload:** Multer + Cloudinary
- **AI Service:** OpenAI API
- **PDF Generation:** PDFKit
- **Security:** Helmet, CORS, express-rate-limit

### 1.2. Kiến Trúc Tổng Thể

```
Request → Middleware (helmet, cors, json parser, rate-limit)
       → Route Handler
       → Validate Middleware (Zod schema)
       → Auth Middleware (JWT verify)
       → Controller (Business Logic)
       → Model (MongoDB Query)
       → Response (JSON)
       → Error Handler (Global)
```

### 1.3. Luồng Dữ Liệu

1. **Request Flow:**
   - Client gửi HTTP request với JWT token trong header `Authorization: Bearer <token>`
   - Express middleware xử lý: helmet (security headers), cors, json parser
   - Rate limiting kiểm tra số lượng requests
   - Route handler nhận request
   - Validate middleware kiểm tra request body/query với Zod schema
   - Auth middleware verify JWT token và load user từ DB
   - Controller thực thi business logic
   - Model query MongoDB
   - Response trả về JSON

2. **Error Flow:**
   - Lỗi validation → 400 với error details
   - Lỗi authentication → 401
   - Lỗi authorization → 403
   - Lỗi not found → 404
   - Lỗi server → 500 với error message (stack trace trong development)

---

## 2. Sơ Đồ Luồng Đi Tổng Thể

### 2.1. Luồng Auth/Login/OTP

```
1. POST /api/auth/register
   → Validate: name, phone (regex), password (min 6), role
   → Check phone đã tồn tại?
   → Hash password với bcryptjs
   → Generate OTP (4 digits, random 1000-9999)
   → Set otpExpiresAt = now + 5 minutes
   → Create User với isVerified: false
   → Log OTP ra console (demo)
   → Response: { message, phone, requiresOTP: true }

2. POST /api/auth/otp/verify
   → Validate: phone, otp (4 digits)
   → Find User by phone
   → Check OTP matches và chưa hết hạn
   → Set isVerified: true, clear OTP
   → Generate JWT token
   → Response: { user, token }

3. POST /api/auth/login
   → Validate: phone, password
   → Find User by phone
   → Compare password với bcryptjs
   → Check isVerified: true
   → Generate JWT token
   → Response: { user, token }
```

### 2.2. Luồng Medication + Reminder + Mark Taken

```
1. POST /api/medications
   → Auth required
   → Validate: name, dosage, unit, frequency, times[], startDate
   → Create Medication record
   → generateRemindersForMedication():
      - Với mỗi time trong times[]:
        - Nếu frequency === 'DAILY': tạo reminder cho hôm nay
        - Nếu frequency === 'EVERY_OTHER_DAY': check ngày chẵn/lẻ
        - Tạo Reminder với scheduledTime = today + time
   → Response: { medication }

2. GET /api/medications/today
   → Auth required
   → Query Reminders với:
      - medicationId trong medications của user
      - scheduledTime >= start of today
      - scheduledTime < start of tomorrow
   → Sort by scheduledTime ASC
   → Response: { reminders }

3. PATCH /api/medications/:id/take
   → Auth required
   → Find Reminder by id
   → Update status: 'TAKEN' hoặc 'SKIPPED'
   → Nếu TAKEN: set takenAt = now
   → Update lastUpdated = now
   → Response: { reminder }
```

### 2.3. Luồng Health Logs (Meal/Exercise/Symptom)

```
1. POST /api/health/logs
   → Auth required
   → Validate: type (meal/exercise/symptom), date, scheduledDate, scheduledTime, details
   → Create HealthLog record
   → Response: { healthLog }

2. GET /api/health/today
   → Auth required
   → Query HealthLog với:
      - userId (có thể là patientId nếu caregiver)
      - type: meal hoặc exercise (không có symptom)
      - date hoặc scheduledDate trong hôm nay
   → Sort by scheduledTime, date
   → Response: { healthLogs }

3. GET /api/health/summary
   → Auth required
   → Query HealthLog trong range (7d/30d)
   → Tính toán:
      - caloriesIn từ meals
      - caloriesOut từ exercises
      - weeklyStats (7 ngày gần nhất)
   → Response: { logs, weeklyStats }
```

### 2.4. Luồng Report (Day/Week/Month) + Export PDF

```
1. GET /api/reports/overview?range=today|week|month|7d|30d
   → Auth required
   → Tính startDate và endDate dựa trên range
   → Query:
      - Reminders trong khoảng thời gian
      - HealthLogs (meals, exercises, symptoms)
      - WellnessLogs
   → Tính toán:
      - medicationAdherence (total, taken, skipped, rate)
      - healthStats (totalCaloriesIn, totalCaloriesOut)
      - exerciseStats (exercises[], totalCaloriesBurned, totalDurationMinutes)
      - wellnessStats (totalMinutes, sessionsCount)
      - symptomsByDate (grouped by date)
   → Response: { medicationAdherence, healthStats, exerciseStats, wellnessStats, symptomsByDate, meals, reminders }

2. GET /api/reports/export-pdf?range=...&token=...
   → Auth (có thể từ header hoặc query param token)
   → Lấy data giống getComprehensiveReport
   → Generate PDF với PDFKit:
      - Header: Tên người bệnh, SĐT, tình trạng
      - Section 1: Tuân thủ uống thuốc (bảng)
      - Section 2: Thống kê sức khỏe (calories)
      - Section 4: Bữa ăn (grouped by date)
      - Section 6: Thư giãn
      - Footer: Ngày xuất báo cáo
   → Response: PDF file (Content-Type: application/pdf)
```

### 2.5. Luồng Link Caregiver (Code 6 Số)

```
1. POST /api/caregiver/link/request
   → Auth required (PATIENT role)
   → Generate unique 6-digit code (100000-999999)
   → Check code chưa tồn tại trong User.linkCode
   → Set User.linkCode = code
   → Response: { code }

2. POST /api/caregiver/link/accept
   → Auth required (CAREGIVER role)
   → Validate: code (6 digits)
   → Find User với role='PATIENT' và linkCode=code
   → Check chưa có CaregiverRequest pending
   → Check chưa được linked
   → Create CaregiverRequest với status='pending'
   → Response: { success: true, message, patientName }

3. POST /api/caregiver/requests/respond
   → Auth required (PATIENT role)
   → Validate: requestId, response (accept/reject)
   → Find CaregiverRequest
   → Nếu accept:
      - Set Patient.caregiverId = Caregiver._id
      - Set CaregiverRequest.status = 'accepted'
   → Nếu reject:
      - Set CaregiverRequest.status = 'rejected'
   → Response: { success: true }
```

### 2.6. Luồng Chat Realtime

**Lưu ý:** Chưa tìm thấy WebSocket/Socket.io trong code. Chat hiện tại dùng REST API polling.

```
1. POST /api/chat/send
   → Auth required
   → Validate: receiverId, content (max 1000 chars), messageType, imageUrl
   → Check receiver tồn tại
   → Check permission:
      - PATIENT → CAREGIVER: phải linked hoặc có pending/accepted request
      - CAREGIVER → PATIENT: phải linked hoặc có pending/accepted request
   → Create Message record
   → Populate senderId và receiverId
   → Response: { message }

2. GET /api/chat/conversations
   → Auth required
   → Query Messages với senderId hoặc receiverId = currentUser
   → Group by otherUserId
   → Tính unreadCount cho mỗi conversation
   → Lấy lastMessage
   → Sort by updatedAt DESC
   → Response: { conversations }

3. GET /api/chat/messages/:otherUserId
   → Auth required
   → Query Messages với:
      - (senderId = currentUser AND receiverId = otherUserId) OR
      - (senderId = otherUserId AND receiverId = currentUser)
   → Sort by createdAt DESC
   → Response: { messages }
```

### 2.7. Luồng Push Notification

**Lưu ý:** Backend không có server-side push notification. Notifications được schedule ở mobile app với Notifee (local notifications).

- Backend chỉ lưu `notificationIds` trong Reminder và HealthLog models
- Mobile app tự schedule notifications với Notifee
- Backend không có FCM/Expo Push Notification setup

---

## 3. Phân Tích Theo Từng Thư Mục

### 3.1. Entry Points

#### `server.js`
**File:** `server/src/server.js`  
**Vai trò:** Bootstrap server, connect database  
**Input:** Environment variables (PORT, HOST, MONGODB_URI)  
**Output:** Server listening trên PORT  
**Luồng hoạt động:**
1. Load `.env` với `dotenv`
2. Require `app.js` (Express app)
3. Require `connectDB()` từ `config/db.js`
4. Gọi `connectDB()` để kết nối MongoDB
5. Start Express app với `app.listen(PORT, HOST)`

**Dependencies:** `dotenv`, `./app`, `./config/db`  
**Edge cases:** Nếu MongoDB connection fail → `process.exit(1)`  
**Cải thiện:** Nên có retry logic cho DB connection

#### `app.js`
**File:** `server/src/app.js`  
**Vai trò:** Express app setup, middleware, routes  
**Input:** HTTP requests  
**Output:** HTTP responses  
**Luồng hoạt động:**
1. Import Express và tạo app
2. Apply middleware:
   - `helmet()` - Security headers
   - `cors()` - CORS
   - `express.json({ limit: '10mb' })` - Parse JSON body
   - `express.urlencoded({ extended: true })` - Parse URL-encoded
   - Request logger (console.log)
   - Rate limiting (có thể disable qua env)
3. Health check route: `GET /health`
4. Mount routes:
   - `/api/auth` → authRoutes
   - `/api/users` → userRoutes
   - `/api/medications` → medicationRoutes
   - `/api/health` → healthRoutes
   - `/api/reports` → reportRoutes
   - `/api/ai` → aiRoutes
   - `/api/upload` → uploadRoutes
   - `/api/caregiver` → caregiverRoutes
   - `/api/wellness` → wellnessRoutes
   - `/api/settings` → settingsRoutes
   - `/api/custom-reminders` → customReminderRoutes
   - `/api/appointments` → appointmentRoutes
   - `/api/chat` → chatRoutes
5. Error handler middleware (cuối cùng)

**Dependencies:** Express, helmet, cors, rate-limit, tất cả routes, error middleware  
**Edge cases:** Rate limiting có thể disable → không an toàn trong production  
**Cải thiện:** Không cho disable rate limit trong production

### 3.2. Middleware

#### `auth.js`
**File:** `server/src/middleware/auth.js`  
**Vai trò:** JWT authentication middleware  
**Input:** `req.headers.authorization` (Bearer token)  
**Output:** `req.user` (User object) hoặc 401 error  
**Luồng hoạt động:**
1. Extract token từ `Authorization: Bearer <token>`
2. Nếu không có token → 401 "No token provided"
3. Verify token với `verifyToken()` từ `utils/jwt.js`
4. Nếu verify fail → 401 "Invalid token"
5. Load User từ DB với `User.findById(decoded.userId)`
6. Nếu user không tồn tại → 401 "User not found"
7. Attach user vào `req.user` (không có passwordHash)
8. Call `next()`

**Dependencies:** `../utils/jwt`, `../models/User`  
**Edge cases:** Token hết hạn, token không hợp lệ, user bị xóa  
**Cải thiện:** Nên có refresh token mechanism

#### `validate.js`
**File:** `server/src/middleware/validate.js`  
**Vai trò:** Validate request body/query/params với Zod schema  
**Input:** Zod schema, `req.body`, `req.query`, `req.params`  
**Output:** Call `next()` hoặc 400 error với details  
**Luồng hoạt động:**
1. Nhận Zod schema làm parameter
2. Return middleware function
3. Parse `{ body, query, params }` với schema
4. Nếu parse fail → 400 với error details
5. Nếu parse success → call `next()`

**Dependencies:** Zod  
**Edge cases:** Schema không match → trả về error details  
**Cải thiện:** Có thể thêm custom error messages

#### `error.js`
**File:** `server/src/middleware/error.js`  
**Vai trò:** Global error handler  
**Input:** Error object, req, res, next  
**Output:** JSON error response  
**Luồng hoạt động:**
1. Log error ra console
2. Lấy statusCode từ `err.statusCode` hoặc default 500
3. Lấy message từ `err.message` hoặc "Internal Server Error"
4. Response JSON với error message
5. Nếu NODE_ENV === 'development': thêm stack trace

**Dependencies:** None  
**Edge cases:** Unhandled errors → 500  
**Cải thiện:** Nên có error tracking service (Sentry)

### 3.3. Controllers

#### `auth.controller.js`
**File:** `server/src/controllers/auth.controller.js`  
**Vai trò:** Authentication logic (register, login, OTP, password reset)  
**Functions:**
- `register(req, res)` - Đăng ký user mới
- `requestOTP(req, res)` - Yêu cầu OTP mới
- `verifyOTP(req, res)` - Xác thực OTP và verify user
- `login(req, res)` - Đăng nhập với phone/password
- `forgotPassword(req, res)` - Quên mật khẩu (generate OTP)
- `resetPassword(req, res)` - Reset mật khẩu với OTP
- `changePassword(req, res)` - Đổi mật khẩu (authenticated)

**Schemas:** registerSchema, loginSchema, otpVerifySchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema

**Luồng register:**
1. Validate input với Zod
2. Check phone đã tồn tại → 400
3. Hash password với bcryptjs
4. Generate OTP (4 digits)
5. Set otpExpiresAt = now + 5 minutes
6. Create User với isVerified: false
7. Log OTP ra console (demo)
8. Response 201 với message và phone

**Dependencies:** `../models/User`, `../utils/hash`, `../utils/jwt`, `zod`  
**Edge cases:** Phone duplicate, OTP hết hạn, password yếu  
**Cải thiện:** 
- Không log OTP ra console (security risk)
- Tích hợp SMS service thật
- Implement refresh token

#### `medication.controller.js`
**File:** `server/src/controllers/medication.controller.js`  
**Vai trò:** Medication và Reminder management  
**Functions:**
- `createMedication(req, res)` - Tạo medication và generate reminders
- `getTodayReminders(req, res)` - Lấy reminders hôm nay
- `updateReminderStatus(req, res)` - Update status (TAKEN/SKIPPED)
- `updateReminder(req, res)` - Update reminder (time, dosage)
- `getMedications(req, res)` - Lấy tất cả medications
- `deleteMedication(req, res)` - Xóa medication và reminders
- `deleteReminder(req, res)` - Xóa một reminder
- `getMissedMedications(req, res)` - Lấy reminders đã trễ

**Helper:** `generateRemindersForMedication(medication)` - Generate reminders cho medication

**Luồng createMedication:**
1. Validate input với Zod
2. Create Medication record
3. Gọi `generateRemindersForMedication()`:
   - Với mỗi time trong times[]:
     - Nếu frequency === 'DAILY': tạo reminder cho hôm nay
     - Nếu frequency === 'EVERY_OTHER_DAY': check ngày chẵn/lẻ
     - Tạo Reminder với scheduledTime = today + time
4. Response 201 với medication

**Dependencies:** `../models/Medication`, `../models/Reminder`, `zod`  
**Edge cases:** Medication không có times, startDate trong quá khứ  
**Cải thiện:** 
- Generate reminders cho nhiều ngày (hiện tại chỉ cho hôm nay)
- Validate startDate không trong quá khứ

#### `health.controller.js`
**File:** `server/src/controllers/health.controller.js`  
**Vai trò:** Health logs management (meal, exercise, symptom)  
**Functions:**
- `createHealthLog(req, res)` - Tạo health log
- `getTodayHealthLogs(req, res)` - Lấy health logs hôm nay (có access control cho caregiver)
- `getHealthSummary(req, res)` - Tổng hợp sức khỏe (calories, weekly stats)
- `getScheduledTasks(req, res)` - Lấy scheduled tasks chưa hoàn thành
- `updateHealthLog(req, res)` - Update health log
- `deleteHealthLog(req, res)` - Xóa health log

**Luồng getTodayHealthLogs:**
1. Lấy targetUserId từ query hoặc req.user._id
2. Nếu targetUserId !== req.user._id:
   - Verify caregiver có access (patient.caregiverId === caregiver._id)
3. Query HealthLog với:
   - userId = targetUserId
   - type: meal hoặc exercise (không có symptom)
   - date hoặc scheduledDate trong hôm nay
4. Sort by scheduledTime, date
5. Response với healthLogs

**Dependencies:** `../models/HealthLog`, `../models/User`, `zod`  
**Edge cases:** Caregiver không có quyền truy cập patient data  
**Cải thiện:** Có thể thêm pagination

#### `caregiver.controller.js`
**File:** `server/src/controllers/caregiver.controller.js`  
**Vai trò:** Caregiver features (link, patients, alerts, tracking)  
**Functions:**
- `requestLink(req, res)` - PATIENT tạo link code
- `acceptLink(req, res)` - CAREGIVER accept link (tạo request)
- `getCaregiverRequests(req, res)` - Lấy requests cho PATIENT
- `respondToRequest(req, res)` - PATIENT accept/reject request
- `getPatients(req, res)` - Lấy danh sách patients với stats
- `getPatientDetail(req, res)` - Chi tiết một patient
- `getAlerts(req, res)` - Lấy alerts (symptoms)
- `markAlertAsRead(req, res)` - Đánh dấu alert đã đọc
- `getMedicationTimeline(req, res)` - Timeline thuốc của patient
- `getMedicationWeekHistory(req, res)` - Lịch sử tuần
- `getMedicationAdherence(req, res)` - Tỷ lệ tuân thủ
- `getDailyHealthSummary(req, res)` - Tổng hợp sức khỏe hôm nay
- `getAppointments(req, res)` - Lịch hẹn của patient
- `getCareNotes(req, res)` - Care notes
- `createCareNote(req, res)` - Tạo care note
- `getLocationStatus(req, res)` - Trạng thái vị trí (placeholder)
- `getEmergencyContacts(req, res)` - Liên hệ khẩn cấp
- `getPatientTasks(req, res)` - Tasks (reminders + health logs scheduled)
- `sendTaskNotification(req, res)` - Gửi thông báo task (placeholder)

**Luồng getPatients:**
1. Verify user là CAREGIVER
2. Query Users với caregiverId = currentUser._id
3. Với mỗi patient:
   - Tính adherenceRate (7 ngày gần nhất)
   - Đếm unreadAlerts
   - Tính needsAttention (adherenceRate < 70 hoặc unreadAlerts > 0)
   - Tính lastUpdate (từ reminders hoặc health logs)
4. Apply filter (all/needsAttention/recentUpdate)
5. Response với patients array

**Dependencies:** Nhiều models (User, Link, CaregiverRequest, Medication, Reminder, HealthLog, Alert, etc.)  
**Edge cases:** Patient không tồn tại, caregiver không có quyền  
**Cải thiện:** Có thể cache patient stats

#### `report.controller.js`
**File:** `server/src/controllers/report.controller.js`  
**Vai trò:** Report generation và PDF export  
**Functions:**
- `getComprehensiveReport(req, res)` - Tổng hợp báo cáo JSON
- `exportPDF(req, res)` - Xuất PDF

**Luồng exportPDF:**
1. Lấy userId từ req.user hoặc query token
2. Verify token nếu có trong query
3. Tính startDate và endDate dựa trên range
4. Query data giống getComprehensiveReport
5. Generate PDF với PDFKit:
   - Header với thông tin user
   - Section 1: Tuân thủ uống thuốc (bảng)
   - Section 2: Thống kê sức khỏe
   - Section 4: Bữa ăn (grouped by date)
   - Section 6: Thư giãn
   - Footer với ngày xuất
6. Pipe PDF to response

**Dependencies:** `pdfkit`, nhiều models  
**Edge cases:** Token không hợp lệ, không có data  
**Cải thiện:** Có thể thêm charts vào PDF

#### `chat.controller.js`
**File:** `server/src/controllers/chat.controller.js`  
**Vai trò:** Chat giữa patient và caregiver  
**Functions:**
- `sendMessage(req, res)` - Gửi tin nhắn
- `getConversations(req, res)` - Lấy danh sách conversations
- `getMessages(req, res)` - Lấy messages với một user
- `markAsRead(req, res)` - Đánh dấu đã đọc
- `getUnreadCount(req, res)` - Đếm tin nhắn chưa đọc

**Luồng sendMessage:**
1. Validate input với Zod
2. Check receiver tồn tại
3. Check permission:
   - PATIENT → CAREGIVER: phải linked hoặc có pending/accepted request
   - CAREGIVER → PATIENT: phải linked hoặc có pending/accepted request
4. Create Message record
5. Populate senderId và receiverId
6. Response 201 với message

**Dependencies:** `../models/Message`, `../models/User`, `../models/CaregiverRequest`, `zod`  
**Edge cases:** Không có quyền nhắn tin, receiver không tồn tại  
**Cải thiện:** 
- Implement WebSocket cho realtime
- Thêm typing indicators

#### `ai.controller.js`
**File:** `server/src/controllers/ai.controller.js`  
**Vai trò:** AI services với OpenAI  
**Functions:**
- `chat(req, res)` - Chat với AI assistant
- `parseMedication(req, res)` - Parse medication từ ảnh/text
- `estimateCalories(req, res)` - Ước tính calories cho food/exercise
- `identifyDisease(req, res)` - Nhận diện bệnh từ triệu chứng
- `getHealthRecommendations(req, res)` - Gợi ý sức khỏe
- `analyzeReport(req, res)` - Phân tích báo cáo
- `getChatHistory(req, res)` - Lấy lịch sử chat với AI

**Luồng chat:**
1. Check OpenAI API key có tồn tại
2. Lấy medicalCondition của user
3. Build system instruction dựa trên medicalCondition
4. Load chat history (5 messages gần nhất)
5. Gọi OpenAI API với messages (system + history + current)
6. Lưu message vào ChatMessage model
7. Response với AI response

**Dependencies:** `../config/openai`, `../models/ChatMessage`, `zod`  
**Edge cases:** OpenAI API fail, API key không có  
**Cải thiện:** 
- Có thể cache responses
- Rate limiting cho AI endpoints

### 3.4. Models

#### `User.js`
**File:** `server/src/models/User.js`  
**Vai trò:** User schema (PATIENT, CAREGIVER)  
**Fields:**
- `name` (String, required)
- `phone` (String, required, unique)
- `passwordHash` (String, required)
- `role` (enum: PATIENT, CAREGIVER, required)
- `caregiverId` (ObjectId, ref: User, default: null)
- `caregiverPhone` (String, default: null)
- `email` (String, default: null)
- `isVerified` (Boolean, default: false)
- `medicalCondition` (String, default: 'Normal', null for CAREGIVER)
- `height` (Number, default: null)
- `weight` (Number, default: null)
- `otpCode` (String, default: null)
- `otpExpiresAt` (Date, default: null)
- `notificationSettings` (Object với các settings)
- `avatar` (String, default: null)
- `linkCode` (String, unique, sparse) - Chỉ cho PATIENT
- `timestamps` (createdAt, updatedAt)

**Indexes:** `phone` (unique)  
**Quan hệ:** `caregiverId` → User (CAREGIVER)

#### `Medication.js`
**File:** `server/src/models/Medication.js`  
**Vai trò:** Medication schema  
**Fields:**
- `userId` (ObjectId, ref: User, required)
- `name` (String, required)
- `dosage` (String, required)
- `unit` (String, default: 'mg')
- `notes` (String, default: '')
- `frequency` (enum: DAILY, EVERY_OTHER_DAY, required)
- `times` ([String]) - Array of "HH:mm"
- `startDate` (Date, required)
- `timestamps`

**Quan hệ:** `userId` → User

#### `Reminder.js`
**File:** `server/src/models/Reminder.js`  
**Vai trò:** Reminder schema (lịch uống thuốc)  
**Fields:**
- `medicationId` (ObjectId, ref: Medication, required)
- `medicationName` (String, required)
- `dosage` (String, required)
- `unit` (String, required)
- `scheduledTime` (Date, required)
- `status` (enum: PENDING, TAKEN, SKIPPED, default: PENDING)
- `takenAt` (Date, default: null)
- `isSynced` (Boolean, default: true)
- `lastUpdated` (Date, default: Date.now)
- `notificationIds` ([String]) - Array of notification IDs
- `timestamps`

**Indexes:** `{ medicationId: 1, scheduledTime: 1 }`  
**Quan hệ:** `medicationId` → Medication

#### `HealthLog.js`
**File:** `server/src/models/HealthLog.js`  
**Vai trò:** Health log schema (meal, exercise, symptom)  
**Fields:**
- `userId` (ObjectId, ref: User, required)
- `date` (Date, required)
- `type` (enum: meal, exercise, symptom, required)
- `scheduledDate` (Date) - Ngày dự kiến
- `scheduledTime` (String) - "HH:mm"
- `isCompleted` (Boolean, default: false)
- `notificationIds` ([String])
- `details` (Object):
  - `foodName` (String)
  - `calories` (Number)
  - `exerciseType` (String)
  - `durationMinutes` (Number)
  - `caloriesBurned` (Number)
  - `symptomName` (String)
  - `severity` (Number)
  - `note` (String)
- `timestamps`

**Indexes:** 
- `{ userId: 1, date: -1 }`
- `{ userId: 1, scheduledDate: 1, scheduledTime: 1 }`

**Quan hệ:** `userId` → User

#### `Appointment.js`
**File:** `server/src/models/Appointment.js`  
**Vai trò:** Appointment schema  
**Fields:**
- `userId` (ObjectId, ref: User, required)
- `doctorName` (String, required)
- `doctorSpecialty` (String, default: '')
- `hospitalName` (String, default: '')
- `appointmentDate` (Date, required)
- `appointmentTime` (String, default: '') - "HH:mm"
- `notes` (String, default: '')
- `reminderBefore` (Number, default: 24) - hours
- `isCompleted` (Boolean, default: false)
- `notificationId` (String, default: null)
- `timestamps`

**Indexes:**
- `{ userId: 1, appointmentDate: 1 }`
- `{ userId: 1, isCompleted: 1 }`

**Quan hệ:** `userId` → User

#### `Message.js`
**File:** `server/src/models/Message.js`  
**Vai trò:** Chat message schema  
**Fields:**
- `senderId` (ObjectId, ref: User, required)
- `receiverId` (ObjectId, ref: User, required)
- `content` (String, required, trim)
- `messageType` (enum: text, image, file, default: text)
- `imageUrl` (String, default: null)
- `isRead` (Boolean, default: false)
- `readAt` (Date, default: null)
- `timestamps`

**Indexes:**
- `{ senderId: 1, receiverId: 1, createdAt: -1 }`
- `{ receiverId: 1, senderId: 1, createdAt: -1 }`
- `{ receiverId: 1, isRead: 1 }`

**Quan hệ:** `senderId` → User, `receiverId` → User

#### `Link.js`
**File:** `server/src/models/Link.js`  
**Vai trò:** Link code schema (để liên kết caregiver-patient)  
**Fields:**
- `code` (String, required, unique)
- `patientId` (ObjectId, ref: User, required)
- `expiresAt` (Date, required)
- `timestamps`

**Indexes:** `{ code: 1, expiresAt: 1 }`  
**Quan hệ:** `patientId` → User

**Lưu ý:** Model này có vẻ không được sử dụng. Link code được lưu trực tiếp trong User.linkCode.

#### `CaregiverRequest.js`
**File:** `server/src/models/CaregiverRequest.js`  
**Vai trò:** Caregiver request schema  
**Fields:**
- `patientId` (ObjectId, ref: User, required)
- `caregiverId` (ObjectId, ref: User, required)
- `status` (enum: pending, accepted, rejected, default: pending)
- `requestedAt` (Date, default: Date.now)
- `respondedAt` (Date, default: null)
- `timestamps`

**Indexes:**
- `{ patientId: 1, caregiverId: 1 }`
- `{ patientId: 1, status: 1 }`
- `{ caregiverId: 1, status: 1 }`

**Quan hệ:** `patientId` → User, `caregiverId` → User

### 3.5. Utils

#### `jwt.js`
**File:** `server/src/utils/jwt.js`  
**Vai trò:** JWT token generation và verification  
**Functions:**
- `generateToken(userId)` - Generate JWT token với expiresIn (default: 7d)
- `verifyToken(token)` - Verify JWT token và return decoded

**Dependencies:** `jsonwebtoken`, `process.env.JWT_SECRET`, `process.env.JWT_EXPIRES_IN`  
**Edge cases:** Secret không có, token hết hạn  
**Cải thiện:** Implement refresh token

#### `hash.js`
**File:** `server/src/utils/hash.js`  
**Vai trò:** Password hashing với bcryptjs  
**Functions:**
- `hashPassword(password)` - Hash password với salt rounds = 10
- `comparePassword(password, hashedPassword)` - Compare password với hash

**Dependencies:** `bcryptjs`  
**Edge cases:** Password quá dài  
**Cải thiện:** Có thể tăng salt rounds

### 3.6. Config

#### `db.js`
**File:** `server/src/config/db.js`  
**Vai trò:** MongoDB connection  
**Functions:**
- `connectDB()` - Connect to MongoDB với MONGODB_URI

**Dependencies:** `mongoose`, `process.env.MONGODB_URI`  
**Edge cases:** Connection fail → `process.exit(1)`  
**Cải thiện:** Retry logic, connection pooling

#### `openai.js`
**File:** `server/src/config/openai.js`  
**Vai trò:** OpenAI client setup  
**Logic:**
- Check `process.env.OPENAI_API_KEY`
- Nếu không có → export null (AI endpoints sẽ disabled)
- Nếu có → tạo OpenAI client và export

**Dependencies:** `openai`, `process.env.OPENAI_API_KEY`  
**Edge cases:** API key không hợp lệ  
**Cải thiện:** Validate API key format

#### `cloudinary.js`
**File:** `server/src/config/cloudinary.js`  
**Vai trò:** Cloudinary client setup  
**Logic:**
- Config Cloudinary với:
  - `cloud_name` từ env
  - `api_key` từ env
  - `api_secret` từ env
- Export cloudinary client

**Dependencies:** `cloudinary`, env variables  
**Edge cases:** Credentials không hợp lệ  
**Cải thiện:** Validate credentials

---

## 4. API Map

### 4.1. Authentication APIs

| Method | Endpoint | Auth | Role | Controller | Request Body | Response Success | Error Cases |
|--------|----------|------|------|------------|--------------|------------------|-------------|
| POST | `/api/auth/register` | No | - | `auth.controller.register` | `{ name, phone, password, role }` | `{ message, phone, requiresOTP }` | 400: Phone đã tồn tại, validation error |
| POST | `/api/auth/login` | No | - | `auth.controller.login` | `{ phone, password }` | `{ user, token }` | 401: Sai phone/password, 403: Chưa verify |
| POST | `/api/auth/otp/request` | No | - | `auth.controller.requestOTP` | `{ phone }` | `{ message, phone }` | 404: Phone chưa đăng ký |
| POST | `/api/auth/otp/verify` | No | - | `auth.controller.verifyOTP` | `{ phone, otp }` | `{ user, token }` | 400: OTP sai/hết hạn |
| POST | `/api/auth/forgot-password` | No | - | `auth.controller.forgotPassword` | `{ phone }` | `{ message, phone }` | 404: Phone chưa đăng ký |
| POST | `/api/auth/reset-password` | No | - | `auth.controller.resetPassword` | `{ phone, otp, newPassword }` | `{ message, user, token }` | 400: OTP sai/hết hạn |
| POST | `/api/auth/change-password` | Yes | - | `auth.controller.changePassword` | `{ currentPassword, newPassword }` | `{ message }` | 400: Password sai, 404: User không tồn tại |

### 4.2. Medication APIs

| Method | Endpoint | Auth | Role | Controller | Request Body | Response Success | Error Cases |
|--------|----------|------|------|------------|--------------|------------------|-------------|
| POST | `/api/medications` | Yes | - | `medication.controller.createMedication` | `{ name, dosage, unit, frequency, times[], startDate }` | `{ medication }` | 400: Validation error |
| GET | `/api/medications/today` | Yes | - | `medication.controller.getTodayReminders` | Query: `userId?` | `{ reminders }` | 500: Server error |
| GET | `/api/medications/missed` | Yes | - | `medication.controller.getMissedMedications` | Query: `userId?` | `{ missedReminders }` | 500: Server error |
| GET | `/api/medications` | Yes | - | `medication.controller.getMedications` | - | `{ medications }` | 500: Server error |
| PATCH | `/api/medications/:id/take` | Yes | - | `medication.controller.updateReminderStatus` | `{ status }` | `{ reminder }` | 404: Reminder không tồn tại |
| PATCH | `/api/medications/reminders/:id` | Yes | - | `medication.controller.updateReminder` | `{ scheduledTime?, dosage?, unit? }` | `{ reminder }` | 404: Reminder không tồn tại |
| DELETE | `/api/medications/reminders/:id` | Yes | - | `medication.controller.deleteReminder` | - | `{ message }` | 403: Access denied, 404: Reminder không tồn tại |
| DELETE | `/api/medications/:id` | Yes | - | `medication.controller.deleteMedication` | - | `{ message }` | 500: Server error |

### 4.3. Health APIs

| Method | Endpoint | Auth | Role | Controller | Request Body | Response Success | Error Cases |
|--------|----------|------|------|------------|--------------|------------------|-------------|
| POST | `/api/health/logs` | Yes | - | `health.controller.createHealthLog` | `{ type, date?, scheduledDate?, scheduledTime?, details }` | `{ healthLog }` | 400: Validation error |
| GET | `/api/health/today` | Yes | - | `health.controller.getTodayHealthLogs` | Query: `userId?` | `{ healthLogs }` | 403: Access denied, 404: User không tồn tại |
| GET | `/api/health/summary` | Yes | - | `health.controller.getHealthSummary` | Query: `userId?, range?` | `{ logs, weeklyStats }` | 500: Server error |
| GET | `/api/health/scheduled` | Yes | - | `health.controller.getScheduledTasks` | Query: `date?` | `{ healthLogs }` | 500: Server error |
| PATCH | `/api/health/logs/:id` | Yes | - | `health.controller.updateHealthLog` | `{ type?, date?, details?, isCompleted? }` | `{ healthLog }` | 404: Health log không tồn tại |
| DELETE | `/api/health/logs/:id` | Yes | - | `health.controller.deleteHealthLog` | - | `{ message }` | 404: Health log không tồn tại |

### 4.4. Caregiver APIs

| Method | Endpoint | Auth | Role | Controller | Request Body | Response Success | Error Cases |
|--------|----------|------|------|------------|--------------|------------------|-------------|
| POST | `/api/caregiver/link/request` | Yes | PATIENT | `caregiver.controller.requestLink` | `{}` | `{ code }` | 403: Không phải PATIENT |
| POST | `/api/caregiver/link/accept` | Yes | CAREGIVER | `caregiver.controller.acceptLink` | `{ code }` | `{ success, message, patientName }` | 400: Code không hợp lệ, đã linked |
| GET | `/api/caregiver/requests` | Yes | PATIENT | `caregiver.controller.getCaregiverRequests` | - | `{ requests }` | 403: Không phải PATIENT |
| POST | `/api/caregiver/requests/respond` | Yes | PATIENT | `caregiver.controller.respondToRequest` | `{ requestId, response }` | `{ success }` | 400: Request không tồn tại |
| GET | `/api/caregiver/patients` | Yes | CAREGIVER | `caregiver.controller.getPatients` | Query: `filter?` | `{ patients }` | 403: Không phải CAREGIVER |
| GET | `/api/caregiver/patients/:patientId` | Yes | CAREGIVER | `caregiver.controller.getPatientDetail` | - | `{ patient }` | 403: Access denied, 404: Patient không tồn tại |
| GET | `/api/caregiver/alerts` | Yes | CAREGIVER | `caregiver.controller.getAlerts` | Query: `patientId?` | `{ alerts }` | 403: Không phải CAREGIVER |
| PATCH | `/api/caregiver/alerts/:alertId/read` | Yes | CAREGIVER | `caregiver.controller.markAlertAsRead` | - | `{ success }` | 403: Access denied, 404: Alert không tồn tại |
| GET | `/api/caregiver/patients/:patientId/medications/timeline` | Yes | CAREGIVER | `caregiver.controller.getMedicationTimeline` | Query: `date?` | `{ timeline }` | 403: Access denied |
| GET | `/api/caregiver/patients/:patientId/medications/week-history` | Yes | CAREGIVER | `caregiver.controller.getMedicationWeekHistory` | - | `{ history }` | 403: Access denied |
| GET | `/api/caregiver/patients/:patientId/medications/adherence` | Yes | CAREGIVER | `caregiver.controller.getMedicationAdherence` | - | `{ adherence }` | 403: Access denied |
| GET | `/api/caregiver/patients/:patientId/health/daily` | Yes | CAREGIVER | `caregiver.controller.getDailyHealthSummary` | - | `{ summary }` | 403: Access denied |
| GET | `/api/caregiver/patients/:patientId/appointments` | Yes | CAREGIVER | `caregiver.controller.getAppointments` | - | `{ appointments }` | 403: Access denied |
| GET | `/api/caregiver/patients/:patientId/notes` | Yes | CAREGIVER | `caregiver.controller.getCareNotes` | - | `{ notes }` | 403: Access denied |
| POST | `/api/caregiver/patients/:patientId/notes` | Yes | CAREGIVER | `caregiver.controller.createCareNote` | `{ content, tags[] }` | `{ note }` | 403: Access denied |
| GET | `/api/caregiver/patients/:patientId/location` | Yes | CAREGIVER | `caregiver.controller.getLocationStatus` | - | `{ location }` | 403: Access denied |
| GET | `/api/caregiver/patients/:patientId/emergency-contacts` | Yes | CAREGIVER | `caregiver.controller.getEmergencyContacts` | - | `{ contacts }` | 403: Access denied |
| GET | `/api/caregiver/patients/:patientId/tasks` | Yes | CAREGIVER | `caregiver.controller.getPatientTasks` | - | `{ tasks }` | 403: Access denied |
| POST | `/api/caregiver/patients/:patientId/tasks/:taskId/notify` | Yes | CAREGIVER | `caregiver.controller.sendTaskNotification` | `{ message }` | `{ success }` | 403: Access denied |

### 4.5. Report APIs

| Method | Endpoint | Auth | Role | Controller | Request Body | Response Success | Error Cases |
|--------|----------|------|------|------------|--------------|------------------|-------------|
| GET | `/api/reports/overview` | Yes | - | `report.controller.getComprehensiveReport` | Query: `userId?, range?` | `{ medicationAdherence, healthStats, ... }` | 500: Server error |
| GET | `/api/reports/export-pdf` | Yes* | - | `report.controller.exportPDF` | Query: `userId?, range?, token?` | PDF file | 401: Unauthorized, 404: User không tồn tại |

*Có thể dùng token trong query param

### 4.6. Chat APIs

| Method | Endpoint | Auth | Role | Controller | Request Body | Response Success | Error Cases |
|--------|----------|------|------|------------|--------------|------------------|-------------|
| POST | `/api/chat/send` | Yes | - | `chat.controller.sendMessage` | `{ receiverId, content, messageType?, imageUrl? }` | `{ message }` | 403: Không có quyền, 404: Receiver không tồn tại |
| GET | `/api/chat/conversations` | Yes | - | `chat.controller.getConversations` | - | `{ conversations }` | 500: Server error |
| GET | `/api/chat/messages/:otherUserId` | Yes | - | `chat.controller.getMessages` | Query: `limit?, offset?` | `{ messages }` | 500: Server error |
| PATCH | `/api/chat/messages/:messageId/read` | Yes | - | `chat.controller.markAsRead` | - | `{ success }` | 404: Message không tồn tại |
| GET | `/api/chat/unread-count` | Yes | - | `chat.controller.getUnreadCount` | - | `{ count }` | 500: Server error |

### 4.7. AI APIs

| Method | Endpoint | Auth | Role | Controller | Request Body | Response Success | Error Cases |
|--------|----------|------|------|------------|--------------|------------------|-------------|
| POST | `/api/ai/chat` | Yes | - | `ai.controller.chat` | `{ message }` | `{ response }` | 503: AI service disabled |
| GET | `/api/ai/chat/history` | Yes | - | `ai.controller.getChatHistory` | Query: `limit?` | `{ messages }` | 500: Server error |
| POST | `/api/ai/medication/parse` | Yes | - | `ai.controller.parseMedication` | `{ imageUrl?, instruction? }` | `{ medication }` | 400: Thiếu imageUrl/instruction, 503: AI disabled |
| POST | `/api/ai/meal/estimate` | Yes | - | `ai.controller.estimateCalories` | `{ query, type }` | `{ calories, foodName? }` | 503: AI disabled |
| POST | `/api/ai/disease/identify` | Yes | - | `ai.controller.identifyDisease` | `{ symptoms[] }` | `{ disease, confidence }` | 503: AI disabled |
| POST | `/api/ai/health/recommendations` | Yes | - | `ai.controller.getHealthRecommendations` | `{ context }` | `{ recommendations }` | 503: AI disabled |
| POST | `/api/ai/report/analyze` | Yes | - | `ai.controller.analyzeReport` | `{ reportData }` | `{ analysis }` | 503: AI disabled |

### 4.8. Other APIs

| Method | Endpoint | Auth | Role | Controller | Request Body | Response Success | Error Cases |
|--------|----------|------|------|------------|--------------|------------------|-------------|
| GET | `/api/users/me` | Yes | - | `user.controller.getMe` | - | `{ user }` | 500: Server error |
| PATCH | `/api/users/me` | Yes | - | `user.controller.updateProfile` | `{ height?, weight?, medicalCondition?, avatar? }` | `{ user }` | 404: User không tồn tại |
| POST | `/api/upload/image` | Yes | - | `upload.controller.uploadImage` | FormData: `image` | `{ url, publicId }` | 400: No file, 500: Upload failed |
| POST | `/api/wellness/log` | Yes | - | `wellness.controller.logWellness` | `{ type, durationSeconds }` | `{ wellnessLog }` | 400: Duration too short |
| POST | `/api/appointments` | Yes | - | `appointment.controller.createAppointment` | `{ doctorName, appointmentDate, ... }` | `{ appointment }` | 403: Access denied (caregiver) |
| GET | `/api/appointments` | Yes | - | `appointment.controller.getAppointments` | Query: `upcoming?, completed?` | `{ appointments }` | 500: Server error |
| PATCH | `/api/appointments/:id` | Yes | - | `appointment.controller.updateAppointment` | `{ doctorName?, ... }` | `{ appointment }` | 404: Appointment không tồn tại |
| DELETE | `/api/appointments/:id` | Yes | - | `appointment.controller.deleteAppointment` | - | `{ message }` | 404: Appointment không tồn tại |
| POST | `/api/custom-reminders` | Yes | - | `customReminder.controller.createCustomReminder` | `{ title, reminderTime, ... }` | `{ reminder }` | 400: Validation error |
| GET | `/api/custom-reminders` | Yes | - | `customReminder.controller.getCustomReminders` | - | `{ reminders }` | 500: Server error |
| PATCH | `/api/custom-reminders/:id` | Yes | - | `customReminder.controller.updateCustomReminder` | `{ title?, ... }` | `{ reminder }` | 404: Reminder không tồn tại |
| DELETE | `/api/custom-reminders/:id` | Yes | - | `customReminder.controller.deleteCustomReminder` | - | `{ message }` | 404: Reminder không tồn tại |

---

## 5. Model / Database Map

### 5.1. Collections

1. **users** - Người dùng (PATIENT, CAREGIVER)
2. **medications** - Thuốc
3. **reminders** - Reminders (lịch uống thuốc)
4. **healthlogs** - Health logs (bữa ăn, vận động, triệu chứng)
5. **appointments** - Lịch hẹn
6. **messages** - Tin nhắn giữa users
7. **chatmessages** - Tin nhắn với AI
8. **links** - Link codes (không được sử dụng, code lưu trong User.linkCode)
9. **caregiverrequests** - Yêu cầu liên kết caregiver
10. **carenotes** - Ghi chú chăm sóc
11. **emergencycontacts** - Liên hệ khẩn cấp
12. **alerts** - Cảnh báo
13. **wellnesslogs** - Wellness logs (breathing, music)
14. **customreminders** - Nhắc nhở tùy chỉnh
15. **aireports** - Báo cáo AI

### 5.2. Schema Details

#### User Schema
```javascript
{
  name: String (required),
  phone: String (required, unique),
  passwordHash: String (required),
  role: enum ['PATIENT', 'CAREGIVER'] (required),
  caregiverId: ObjectId (ref: User, default: null),
  caregiverPhone: String (default: null),
  email: String (default: null),
  isVerified: Boolean (default: false),
  medicalCondition: String (default: 'Normal', null for CAREGIVER),
  height: Number (default: null),
  weight: Number (default: null),
  otpCode: String (default: null),
  otpExpiresAt: Date (default: null),
  notificationSettings: {
    medicationReminderBefore: Number (default: 15),
    mealReminderBefore: Number (default: 15),
    exerciseReminderBefore: Number (default: 15),
    medicationEnabled: Boolean (default: true),
    mealEnabled: Boolean (default: true),
    exerciseEnabled: Boolean (default: true),
  },
  avatar: String (default: null),
  linkCode: String (unique, sparse), // Chỉ cho PATIENT
  timestamps: true
}
```

**Indexes:** `phone` (unique)

#### Medication Schema
```javascript
{
  userId: ObjectId (ref: User, required),
  name: String (required),
  dosage: String (required),
  unit: String (default: 'mg'),
  notes: String (default: ''),
  frequency: enum ['DAILY', 'EVERY_OTHER_DAY'] (required),
  times: [String], // Array of "HH:mm"
  startDate: Date (required),
  timestamps: true
}
```

#### Reminder Schema
```javascript
{
  medicationId: ObjectId (ref: Medication, required),
  medicationName: String (required),
  dosage: String (required),
  unit: String (required),
  scheduledTime: Date (required),
  status: enum ['PENDING', 'TAKEN', 'SKIPPED'] (default: 'PENDING'),
  takenAt: Date (default: null),
  isSynced: Boolean (default: true),
  lastUpdated: Date (default: Date.now),
  notificationIds: [String], // Array of notification IDs
  timestamps: true
}
```

**Indexes:** `{ medicationId: 1, scheduledTime: 1 }`

#### HealthLog Schema
```javascript
{
  userId: ObjectId (ref: User, required),
  date: Date (required),
  type: enum ['meal', 'exercise', 'symptom'] (required),
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

### 5.3. Quan Hệ

```
User (PATIENT)
  ├── caregiverId → User (CAREGIVER)
  └── linkCode (unique, sparse)

User (CAREGIVER)
  └── (có thể có nhiều patients qua caregiverId)

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

CaregiverRequest
  ├── patientId → User
  └── caregiverId → User
```

### 5.4. Validation

- **Zod schemas** được định nghĩa trong controllers
- **Mongoose schema validation** chỉ có required, enum, default
- Không có custom validators trong Mongoose schemas

---

## 6. Middleware & Security

### 6.1. Authentication Middleware

**File:** `server/src/middleware/auth.js`

**JWT Flow:**
1. Extract token từ `Authorization: Bearer <token>`
2. Verify token với `jwt.verify(token, JWT_SECRET)`
3. Load user từ DB với `User.findById(decoded.userId)`
4. Attach user vào `req.user`

**Role Check:**
- Không có role-based middleware riêng
- Role check được thực hiện trong controllers
- Ví dụ: `if (req.user.role !== 'CAREGIVER') return res.status(403)`

**Rủi ro:**
- Không có refresh token → user phải login lại khi token hết hạn
- Token không có expiration check trong middleware (chỉ trong jwt.verify)

### 6.2. Validation Middleware

**File:** `server/src/middleware/validate.js`

**Schema Validation:**
- Sử dụng Zod schemas
- Validate `req.body`, `req.query`, `req.params`
- Error format: `{ error: 'Validation error', details: error.errors }`

**Rủi ro:**
- Không có input sanitization cho XSS
- Không có SQL injection protection (nhưng dùng MongoDB nên ít rủi ro)

### 6.3. Error Handler

**File:** `server/src/middleware/error.js`

**Error Response Format:**
```json
{
  "error": "Error message",
  "stack": "..." // Chỉ trong development
}
```

**Rủi ro:**
- Stack trace có thể leak thông tin trong development
- Không có error tracking service

### 6.4. Security Features

#### ✅ Đã Có
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate limiting** - express-rate-limit (có thể disable)
- **JWT authentication** - Token-based auth
- **Password hashing** - bcryptjs với salt rounds = 10
- **Input validation** - Zod schemas

#### ⚠️ Rủi Ro & Khuyến Nghị

**P0 (Critical):**
1. **OTP được log ra console** - Rủi ro: OTP có thể bị lộ trong logs
   - **Fix:** Không log OTP, chỉ log "OTP sent to phone: XXX"
   - **Hoặc:** Tích hợp SMS service thật (Twilio, AWS SNS)

2. **Rate limiting có thể disable** - Rủi ro: DDoS
   - **Fix:** Không cho disable trong production

3. **Không có input sanitization** - Rủi ro: XSS trong chat/content
   - **Fix:** Sanitize user input, escape HTML

4. **JWT secret có thể bị hardcode** - Rủi ro: Secret bị lộ
   - **Fix:** Đảm bảo JWT_SECRET trong `.env`, không commit `.env`

**P1 (High):**
5. **File upload không validate file type** - Rủi ro: Upload malicious files
   - **Fix:** Validate file type, size, scan với antivirus

6. **Không có refresh token** - Rủi ro: User phải login lại
   - **Fix:** Implement refresh token mechanism

7. **Không có CSRF protection** - Rủi ro: CSRF attacks
   - **Fix:** Implement CSRF tokens (nếu có web admin)

**P2 (Medium):**
8. **Không có audit logging** - Rủi ro: Khó trace security incidents
   - **Fix:** Log tất cả sensitive operations

9. **Error messages có thể leak thông tin** - Rủi ro: Information disclosure
   - **Fix:** Generic error messages trong production

---

## 7. Realtime & Notification

### 7.1. Realtime Communication

**Chưa tìm thấy WebSocket/Socket.io trong code.**

Chat hiện tại dùng REST API polling:
- Client phải poll `/api/chat/messages/:otherUserId` để lấy messages mới
- Không có realtime updates

**Khuyến nghị:**
- Implement Socket.io cho realtime chat
- Events: `message`, `typing`, `read`
- Rooms: `user:${userId}`

### 7.2. Push Notifications

**Backend không có server-side push notifications.**

- Notifications được schedule ở mobile app với Notifee (local notifications)
- Backend chỉ lưu `notificationIds` trong Reminder và HealthLog models
- Không có FCM/Expo Push Notification setup

**Khuyến nghị:**
- Implement FCM cho Android và APNs cho iOS
- Lưu FCM tokens trong User model
- Gửi push notifications khi có events quan trọng (medication missed, alert, etc.)

---

## 8. Chạy Dự Án & Cấu Hình Môi Trường

### 8.1. Environment Variables

**File:** `.env` (tạo từ `exam env`)

**Required Variables:**
- `MONGODB_URI` - MongoDB connection string (ví dụ: `mongodb://localhost:27017/smartcare`)
- `JWT_SECRET` - Secret cho JWT token (ví dụ: `your-secret-key`)
- `JWT_EXPIRES_IN` - Token expiration (default: `7d`)
- `PORT` - Server port (default: `4000`)
- `HOST` - Server host (default: `0.0.0.0`)

**Optional Variables:**
- `OPENAI_API_KEY` - OpenAI API key (nếu không có thì AI endpoints disabled)
- `OPENAI_MODEL` - OpenAI model (default: `gpt-4o-mini`)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `CLOUDINARY_FOLDER` - Cloudinary folder (default: `smartcare`)
- `RATE_LIMIT_DISABLED` - Disable rate limiting (default: `false`)
- `RATE_LIMIT_WINDOW_MINUTES` - Rate limit window (default: `15`)
- `RATE_LIMIT_MAX` - Max requests per window (default: `100`)
- `NODE_ENV` - Environment (development/production)

### 8.2. Scripts

**File:** `server/package.json`

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js"
  }
}
```

**Chạy Development:**
```bash
cd server
npm install
cp "exam env" .env
# Chỉnh sửa .env với các giá trị cần thiết
npm run dev
```

**Chạy Production:**
```bash
npm start
```

### 8.3. Test với Postman

**1. Test Register + OTP:**
```
POST http://localhost:4000/api/auth/register
Body (JSON):
{
  "name": "Test User",
  "phone": "0912345678",
  "password": "123456",
  "role": "PATIENT"
}

Response: { message, phone, requiresOTP }
→ Check console log để lấy OTP

POST http://localhost:4000/api/auth/otp/verify
Body (JSON):
{
  "phone": "0912345678",
  "otp": "1234" // OTP từ console
}

Response: { user, token }
```

**2. Test Get Today Reminders:**
```
GET http://localhost:4000/api/medications/today
Headers:
  Authorization: Bearer <token>

Response: { reminders }
```

---

## 9. Tổng Kết + Backlog Cải Thiện

### 9.1. P0 (Critical - Phải Sửa Ngay)

1. **Security:**
   - [ ] Không log OTP ra console
   - [ ] Tích hợp SMS service thật (Twilio/AWS SNS)
   - [ ] Không cho disable rate limiting trong production
   - [ ] Input sanitization cho XSS
   - [ ] Validate file upload (type, size)

2. **Reliability:**
   - [ ] Retry logic cho MongoDB connection
   - [ ] Health check endpoint cho DB connection
   - [ ] Error tracking service (Sentry)

3. **Functionality:**
   - [ ] Generate reminders cho nhiều ngày (hiện tại chỉ cho hôm nay)
   - [ ] Implement refresh token

### 9.2. P1 (High - Nên Làm Sớm)

4. **Features:**
   - [ ] WebSocket cho realtime chat (Socket.io)
   - [ ] Server-side push notifications (FCM/APNs)
   - [ ] Pagination cho list endpoints

5. **Performance:**
   - [ ] Caching cho user data, medications
   - [ ] Database connection pooling optimization
   - [ ] Index optimization

6. **Code Quality:**
   - [ ] Unit tests cho controllers
   - [ ] Integration tests cho API
   - [ ] API documentation (Swagger)

### 9.3. P2 (Medium - Có Thể Làm Sau)

7. **Features:**
   - [ ] Admin panel API
   - [ ] Analytics endpoints
   - [ ] Export data (CSV, Excel)

8. **Monitoring:**
   - [ ] Request logging (Winston/Morgan)
   - [ ] Performance monitoring (New Relic)
   - [ ] Database query logging

9. **Documentation:**
   - [ ] API documentation với Swagger/OpenAPI
   - [ ] Deployment guide
   - [ ] Troubleshooting guide

---

## Kết Luận

Tài liệu này cung cấp phân tích chi tiết về backend của SmartCare, bao gồm kiến trúc, luồng dữ liệu, API endpoints, models, và các rủi ro bảo mật. Để phát triển tiếp, nên ưu tiên các task P0 và P1, đặc biệt là security improvements và realtime features.

**Lưu ý:** Một số phần có thể chưa được đề cập đầy đủ do giới hạn về độ dài tài liệu. Vui lòng tham khảo code trực tiếp để có thông tin chi tiết hơn.

---

**Chú ý:** Tài liệu này được tạo tự động từ codebase. Nếu code thay đổi, cần cập nhật tài liệu tương ứng.


