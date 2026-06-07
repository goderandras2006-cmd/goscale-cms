import fs from 'fs';
import path from 'path';

const MAP_FILE = path.join(process.cwd(), 'lib', 'domain-map.json');

export function updateDomainMap(customDomain: string | undefined, siteId: string) {
  try {
    let map: Record<string, string> = {};
    if (fs.existsSync(MAP_FILE)) {
      map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf-8'));
    }
    
    // Check if siteId is already mapped to another domain, remove old
    for (const [domain, id] of Object.entries(map)) {
      if (id === siteId) {
        delete map[domain];
      }
    }
    
    // Add new domain
    if (customDomain) {
      map[customDomain] = siteId;
    }
    
    fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to update domain-map.json', error);
  }
}
