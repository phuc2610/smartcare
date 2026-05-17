package com.smartcare;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * FallDetectionService — Foreground Service phát hiện té ngã chạy nền
 * 
 * Thuật toán 2 giai đoạn (Apple Watch style):
 * 1. FREEFALL: Gia tốc < 3 m/s² (rơi tự do)
 * 2. IMPACT: Gia tốc > 24.5 m/s² trong vòng 1 giây sau freefall
 */
public class FallDetectionService extends Service implements SensorEventListener {

    private static final String TAG = "FallDetection";
    private static final String CHANNEL_ID = "fall_detection_channel";
    private static final String ALERT_CHANNEL_ID = "fall_alert_channel";
    private static final int NOTIFICATION_ID = 9001;

    // Thresholds
    private static final float GRAVITY = 9.81f;
    private static final float FREEFALL_THRESHOLD = 0.3f * GRAVITY;   // < 3 m/s²
    private static final float IMPACT_THRESHOLD = 2.5f * GRAVITY;     // > 24.5 m/s²
    private static final long FREEFALL_WINDOW_MS = 1000;              // 1 giây
    private static final long COOLDOWN_MS = 10000;                    // 10 giây

    private SensorManager sensorManager;
    private Sensor accelerometer;
    private PowerManager.WakeLock wakeLock;

    private long freefallTimestamp = 0;
    private long lastFallTime = 0;
    private boolean isInCooldown = false;

    // Static flag để JS đọc trạng thái
    public static boolean isRunning = false;
    public static boolean fallDetected = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "✅ Service created");
        
        createNotificationChannels();
        
        // Acquire WakeLock để sensor không bị tắt khi CPU sleep
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SmartCare::FallDetection");
        wakeLock.acquire();

        // Khởi tạo accelerometer
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "✅ Service started");
        
        // Hiện notification cố định "Đang bảo vệ"
        startForeground(NOTIFICATION_ID, buildForegroundNotification());
        
        // Bắt đầu đọc accelerometer (5Hz = tiết kiệm pin)
        if (accelerometer != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL);
            Log.i(TAG, "📡 Accelerometer registered");
        } else {
            Log.e(TAG, "❌ No accelerometer found on this device!");
        }

        isRunning = true;
        fallDetected = false;

        // START_STICKY = restart service nếu bị kill
        return START_STICKY;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) return;
        if (isInCooldown) return;

        float x = event.values[0];
        float y = event.values[1];
        float z = event.values[2];
        float totalAccel = (float) Math.sqrt(x * x + y * y + z * z);

        long now = System.currentTimeMillis();

        // Giai đoạn 1: Phát hiện rơi tự do
        if (totalAccel < FREEFALL_THRESHOLD) {
            if (freefallTimestamp == 0) {
                freefallTimestamp = now;
                Log.d(TAG, "🔻 Freefall detected: " + totalAccel + " m/s²");
            }
            return;
        }

        // Giai đoạn 2: Phát hiện va chạm sau rơi tự do
        if (freefallTimestamp > 0 && totalAccel > IMPACT_THRESHOLD) {
            long timeSinceFreefall = now - freefallTimestamp;

            if (timeSinceFreefall <= FREEFALL_WINDOW_MS) {
                Log.w(TAG, "⚠️ FALL CONFIRMED! Impact: " + totalAccel + " m/s², Delay: " + timeSinceFreefall + "ms");
                
                onFallDetected();
                
                // Cooldown
                isInCooldown = true;
                lastFallTime = now;
                new android.os.Handler(getMainLooper()).postDelayed(() -> {
                    isInCooldown = false;
                }, COOLDOWN_MS);

                freefallTimestamp = 0;
                return;
            }
        }

        // Reset freefall nếu quá window
        if (freefallTimestamp > 0 && (now - freefallTimestamp) > FREEFALL_WINDOW_MS) {
            freefallTimestamp = 0;
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Không cần xử lý
    }

    /**
     * Xử lý khi phát hiện ngã: Mở app lên foreground + gửi event cho JS
     */
    private void onFallDetected() {
        fallDetected = true;

        // 1. Mở MainActivity (đưa app lên foreground ngay cả khi màn hình tắt)
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        launchIntent.putExtra("fall_detected", true);
        startActivity(launchIntent);

        // 2. Gửi broadcast để JS biết
        Intent broadcastIntent = new Intent("com.smartcare.FALL_DETECTED");
        sendBroadcast(broadcastIntent);

        Log.w(TAG, "🚨 Fall alert triggered - opening app");
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Channel cho notification cố định (silent)
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "Phát hiện té ngã",
                NotificationManager.IMPORTANCE_LOW // Không phát âm thanh
            );
            serviceChannel.setDescription("SmartCare đang bảo vệ bạn khỏi té ngã");
            serviceChannel.setShowBadge(false);

            // Channel cho cảnh báo ngã (HIGH - âm thanh + rung)
            NotificationChannel alertChannel = new NotificationChannel(
                ALERT_CHANNEL_ID,
                "Cảnh báo té ngã",
                NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("Cảnh báo khẩn cấp khi phát hiện té ngã");
            alertChannel.enableVibration(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(serviceChannel);
            manager.createNotificationChannel(alertChannel);
        }
    }

    private Notification buildForegroundNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🛡 SmartCare đang bảo vệ bạn")
            .setContentText("Phát hiện té ngã đang hoạt động")
            .setSmallIcon(android.R.drawable.ic_menu_compass) // Dùng icon hệ thống
            .setContentIntent(pendingIntent)
            .setOngoing(true) // Không thể vuốt bỏ
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "⏹ Service destroyed");
        isRunning = false;
        
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        super.onDestroy();
    }
}
