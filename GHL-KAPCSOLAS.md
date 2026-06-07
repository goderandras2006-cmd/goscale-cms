# GHL összekapcsolás — 3 lépés (fejlesztés nélkül)

A GHL **nem a gépedhez** kapcsolódik, hanem egy **interneten futó szerkesztő címhez** (`cms.goscale.hu`).

---

## 1. lépés — Szerkesztő fent az interneten (kötelező)

**Ez nem fejlesztés** — ez üzembe helyezés, mint amikor egy weboldalt feltöltesz Cloudflare-re.

- Hol: **Render.com** (online tárhely, ~7 USD/hó, 0–24 fut)
- Cím: `https://cms.goscale.hu`
- Részletek: `ELES-CMS-TELEPITES.md`

**Amíg ez nincs kész**, a GHL menü **nem fog működni** az ügyfélnek (502 vagy üres oldal).

A tunnel + géped **nem** végleges — ezt most kihagyjuk.

---

## 2. lépés — Location ID párosítás (Agency)

1. Nyisd meg: `https://cms.goscale.hu/agency`
2. Site kártya → **GHL párosítás**
3. Beilleszted a **Location ID**-t (GHL → ügyfél sub-account → Settings → Business Profile)
4. **Mentés**

---

## 3. lépés — GHL menüpont

1. GHL Agency → **Settings → Custom Menu Links → Create**
2. Cím: `Weboldal szerkesztése`
3. Megjelenés: sub-account bal menü, **iFrame**
4. URL (másold az Agency-ből):

```
https://cms.goscale.hu/api/ghl/auth?loc={{location.id}}&embed=1
```

5. Mentés → ügyfél sub-accountban megjelenik a menü

---

## Kész — mit csinál az ügyfél?

GHL menü → Weboldal szerkesztése → belép jelszó nélkül → szerkeszt → Élesítés
