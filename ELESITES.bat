@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   GoScale CMS - ELESITES (1 kattintas)
echo ========================================
echo.
echo Mit csinal ez?
echo   1. Feltolti a valtoztatasokat GitHubra
echo   2. A Render MAGATOL ujratelepiti (~2-3 perc)
echo   Neked NEM kell a Render oldalra menni.
echo.

set "GIT=C:\Program Files\Git\bin\git.exe"
if not exist "%GIT%" set "GIT=git"

"%GIT%" rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo HIBA: Ez a mappa nincs Git alatt.
  pause
  exit /b 1
)

"%GIT%" remote get-url origin >nul 2>&1
if errorlevel 1 (
  "%GIT%" remote add origin https://github.com/goderandras2006-cmd/goscale-cms.git
)

"%GIT%" branch -M main 2>nul

REM --- Git nev / email (elso alkalommal kerdezi, fajlba is menti) ---
call :ENSURE_GIT_IDENTITY
if errorlevel 1 (
  pause
  exit /b 1
)

echo Ellenorzes: van-e uj valtozas...
"%GIT%" diff --quiet
set "HAS_UNSTAGED=!ERRORLEVEL!"
"%GIT%" diff --cached --quiet
set "HAS_STAGED=!ERRORLEVEL!"

if !HAS_UNSTAGED!==0 if !HAS_STAGED!==0 (
  echo.
  echo Nincs uj valtozas a gepeden.
  echo Megprobalom feltolteni amit mar commitoltunk...
  goto PUSH
)

echo.
set /p MSG="Rovid leiras (Enter = automatikus): "
if "!MSG!"=="" set "MSG=Frissites !date! !time!"

echo.
echo Mentes es feltoltes...
"%GIT%" add -A
"%GIT%" commit -m "!MSG!"
if errorlevel 1 (
  echo.
  echo Commit sikertelen.
  echo Ha meg mindig hiba van, ird meg milyen szoveg jott.
  pause
  exit /b 1
)

:PUSH
echo.
echo Feltoltes GitHubra... (ha ker, jelentkezz be a bongeszoben)
"%GIT%" push -u origin main
if errorlevel 1 (
  echo.
  echo HIBA a feltoltesnel. Probald ujra, vagy jelentkezz be GitHubra.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   SIKER!
echo ========================================
echo.
echo A Render most MAGATOL ujratelepiti a szerkesztot.
echo Varj 2-3 percet, aztan probald a GHL menut.
echo.
echo Ellenorzes: https://dashboard.render.com
echo.
pause
exit /b 0

:ENSURE_GIT_IDENTITY
REM Automatikus - nem kerdez semmit (adatok: .git-identity-name / .git-identity-email)
set "GIT_NAME="
set "GIT_EMAIL="
if exist ".git-identity-name" set /p GIT_NAME=<.git-identity-name
if exist ".git-identity-email" set /p GIT_EMAIL=<.git-identity-email
if "!GIT_NAME!"=="" set "GIT_NAME=andris"
if "!GIT_EMAIL!"=="" set "GIT_EMAIL=godeer.andras2006@gmail.com"
"%GIT%" config user.name "!GIT_NAME!"
"%GIT%" config user.email "!GIT_EMAIL!"
exit /b 0
