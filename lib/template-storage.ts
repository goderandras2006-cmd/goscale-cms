import fs from 'fs';
import path from 'path';
import { isTextFile, loadFromDirectory, writeFilesToDir } from '@/lib/template-files';

export function getSiteTemplateDir(siteId: string): string {
  return path.join(process.cwd(), 'data', 'templates', siteId);
}

export function getRelativeTemplateDir(siteId: string): string {
  return path.join('data', 'templates', siteId).replace(/\\/g, '/');
}

export function pickTextFiles(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, content] of Object.entries(files)) {
    const normalized = name.replace(/\\/g, '/');
    if (isTextFile(normalized)) {
      out[normalized] = content;
    }
  }
  return out;
}

/** Teljes sablon (képek is) lemezre — MongoDB csak szöveges fájlokat kap. */
export function persistSiteTemplate(siteId: string, files: Record<string, string>): string {
  const dir = getSiteTemplateDir(siteId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  writeFilesToDir(files, dir);
  return getRelativeTemplateDir(siteId);
}

export function resolveTemplateFiles(site: {
  templateDir?: string;
  templateFiles?: Record<string, string> | Map<string, string>;
}): Record<string, string> {
  const fromDb: Record<string, string> =
    site.templateFiles instanceof Map
      ? Object.fromEntries(site.templateFiles)
      : { ...(site.templateFiles || {}) };

  if (!site.templateDir) {
    return fromDb;
  }

  const absDir = path.isAbsolute(site.templateDir)
    ? site.templateDir
    : path.join(process.cwd(), site.templateDir);

  if (!fs.existsSync(absDir)) {
    return fromDb;
  }

  const fromDisk = loadFromDirectory(absDir);
  return { ...fromDisk, ...fromDb };
}
