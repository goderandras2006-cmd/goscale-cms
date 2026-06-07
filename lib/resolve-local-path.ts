import fs from 'fs';
import path from 'path';

/** Windows: ha a beírt útvonal encoding miatt nem egyezik, megkeresi a mappát név alapján. */
export function resolveLocalImportPath(localPath: string): string {
  const trimmed = localPath.trim();
  const resolved = path.resolve(trimmed);

  if (fs.existsSync(resolved)) {
    return resolved;
  }

  const parent = path.dirname(resolved);
  const wanted = path.basename(resolved).normalize('NFC').toLowerCase();

  if (!fs.existsSync(parent)) {
    return resolved;
  }

  for (const entry of fs.readdirSync(parent)) {
    const normalized = entry.normalize('NFC').toLowerCase();
    if (normalized === wanted) {
      return path.join(parent, entry);
    }
  }

  return resolved;
}

export function normalizeLiveUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
