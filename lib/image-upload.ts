import fs from 'fs';
import path from 'path';
import { getSiteTemplateDir } from '@/lib/template-storage';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

export function saveSiteUpload(
  siteId: string,
  buffer: Buffer,
  originalName: string
): { relativePath: string; previewUrl: string } {
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Csak JPG, PNG, GIF, WebP vagy AVIF kép tölthető fel');
  }

  const safeBase = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40) || 'kep';

  const filename = `${Date.now()}-${safeBase}${ext}`;
  const relativePath = `img/uploads/${filename}`;
  const dir = path.join(getSiteTemplateDir(siteId), 'img', 'uploads');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path.join(dir, filename), buffer);

  const previewUrl = `/api/sites/${siteId}/preview-asset?path=${encodeURIComponent(relativePath)}`;

  return { relativePath, previewUrl };
}
