# Script để khởi động Metro Bundler cho React Native
# Sử dụng script này để đảm bảo Metro bundler chạy trước khi build/run app

Write-Host "Starting Metro Bundler..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop Metro Bundler" -ForegroundColor Yellow
Write-Host ""

# Kiểm tra xem Metro có đang chạy không
$metroProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*metro*" -or $_.CommandLine -like "*react-native start*" }

if ($metroProcess) {
    Write-Host "Metro Bundler is already running!" -ForegroundColor Yellow
    Write-Host "If you want to restart, please stop it first (Ctrl+C in the Metro terminal)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Starting new Metro instance anyway..." -ForegroundColor Cyan
}

# Clear Metro cache nếu cần
if ($args -contains "--reset-cache") {
    Write-Host "Clearing Metro cache..." -ForegroundColor Cyan
    npx react-native start --reset-cache
} else {
    # Mặc định reset cache để đảm bảo nhận package mới
    Write-Host "Starting Metro with cache reset (to pick up new packages)..." -ForegroundColor Cyan
    npx react-native start --reset-cache
}

