import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI nincs beállítva a .env.local fájlban!');
  process.exit(1);
}

// Inline sémák
const SiteSchema = new mongoose.Schema(
  { 
    _id: String, name: String, type: String, password: String, checkoutEmail: String, checkoutUrl: String,
    pages: { type: [{ slug: String, title: String, navLabel: String, order: Number }], default: [] },
    customDomain: String, isDemo: Boolean, theme: { primary: String },
    siteMode: { type: String, enum: ['html_cloudflare', 'demo_template'], default: 'demo_template' }
  },
  { timestamps: true, _id: false }
);

const ContentSchema = new mongoose.Schema(
  { siteId: String, status: String, version: Number, data: mongoose.Schema.Types.Mixed },
  { timestamps: true }
);
ContentSchema.index({ siteId: 1, status: 1 }, { unique: true });

const ProductSchema = new mongoose.Schema(
  { siteId: String, slug: String, name: String, description: String, priceHuf: Number, imageUrl: String, category: String, active: Boolean, order: Number },
  { timestamps: true }
);

const Site = mongoose.models.Site || mongoose.model('Site', SiteSchema);
const Content = mongoose.models.Content || mongoose.model('Content', ContentSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ MongoDB kapcsolódva');

  // Törlés
  await Site.deleteMany({ _id: { $in: ['demo-epito', 'demo-webshop', 'lg-klimatech'] } });
  await Content.deleteMany({ siteId: { $in: ['demo-epito', 'demo-webshop', 'lg-klimatech'] } });
  await Product.deleteMany({ siteId: 'demo-webshop' });

  // ─── SITE 1: demo-epito (landing) ─────────────────────────────────
  await Site.create({
    _id: 'demo-epito',
    name: 'Kovács Építő Kft.',
    type: 'landing',
    siteMode: 'demo_template',
    password: 'epito123',
    checkoutEmail: 'info@kovacsepit.hu',
    isDemo: true,
  });

  const epitoContent = {
    hero: {
      title: 'Megbízható építőipari megoldások',
      subtitle: 'Több mint 20 éve tervezzük és kivitelezzük az ön álomotthonát. Minőség, megbízhatóság, pontosság.',
      cta: 'Kérjen ingyenes ajánlatot',
      imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
      badge: '⭐ 500+ elégedett ügyfél',
    },
    about: {
      title: 'Rólunk',
      text: 'A Kovács Építő Kft. 2003 óta foglalkozik lakóépületek, irodák és ipari létesítmények tervezésével és kivitelezésével. Csapatunk 30 tapasztalt szakemberből áll, akik elkötelezettek a minőség iránt. Munkáinkat garanciával végezzük, és minden projektet határidőre adunk át.',
      imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    },
    services: [
      { title: 'Tervezés', desc: 'Egyedi tervek, engedélyeztetés, hatósági ügyek intézése professzionálisan.', icon: '📐' },
      { title: 'Kivitelezés', desc: 'Magasépítési munkák, szerkezetépítés, teljes körű kivitelezés.', icon: '🏗️' },
      { title: 'Felújítás', desc: 'Lakás- és irodafelújítás, tetőcsere, homlokzatfelújítás.', icon: '🔨' },
      { title: 'Karbantartás', desc: 'Épületkarbantartás, hibajavítás, azonnali beavatkozás.', icon: '🔧' },
    ],
    testimonials: [
      { name: 'Nagy Péter', text: 'Kiváló munkát végeztek! Az egész felújítás határidőre, hibamentesen lett kész.', rating: 5 },
      { name: 'Szabó Mária', text: 'Professzionális csapat, tisztességes árak. Mindenkinek ajánlom!', rating: 5 },
    ],
    contact: { phone: '+36 1 234 5678', email: 'info@kovacsepit.hu', address: '1051 Budapest, Nádor utca 12.' },
    seo: { title: 'Kovács Építő Kft. — Megbízható építőipari megoldások Budapest', description: 'Lakóépületek és irodák...', keywords: 'építkezés' },
  };

  await Content.create({ siteId: 'demo-epito', status: 'draft', version: 1, data: epitoContent });
  await Content.create({ siteId: 'demo-epito', status: 'published', version: 1, data: epitoContent });

  // ─── SITE 2: demo-webshop ─────────────────────────────────────────
  await Site.create({
    _id: 'demo-webshop',
    name: 'Fából Faragva Webshop',
    type: 'shop',
    siteMode: 'demo_template',
    password: 'webshop123',
    checkoutEmail: 'rendeles@fabolfaragva.hu',
    isDemo: true,
  });

  const shopContent = {
    hero: { title: 'Fából Faragva', subtitle: 'Kézzel készített...', cta: 'Vásároljon most', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80' },
    shopText: { heroTitle: 'Kézzel készített faipari termékek', cta: 'Megtekintés' }
  };

  await Content.create({ siteId: 'demo-webshop', status: 'draft', version: 1, data: shopContent });
  await Content.create({ siteId: 'demo-webshop', status: 'published', version: 1, data: shopContent });

  console.log('\n🎉 Seed sikeres!\n');
  console.log('Demo loginok:');
  console.log('  Agency:     /agency  →  jelszó: [AGENCY_PASSWORD env változó]');
  console.log('  Építő:      /edit/demo-epito  →  jelszó: epito123');
  console.log('  Webshop:    /edit/demo-webshop  →  jelszó: webshop123');
  console.log('\nPublikus oldalak:');
  console.log('  /site/demo-epito');
  console.log('  /site/demo-webshop/shop');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed hiba:', err);
  process.exit(1);
});
