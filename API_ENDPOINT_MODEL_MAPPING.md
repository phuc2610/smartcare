# SmartCare - API Endpoint Model Mapping

**Version:** 1.0.0  
**Ngày tạo:** 2024  
**Tác giả:** Backend Architect

---

## Mục Lục

1. [Bảng 1: API → Controller → Model → Fields](#bảng-1-api--controller--model--fields)
2. [Bảng 2: API Contract](#bảng-2-api-contract)

---

## Bảng 1: API → Controller → Model → Fields

| Method | Endpoint | Route File | Middleware | Controller.function | Auth | Role | Models | READ DB Fields | WRITE DB Fields |
|--------|----------|------------|------------|---------------------|------|------|--------|----------------|----------------|
| POST | `/api/auth/register` | `auth.routes.js` | `validate(registerSchema)` | `auth.controller.register` | No | - | User | User.phone (check exists) | User.name, User.phone, User.passwordHash, User.role, User.isVerified=false, User.otpCode, User.otpExpiresAt, User.medicalCondition (if PATIENT) |
| POST | `/api/auth/login` | `auth.routes.js` | `validate(loginSchema)` | `auth.controller.login` | No | - | User | User.phone, User.passwordHash, User.isVerified | - |
| POST | `/api/auth/otp/request` | `auth.routes.js` | - | `auth.controller.requestOTP` | No | - | User | User.phone | User.otpCode, User.otpExpiresAt |
| POST | `/api/auth/otp/verify` | `auth.routes.js` | `validate(otpVerifySchema)` | `auth.controller.verifyOTP` | No | - | User | User.phone, User.otpCode, User.otpExpiresAt | User.isVerified=true, User.otpCode=null, User.otpExpiresAt=null |
| POST | `/api/auth/forgot-password` | `auth.routes.js` | `validate(forgotPasswordSchema)` | `auth.controller.forgotPassword` | No | - | User | User.phone | User.otpCode, User.otpExpiresAt |
| POST | `/api/auth/reset-password` | `auth.routes.js` | `validate(resetPasswordSchema)` | `auth.controller.resetPassword` | No | - | User | User.phone, User.otpCode, User.otpExpiresAt | User.passwordHash, User.otpCode=null, User.otpExpiresAt=null |
| POST | `/api/auth/change-password` | `auth.routes.js` | `authenticate`, `validate(changePasswordSchema)` | `auth.controller.changePassword` | Yes | - | User | User._id (from req.user), User.passwordHash | User.passwordHash |
| GET | `/api/users/me` | `users.routes.js` | `authenticate` | `user.controller.getMe` | Yes | - | User | User._id (from req.user), User.* (except passwordHash, otpCode) | - |
| PATCH | `/api/users/me` | `users.routes.js` | `authenticate`, `validate(updateProfileSchema)` | `user.controller.updateProfile` | Yes | - | User | User._id (from req.user), User.role | User.height, User.weight, User.avatar, User.medicalCondition (if PATIENT) |
| POST | `/api/medications` | `medications.routes.js` | `authenticate`, `validate(createMedicationSchema)` | `medication.controller.createMedication` | Yes | - | Medication, Reminder | - | Medication.userId, Medication.name, Medication.dosage, Medication.unit, Medication.notes, Medication.frequency, Medication.times, Medication.startDate; Reminder.medicationId, Reminder.medicationName, Reminder.dosage, Reminder.unit, Reminder.scheduledTime, Reminder.status, Reminder.isSynced, Reminder.lastUpdated |
| GET | `/api/medications/today` | `medications.routes.js` | `authenticate` | `medication.controller.getTodayReminders` | Yes | - | Medication, Reminder | Medication.userId (or query.userId), Medication._id; Reminder.medicationId, Reminder.scheduledTime, Reminder.* | - |
| GET | `/api/medications/missed` | `medications.routes.js` | `authenticate` | `medication.controller.getMissedMedications` | Yes | - | Medication, Reminder | Medication.userId (or query.userId), Medication._id; Reminder.medicationId, Reminder.scheduledTime, Reminder.status | - |
| GET | `/api/medications` | `medications.routes.js` | `authenticate` | `medication.controller.getMedications` | Yes | - | Medication | Medication.userId (from req.user._id) | - |
| PATCH | `/api/medications/:id/take` | `medications.routes.js` | `authenticate` | `medication.controller.updateReminderStatus` | Yes | - | Reminder | Reminder._id (from params.id) | Reminder.status, Reminder.takenAt (if TAKEN), Reminder.lastUpdated |
| PATCH | `/api/medications/reminders/:id` | `medications.routes.js` | `authenticate`, `validate(updateReminderSchema)` | `medication.controller.updateReminder` | Yes | - | Reminder | Reminder._id (from params.id) | Reminder.scheduledTime, Reminder.dosage, Reminder.unit, Reminder.lastUpdated |
| DELETE | `/api/medications/reminders/:id` | `medications.routes.js` | `authenticate` | `medication.controller.deleteReminder` | Yes | - | Reminder, Medication | Reminder._id, Reminder.medicationId; Medication._id, Medication.userId (for access check) | Reminder (delete) |
| DELETE | `/api/medications/:id` | `medications.routes.js` | `authenticate` | `medication.controller.deleteMedication` | Yes | - | Medication, Reminder | Medication._id (from params.id) | Medication (delete), Reminder (deleteMany by medicationId) |
| POST | `/api/health/logs` | `health.routes.js` | `authenticate`, `validate(createHealthLogSchema)` | `health.controller.createHealthLog` | Yes | - | HealthLog | - | HealthLog.userId, HealthLog.type, HealthLog.date, HealthLog.scheduledDate, HealthLog.scheduledTime, HealthLog.details |
| GET | `/api/health/today` | `health.routes.js` | `authenticate` | `health.controller.getTodayHealthLogs` | Yes | - | HealthLog, User | HealthLog.userId (or query.userId), HealthLog.type, HealthLog.date, HealthLog.scheduledDate; User._id, User.role, User.caregiverId (for access check) | - |
| GET | `/api/health/summary` | `health.routes.js` | `authenticate` | `health.controller.getHealthSummary` | Yes | - | HealthLog | HealthLog.userId (or query.userId), HealthLog.date, HealthLog.type, HealthLog.details.calories, HealthLog.details.caloriesBurned | - |
| GET | `/api/health/scheduled` | `health.routes.js` | `authenticate` | `health.controller.getScheduledTasks` | Yes | - | HealthLog | HealthLog.userId (from req.user._id), HealthLog.scheduledDate, HealthLog.scheduledTime | - |
| PATCH | `/api/health/logs/:id` | `health.routes.js` | `authenticate`, `validate(updateHealthLogSchema)` | `health.controller.updateHealthLog` | Yes | - | HealthLog | HealthLog._id (from params.id), HealthLog.userId (for access check) | HealthLog.type, HealthLog.date, HealthLog.scheduledDate, HealthLog.scheduledTime, HealthLog.details, HealthLog.isCompleted |
| DELETE | `/api/health/logs/:id` | `health.routes.js` | `authenticate` | `health.controller.deleteHealthLog` | Yes | - | HealthLog | HealthLog._id (from params.id), HealthLog.userId (for access check) | HealthLog (delete) |
| GET | `/api/reports/overview` | `reports.routes.js` | `authenticate` | `report.controller.getComprehensiveReport` | Yes | - | Medication, Reminder, HealthLog, WellnessLog | Medication.userId (or query.userId); Reminder.medicationId, Reminder.scheduledTime, Reminder.status, Reminder.takenAt; HealthLog.userId, HealthLog.date, HealthLog.type, HealthLog.details.*; WellnessLog.userId, WellnessLog.date, WellnessLog.durationSeconds | - |
| GET | `/api/reports/export-pdf` | `reports.routes.js` | `authenticate` (optional, can use query token) | `report.controller.exportPDF` | Yes* | - | User, Medication, Reminder, HealthLog, WellnessLog | User._id (from token), User.name, User.phone, User.medicalCondition; Medication.userId; Reminder.*; HealthLog.*; WellnessLog.* | - |
| POST | `/api/ai/chat` | `ai.routes.js` | `authenticate`, `validate(chatSchema)` | `ai.controller.chat` | Yes | - | ChatMessage, User | User._id (from req.user), User.name, User.medicalCondition; ChatMessage.userId, ChatMessage.message, ChatMessage.response, ChatMessage.timestamp (last 5) | ChatMessage.userId, ChatMessage.message, ChatMessage.response, ChatMessage.sender, ChatMessage.timestamp |
| GET | `/api/ai/chat/history` | `ai.routes.js` | `authenticate` | `ai.controller.getChatHistory` | Yes | - | ChatMessage | ChatMessage.userId (from req.user._id), ChatMessage.message, ChatMessage.response, ChatMessage.sender, ChatMessage.timestamp | - |
| POST | `/api/ai/medication/parse` | `ai.routes.js` | `authenticate`, `validate(parseMedicationSchema)` | `ai.controller.parseMedication` | Yes | - | - | - | - |
| POST | `/api/ai/meal/estimate` | `ai.routes.js` | `authenticate`, `validate(estimateCaloriesSchema)` | `ai.controller.estimateCalories` | Yes | - | - | - | - |
| POST | `/api/ai/disease/identify` | `ai.routes.js` | `authenticate`, `validate(identifyDiseaseSchema)` | `ai.controller.identifyDisease` | Yes | - | - | - | - |
| POST | `/api/ai/health/recommendations` | `ai.routes.js` | `authenticate`, `validate(getHealthRecommendationsSchema)` | `ai.controller.getHealthRecommendations` | Yes | - | User | User.medicalCondition (from req.user or body) | - |
| POST | `/api/ai/report/analyze` | `ai.routes.js` | `authenticate`, `validate(analyzeReportSchema)` | `ai.controller.analyzeReport` | Yes | - | AIReport | AIReport.userId, AIReport.range, AIReport.medicalCondition, AIReport.dateKey, AIReport.expiresAt, AIReport.notes | AIReport.userId, AIReport.range, AIReport.medicalCondition, AIReport.dateKey, AIReport.notes, AIReport.expiresAt (upsert) |
| POST | `/api/upload/image` | `upload.routes.js` | `authenticate`, `uploadMiddleware` | `upload.controller.uploadImage` | Yes | - | - | - | - |
| POST | `/api/wellness/log` | `wellness.routes.js` | `authenticate`, `validate(logWellnessSchema)` | `wellness.controller.logWellness` | Yes | - | WellnessLog | - | WellnessLog.userId, WellnessLog.type, WellnessLog.durationSeconds, WellnessLog.date |
| GET | `/api/settings/notifications` | `settings.routes.js` | `authenticate` (in controller) | `settings.controller.getNotificationSettings` | Yes | - | User | User._id (from req.user.id), User.notificationSettings.* | - |
| PATCH | `/api/settings/notifications` | `settings.routes.js` | `authenticate` (in controller) | `settings.controller.updateNotificationSettings` | Yes | - | User | User._id (from req.user.id) | User.notificationSettings.medicationReminderBefore, User.notificationSettings.mealReminderBefore, User.notificationSettings.exerciseReminderBefore, User.notificationSettings.medicationEnabled, User.notificationSettings.mealEnabled, User.notificationSettings.exerciseEnabled |
| POST | `/api/custom-reminders` | `customReminders.routes.js` | `authenticate`, `validate(createCustomReminderSchema)` | `customReminder.controller.createCustomReminder` | Yes | - | CustomReminder | - | CustomReminder.userId, CustomReminder.title, CustomReminder.description, CustomReminder.reminderTime, CustomReminder.repeatType, CustomReminder.repeatDays, CustomReminder.isActive |
| GET | `/api/custom-reminders` | `customReminders.routes.js` | `authenticate` | `customReminder.controller.getCustomReminders` | Yes | - | CustomReminder | CustomReminder.userId (from req.user._id), CustomReminder.isActive, CustomReminder.reminderTime | - |
| PATCH | `/api/custom-reminders/:id` | `customReminders.routes.js` | `authenticate` | `customReminder.controller.updateCustomReminder` | Yes | - | CustomReminder | CustomReminder._id (from params.id), CustomReminder.userId (for access check) | CustomReminder.title, CustomReminder.description, CustomReminder.reminderTime, CustomReminder.repeatType, CustomReminder.repeatDays, CustomReminder.isActive |
| DELETE | `/api/custom-reminders/:id` | `customReminders.routes.js` | `authenticate` | `customReminder.controller.deleteCustomReminder` | Yes | - | CustomReminder | CustomReminder._id (from params.id), CustomReminder.userId (for access check) | CustomReminder (delete) |
| POST | `/api/appointments` | `appointments.routes.js` | `authenticate`, `validate(createAppointmentSchema)` | `appointment.controller.createAppointment` | Yes | - | Appointment, User | User._id (from body.userId if caregiver), User.role, User.caregiverId (for access check) | Appointment.userId, Appointment.doctorName, Appointment.doctorSpecialty, Appointment.hospitalName, Appointment.appointmentDate, Appointment.appointmentTime, Appointment.notes, Appointment.reminderBefore, Appointment.isCompleted |
| GET | `/api/appointments` | `appointments.routes.js` | `authenticate` | `appointment.controller.getAppointments` | Yes | - | Appointment | Appointment.userId (from req.user._id), Appointment.isCompleted, Appointment.appointmentDate | - |
| PATCH | `/api/appointments/:id` | `appointments.routes.js` | `authenticate` | `appointment.controller.updateAppointment` | Yes | - | Appointment | Appointment._id (from params.id), Appointment.userId (for access check) | Appointment.doctorName, Appointment.doctorSpecialty, Appointment.hospitalName, Appointment.appointmentDate, Appointment.appointmentTime, Appointment.notes, Appointment.reminderBefore, Appointment.isCompleted |
| DELETE | `/api/appointments/:id` | `appointments.routes.js` | `authenticate` | `appointment.controller.deleteAppointment` | Yes | - | Appointment | Appointment._id (from params.id), Appointment.userId (for access check) | Appointment (delete) |
| POST | `/api/chat/send` | `chat.routes.js` | `authenticate` | `chat.controller.sendMessage` | Yes | - | Message, User, CaregiverRequest | User._id (receiverId), User.role, User.caregiverId; CaregiverRequest.patientId, CaregiverRequest.caregiverId, CaregiverRequest.status | Message.senderId, Message.receiverId, Message.content, Message.messageType, Message.imageUrl |
| GET | `/api/chat/conversations` | `chat.routes.js` | `authenticate` | `chat.controller.getConversations` | Yes | - | Message, User | Message.senderId, Message.receiverId, Message.content, Message.messageType, Message.createdAt, Message.isRead; User._id, User.role, User.caregiverId, User.name, User.avatar (populate) | - |
| GET | `/api/chat/messages/:otherUserId` | `chat.routes.js` | `authenticate` | `chat.controller.getMessages` | Yes | - | Message, User, CaregiverRequest | Message.senderId, Message.receiverId, Message.content, Message.messageType, Message.createdAt, Message.isRead; User._id, User.name, User.avatar (populate); CaregiverRequest.* (for permission check) | Message.isRead=true, Message.readAt (updateMany) |
| PATCH | `/api/chat/messages/:messageId/read` | `chat.routes.js` | `authenticate` | `chat.controller.markAsRead` | Yes | - | Message | Message._id (from params.messageId), Message.receiverId (for access check) | Message.isRead=true, Message.readAt |
| GET | `/api/chat/unread-count` | `chat.routes.js` | `authenticate` | `chat.controller.getUnreadCount` | Yes | - | Message | Message.receiverId (from req.user._id), Message.isRead | - |
| POST | `/api/caregiver/link/request` | `caregiver.routes.js` | `authenticate`, `validate(requestLinkSchema)` | `caregiver.controller.requestLink` | Yes | PATIENT | User | User._id (from req.user), User.linkCode | User.linkCode |
| POST | `/api/caregiver/link/accept` | `caregiver.routes.js` | `authenticate`, `validate(acceptLinkSchema)` | `caregiver.controller.acceptLink` | Yes | CAREGIVER | User, CaregiverRequest | User.role, User.linkCode (by code); CaregiverRequest.patientId, CaregiverRequest.caregiverId, CaregiverRequest.status | CaregiverRequest.patientId, CaregiverRequest.caregiverId, CaregiverRequest.status='pending', CaregiverRequest.requestedAt |
| GET | `/api/caregiver/requests` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getCaregiverRequests` | Yes | PATIENT | CaregiverRequest | CaregiverRequest.patientId (from req.user._id), CaregiverRequest.status='pending', CaregiverRequest.caregiverId (populate User.name, User.phone, User.avatar) | - |
| POST | `/api/caregiver/requests/respond` | `caregiver.routes.js` | `authenticate`, `validate(respondToRequestSchema)` | `caregiver.controller.respondToRequest` | Yes | PATIENT | CaregiverRequest, User | CaregiverRequest._id, CaregiverRequest.patientId, CaregiverRequest.caregiverId, CaregiverRequest.status; User._id, User.caregiverId | User.caregiverId (if accept); CaregiverRequest.status, CaregiverRequest.respondedAt; CaregiverRequest.status='rejected' (for other pending requests) |
| GET | `/api/caregiver/patients` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getPatients` | Yes | CAREGIVER | User, Medication, Reminder, HealthLog, Alert | User.caregiverId (from req.user._id); Medication.userId; Reminder.medicationId, Reminder.scheduledTime, Reminder.status, Reminder.lastUpdated; HealthLog.userId, HealthLog.updatedAt; Alert.patientId, Alert.isRead | - |
| GET | `/api/caregiver/patients/:patientId` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getPatientDetail` | Yes | CAREGIVER | User, Medication, Reminder, HealthLog, Alert | User._id (from params.patientId), User.caregiverId; Medication.userId; Reminder.*; HealthLog.*; Alert.* | - |
| GET | `/api/caregiver/alerts` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getAlerts` | Yes | CAREGIVER | HealthLog, User | HealthLog.userId (in patientIds), HealthLog.type='symptom', HealthLog.details.severity, HealthLog.details.symptomName, HealthLog.details.note, HealthLog.createdAt, HealthLog.date; User._id, User.name (populate) | - |
| PATCH | `/api/caregiver/alerts/:alertId/read` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.markAlertAsRead` | Yes | CAREGIVER | Alert, User | Alert._id (from params.alertId), Alert.patientId, Alert.readBy; User._id, User.caregiverId (for access check) | Alert.readBy (push), Alert.isRead |
| GET | `/api/caregiver/patients/:patientId/medications/timeline` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getMedicationTimeline` | Yes | CAREGIVER | User, Medication, Reminder | User._id (from params.patientId), User.caregiverId; Medication.userId; Reminder.medicationId, Reminder.scheduledTime, Reminder.medicationName, Reminder.dosage, Reminder.unit, Reminder.status | - |
| GET | `/api/caregiver/patients/:patientId/medications/week-history` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getMedicationWeekHistory` | Yes | CAREGIVER | User, Medication, Reminder | User._id, User.caregiverId; Medication.userId; Reminder.medicationId, Reminder.scheduledTime, Reminder.status | - |
| GET | `/api/caregiver/patients/:patientId/medications/adherence` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getMedicationAdherence` | Yes | CAREGIVER | User, Medication, Reminder | User._id, User.caregiverId; Medication.userId; Reminder.medicationId, Reminder.scheduledTime, Reminder.status | - |
| GET | `/api/caregiver/patients/:patientId/health/daily` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getDailyHealthSummary` | Yes | CAREGIVER | User, HealthLog | User._id, User.caregiverId; HealthLog.userId, HealthLog.date, HealthLog.type, HealthLog.details.calories, HealthLog.details.durationMinutes, HealthLog.details.severity | - |
| GET | `/api/caregiver/patients/:patientId/appointments` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getAppointments` | Yes | CAREGIVER | User, Appointment | User._id, User.caregiverId; Appointment.userId, Appointment.isCompleted, Appointment.appointmentDate, Appointment.* | - |
| GET | `/api/caregiver/patients/:patientId/notes` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getCareNotes` | Yes | CAREGIVER | User, CareNote | User._id, User.caregiverId; CareNote.patientId, CareNote.caregiverId, CareNote.content, CareNote.tags, CareNote.createdAt | - |
| POST | `/api/caregiver/patients/:patientId/notes` | `caregiver.routes.js` | `authenticate`, `validate(createCareNoteSchema)` | `caregiver.controller.createCareNote` | Yes | CAREGIVER | User, CareNote | User._id, User.caregiverId (for access check) | CareNote.patientId, CareNote.caregiverId, CareNote.content, CareNote.tags |
| GET | `/api/caregiver/patients/:patientId/location` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getLocationStatus` | Yes | CAREGIVER | User | User._id, User.caregiverId (for access check) | - |
| GET | `/api/caregiver/patients/:patientId/emergency-contacts` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getEmergencyContacts` | Yes | CAREGIVER | User, EmergencyContact | User._id, User.caregiverId; EmergencyContact.patientId, EmergencyContact.name, EmergencyContact.phone, EmergencyContact.relationship, EmergencyContact.isPrimary | - |
| GET | `/api/caregiver/patients/:patientId/tasks` | `caregiver.routes.js` | `authenticate` | `caregiver.controller.getPatientTasks` | Yes | CAREGIVER | User, Medication, Reminder, HealthLog | User._id, User.caregiverId; Medication.userId; Reminder.medicationId, Reminder.status, Reminder.scheduledTime; HealthLog.userId, HealthLog.isCompleted, HealthLog.type, HealthLog.scheduledDate, HealthLog.date | - |
| POST | `/api/caregiver/patients/:patientId/tasks/:taskId/notify` | `caregiver.routes.js` | `authenticate`, `validate(sendTaskNotificationSchema)` | `caregiver.controller.sendTaskNotification` | Yes | CAREGIVER | User, Reminder, HealthLog | User._id, User.caregiverId; Reminder._id (if taskType='medication'), Reminder.medicationName, Reminder.dosage, Reminder.unit; HealthLog._id (if taskType='health'), HealthLog.type | - |

---

## Bảng 2: API Contract

| Method | Endpoint | Request (params/query/body) | Validation Schema | Response Success Example | Error Codes |
|--------|----------|------------------------------|-------------------|--------------------------|-------------|
| POST | `/api/auth/register` | Body: `{ name: string, phone: string (regex: ^(84\|0[3\|5\|7\|8\|9])+([0-9]{8})\b), password: string (min 6), role: 'PATIENT'\|'CAREGIVER' }` | `registerSchema` (Zod) | `{ message: string, phone: string, requiresOTP: true }` | 400: Phone đã tồn tại, validation error; 500: Server error |
| POST | `/api/auth/login` | Body: `{ phone: string, password: string }` | `loginSchema` (Zod) | `{ user: { _id, name, phone, role, medicalCondition, height, weight, caregiverId, caregiverPhone, isVerified }, token: string }` | 401: Sai phone/password; 403: Chưa verify (requiresOTP: true); 500: Server error |
| POST | `/api/auth/otp/request` | Body: `{ phone: string }` | - | `{ message: string, phone: string }` | 404: Phone chưa đăng ký; 500: Server error |
| POST | `/api/auth/otp/verify` | Body: `{ phone: string, otp: string (length 4) }` | `otpVerifySchema` (Zod) | `{ user: { _id, name, phone, role, medicalCondition, height, weight, caregiverId, caregiverPhone, isVerified }, token: string }` | 400: OTP không tồn tại/sai/hết hạn; 404: Phone chưa đăng ký; 500: Server error |
| POST | `/api/auth/forgot-password` | Body: `{ phone: string }` | `forgotPasswordSchema` (Zod) | `{ message: string, phone: string }` | 404: Phone chưa đăng ký; 500: Server error |
| POST | `/api/auth/reset-password` | Body: `{ phone: string, otp: string (length 4), newPassword: string (min 6) }` | `resetPasswordSchema` (Zod) | `{ message: string, user: {...}, token: string }` | 400: OTP sai/hết hạn; 404: Phone chưa đăng ký; 500: Server error |
| POST | `/api/auth/change-password` | Body: `{ currentPassword: string, newPassword: string (min 6) }` | `changePasswordSchema` (Zod) | `{ message: string }` | 400: Password hiện tại sai/mật khẩu mới giống mật khẩu cũ; 404: User không tồn tại; 500: Server error |
| GET | `/api/users/me` | - | - | `{ user: { _id, name, phone, role, medicalCondition (null if CAREGIVER), height, weight, avatar, caregiverId, caregiverPhone, isVerified, ... } }` | 500: Server error |
| PATCH | `/api/users/me` | Body: `{ height?: number, weight?: number, medicalCondition?: string, avatar?: string (url) }` | `updateProfileSchema` (Zod) | `{ user: { _id, name, phone, role, medicalCondition (null if CAREGIVER), height, weight, avatar, caregiverId, caregiverPhone, isVerified } }` | 404: User không tồn tại; 500: Server error |
| POST | `/api/medications` | Body: `{ name: string (min 1), dosage: string, unit?: string (default 'mg'), notes?: string, frequency: 'DAILY'\|'EVERY_OTHER_DAY', times: string[] (regex: ^([0-1][0-9]\|2[0-3]):[0-5][0-9]$), startDate: string (datetime) }` | `createMedicationSchema` (Zod) | `{ medication: { _id, userId, name, dosage, unit, notes, frequency, times, startDate, ... } }` | 400: Validation error; 500: Server error |
| GET | `/api/medications/today` | Query: `userId?: string` | - | `{ reminders: [{ _id, medicationId, medicationName, dosage, unit, scheduledTime, status, takenAt, ... }] }` | 500: Server error |
| GET | `/api/medications/missed` | Query: `userId?: string` | - | `{ missedReminders: [{ _id, medicationId, medicationName, dosage, unit, scheduledTime, status, ... }] }` | 500: Server error |
| GET | `/api/medications` | - | - | `{ medications: [{ _id, userId, name, dosage, unit, notes, frequency, times, startDate, ... }] }` | 500: Server error |
| PATCH | `/api/medications/:id/take` | Params: `id: string`; Body: `{ status: 'TAKEN'\|'SKIPPED' }` | - | `{ reminder: { _id, medicationId, medicationName, dosage, unit, scheduledTime, status, takenAt, lastUpdated, ... } }` | 404: Reminder không tồn tại; 500: Server error |
| PATCH | `/api/medications/reminders/:id` | Params: `id: string`; Body: `{ scheduledTime?: string (datetime), dosage?: string, unit?: string }` | `updateReminderSchema` (Zod) | `{ reminder: { _id, medicationId, medicationName, dosage, unit, scheduledTime, status, ... } }` | 404: Reminder không tồn tại; 500: Server error |
| DELETE | `/api/medications/reminders/:id` | Params: `id: string` | - | `{ message: 'Reminder deleted' }` | 403: Access denied; 404: Reminder không tồn tại; 500: Server error |
| DELETE | `/api/medications/:id` | Params: `id: string` | - | `{ message: 'Medication deleted' }` | 500: Server error |
| POST | `/api/health/logs` | Body: `{ type: 'meal'\|'exercise'\|'symptom', date?: string, scheduledDate?: string (YYYY-MM-DD), scheduledTime?: string (HH:mm), details: { foodName?: string, calories?: number, exerciseType?: string, durationMinutes?: number, caloriesBurned?: number, symptomName?: string, severity?: number, note?: string } }` | `createHealthLogSchema` (Zod) | `{ healthLog: { _id, userId, type, date, scheduledDate, scheduledTime, details, ... } }` | 400: Validation error; 500: Server error |
| GET | `/api/health/today` | Query: `userId?: string` | - | `{ healthLogs: [{ _id, userId, type, date, scheduledDate, scheduledTime, details, ... }] }` | 403: Access denied; 404: User không tồn tại; 500: Server error |
| GET | `/api/health/summary` | Query: `userId?: string, range?: '7d'\|'30d'` | - | `{ logs: [{ _id, userId, type, date, details, ... }], weeklyStats: [{ date: string, caloriesIn: number, caloriesOut: number }] }` | 500: Server error |
| GET | `/api/health/scheduled` | Query: `date?: string` | - | `{ healthLogs: [{ _id, userId, type, scheduledDate, scheduledTime, details, ... }] }` | 500: Server error |
| PATCH | `/api/health/logs/:id` | Params: `id: string`; Body: `{ type?: 'meal'\|'exercise'\|'symptom', date?: string, scheduledDate?: string, scheduledTime?: string, details?: {...}, isCompleted?: boolean }` | `updateHealthLogSchema` (Zod) | `{ healthLog: { _id, userId, type, date, scheduledDate, scheduledTime, details, isCompleted, ... } }` | 404: Health log không tồn tại; 500: Server error |
| DELETE | `/api/health/logs/:id` | Params: `id: string` | - | `{ message: 'Health log deleted successfully' }` | 404: Health log không tồn tại; 500: Server error |
| GET | `/api/reports/overview` | Query: `userId?: string, range?: 'today'\|'week'\|'month'\|'7d'\|'30d'` | - | `{ startDate: string, endDate: string, medicationAdherence: { total: number, taken: number, skipped: number, rate: number }, healthStats: { totalCaloriesIn: number, totalCaloriesOut: number }, exerciseStats: { exercises: [...], totalCaloriesBurned: number, totalDurationMinutes: number }, wellnessStats: { totalMinutes: number, sessionsCount: number }, symptomsByDate: [{ date: string, symptoms: [...] }], meals: [...], reminders: [...] }` | 500: Server error |
| GET | `/api/reports/export-pdf` | Query: `userId?: string, range?: 'today'\|'week'\|'month'\|'7d'\|'30d', token?: string` | - | PDF file (Content-Type: application/pdf) | 401: Unauthorized/Invalid token; 404: User không tồn tại; 500: Server error |
| POST | `/api/ai/chat` | Body: `{ message: string (min 1) }` | `chatSchema` (Zod) | `{ response: string }` | 503: AI service disabled; 500: AI service error |
| GET | `/api/ai/chat/history` | Query: `limit?: number` | - | `{ messages: [{ message: string, response: string, sender: 'user'\|'bot', timestamp: Date }] }` | 500: Server error |
| POST | `/api/ai/medication/parse` | Body: `{ imageUrl?: string (url), instruction?: string }` | `parseMedicationSchema` (Zod) | `{ medication: { name: string, dosage: string, unit: string, frequency: 'DAILY'\|'EVERY_OTHER_DAY', times: string[], notes: string } }` | 400: Thiếu imageUrl/instruction; 503: AI disabled; 500: Failed to parse |
| POST | `/api/ai/meal/estimate` | Body: `{ query: string (min 1), type: 'food'\|'exercise' }` | `estimateCaloriesSchema` (Zod) | `{ calories: number, foodName?: string (if type='food'), exerciseType?: string (if type='exercise') }` | 503: AI disabled; 500: Failed to estimate |
| POST | `/api/ai/disease/identify` | Body: `{ input: string (min 1) }` | `identifyDiseaseSchema` (Zod) | `{ condition: string }` | 503: AI disabled; 500: Failed to identify |
| POST | `/api/ai/health/recommendations` | Body: `{ medicalCondition?: string }` | `getHealthRecommendationsSchema` (Zod) | `{ recommendations: [{ id: string, type: 'DIET'\|'EXERCISE'\|'LIFESTYLE', title: string, description: string, iconName: string, color: string }] }` | 503: AI disabled; 500: Server error |
| POST | `/api/ai/report/analyze` | Body: `{ range: 'week'\|'month', medicalCondition?: string, reportData: { totalCaloriesIn: number, totalCaloriesOut: number, meals?: [...], exercises?: [...], symptoms?: [...] } }` | `analyzeReportSchema` (Zod) | `{ notes: string }` | 503: AI disabled; 500: Failed to analyze |
| POST | `/api/upload/image` | FormData: `image: File` (max 5MB) | - | `{ url: string, publicId: string }` | 400: No file uploaded; 500: Upload failed |
| POST | `/api/wellness/log` | Body: `{ type: 'breathing'\|'music', durationSeconds: number (min 1) }` | `logWellnessSchema` (Zod) | `{ wellnessLog: { _id, userId, type, durationSeconds, date, ... } }` | 400: Duration too short; 500: Server error |
| GET | `/api/settings/notifications` | - | - | `{ settings: { medicationReminderBefore: number, mealReminderBefore: number, exerciseReminderBefore: number, medicationEnabled: boolean, mealEnabled: boolean, exerciseEnabled: boolean } }` | 404: User not found; 500: Server error |
| PATCH | `/api/settings/notifications` | Body: `{ medicationReminderBefore?: number (0-60), mealReminderBefore?: number (0-60), exerciseReminderBefore?: number (0-60), medicationEnabled?: boolean, mealEnabled?: boolean, exerciseEnabled?: boolean }` | - | `{ settings: { medicationReminderBefore: number, mealReminderBefore: number, exerciseReminderBefore: number, medicationEnabled: boolean, mealEnabled: boolean, exerciseEnabled: boolean } }` | 400: Value out of range (0-60); 404: User not found; 500: Server error |
| POST | `/api/custom-reminders` | Body: `{ title: string (min 1), description?: string, reminderTime: string (datetime), repeatType?: 'NONE'\|'DAILY'\|'WEEKLY'\|'MONTHLY', repeatDays?: number[] (0-6) }` | `createCustomReminderSchema` (Zod) | `{ reminder: { _id, userId, title, description, reminderTime, repeatType, repeatDays, isActive, ... } }` | 400: Validation error; 500: Server error |
| GET | `/api/custom-reminders` | - | - | `{ reminders: [{ _id, userId, title, description, reminderTime, repeatType, repeatDays, isActive, ... }] }` | 500: Server error |
| PATCH | `/api/custom-reminders/:id` | Params: `id: string`; Body: `{ title?: string, description?: string, reminderTime?: string (datetime), repeatType?: 'NONE'\|'DAILY'\|'WEEKLY'\|'MONTHLY', repeatDays?: number[], isActive?: boolean }` | - | `{ reminder: { _id, userId, title, description, reminderTime, repeatType, repeatDays, isActive, ... } }` | 404: Reminder không tồn tại; 500: Server error |
| DELETE | `/api/custom-reminders/:id` | Params: `id: string` | - | `{ message: 'Reminder deleted' }` | 404: Reminder không tồn tại; 500: Server error |
| POST | `/api/appointments` | Body: `{ doctorName: string (min 1), doctorSpecialty?: string, hospitalName?: string, appointmentDate: string (datetime), appointmentTime?: string, notes?: string, reminderBefore?: number, userId?: string }` | `createAppointmentSchema` (Zod) | `{ appointment: { _id, userId, doctorName, doctorSpecialty, hospitalName, appointmentDate, appointmentTime, notes, reminderBefore, isCompleted, ... } }` | 400: User is not a patient; 403: Access denied (caregiver not linked); 404: Patient not found; 500: Server error |
| GET | `/api/appointments` | Query: `upcoming?: 'true', completed?: 'true'` | - | `{ appointments: [{ _id, userId, doctorName, doctorSpecialty, hospitalName, appointmentDate, appointmentTime, notes, reminderBefore, isCompleted, ... }] }` | 500: Server error |
| PATCH | `/api/appointments/:id` | Params: `id: string`; Body: `{ doctorName?: string, doctorSpecialty?: string, hospitalName?: string, appointmentDate?: string (datetime), appointmentTime?: string, notes?: string, reminderBefore?: number, isCompleted?: boolean }` | - | `{ appointment: { _id, userId, doctorName, doctorSpecialty, hospitalName, appointmentDate, appointmentTime, notes, reminderBefore, isCompleted, ... } }` | 404: Appointment không tồn tại; 500: Server error |
| DELETE | `/api/appointments/:id` | Params: `id: string` | - | `{ message: 'Appointment deleted' }` | 404: Appointment không tồn tại; 500: Server error |
| POST | `/api/chat/send` | Body: `{ receiverId: string (min 1), content: string (min 1, max 1000), messageType?: 'text'\|'image'\|'file', imageUrl?: string (url) }` | `sendMessageSchema` (Zod, inline) | `{ message: { _id, senderId (populate User.name, User.avatar), receiverId (populate User.name, User.avatar), content, messageType, imageUrl, isRead, createdAt, ... } }` | 400: Validation error; 403: Không có quyền nhắn tin; 404: Receiver không tồn tại; 500: Server error |
| GET | `/api/chat/conversations` | - | - | `{ conversations: [{ userId: string, userName: string, userAvatar: string, userRole: string, lastMessage: { content: string, messageType: string, createdAt: Date }, unreadCount: number, updatedAt: Date }] }` | 500: Server error |
| GET | `/api/chat/messages/:otherUserId` | Params: `otherUserId: string`; Query: `page?: number, limit?: number` | - | `{ messages: [{ _id, senderId (populate User.name, User.avatar), receiverId (populate User.name, User.avatar), content, messageType, imageUrl, isRead, readAt, createdAt, ... }], hasMore: boolean }` | 403: Không có quyền xem tin nhắn; 404: Người dùng không tồn tại; 500: Server error |
| PATCH | `/api/chat/messages/:messageId/read` | Params: `messageId: string` | - | `{ message: { _id, senderId, receiverId, content, messageType, isRead=true, readAt, ... } }` | 403: Không có quyền; 404: Tin nhắn không tồn tại; 500: Server error |
| GET | `/api/chat/unread-count` | - | - | `{ unreadCount: number }` | 500: Server error |
| POST | `/api/caregiver/link/request` | Body: `{}` | `requestLinkSchema` (Zod) | `{ code: string (6 digits) }` | 403: Không phải PATIENT; 500: Server error |
| POST | `/api/caregiver/link/accept` | Body: `{ code: string (length 6) }` | `acceptLinkSchema` (Zod) | `{ success: true, message: string, patientName: string }` | 400: Code không hợp lệ/đã linked/đã có request pending; 403: Không phải CAREGIVER; 404: Mã liên kết không hợp lệ; 500: Server error |
| GET | `/api/caregiver/requests` | - | - | `{ requests: [{ _id, caregiverId, caregiverName, caregiverPhone, caregiverAvatar, status: 'pending', requestedAt }] }` | 403: Không phải PATIENT; 500: Server error |
| POST | `/api/caregiver/requests/respond` | Body: `{ requestId: string, action: 'accept'\|'reject' }` | `respondToRequestSchema` (Zod) | `{ success: true, message: string, caregiverName?: string }` | 400: Yêu cầu không tìm thấy/đã có caregiver; 403: Không phải PATIENT; 404: Yêu cầu không tìm thấy; 500: Server error |
| GET | `/api/caregiver/patients` | Query: `filter?: 'all'\|'needsAttention'\|'recentUpdate'` | - | `{ patients: [{ _id, name, phone, role, medicalCondition, height, weight, avatar, caregiverId, caregiverPhone, isVerified, adherenceRate: number, needsAttention: boolean, recentAlerts: number, lastUpdate: Date, ... }] }` | 403: Không phải CAREGIVER; 500: Server error |
| GET | `/api/caregiver/patients/:patientId` | Params: `patientId: string` | - | `{ patient: { _id, name, phone, role, medicalCondition, height, weight, avatar, caregiverId, caregiverPhone, isVerified, adherenceRate: number, needsAttention: boolean, recentAlerts: number, lastUpdate: Date, ... } }` | 403: Access denied; 404: Patient không tồn tại; 500: Server error |
| GET | `/api/caregiver/alerts` | Query: `patientId?: string` | - | `{ alerts: [{ _id, patientId, patientName, type: 'symptom', severity: 'error'\|'warning'\|'info', title: string, message: string, timestamp: Date, isRead: boolean, actionUrl: null }] }` | 403: Không phải CAREGIVER/Access denied; 500: Server error |
| PATCH | `/api/caregiver/alerts/:alertId/read` | Params: `alertId: string` | - | `{ success: true }` | 403: Access denied; 404: Alert không tồn tại; 500: Server error |
| GET | `/api/caregiver/patients/:patientId/medications/timeline` | Params: `patientId: string`; Query: `date?: string` | - | `{ timeline: [{ _id, medicationName, dosage, unit, scheduledTime, status, period: 'morning'\|'noon'\|'evening'\|'night' }] }` | 403: Access denied; 500: Server error |
| GET | `/api/caregiver/patients/:patientId/medications/week-history` | Params: `patientId: string` | - | `{ history: [{ date: string (YYYY-MM-DD), total: number, taken: number, skipped: number, adherenceRate: number }] }` | 403: Access denied; 500: Server error |
| GET | `/api/caregiver/patients/:patientId/medications/adherence` | Params: `patientId: string` | - | `{ rate: number, total: number, taken: number, skipped: number }` | 403: Access denied; 500: Server error |
| GET | `/api/caregiver/patients/:patientId/health/daily` | Params: `patientId: string`; Query: `date?: string` | - | `{ date: string (YYYY-MM-DD), calories: number, exerciseMinutes: number, symptomScore: number }` | 403: Access denied; 500: Server error |
| GET | `/api/caregiver/patients/:patientId/appointments` | Params: `patientId: string` | - | `{ appointments: [{ _id, patientId, title: string, doctor: string, location: string, date: string (YYYY-MM-DD), time: string (HH:mm), notes: string, status: 'upcoming'\|'completed', reminderMinutes: number }] }` | 403: Access denied; 500: Server error |
| GET | `/api/caregiver/patients/:patientId/notes` | Params: `patientId: string` | - | `{ notes: [{ _id, patientId, content: string, tags: string[], createdAt: Date, createdBy: string }] }` | 403: Access denied; 500: Server error |
| POST | `/api/caregiver/patients/:patientId/notes` | Params: `patientId: string`; Body: `{ content: string (min 1), tags?: string[] }` | `createCareNoteSchema` (Zod) | `{ _id, patientId, content, tags, createdAt, createdBy }` | 403: Access denied; 500: Server error |
| GET | `/api/caregiver/patients/:patientId/location` | Params: `patientId: string` | - | `{ patientId: string, safetyStatus: 'unknown' }` | 403: Access denied; 500: Server error |
| GET | `/api/caregiver/patients/:patientId/emergency-contacts` | Params: `patientId: string` | - | `{ contacts: [{ _id, name, phone, relationship, isPrimary: boolean }] }` | 403: Access denied; 500: Server error |
| GET | `/api/caregiver/patients/:patientId/tasks` | Params: `patientId: string` | - | `{ reminders: [{ _id, medicationId, medicationName, dosage, unit, scheduledTime, status, ... }], healthLogs: [{ _id, userId, type, scheduledDate, scheduledTime, details, ... }] }` | 403: Access denied; 500: Server error |
| POST | `/api/caregiver/patients/:patientId/tasks/:taskId/notify` | Params: `patientId: string, taskId: string`; Body: `{ taskType: 'medication'\|'health' }` | `sendTaskNotificationSchema` (Zod) | `{ success: true, message: string }` | 400: Invalid task type; 403: Access denied; 404: Reminder/Health log không tồn tại; 500: Server error |

---

## Ghi Chú

### Quy Ước Ghi Fields

1. **READ DB Fields**: Liệt kê các field được đọc từ database, bao gồm:
   - Fields dùng để query/filter (vd: `User.phone`, `Reminder.scheduledTime`)
   - Fields được populate (vd: `Message.senderId populate User.name, User.avatar`)
   - Fields được select/return trong response

2. **WRITE DB Fields**: Liệt kê các field được tạo/update/xóa:
   - Fields được set khi create (vd: `User.name`, `Medication.userId`)
   - Fields được update (vd: `User.isVerified=true`, `Reminder.status`)
   - Fields được set null (vd: `User.otpCode=null`)
   - Models được delete (vd: `Reminder (delete)`)

3. **Populate**: Ghi rõ khi có populate, ví dụ:
   - `Message.senderId populate User.name, User.avatar`
   - `CaregiverRequest.caregiverId populate User.name, User.phone, User.avatar`

4. **Access Control**: 
   - Role check được ghi trong cột "Role"
   - Access control check (vd: `patient.caregiverId === caregiver._id`) được ghi trong READ fields với model User

5. **Helper Functions**:
   - `generateRemindersForMedication()` trong `createMedication` tạo Reminder records
   - Các function này không được ghi riêng trong bảng, nhưng WRITE fields đã bao gồm các fields được tạo

### Lưu Ý Đặc Biệt

1. **PDF Export**: Endpoint `/api/reports/export-pdf` có thể nhận token từ query param hoặc header Authorization.

2. **Settings Routes**: Routes `/api/settings/notifications` có authenticate middleware được apply trong controller, không phải trong route file.

3. **Chat Permissions**: Chat endpoints kiểm tra permission dựa trên:
   - PATIENT → CAREGIVER: phải linked (`receiver.caregiverId === sender._id`) hoặc có pending/accepted request
   - CAREGIVER → PATIENT: phải linked (`receiver.caregiverId === sender._id`) hoặc có pending/accepted request

4. **Caregiver Access Control**: Tất cả caregiver endpoints kiểm tra:
   - User role phải là CAREGIVER
   - Patient phải có `caregiverId === caregiver._id`

5. **AI Endpoints**: Một số AI endpoints không lưu vào database (vd: `parseMedication`, `estimateCalories`), chỉ trả về kết quả từ OpenAI API.

6. **Notification IDs**: Các model Reminder và HealthLog có field `notificationIds` nhưng backend không schedule notifications. Notifications được schedule ở mobile app với Notifee.

---

**Chú ý:** Tài liệu này được tạo tự động từ codebase. Nếu code thay đổi, cần cập nhật tài liệu tương ứng.


