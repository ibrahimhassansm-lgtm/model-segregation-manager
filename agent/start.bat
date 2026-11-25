@echo off
title MSM Forma Agent
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Install the LTS version from https://nodejs.org then run this file again. & pause & exit /b 1)
if not exist node_modules (echo Installing the helper, one time only... & call npm install --no-audit --no-fund)
echo.
echo Starting MSM Forma Agent. Keep this window open while you scan.
node agent.js
pause
