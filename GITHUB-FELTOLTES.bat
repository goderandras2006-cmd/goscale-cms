@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo Ez a fajl mar elavult.
echo Hasznald helyette: ELESITES.bat  (1 kattintas, automatikus Render frissites)
echo.
call "%~dp0ELESITES.bat"
