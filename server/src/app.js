const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/error');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const medicationRoutes = require('./routes/medications.routes');
const healthRoutes = require('./routes/health.routes');
const reportRoutes = require('./routes/reports.routes');
const aiRoutes = require('./routes/ai.routes');
const uploadRoutes = require('./routes/upload.routes');
const caregiverRoutes = require('./routes/caregiver.routes');
const wellnessRoutes = require('./routes/wellness.routes');
const settingsRoutes = require('./routes/settings.routes');
const customReminderRoutes = require('./routes/customReminders.routes');
const appointmentRoutes = require('./routes/appointments.routes');
const chatRoutes = require('./routes/chat.routes');
const doctorRoutes = require('./routes/doctors.routes');
const drugCatalogRoutes = require('./routes/drugCatalog.routes');
const medicalRecordRoutes = require('./routes/medicalRecord.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Rate limiting (tunable via env, can disable in dev)
const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === 'true';
const RATE_LIMIT_WINDOW_MINUTES = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 100);

if (!RATE_LIMIT_DISABLED) {
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
} else {
  console.log('[RATE LIMIT] Disabled via env');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/caregiver', caregiverRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/custom-reminders', customReminderRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/drug-catalog', drugCatalogRoutes);
app.use('/api/medical-records', medicalRecordRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;

