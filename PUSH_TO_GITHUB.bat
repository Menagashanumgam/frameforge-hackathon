@echo off
SET GIT="C:\Program Files\Git\cmd\git.exe"
SET REPO=https://github.com/Menagashanumgam/frameforge-hackathon.git

echo ============================================
echo   FrameForge - Push to GitHub
echo ============================================
echo.
echo GitHub Username: Menagashanumgam
echo Repo: frameforge-hackathon
echo.
echo You need a Personal Access Token as password.
echo Get one at: https://github.com/settings/tokens/new
echo  - Note: frameforge
echo  - Tick: repo (first checkbox)
echo  - Click Generate token, COPY it
echo.
echo RIGHT-CLICK in this window to PASTE your token when asked!
echo.

cd /d C:\Users\menaga\OneDrive\Desktop\videohackathon

%GIT% remote remove origin 2>nul
%GIT% remote add origin %REPO%
%GIT% branch -M main
%GIT% push -u origin main

echo.
if errorlevel 1 (
    echo ============================================
    echo  FAILED! Try these fixes:
    echo  1. Make sure you RIGHT-CLICKED to paste token
    echo  2. Generate a fresh token if expired
    echo  3. Make sure 'repo' scope is ticked
    echo ============================================
) else (
    echo ============================================
    echo  SUCCESS! Code is on GitHub!
    echo.
    echo  Now go to Render and click Manual Deploy!
    echo  URL: https://dashboard.render.com
    echo ============================================
)
echo.
pause
