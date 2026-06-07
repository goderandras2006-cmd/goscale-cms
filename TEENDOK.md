# Teendők — platform kész, ezt csináld te

Az Antigravity **megépítette** a platformot. Neked 3 dolog kell, hogy tényleg működjön:

---

## 1. MongoDB Atlas (15 perc, egyszer)

1. Menj: https://cloud.mongodb.com → regisztráció / belépés  
2. **Create** → ingyenes **M0** cluster  
3. **Database Access** → Add user (jelszó, pl. `GoscaleCms2024`)  
4. **Network Access** → **Add IP** → **Allow access from anywhere** (`0.0.0.0/0`)  
   *(kell a Vercelhez is később)*  
5. **Database** → **Connect** → **Drivers** → másold a connection stringet  
6. A jelszóban lévő speciális karaktereket URL-encode-old, vagy egyszerű jelszót használj  

---

## 2. `.env.local` fájl

A `client-cms-platform` mappában:

1. Másold: `.env.example` → `.env.local`  
2. Írd át:

```env
MONGODB_URI=mongodb+srv://TE_USER:TE_JELSZO@cluster0.xxxxx.mongodb.net/goscale-cms?retryWrites=true&w=majority
AGENCY_PASSWORD=AgencyAdmin2024!
JWT_SECRET=valami-hosszu-random-minimum-32-karakter
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Parancssorban (cmd):

```cmd
cd C:\Users\K\saját\szerkesztő\client-cms-platform
npm.cmd run seed
```

Ha sikeres: „Seed kész” / demo site-ok létrejöttek.

---

## 3. Indítás

**Dupla katt:** `INDITAS.bat`  

VAGY cmd:

```cmd
npm.cmd run dev
```

---

## Tesztelési checklist

| # | Mit | URL | Jelszó |
|---|-----|-----|--------|
| 1 | Agency (te) | http://localhost:3000/agency | `AgencyAdmin2024!` |
| 2 | Ügyfél landing | http://localhost:3000/edit/demo-epito | `epito123` |
| 3 | Élő landing | http://localhost:3000/site/demo-epito | — |
| 4 | Ügyfél webshop | http://localhost:3000/edit/demo-webshop | `webshop123` |
| 5 | Élő shop | http://localhost:3000/site/demo-webshop/shop | — |

**Publish teszt:**  
Szerkesztőben változtass egy szöveget → **Élesítés** → nyisd meg a `/site/...` oldalt F5-tel.

---

## Ügyfélnek átadás (élesben)

1. **Vercel:** GitHub repo → Import → env változók ugyanazok  
2. **Deploy** után: `https://te-app.vercel.app/agency`  
3. Új ügyfél: Agency dashboard → Új site  
4. Küldés: `/edit/ugyfel-id` + jelszó  
5. Ügyfél domain: Vercel custom domain VAGY külön statikus host (később)

---

## 2. fázis (ha kéred Antigravitynek)

- Site jelszó módosítás agency-ből  
- Vercel automatikus frissítés publish után  
- Valódi kosár / SimplePay  
- OpenRouter AI szerkesztő  

Másold be: `antigravity\PROMPT-2-WEBSHOP.txt` vagy írd: „2. fázis: jelszó szerkesztés + Vercel revalidate”.

---

## goscale.hu

A **saját** oldalad továbbra is: `saját\weboldal` — **külön** marad.  
Ez a platform = **amit ügyfeleknek adsz**.
