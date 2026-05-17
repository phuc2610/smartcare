package com.smartcare;

import android.content.Intent;
import android.os.Build;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import androidx.core.content.ContextCompat;

/**
 * FallDetectionModule — Bridge để React Native điều khiển Foreground Service
 * 
 * JS gọi được:
 *   NativeModules.FallDetectionModule.startService()
 *   NativeModules.FallDetectionModule.stopService()
 *   NativeModules.FallDetectionModule.getStatus()
 *   NativeModules.FallDetectionModule.resetFallState()
 */
public class FallDetectionModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public FallDetectionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "FallDetectionModule";
    }

    /**
     * Bắt đầu Foreground Service phát hiện té ngã
     */
    @ReactMethod
    public void startService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, FallDetectionService.class);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(reactContext, serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("START_ERROR", "Không thể khởi động dịch vụ phát hiện té ngã: " + e.getMessage());
        }
    }

    /**
     * Dừng Foreground Service
     */
    @ReactMethod
    public void stopService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, FallDetectionService.class);
            reactContext.stopService(serviceIntent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_ERROR", "Không thể dừng dịch vụ: " + e.getMessage());
        }
    }

    /**
     * Lấy trạng thái hiện tại
     */
    @ReactMethod
    public void getStatus(Promise promise) {
        WritableMap status = Arguments.createMap();
        status.putBoolean("isRunning", FallDetectionService.isRunning);
        status.putBoolean("fallDetected", FallDetectionService.fallDetected);
        promise.resolve(status);
    }

    /**
     * Reset trạng thái fallDetected (sau khi user xác nhận "Tôi ổn")
     */
    @ReactMethod
    public void resetFallState(Promise promise) {
        FallDetectionService.fallDetected = false;
        promise.resolve(true);
    }

    /**
     * Giả lập ngã để test (chỉ dùng dev)
     */
    @ReactMethod
    public void simulateFall(Promise promise) {
        FallDetectionService.fallDetected = true;
        
        // Mở app lên foreground
        Intent launchIntent = new Intent(reactContext, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        launchIntent.putExtra("fall_detected", true);
        reactContext.startActivity(launchIntent);
        
        // Gửi event cho JS
        sendFallEvent();
        
        promise.resolve(true);
    }

    private void sendFallEvent() {
        if (reactContext.hasActiveReactInstance()) {
            WritableMap params = Arguments.createMap();
            params.putBoolean("fallDetected", true);
            params.putDouble("timestamp", System.currentTimeMillis());
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onFallDetected", params);
        }
    }
}
