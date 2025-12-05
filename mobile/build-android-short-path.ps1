# Script build Android với virtual drive để tránh Windows path length limit
# Sử dụng subst để tạo drive ngắn hơn

$currentPath = (Get-Location).Path
$shortDrive = "W:"
$shortPath = "W:\"

Write-Host "Creating virtual drive $shortDrive for shorter path..." -ForegroundColor Cyan

# Remove existing subst nếu có
try {
    subst $shortDrive /D 2>$null | Out-Null
} catch {
    # Ignore error if drive doesn't exist
}

# Tạo virtual drive
try {
    subst $shortDrive $currentPath
} catch {
    Write-Host "Warning: Could not create virtual drive. Continuing with original path..." -ForegroundColor Yellow
    npm run android
    exit $LASTEXITCODE
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create virtual drive. Trying to build with original path..." -ForegroundColor Yellow
    npm run android
    exit $LASTEXITCODE
}

Write-Host "Virtual drive created: $shortDrive -> $currentPath" -ForegroundColor Green
Write-Host "Building from $shortDrive..." -ForegroundColor Cyan

# Chuyển sang virtual drive và build
Set-Location $shortPath
# Không tự động start Metro (vì đã chạy rồi)
$env:REACT_NATIVE_PACKAGER_SKIP_AUTO_START = "true"
$env:CI = "true"  # Disable interactive prompts
npx react-native run-android --no-packager
$buildResult = $LASTEXITCODE

# Quay lại thư mục gốc
Set-Location $currentPath

# Xóa virtual drive
Write-Host "`nRemoving virtual drive..." -ForegroundColor Cyan
subst $shortDrive /D

if ($buildResult -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit $buildResult
} else {
    Write-Host "Build completed successfully!" -ForegroundColor Green
}

