MSM Forma Agent (free, no API, no admin)
Needs: Windows, Google Chrome, Node.js LTS (https://nodejs.org).
1. Extract this folder anywhere. Double-click start.bat (first run installs one small package).
2. Keep the window open. In MSM: Autodesk Forma > Scan Models > "Scan with local agent".
3. A Chrome window opens on Forma. Sign in yourself the first time (it is remembered after that).
   The agent then sets the search, scans every model and sends the list back to MSM.
Optional: set HEADLESS=1 before starting to hide the Chrome window once you are signed in.
The agent listens on 127.0.0.1 only and only answers the MSM page.
