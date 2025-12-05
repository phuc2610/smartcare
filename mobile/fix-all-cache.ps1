# Script để fix tất cả cache issues
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Clearing ALL caches..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop Metro if running
Write-Host "Stopping Metro bundler..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*metro*" -or $_.CommandLine -like "*react-native start*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear Metro cache
Write-Host "Clearing Metro cache..." -ForegroundColor Yellow
if (Test-Path "$env:TEMP\metro-*") {
    Remove-Item -Recurse -Force "$env:TEMP\metro-*" -ErrorAction SilentlyContinue
}
if (Test-Path "$env:TEMP\haste-map-*") {
    Remove-Item -Recurse -Force "$env:TEMP\haste-map-*" -ErrorAction SilentlyContinue
}

# Clear watchman cache (if exists - mainly for macOS/Linux)
Write-Host "Clearing watchman cache..." -ForegroundColor Yellow
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    watchman watch-del-all 2>$null
} else {
    Write-Host "  Watchman not installed (optional, mainly for macOS/Linux)" -ForegroundColor Gray
}

# Clear Android build cache
Write-Host "Clearing Android build cache..." -ForegroundColor Yellow
if (Test-Path "android\.gradle") {
    Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
}
if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
}

# Clear node_modules/.cache
Write-Host "Clearing node_modules cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Cache cleared! Now:" -ForegroundColor Green
Write-Host "1. Start Metro: npm start" -ForegroundColor Yellow
Write-Host "2. Build app: npm run android:short" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green

