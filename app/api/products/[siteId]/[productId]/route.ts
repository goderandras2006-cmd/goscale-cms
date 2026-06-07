import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import { checkSiteAccess } from '@/lib/site-access';

// PUT /api/products/[siteId]/[productId] — Termék frissítése
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; productId: string }> }
) {
  const { siteId, productId } = await params;
  await connectDB();

  if (!(await checkSiteAccess(req, siteId))) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const body = await req.json();
  // Guardian: csak engedélyezett termék mezők
  const allowed = ['name', 'description', 'priceHuf', 'imageUrl', 'category', 'active', 'order'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const product = await Product.findOneAndUpdate(
    { _id: productId, siteId },
    { $set: update },
    { new: true }
  );

  if (!product) {
    return NextResponse.json({ error: 'Termék nem található' }, { status: 404 });
  }

  return NextResponse.json(product);
}

// DELETE /api/products/[siteId]/[productId] — Termék törlése
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; productId: string }> }
) {
  const { siteId, productId } = await params;
  await connectDB();

  if (!(await checkSiteAccess(req, siteId))) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  await Product.findOneAndDelete({ _id: productId, siteId });
  return NextResponse.json({ ok: true });
}
