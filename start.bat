@echo off
setlocal
title BobCoin
cd /d "%~dp0"

echo [BobCoin] Starting...
where npm >nul 2>nul
if errorlevel 1 (
    echo [BobCoin] npm not found. Please install it.
    pause
    exit /b 1
)

npm run parity:matrix

if errorlevel 1 (
    echo [BobCoin] Exited with error code %errorlevel%.
    pause
)
endlocal
