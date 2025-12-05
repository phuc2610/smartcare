# Script để chạy Android app với Metro bundler tự động
# Script này sẽ:
# 1. Kiểm tra và khởi động Metro bundler nếu chưa chạy
# 2. Build và chạy Android app

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SmartCare - Android Build & Run Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra xem Metro có đang chạy không
Write-Host "Checking if Metro Bundler is running..." -ForegroundColor Yellow
$metroRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/status" -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $metroRunning = $true
        Write-Host "Metro Bundler is already running!" -ForegroundColor Green
    }
} catch {
    Write-Host "Metro Bundler is not running. Will start it in background..." -ForegroundColor Yellow
}

# Khởi động Metro trong background nếu chưa chạy
if (-not $metroRunning) {
    Write-Host "Starting Metro Bundler in background with cache reset..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npx react-native start --reset-cache" -WindowStyle Minimized
    Write-Host "Waiting for Metro to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Kiểm tra lại
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8081/status" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "Metro Bundler started successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not verify Metro is running. Continuing anyway..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Building and running Android app..." -ForegroundColor Cyan
Write-Host ""

# Chạy build script
if (Test-Path ".\build-android-short-path.ps1") {
    Write-Host "Using short path build script..." -ForegroundColor Cyan
    .\build-android-short-path.ps1
} else {
    Write-Host "Using standard build..." -ForegroundColor Cyan
    npm run android
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Build completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Metro Bundler is running in a separate window." -ForegroundColor Yellow
Write-Host "Keep it running while using the app." -ForegroundColor Yellow

