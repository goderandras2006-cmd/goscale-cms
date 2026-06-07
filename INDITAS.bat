@echo off
chcp 65001 >nul
echo ========================================================
echo                 GOSCALE CMS PLATFORM
echo ========================================================
echo.
echo Lépésről lépésre:
echo.
echo 1. INDITAS: Ez az ablak elindítja a szervert. Ne zárd be!
echo 2. AGENCY DASHBOARD: Nyisd meg a bongeszoben a http://localhost:3000/agency cimet.
echo 3. HTML IMPORT MAPPA: Kattints a "HTML ugyfel" gombra, es toltsd fel az ugyfel megleve HTML weboldal mappajat.
echo 4. SZERKESZTO: Az importalas utan kattints a "Szerkeszto" gombra a site kartyan.
echo 5. ELESITES: A szerkesztoben a Mentes majd az Elesites gombra kattintva a weboldal kikerul az elo webre.
echo 6. CF TOKEN: Elesiteshez kell a CLOUDFLARE_API_TOKEN a .env.local fajlban!
echo.
echo ========================================================
echo A rendszer most elindul...
echo A bongeszoben nyisd meg: http://localhost:3000/agency
echo ========================================================
echo.
npm run dev
