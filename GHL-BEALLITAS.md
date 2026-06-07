# GHL — szerkesztő a menüben (egyszerűen)

## Mi a cél?

Az ügyfél a **GHL bal menüjéből** rákattint egy gombra → megnyílik a **weboldal szerkesztő** → jelszó nélkül tud szerkeszteni.

---

## Miért nem megy még?

Most a szerkesztő csak a **saját gépeden** fut (`INDITAS.bat` → `localhost:3000`).

A GHL az **interneten** van. Onnan **nem éri el** a te géped „belső” címét.

**Kell:** egy **nyilvános internetes cím** a szerkesztőnek, pl. `https://cms.goscale.hu`

*(A Cloudflare-t már ismered — az ügyfél weboldalait onnan szolgálod ki. Ugyanitt lehet egy **aldomain** a szerkesztőnek is.)*

---

## 1. lépés — Szerkesztő kint az interneten (Cloudflare Tunnel)

Ez **ingyenes**, nem kell Vercel. A gépeden fut továbbra is a szerkesztő, a Cloudflare „kiteszi” az internetre.

### A) Cloudflare-ben (böngésző)

1. Lépj be: [dash.cloudflare.com](https://dash.cloudflare.com)
2. Válaszd a **goscale.hu** domaint
3. Bal oldalon: **Zero Trust** (ha nincs, ingyenes csomagot kérhetsz — elég a ingyenes)
4. **Networks → Tunnels → Create a tunnel**
5. Nevezd el: pl. `goscale-cms`
6. Telepítsd a **cloudflared** programot a gépre (a Cloudflare ad linket / parancsot)
7. A tunnelnél add hozzá a **Public Hostname**:
   - Subdomain: `cms`
   - Domain: `goscale.hu`
   - Service: `http://localhost:3000`
8. Mentsd

### B) Saját gépen (minden alkalommal, amikor GHL-t tesztelsz)

1. Indítsd: **INDITAS.bat** (maradjon nyitva az ablak)
2. Indítsd a **cloudflared** tunelt is (amit a Cloudflare mutatott — pl. `cloudflared tunnel run goscale-cms`)

Ha mindkettő fut → a `https://cms.goscale.hu` megnyitja a szerkesztőt.

### C) Beállító fájl (`.env.local`)

Nyisd meg a `client-cms-platform\.env.local` fájlt, és írd át ezt a sort:

```
NEXT_PUBLIC_APP_URL=https://cms.goscale.hu
```

Mentsd, majd **állítsd le és indítsd újra** az INDITAS.bat-ot.

---

## 2. lépés — Site összekötése a GHL fiókkal

1. Böngésző: `http://localhost:3000/agency` (vagy élesben `https://cms.goscale.hu/agency`)
2. Jelszó: amit az `AGENCY_PASSWORD`-ben beállítottál
3. Keresd meg az ügyfél site-ját (pl. Aktív Klíma)
4. Kattints: **🔗 GHL párosítás**
5. Írd be a **Location ID**-t

**Hol találod a Location ID-t?**

- Lépj be a GHL-be **az ügyfél sub-accountjába**
- **Settings** (beállítások) → **Business Profile**
- Ott van: **Location ID** — másold ki

6. Kattints: **💾 Location ID mentése**
7. Kattints: **📋 Custom Menu URL másolása** (megjelenik a másolható link)

---

## 3. lépés — GHL menüpont létrehozása

1. GHL **Agency** fiók (a te fő fiókod, nem az ügyfél)
2. **Settings** → **Custom Menu Links** → **Create New**
3. Töltsd ki:

| Mit írj | Példa |
|---------|--------|
| Cím (Title) | Weboldal szerkesztése |
| Hol jelenjen meg | Sub-account sidebar (bal menü) |
| Hogyan nyíljon | iFrame |
| URL | Illeszd be a másolt linket (van benne `{{location.id}}` — **ne töröld**, a GHL kitölti) |

4. Mentsd

---

## 4. lépés — Teszt

1. Nyisd meg a GHL-t az **ügyfél sub-accountjában**
2. Bal menü: **Weboldal szerkesztése**
3. Meg kell nyílnia a szerkesztőnek, jelszó nélkül

---

## Ha valami nem jó

| Mit látsz | Mit csinálj |
|-----------|-------------|
| „GHL Location nincs párosítva” | Agency-ben ellenőrizd a Location ID-t — pontosan az ügyfél sub-account ID-ja legyen |
| Üres fehér ablak | Fut az INDITAS.bat + cloudflared? Elérhető böngészőből a `https://cms.goscale.hu`? |
| Nem tölt be semmi | `.env.local`-ban `NEXT_PUBLIC_APP_URL=https://cms.goscale.hu` és újraindítás |

---

## Összefoglalva

```
Te géped: INDITAS.bat + cloudflared
     ↓
cms.goscale.hu (internet)
     ↓
GHL menü → ügyfél szerkeszt
```

Nincs szükség Vercelre.
