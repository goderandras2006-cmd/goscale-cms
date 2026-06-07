import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { writeFilesToDir } from '@/lib/template-files';

const execAsync = promisify(exec);

/**
 * cloudflare-deploy.ts
 * A megépített fájlokat egy átmeneti mappába menti, majd a Wrangler CLI
 * segítségével deployolja a Cloudflare Pages-re.
 */

export async function deployToCloudflare(projectName: string, files: Record<string, string>, accountId?: string): Promise<{ ok: boolean, url?: string, error?: string }> {
  // A Vercel (és a legtöbb serverless környezet) engedi a /tmp mappába írást.
  const tmpDir = path.join(os.tmpdir(), `deploy_${projectName}_${Date.now()}`);
  
  try {
    fs.mkdirSync(tmpDir, { recursive: true });

    writeFilesToDir(files, tmpDir);

    const token = process.env.CLOUDFLARE_API_TOKEN;
    const accId = accountId || process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!token || !accId) {
      throw new Error('Hiányzó Cloudflare API token vagy Account ID a környezeti változókból.');
    }

    // Wrangler hívása programmatic módon npx-en keresztül.
    // Figyelem: Vercel környezetben a child_process Node runtime-on futtatható.
    const { stdout, stderr } = await execAsync(
      `npx wrangler pages deploy "${tmpDir}" --project-name="${projectName}" --commit-dirty=true`, 
      {
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: token,
          CLOUDFLARE_ACCOUNT_ID: accId,
        }
      }
    );

    // Keresés a kimenetben az URL-re (pl. https://valami.pages.dev)
    const urlMatch = stdout.match(/https:\/\/[a-zA-Z0-9-]+\.pages\.dev/);
    const deploymentUrl = urlMatch ? urlMatch[0] : undefined;

    return { ok: true, url: deploymentUrl };

  } catch (error: any) {
    console.error('Cloudflare deploy error:', error);
    return { ok: false, error: error.message || 'Deploy script hiba' };
  } finally {
    // Takarítás
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Nem sikerült törölni a tmp mappát', e);
    }
  }
}
