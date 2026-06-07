# ECONNREFUSED hiba — 3 javítás (próbáld sorban)

A jelszó rendben lehet. A gép **nem éri el** a MongoDB címet (DNS / hálózat).

---

## JAVÍTÁS 1 — Atlas: mindenhonnan engedély (2 perc)

1. https://cloud.mongodb.com
2. Bal: **Security** → **Network Access**
3. Legyen **két** sor is ok:
   - `188.143.14.181` (a tied)
   - `0.0.0.0/0` — ha nincs, **Add IP** → **Allow Access from Anywhere** → Confirm
4. Várj **2 percet**
5. Futtasd újra: **MONGO-TELEPITES.bat**

---

## JAVÍTÁS 2 — Másik internet (1 perc)

1. Kapcsold ki a Wi-Fi-t a telefonon
2. **Mobil hotspot** be
3. A számítógép csatlakozzon a telefonra
4. **MONGO-TELEPITES.bat** újra

Ha így megy → a router/DNS blokkolta otthon.

---

## JAVÍTÁS 3 — Nem SRV string (Atlasból)

Ha 1–2 nem segít:

1. Atlas → **Database** → **Clusters** → **Connect**
2. **Drivers**
3. Keresd: **„View full code sample”** VAGY **„I have MongoDB Compass”**
4. Vagy görgess le: **„Use a connection string without SRV”** / kapcsoló kikapcsolása
5. Másold a **`mongodb://`** kezdetű sort (nem `mongodb+srv`)

6. Dupla katt: **ENV-JEGYZETTOMB.bat**
7. Az **első sort** cseréld erre (a TE sort másold, csak példa):

```
MONGODB_URI=mongodb://goscalecms:JELSZO@cluster0-shard-00-00.ieasjsl.mongodb.net:27017,cluster0-shard-00-01.ieasjsl.mongodb.net:27017,cluster0-shard-00-02.ieasjsl.mongodb.net:27017/goscale-cms?ssl=true&authSource=admin&replicaSet=atlas-xxxxx-shard-0
```

8. **Ctrl+S** → **MONGO-TELEPITES.bat**

---

## JAVÍTÁS 4 — Windows DNS (opcionális)

1. **Beállítások** → **Hálózat** → Wi-Fi → a hálózatod → **DNS**
2. **Szerkesztés** → **Kézi**
3. Elsődleges: `8.8.8.8`
4. Másodlagos: `1.1.1.1`
5. Mentés → gépet **újraindítás** → **MONGO-TELEPITES.bat**
