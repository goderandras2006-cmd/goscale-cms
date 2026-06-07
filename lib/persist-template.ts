import Site from '@/models/Site';
import { pickTextFiles, persistSiteTemplate, resolveTemplateFiles } from '@/lib/template-storage';
import { isTextFile } from '@/lib/template-files';

/** Sablon frissítése lemezen + MongoDB szöveges fájlok */
export async function saveTemplateFilesForSite(
  siteId: string,
  templateFiles: Record<string, string>
): Promise<void> {
  const templateDir = persistSiteTemplate(siteId, templateFiles);
  const textOnly = pickTextFiles(templateFiles);
  await Site.findByIdAndUpdate(siteId, {
    $set: { templateDir, templateFiles: textOnly },
    $inc: { templateVersion: 1 },
  });
}

export function mergeTemplateUpdate(
  site: { templateDir?: string; templateFiles?: Record<string, string> },
  updates: Record<string, string>
): Record<string, string> {
  const current = resolveTemplateFiles(site);
  return { ...current, ...updates };
}

export function hasImageAssets(templateFiles: Record<string, string>): boolean {
  return Object.keys(templateFiles).some((k) =>
    /^img\//i.test(k.replace(/\\/g, '/')) && /\.(png|jpe?g|gif|webp|ico|avif)$/i.test(k)
  );
}
