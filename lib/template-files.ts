import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const BINARY_PREFIX = 'base64:';

const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.js', '.css', '.svg', '.txt', '.json', '.xml', '.webmanifest', '.md',
]);

export function isTextFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function shouldSkip(name: string): boolean {
  return name.includes('__MACOSX') || name.endsWith('.DS_Store');
}

function shouldInclude(name: string): boolean {
  if (shouldSkip(name)) return false;
  const ext = path.extname(name).toLowerCase();
  if (isTextFile(name)) return true;
  // Képek, fontok, egyéb statikus fájlok
  return /\.(png|jpe?g|gif|webp|ico|avif|woff2?|ttf|eot|mp4|webm|pdf)$/i.test(ext);
}

/** Ha a ZIP egy mappába csomagolva van (pl. lg-hvac-website/index.html), levágja a közös prefixet. */
export function normalizeZipPaths(files: Record<string, string>): Record<string, string> {
  const keys = Object.keys(files);
  if (keys.length === 0) return files;

  const withSlash = keys.filter((k) => k.includes('/'));
  if (withSlash.length === 0) return files;

  const prefixCounts = new Map<string, number>();
  for (const key of withSlash) {
    const prefix = key.split('/')[0] + '/';
    prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
  }

  let bestPrefix = '';
  let bestCount = 0;
  for (const [prefix, count] of prefixCounts) {
    if (count > bestCount) {
      bestPrefix = prefix;
      bestCount = count;
    }
  }

  if (bestCount < keys.length * 0.5) return files;

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(files)) {
    normalized[key.startsWith(bestPrefix) ? key.slice(bestPrefix.length) : key] = value;
  }
  return normalized;
}

export function loadFromZipBuffer(buffer: Buffer): Record<string, string> {
  const zip = new AdmZip(buffer);
  const files: Record<string, string> = {};

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, '/');
    if (!shouldInclude(name)) continue;

    if (isTextFile(name)) {
      files[name] = entry.getData().toString('utf8');
    } else {
      files[name] = BINARY_PREFIX + entry.getData().toString('base64');
    }
  }

  return normalizeZipPaths(files);
}

export function loadFromDirectory(dir: string): Record<string, string> {
  const files: Record<string, string> = {};

  function walk(current: string, prefix: string) {
    for (const item of fs.readdirSync(current)) {
      const full = path.join(current, item);
      const rel = (prefix ? `${prefix}/${item}` : item).replace(/\\/g, '/');
      if (fs.statSync(full).isDirectory()) {
        walk(full, rel);
      } else if (shouldInclude(rel)) {
        if (isTextFile(rel)) {
          files[rel] = fs.readFileSync(full, 'utf-8');
        } else {
          files[rel] = BINARY_PREFIX + fs.readFileSync(full).toString('base64');
        }
      }
    }
  }

  if (fs.existsSync(dir)) walk(dir, '');
  return files;
}

export function writeFilesToDir(files: Record<string, string>, dir: string): void {
  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(dir, filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (content.startsWith(BINARY_PREFIX)) {
      fs.writeFileSync(filePath, Buffer.from(content.slice(BINARY_PREFIX.length), 'base64'));
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
}

export function htmlSlugFromFilename(filename: string): string {
  const base = path.basename(filename);
  if (base === 'index.html') return '';
  return base.replace(/\.html$/i, '');
}

/** Böngészőből feltöltött mappa fájljai (webkitRelativePath a File.name-ben). */
export async function loadFromUploadedFiles(files: File[]): Promise<Record<string, string>> {
  const record: Record<string, string> = {};

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const name = (file.name || '').replace(/\\/g, '/');
    if (!shouldInclude(name)) continue;

    const buf = Buffer.from(await file.arrayBuffer());
    if (isTextFile(name)) {
      record[name] = buf.toString('utf8');
    } else {
      record[name] = BINARY_PREFIX + buf.toString('base64');
    }
  }

  return normalizeZipPaths(record);
}

/** ZIP vagy mappa (files[]) — FormData import űrlapból. */
export async function loadFromImportFormData(formData: FormData): Promise<Record<string, string> | null> {
  const uploaded = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (uploaded.length > 0) {
    return loadFromUploadedFiles(uploaded);
  }

  const zipFile = formData.get('file');
  if (zipFile instanceof File && zipFile.size > 0) {
    const buffer = Buffer.from(await zipFile.arrayBuffer());
    return loadFromZipBuffer(buffer);
  }

  return null;
}
