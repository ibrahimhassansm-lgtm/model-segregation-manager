@echo off
rem MSM Forma Scanner - one-time install helper (Chrome or Edge)
set "DIR=%~dp0"
if "%DIR:~-1%"=="\" set "DIR=%DIR:~0,-1%"
echo %DIR%| clip
echo.
echo The extension folder path is copied to your clipboard:
echo   %DIR%
echo.
echo In the page that opens:
echo   1. Turn ON "Developer mode" (top right)
echo   2. Click "Load unpacked"
echo   3. Paste the path (Ctrl+V) in the folder box and press Select Folder
echo.
start "" chrome "chrome://extensions" 2>nul || start "" msedge "edge://extensions"
pause
