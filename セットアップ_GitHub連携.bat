@echo off
cd /d "%~dp0"
set "GH=C:\Program Files\GitHub CLI\gh.exe"

echo === Step 1/3: GitHub login ===
"%GH%" auth status >nul 2>&1
if errorlevel 1 "%GH%" auth login --hostname github.com --git-protocol https --web
"%GH%" auth status >nul 2>&1
if errorlevel 1 (
  echo NG: GitHub login failed. Please run this file again.
  pause
  exit /b 1
)

echo === Step 2/3: Create cloud repository ===
git config user.name >nul 2>&1 || git config user.name "hit-radar"
git config user.email >nul 2>&1 || git config user.email "hit-radar@example.com"
git rev-parse --is-inside-work-tree >nul 2>&1 || (git init -b main >nul && git add -A && git commit -m "initial" >nul)
"%GH%" repo view uefn-hit-radar >nul 2>&1
if errorlevel 1 (
  "%GH%" repo create uefn-hit-radar --public --source . --push
) else (
  git push -u origin main
)

echo === Step 3/3: Configure app and start first cloud run ===
for /f %%i in ('"%GH%" repo view uefn-hit-radar --json nameWithOwner -q .nameWithOwner') do set "REPO=%%i"
node setup-github.mjs %REPO%
"%GH%" workflow run daily-collect --repo %REPO% >nul 2>&1
schtasks /Delete /F /TN "UEFNHitRadar" >nul 2>&1
echo.
echo OK: Setup complete. Cloud will collect data daily at 07:05 JST.
echo Repo: https://github.com/%REPO%
pause
