package com.smartcare;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.media.Image;
import android.media.ImageReader;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;
import android.view.Surface;

import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * HeartRateModule — Đo nhịp tim qua camera + flash
 * 
 * Nguyên lý PPG (Photoplethysmography):
 * 1. Bật flash + camera sau
 * 2. User đặt ngón tay lên camera
 * 3. Đọc mỗi frame, tính trung bình kênh Red
 * 4. Gửi data points cho JS để tính BPM
 */
public class HeartRateModule extends ReactContextBaseJavaModule {

    private static final String TAG = "HeartRate";
    private static final int PREVIEW_WIDTH = 176;
    private static final int PREVIEW_HEIGHT = 144;

    private final ReactApplicationContext reactContext;
    private CameraDevice cameraDevice;
    private CameraCaptureSession captureSession;
    private ImageReader imageReader;
    private HandlerThread backgroundThread;
    private Handler backgroundHandler;
    private boolean isMeasuring = false;

    // Data collection
    private final List<Double> redValues = new ArrayList<>();
    private long startTime = 0;
    private int frameCount = 0;

    public HeartRateModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "HeartRateModule";
    }

    @ReactMethod
    public void startMeasurement(Promise promise) {
        if (isMeasuring) {
            promise.reject("ALREADY_MEASURING", "Đang đo rồi");
            return;
        }

        if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            promise.reject("NO_PERMISSION", "Chưa cấp quyền camera");
            return;
        }

        try {
            startBackgroundThread();
            openCamera();
            isMeasuring = true;
            redValues.clear();
            frameCount = 0;
            startTime = System.currentTimeMillis();
            promise.resolve(true);
            Log.i(TAG, "✅ Heart rate measurement started");
        } catch (Exception e) {
            promise.reject("START_ERROR", "Lỗi khởi động camera: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopMeasurement(Promise promise) {
        try {
            closeCamera();
            stopBackgroundThread();
            isMeasuring = false;

            // Tính BPM từ dữ liệu thu được
            if (redValues.size() >= 30) {
                double bpm = calculateBPM();
                WritableMap result = Arguments.createMap();
                result.putDouble("bpm", bpm);
                result.putInt("sampleCount", redValues.size());
                result.putDouble("duration", (System.currentTimeMillis() - startTime) / 1000.0);
                result.putBoolean("valid", bpm >= 40 && bpm <= 200);
                promise.resolve(result);
            } else {
                promise.reject("NOT_ENOUGH_DATA", "Chưa đủ dữ liệu. Giữ ngón tay lâu hơn.");
            }

            Log.i(TAG, "⏹ Measurement stopped, samples: " + redValues.size());
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getStatus(Promise promise) {
        WritableMap status = Arguments.createMap();
        status.putBoolean("isMeasuring", isMeasuring);
        status.putInt("sampleCount", redValues.size());
        status.putDouble("elapsed", isMeasuring ? (System.currentTimeMillis() - startTime) / 1000.0 : 0);
        promise.resolve(status);
    }

    private void openCamera() throws CameraAccessException {
        CameraManager manager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);
        String cameraId = manager.getCameraIdList()[0]; // Back camera

        // Setup ImageReader nhỏ (176x144) để tiết kiệm
        imageReader = ImageReader.newInstance(PREVIEW_WIDTH, PREVIEW_HEIGHT, ImageFormat.YUV_420_888, 2);
        imageReader.setOnImageAvailableListener(reader -> {
            Image image = reader.acquireLatestImage();
            if (image != null) {
                processFrame(image);
                image.close();
            }
        }, backgroundHandler);

        try {
            manager.openCamera(cameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(CameraDevice camera) {
                    cameraDevice = camera;
                    Log.i(TAG, "📷 Camera opened");
                    createCaptureSession();
                }

                @Override
                public void onDisconnected(CameraDevice camera) {
                    camera.close();
                    cameraDevice = null;
                }

                @Override
                public void onError(CameraDevice camera, int error) {
                    camera.close();
                    cameraDevice = null;
                    Log.e(TAG, "Camera error: " + error);
                }
            }, backgroundHandler);
        } catch (SecurityException e) {
            Log.e(TAG, "Camera permission denied", e);
        }
    }

    private void createCaptureSession() {
        if (cameraDevice == null) return;

        try {
            Surface surface = imageReader.getSurface();

            cameraDevice.createCaptureSession(
                Arrays.asList(surface),
                new CameraCaptureSession.StateCallback() {
                    @Override
                    public void onConfigured(CameraCaptureSession session) {
                        captureSession = session;
                        try {
                            CaptureRequest.Builder builder = 
                                cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
                            builder.addTarget(surface);
                            
                            // Bật flash liên tục
                            builder.set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_TORCH);
                            // Auto exposure OFF cho ổn định
                            builder.set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON);
                            
                            session.setRepeatingRequest(builder.build(), null, backgroundHandler);
                            Log.i(TAG, "📡 Capture session started with flash ON");
                        } catch (CameraAccessException e) {
                            Log.e(TAG, "Capture request failed", e);
                        }
                    }

                    @Override
                    public void onConfigureFailed(CameraCaptureSession session) {
                        Log.e(TAG, "Session configuration failed");
                    }
                },
                backgroundHandler
            );
        } catch (CameraAccessException e) {
            Log.e(TAG, "Create session failed", e);
        }
    }

    /**
     * Xử lý mỗi frame: Lấy trung bình kênh Red từ YUV
     */
    private void processFrame(Image image) {
        if (!isMeasuring) return;

        ByteBuffer yBuffer = image.getPlanes()[0].getBuffer();
        ByteBuffer uBuffer = image.getPlanes()[1].getBuffer();
        ByteBuffer vBuffer = image.getPlanes()[2].getBuffer();

        int width = image.getWidth();
        int height = image.getHeight();

        // Lấy vùng trung tâm (1/4 diện tích) để tránh viền
        int startX = width / 4;
        int endX = width * 3 / 4;
        int startY = height / 4;
        int endY = height * 3 / 4;

        double totalRed = 0;
        int pixelCount = 0;
        int yRowStride = image.getPlanes()[0].getRowStride();
        int uvRowStride = image.getPlanes()[1].getRowStride();
        int uvPixelStride = image.getPlanes()[1].getPixelStride();

        for (int y = startY; y < endY; y += 2) {
            for (int x = startX; x < endX; x += 2) {
                int yVal = yBuffer.get(y * yRowStride + x) & 0xFF;
                int uvIndex = (y / 2) * uvRowStride + (x / 2) * uvPixelStride;
                
                int uVal, vVal;
                try {
                    uVal = uBuffer.get(uvIndex) & 0xFF;
                    vVal = vBuffer.get(uvIndex) & 0xFF;
                } catch (IndexOutOfBoundsException e) {
                    continue;
                }

                // YUV to Red channel
                double red = yVal + 1.402 * (vVal - 128);
                red = Math.max(0, Math.min(255, red));
                totalRed += red;
                pixelCount++;
            }
        }

        if (pixelCount > 0) {
            double avgRed = totalRed / pixelCount;
            redValues.add(avgRed);
            frameCount++;

            // Gửi data point cho JS mỗi frame
            if (reactContext.hasActiveReactInstance()) {
                WritableMap event = Arguments.createMap();
                event.putDouble("redValue", avgRed);
                event.putInt("frameIndex", frameCount);
                event.putDouble("elapsed", (System.currentTimeMillis() - startTime) / 1000.0);
                
                // Tính BPM realtime nếu đủ data (>50 samples)
                if (redValues.size() > 50) {
                    double bpm = calculateBPM();
                    event.putDouble("bpm", bpm);
                    event.putBoolean("valid", bpm >= 40 && bpm <= 200);
                }

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onHeartRateData", event);
            }
        }
    }

    /**
     * Tính BPM từ tín hiệu Red:
     * 1. Smoothing (moving average)
     * 2. Đếm peak (điểm cực đại)
     * 3. BPM = peaks / thời_gian * 60
     */
    private double calculateBPM() {
        if (redValues.size() < 30) return 0;

        // 1. Moving average smoothing (window = 5)
        List<Double> smoothed = new ArrayList<>();
        int window = 5;
        for (int i = 0; i < redValues.size(); i++) {
            double sum = 0;
            int count = 0;
            for (int j = Math.max(0, i - window); j <= Math.min(redValues.size() - 1, i + window); j++) {
                sum += redValues.get(j);
                count++;
            }
            smoothed.add(sum / count);
        }

        // 2. Tính đạo hàm để tìm điểm chuyển hướng
        // 3. Đếm peaks (local maxima)
        int peaks = 0;
        double totalVal = 0;
        for (double v : smoothed) totalVal += v;
        double mean = totalVal / smoothed.size();

        // Chỉ đếm peak nằm trên mean
        for (int i = 2; i < smoothed.size() - 2; i++) {
            if (smoothed.get(i) > smoothed.get(i - 1) &&
                smoothed.get(i) > smoothed.get(i - 2) &&
                smoothed.get(i) > smoothed.get(i + 1) &&
                smoothed.get(i) > smoothed.get(i + 2) &&
                smoothed.get(i) > mean) {
                peaks++;
                i += 3; // Skip next few to avoid counting same peak twice
            }
        }

        // 4. Tính BPM
        double durationSeconds = (System.currentTimeMillis() - startTime) / 1000.0;
        if (durationSeconds <= 0 || peaks <= 0) return 0;

        double bpm = (peaks / durationSeconds) * 60.0;

        // Clamp to reasonable range
        bpm = Math.max(40, Math.min(200, bpm));

        Log.d(TAG, "BPM=" + bpm + " peaks=" + peaks + " duration=" + durationSeconds + "s samples=" + redValues.size());
        return Math.round(bpm * 10) / 10.0;
    }

    private void closeCamera() {
        if (captureSession != null) {
            captureSession.close();
            captureSession = null;
        }
        if (cameraDevice != null) {
            cameraDevice.close();
            cameraDevice = null;
        }
        if (imageReader != null) {
            imageReader.close();
            imageReader = null;
        }
    }

    private void startBackgroundThread() {
        backgroundThread = new HandlerThread("HeartRateBg");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());
    }

    private void stopBackgroundThread() {
        if (backgroundThread != null) {
            backgroundThread.quitSafely();
            try {
                backgroundThread.join();
                backgroundThread = null;
                backgroundHandler = null;
            } catch (InterruptedException e) {
                Log.e(TAG, "Thread join interrupted", e);
            }
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    public void removeListeners(int count) {
        // Required for NativeEventEmitter
    }
}
