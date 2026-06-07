# MongoDB Atlas — most, lépésről lépésre

## 1. Fiók (2 perc)

1. Nyisd meg: **https://cloud.mongodb.com**
2. **Sign up** (Google fiókkal is jó)
3. Válaszd: **M0 FREE** → régió: **Frankfurt (eu-central-1)** → Create

---

## 2. Felhasználó + jelszó (1 perc)

1. Bal oldal: **Database Access** → **Add New Database User**
2. Username: `goscalecms`
3. **Autogenerate Secure Password** → **másold ki** (pl. Jegyzettömbbe)
4. Database User Privileges: **Read and write to any database**
5. **Add User**

---

## 3. Hálózat — engedélyezd a géped (1 perc)

1. **Network Access** → **Add IP Address**
2. **Allow Access from Anywhere** → `0.0.0.0/0`
3. **Confirm**

*(Később Vercelhez is kell.)*

---

## 4. Connection string (1 perc)

1. **Database** → **Connect** → **Drivers**
2. Driver: **Node.js**, verzió mindegy
3. Másold a sort, pl.:

```
mongodb+srv://goscalecms:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

4. Cseréld ki:
   - `<password>` → a **2. lépésben** másolt jelszó (egyben, nincs szóköz)
   - A végére add hozzá az adatbázis nevét: `/goscale-cms` a `.net/` után:

**Példa végeredmény:**

```
mongodb+srv://goscalecms:ABCxyz123@cluster0.ab1cd.mongodb.net/goscale-cms?retryWrites=true&w=majority
```

**Ha `ECONNREFUSED` hibát kapsz:** a `.env.local`-ban használd a „sima” sort (a projektben már be van állítva nálad). Ne `mongodb+srv`, hanem `mongodb://` — lásd `.env.local` első sora.

---

## 5. Beillesztés a projektbe

1. Nyisd meg fájlban:

   `C:\Users\K\saját\szerkesztő\client-cms-platform\.env.local`

2. Az első sort cseréld erre (a TE stringeddel):

```env
MONGODB_URI=mongodb+srv://goscalecms:IDE_A_JELSZO@cluster0.xxxxx.mongodb.net/goscale-cms?retryWrites=true&w=majority
AGENCY_PASSWORD=AgencyAdmin2024!
JWT_SECRET=goscale-cms-jwt-secret-32-chars-min
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Mentsd** (Ctrl+S)

---

## 6. Teszt + demo adatok

**Dupla katt:** `MONGO-TELEPITES.bat`

VAGY cmd:

```cmd
cd C:\Users\K\saját\szerkesztő\client-cms-platform
npm.cmd run mongo:test
npm.cmd run seed
npm.cmd run dev
```

---

## 7. Böngésző

| Hol | Jelszó |
|-----|--------|
| http://localhost:3000/agency | `AgencyAdmin2024!` |
| http://localhost:3000/edit/demo-epito | `epito123` |
| http://localhost:3000/edit/demo-webshop | `webshop123` |

---

## Ha hibázik

| Hiba | Megoldás |
|------|----------|
| `authentication failed` | Rossz jelszó a URI-ban |
| `timed out` | Network Access → 0.0.0.0/0 |
| `bad auth` + speciális jelszó | Atlas-ban új user, egyszerű jelszó (csak betű+szám) |

Jelszó URL-kódolás: pl. `@` → `%40`, `#` → `%23`
