@echo off
cd /d "%~dp0"
start "" "http://localhost:3199"
node server.mjs
pause
