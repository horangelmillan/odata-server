@echo off
setlocal enabledelayedexpansion

if "%1"=="" (
    echo Usage: %~nx0 ^<port^>
    echo Example: %~nx0 3000
    exit /b 1
)

set "PORT=%1"
set "PID="

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    set "PID=%%a"
)

if not defined PID (
    echo No process found listening on port %PORT%.
    exit /b 0
)

echo Found PID %PID% listening on port %PORT%. Killing...
taskkill /F /PID %PID% >nul 2>&1

if %errorlevel% equ 0 (
    echo Process %PID% terminated.
) else (
    echo Failed to kill process %PID%.
    exit /b 1
)

exit /b 0
