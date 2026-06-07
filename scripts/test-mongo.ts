import * as dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const uri = process.env.MONGODB_URI;

async function main() {
  console.log('');
  console.log('  MongoDB kapcsolat teszt');
  console.log('');

  if (!uri || uri.includes('FELHASZNÁLÓ') || uri.includes('JELSZÓ')) {
    console.log('  ❌ A .env.local-ban még nincs valódi MONGODB_URI.');
    console.log('     Nyisd meg: client-cms-platform\\.env.local');
    console.log('     Illeszd be az Atlas connection stringet.');
    console.log('');
    console.log('  Lépések: szerkesztő\\client-cms-platform\\MONGO-LEPESEK.md');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('  ✅ Sikeres kapcsolat a MongoDB Atlas-szal!');
    const db = mongoose.connection.db;
    const collections = await db?.listCollections().toArray();
    console.log(`  Adatbázis: ${db?.databaseName}`);
    console.log(`  Kollekciók: ${collections?.map((c) => c.name).join(', ') || '(üres — futtasd: npm run seed)'}`);
    await mongoose.disconnect();
    console.log('');
    console.log('  Következő: npm.cmd run seed');
    console.log('');
  } catch (e) {
    console.log('  ❌ Nem sikerült csatlakozni.');
    console.log('');
    if (e instanceof Error) {
      console.log('  Hiba:', e.message);
    }
    console.log('');
    console.log('  Gyakori okok:');
    console.log('  - Rossz jelszó a connection stringben');
    console.log('  - Atlas Network Access: nincs 0.0.0.0/0');
    console.log('  - Speciális karakter a jelszóban (URL-encode vagy új jelszó)');
    process.exit(1);
  }
}

main();
