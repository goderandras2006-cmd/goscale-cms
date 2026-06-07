import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import type { EditableField } from '@/lib/editable-fields';

function requireAgency(req: NextRequest): boolean {
  return req.cookies.get('agency_auth')?.value === process.env.AGENCY_PASSWORD;
}

// DELETE /api/sites/[siteId]/fields/[fieldId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; fieldId: string }> }
) {
  if (!requireAgency(req)) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const { siteId, fieldId } = await params;
  await connectDB();
  const site = await Site.findById(siteId);
  if (!site) return NextResponse.json({ error: 'Site nem található' }, { status: 404 });

  const fields: EditableField[] = (site.editableFields || []).filter((f: EditableField) => f.id !== fieldId);
  if (fields.length === (site.editableFields || []).length) {
    return NextResponse.json({ error: 'Mező nem található' }, { status: 404 });
  }

  site.editableFields = fields;
  await site.save();

  return NextResponse.json({ ok: true, fields });
}
