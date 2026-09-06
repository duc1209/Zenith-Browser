[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  ZENITH BROWSER - BIEN DICH FILE APK (ANDROID)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$env:JAVA_HOME = "C:\Users\DUC\AppData\Roaming\PrismLauncher\java\java-runtime-gamma"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

Write-Host "`n[1/2] Dang bien dich ung dung Android..." -ForegroundColor Yellow
& "$env:JAVA_HOME\bin\java.exe" -classpath "gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[2/2] Sao chep file APK..." -ForegroundColor Yellow
    Copy-Item "app\build\outputs\apk\debug\app-debug.apk" "$scriptDir\ZenithBrowser.apk" -Force
    Copy-Item "app\build\outputs\apk\debug\app-debug.apk" "$scriptDir\..\ZenithBrowser.apk" -Force
    Write-Host "`n====================================================" -ForegroundColor Cyan
    Write-Host "  XUAT FILE APK THANH CONG 100%!" -ForegroundColor Green
    Write-Host "  File nam tai: $scriptDir\..\ZenithBrowser.apk" -ForegroundColor White
    Write-Host "====================================================" -ForegroundColor Cyan
} else {
    Write-Host "`n Bien dich that bai, vui long kiem tra lai!" -ForegroundColor Red
}
