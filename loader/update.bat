@echo off
rem Optional: re-download the loader files from GitHub into this folder, then press the refresh arrow in chrome://extensions
set "DIR=%~dp0"
for %%F in (manifest.json background.js) do powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing 'https://ibrahimhassansm-lgtm.github.io/model-segregation-manager/loader/%%F' -OutFile '%DIR%%%F'"
echo Done. Now press the refresh arrow on "MSM Forma Scanner" in chrome://extensions
pause
