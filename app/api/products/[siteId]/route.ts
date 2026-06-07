import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import Site from '@/models/Site';

// GET /api/products/[siteId] — Termékek listázása
export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await connectDB();
  const products = await Product.find({ siteId }).sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json(products);
}

// POST /api/products/[siteId] — Új termék hozzáadása
export async function POST(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  const agencyAuth = req.cookies.get('agency_auth')?.value;
  const siteAuth = req.cookies.get(`site_auth_${siteId}`)?.value;

  if (agencyAuth !== process.env.AGENCY_PASSWORD && !siteAuth) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  if (siteAuth && agencyAuth !== process.env.AGENCY_PASSWORD) {
    await connectDB();
    const site = await Site.findById(siteId);
    if (!site || siteAuth !== site.password) {
      return NextResponse.json({ error: 'Érvénytelen jelszó' }, { status: 401 });
    }
  } else {
    await connectDB();
  }

  const body = await req.json();
  const { name, description, priceHuf, imageUrl, category, active, slug } = body;

  if (!name || priceHuf === undefined) {
    return NextResponse.json({ error: 'Név és ár kötelező' }, { status: 400 });
  }

  // Slug generálás
  const finalSlug = slug || name
    .toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óöő]/g, 'o').replace(/[úüű]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const count = await Product.countDocuments({ siteId });
  const product = await Product.create({
    siteId, slug: finalSlug, name, description: description || '',
    priceHuf, imageUrl: imageUrl || '', category: category || 'Általános',
    active: active !== false, order: count,
  });

  return NextResponse.json(product, { status: 201 });
}
