# CMS élesben, 0–24 (géped nélkül)

## Mi ez?

Egy **online tárhely** (Render.com), ahol a szerkesztő **folyamatosan fut**.
Nem kell INDITAS.bat, nem kell bekapcsolt géped.

Az ügyfél weboldala továbbra is **Cloudflare Pages** — ez nem változik.

---

## MOST mit csinálj? (átmenet)

| Mi | Kell most? |
|----|------------|
| INDITAS.bat gépeden | **Nem** ügyfeleknek — csak ha te fejlesztesz |
| Cloudflare tunnel | **Átmenet** — amíg fel nem rakjuk Renderre |
| GHL párosítás (Location ID) | **Igen** — ezt megcsinálhatod agency-ben, nem vész el |

**Tehát most:** nyugodtan **kapcsold ki / ne foglalkozz** a gépeden futó szerkesztővel ügyfél miatt.
A következő lépés: CMS felrakása Renderre → `cms.goscale.hu` oda mutat.

---

## 1. lépés — Render fiók

1. Menj: [render.com](https://render.com)
2. Regisztráció (email vagy GitHub)
3. **Ingyenes** regisztráció van, de **0–24 futáshoz** kell a **Starter** csomag (~7 USD/hó) — különben „elalszik”

---

## 2. lépés — Projekt feltöltése

**Ha van GitHub:**
1. Render → **New** → **Web Service**
2. Csatold a GitHubot, válaszd a `client-cms-platform` mappát
3. Beállítások:
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Plan: **Starter**

**Ha nincs GitHub:**
1. Hozz létre GitHub repót, töltsd fel a mappát  
   VAGY Render **Manual Deploy** (zip) — kérdezd meg, segítünk

---

## 3. lépés — Környezeti változók (Render dashboard)

Ugyanazok, mint a `.env.local`:

| Név | Érték |
|-----|--------|
| MONGODB_URI | (a tiéd Atlas-ból) |
| AGENCY_PASSWORD | (a tiéd) |
| JWT_SECRET | (a tiéd) |
| NEXT_PUBLIC_APP_URL | `https://cms.goscale.hu` |
| CLOUDFLARE_API_TOKEN | (a tiéd) |
| CLOUDFLARE_ACCOUNT_ID | (a tiéd) |

---

## 4. lépés — cms.goscale.hu átállítása

**Régi (tunnel):** géped → cloudflared  
**Új (éles):** Render szerver

1. Render → a service → **Settings** → **Custom Domains** → add: `cms.goscale.hu`
2. Cloudflare (goscale.hu DNS):
   - Töröld vagy kapcsold ki a **tunnel** hostname-et (`cms`)
   - Új **CNAME**: `cms` → amit a Render megad (pl. `goscale-cms.onrender.com`)
3. Várj 5–15 percet

---

## 5. lépés — Tunnel kikapcsolása (ha Render megy)

Gépeden (opcionális, takarítás):
- Szolgáltatások → **Cloudflared** → Leállítás  
Vagy hagyd — nem árt, ha már nem használod a DNS-t.

---

## 6. lépés — GHL

Ha `https://cms.goscale.hu/agency` betölt Renderről:
1. Agency → **GHL párosítás** → Location ID
2. GHL Custom Menu URL másolása
3. Kész — **géped nem kell**

---

## Összefoglaló

```
ELŐTTE (most):  cms.goscale.hu → tunnel → a te géped
UTÁNA (cél):    cms.goscale.hu → Render → mindig fut
```

Fejlesztéshez továbbra is: `INDITAS.bat` + `localhost:3000` a gépeden.
