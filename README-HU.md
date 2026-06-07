# GoScale Client CMS Platform — README

## Mi ez?

Egy **belső CMS platform**, amelyen keresztül ügyfeleid be tudnak lépni és szerkeszthetik a számukra készített weboldal / webshop tartalmát — anélkül, hogy megrontanák a dizájnt vagy a kódot.

**Az ügyfél:**
- Kap egy linket (`/edit/ugyfel-id`) + jelszót — **vagy** GHL Custom Menu Linken keresztül lép be jelszó nélkül
- Módosítja a szövegeket a szerkesztőben
- Kattint Mentés → Élesítés
- **A látogató azonnal a valódi, módosított HTML oldalt látja** a saját domainjén (Cloudflare Pages)

**Te (agency):**
- Importálod a statikus HTML weboldalt (mappa vagy ZIP)
- A rendszer tárolja a sablonokat MongoDB-ben
- Minden Élesítés = Cloudflare Pages Direct Upload Deploy

**goscale.hu marketing = KÜLÖN projekt, ne keverd.**

---

## Architektúra

```
Ügyfél /edit/[siteId]  →  Next.js CMS (Vercel vagy CF Workers)
         ↓ Mentés (draft)
         MongoDB (Content, templateFiles)
         ↓ Élesítés (Publish)
         Cloudflare Pages Deploy → www.ugyfel.hu
```

A látogató soha nem a Next.js `/site/...` sablont látja — hanem a **valódi ügyfél HTML-jét Cloudflare-en**.

---

## Gyors indítás (lokális fejlesztés)

### 1. Előfeltételek

- Node.js 18+
- MongoDB Atlas fiók (ingyenes tier elegendő)

### 2. Telepítés

```bash
cd client-cms-platform
npm install
```

### 3. Környezeti változók

Másold a `.env.example` fájlt `.env.local` névvel:

```env
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://...

# Az ügynökség bejelentkezési jelszava (/agency)
AGENCY_PASSWORD=AgencyAdmin2024!

# JWT titkos kulcs
JWT_SECRET=goscale-cms-jwt-secret-32-chars-min

# Lokális URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cloudflare Pages (éles deploynál kell)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=

# Feature flag: Vercel custom domain rewrite (html ügyfeleknél NEM kell)
SITE_TEMPLATE_ENABLED=false
```

### 4. Fejlesztői szerver

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

---

## Valódi HTML ügyfél felvétele (Fő folyamat)

Ez az **igazi** ügyfél-felvétel: meglévő statikus HTML weboldal beimportálása.

1. Menj az Agency Dashboardra (`/agency`)
2. Kattints a **📦 HTML ügyfél (ZIP)** gombra
3. Töltsd ki:
   - **Site ID**: `ugyfel-cegnev` (kisbetű, kötőjel)
   - **Ügyfél neve**: pl. `L&G Klimatech Kft.`
   - **Jelszó**: az ügyfél belépési jelszava
   - **Cloudflare Live URL**: pl. `https://lg-klimatech.pages.dev`
   - **Cloudflare Project Name**: pl. `lg-klimatech` (a CF Pages projektedének neve)
   - **Forrás**: válassz Mappa (webkitdirectory) vagy ZIP között
4. Kattints az **Import** gombra
5. A rendszer:
   - Betölti az összes HTML/CSS/JS/kép fájlt
   - Automatikusan `data-cms` markereket ad az editable elemekhez
   - MongoDB-be menti (templateFiles)
   - Létrehozza az initial content draft-ot
6. A megjelenő checklist modál megmutatja a következő lépéseket

### Sablon update (ha változik a weboldal dizájnja)

Az Agency Dashboardon a site kártyán a **📁 Mappa** vagy **📦 ZIP** gombbal töltsd fel az új sablonokat. Ez NEM törli a meglévő tartalmat!

---

## Cloudflare Pages beállítás

### 1. CF API token

Cloudflare Dashboard → My Profile → API Tokens → Create Token

Szükséges jogosultság: `Cloudflare Pages:Edit`

Töltsd be a `.env.local`-ba:
```env
CLOUDFLARE_API_TOKEN=<token>
CLOUDFLARE_ACCOUNT_ID=<fiókod ID>
```

### 2. CF Pages projekt

Az első deployhoz létre kell hozni a projektet a Cloudflare-en:
```bash
npx wrangler pages project create ugyfel-project-name
```

Vagy a CF Dashboard-on: Pages → Create a project → Direct Upload

### 3. Custom domain

CF Dashboard → Pages → [projekt] → Custom Domains → Add domain → `www.ugyfel.hu`

DNS beállítás (ügyfél domain regisztrátornál):
```
Type: CNAME
Name: www
Target: ugyfel-project-name.pages.dev
```

---

## Szerkesztő előnézet — hogyan működik

Az `/edit/[siteId]` oldalon az **előnézet iframe** a `GET /api/sites/[siteId]/preview` API-t tölti be.

Ez az API:
1. Betölti a `templateFiles`-ból a HTML sablonokat
2. Beleinjektálja a jelenlegi draft tartalmat (`buildSiteFiles()`)
3. Visszaadja a kész HTML-t
4. Az iframe ugyanazon az originen tölti, nem Cloudflare-ről → nincs X-Frame-Options blokkolás

Az **Élő oldal** gomb a valódi Cloudflare URL-t nyitja meg.

---

## Publikálás (Publish) menete

1. Ügyfél módosítja a szövegeket a szerkesztőben
2. **Mentés** → Draft frissül MongoDB-ben (a látogatók még a régit látják)
3. **Élesítés** → 
   - Draft átmásolódik Published-be
   - `buildSiteFiles()` → HTML generálás a tartalom + sablon alapján
   - `wrangler pages deploy` → Cloudflare-re feltöltés
   - **A látogatók azonnal az új tartalmat látják** a Cloudflare CDN-en

---

## GoHighLevel (GHL) Custom Menu Link integráció

Az ügyfél **jelszó nélkül** lép be a CMS szerkesztőbe, közvetlenül a GHL sub-account menüjéből.

### Hogyan működik?

```
GHL sub-account menü
  → Custom Menu Link URL: https://cms.goscale.hu/api/ghl/auth?loc={{location.id}}&embed=1
  → GHL behelyettesíti: ?loc=abc123xyz456
  → Platform megtalálja a párosított site-ot (ghlLocationId alapján)
  → Beállítja a session cookie-t (8 óra, SameSite=None)
  → Átirányít: /edit/kovacs-epito
  → Ügyfél automatikusan belépve ✅
```

### URL minták

| Mikor | URL minta |
|-------|-----------|
| GHL Custom Menu Link (ha MÁR van GHL ID párosítva) | `.../api/ghl/auth?loc={{location.id}}&embed=1` |
| Hagyományos belépés (jelszóval) | `.../edit/ugyfel-id` |

**`?embed=1`** opcionális, ha a GHL iframe-ben mutatja: kompaktabb fejléc, és a CMS cookie SameSite=None lesz.

### GHL Location ID párosítás

Agency Dashboardon az új HTML ügyfél modálban add meg a **GHL Location ID**-t (GHL → Settings → Business Profile → Location ID).

Ezután a Dashboard automatikusan a helyes linket másolja a `🔗 GHL szerkesztő URL` gombbal.

---

## Demo site-ok (csak belső célra)

A **+ Demo site** gomb egy `demo_template` módú site-ot hoz létre, ami a Next.js `/site/...` sablonon fut. Ez csak belső tesztelésre és referenciának való — **valódi ügyfélnél tilos!**

---

## `/site/*` route státusza

- `demo_template` site-oknál: aktív, Next.js rendereli
- `html_cloudflare` ügyfeleknél: **nem használt** (a látogató a CF-ről tölti)
- `SITE_TEMPLATE_ENABLED=false` → middleware nem rewrite-ol custom domainre

---

## Fejlesztési roadmap

- [x] Agency dashboard
- [x] HTML ügyfél import (mappa + ZIP)
- [x] Lokális preview API (iframe, no X-Frame-Options)
- [x] Kliens szerkesztő (Guardian védett)
- [x] Draft + Publish munkafolyamat
- [x] Cloudflare Pages deploy (wrangler)
- [x] GHL Custom Menu Link integráció (`?embed=1`)
- [x] Site törlés (DELETE + tartalom + termékek)
- [x] Multi-page HTML support
- [ ] Cloudflare Workers CMS deploy (cms.goscale.hu) — 2. fázis
- [ ] AI chat szerkesztés (OpenRouter) — 2. fázis
- [ ] Stripe fizetés — 2. fázis

---

*GoScale Webügynökség — goscale.hu*
