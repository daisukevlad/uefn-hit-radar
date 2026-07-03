@echo off
schtasks /Delete /F /TN "UEFNHitRadar" >nul 2>&1
schtasks /Create /F /TN "UEFNHitRadar" /TR "\"%~dp0daily-collect.bat\"" /SC DAILY /ST 07:00
if %errorlevel%==0 (
  echo OK: Daily task "UEFNHitRadar" registered at 07:00
) else (
  echo NG: Failed to register task. Error code %errorlevel%
)
pause
