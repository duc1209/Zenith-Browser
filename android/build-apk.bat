@echo off
title Zenith Browser - Build APK
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1"
echo.
pause
