# Cloudflare Pages HTML Injection Architektúra

## Cél
A jelenlegi CMS rendszer átalakítása úgy, hogy a valódi ügyfelek meglévő, Cloudflare Pages-en hosztolt HTML oldalait lehessen szerkeszteni. A szerkesztő a meglévő Vercel alapú CMS, a publikus oldal pedig marad a statikus HTML a Cloudflare-en. Mentés után a rendszer automatikusan beinjektálja a tartalmat a HTML sablonba, és újra-deployolja a Cloudflare Pages-re (Direct Upload API).

## Proposed Changes

### [Models & Database]

#### [MODIFY] `models/Site.ts`
- Új mezők: `siteMode` ('html_cloudflare' | 'demo_template'), `liveUrl`, `cloudflareProjectName`, `cloudflareAccountId`, `lastDeployedAt`, `lastSyncedAt`, `templateVersion`.
- A `type` mező maradhat, de a `siteMode` lesz a fő vezérlő.

#### [MODIFY] `models/Content.ts`
- A data struktúrában megjelenik a `sharedContact` (tel, phoneLabel, email) és a `pages` struktúra alatti HTML blokkok kezelése.

#### [MODIFY] `lib/guardian.ts`
- Az `ALLOWED_LANDING_FIELDS` bővítése a `sharedContact` mezőkkel és az aloldalankénti specifikus blokkokkal (pl. `hero.h1`, `hero.lead`).

---

### [Phase 1: Import & Parsing]

#### [NEW] `lib/html-mark.ts`
- Segédfüggvények, amik a feltöltött/importált HTML fájlokba `data-cms="kulcs"` attribútumokat injektálnak (ha még nincsenek benne).

#### [NEW] `lib/html-parse.ts`
- A megjelölt HTML fájlok beolvasása, és a `data-cms` attribútumok alapján a tartalom kinyerése a MongoDB `draft` állapotához.

#### [NEW] `app/api/sites/import/route.ts`
- `POST`: Ügynökségi végpont ZIP fájl (vagy dev módban localPath) fogadására. 
- Kicsomagolás `templates/[siteId]/` mappába (vagy tmp-be), fájlok megjelölése, parse-olás, Site és Content(draft, published) rekordok létrehozása.

#### [MODIFY] `seed/seed.ts`
- Az `lg-klimatech` "kamu" seed eltávolítása/kikapcsolása, mivel ez már egy valódi Cloudflare importált site lesz.

---

### [Phase 2: Editor Updates]

#### [MODIFY] `app/edit/[siteId]/page.tsx`
- Ha `siteMode === 'html_cloudflare'`:
  - Iframe előnézet a `liveUrl` alapján (cache busting parameterrel `?preview=time`).
  - Dinamikus űrlap generálás a parse-olt mezők alapján (SEO, Hero H1/Lead, Shared Contact).
  - GHL iframe optimalizálás (`?embed=1`).

---

### [Phase 3: Publish to Cloudflare]

#### [NEW] `lib/html-build.ts`
- A MongoDB `published` tartalom beinjektálása a `templates/[siteId]/` mappában lévő HTML fájlokba (a `data-cms` attribútumok alapján).
- A `shared.js` regex alapú módosítása a CONTACT adatokhoz.

#### [NEW] `lib/cloudflare-deploy.ts`
- A módosított fájlrendszer direkt feltöltése (Direct Upload API) a Cloudflare Pages-re a megadott `cloudflareProjectName` projektbe.

#### [NEW] `app/api/content/[siteId]/publish/route.ts`
- `POST`: A publish gomb hívja. Másolja a draftot published-be, meghívja a `html-build`-et, majd a `cloudflare-deploy`-t.
- Visszaadja a deployment URL-t.

---

### [Phase 4: Sync & Re-import]

#### [NEW] `app/api/sites/[siteId]/sync-live/route.ts`
- A `liveUrl` html-jeinek letöltése, `html-parse` futtatása, és a MongoDB `draft` frissítése.

#### [NEW] `app/api/sites/[siteId]/import-zip/route.ts`
- Meglévő site HTML sablonjának frissítése új ZIP fájlból (ha kézzel módosult a dizájn).

---

### [Phase 5: Agency UI & Cleanup]

#### [MODIFY] `app/agency/page.tsx`
- Új gombok: "HTML import (ZIP)", "Szinkron élőről", "Import ZIP".
- Meglévő űrlap bővítése `liveUrl`, `cloudflareProjectName` mezőkkel.

#### [MODIFY] `middleware.ts`
- A Vercel rewrite kikapcsolása a `html_cloudflare` site-oknál.

#### [MODIFY] `README-HU.md`
- Teljes újraírás a Vercel vs Cloudflare Pages megosztásról, deployról, env változókról.

## User Review Required

> [!WARNING]
> Kérlek hagyd jóvá a tervet! Az importált HTML fájlok ideiglenes tárolására a szerveren (Vercel) a `/tmp` mappát vagy a fájlrendszert (pl. `data/templates`) fogjuk használni a prototípushoz? Mivel a Vercel stateless, érdemes lehet az import során a MongoDB-be menteni a sablon HTML fájlokat (pl. GridFS vagy simán adatbázis mezők), és publishkor onnan felépíteni. Az MVP-ben használhatunk Vercel fájlrendszert ideiglenesen a build folyamán, de a sablon forrását hol tároljuk? MongoDB-ben stringként az egyes HTML fájlok tartalmát? Ez tűnik a legstabilabbnak. Kérem a visszajelzésed!
