@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  === MongoDB telepites ellenorzes ===
echo.

call npm.cmd run mongo:test
if errorlevel 1 (
  echo.
  echo  Allitsd be a .env.local MONGODB_URI-t, aztan futtasd ujra.
  echo  Utmutato: MONGO-LEPESEK.md
  pause
  exit /b 1
)

echo.
echo  Demo adatok feltoltese (seed)...
call npm.cmd run seed
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo  === Keszen all ===
echo  Inditas: INDITAS.bat  vagy  npm.cmd run dev
echo  Agency:  http://localhost:3000/agency
echo.
pause
