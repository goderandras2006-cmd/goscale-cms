'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ghlMenuAuthUrl, getCmsBaseUrl, isLocalCmsUrl } from '@/lib/cms-base-url';

interface Site {
  _id: string;
  name: string;
  type: 'landing' | 'shop' | 'hybrid';
  siteMode?: 'html_cloudflare' | 'demo_template';
  password: string;
  checkoutEmail?: string;
  ghlLocationId?: string;
  customDomain?: string;
  liveUrl?: string;
  cloudflareProjectName?: string;
  isDemo?: boolean;
  theme?: { primary: string };
  createdAt: string;
}

const TYPE_LABELS = {
  landing: { label: 'Landing', color: 'badge-purple' },
  shop: { label: 'Webshop', color: 'badge-green' },
  hybrid: { label: 'Hybrid', color: 'badge-yellow' },
};

export default function AgencyPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewSiteModal, setShowNewSiteModal] = useState(false);
  const [showHtmlImportModal, setShowHtmlImportModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState<Site | null>(null);
  const [htmlImport, setHtmlImport] = useState({
    siteId: '', name: '', password: '', liveUrl: '', cloudflareProjectName: '', ghlLocationId: '',
    localPath: 'C:\\Users\\K\\Projects\\lg-hvac-website',
  });
  const [htmlImportSource, setHtmlImportSource] = useState<'folder' | 'zip'>('folder');
  const [htmlFolderFiles, setHtmlFolderFiles] = useState<File[]>([]);
  const [htmlZipFile, setHtmlZipFile] = useState<File | null>(null);
  const [htmlImportError, setHtmlImportError] = useState('');
  const [htmlImporting, setHtmlImporting] = useState(false);

  function appendFolderToFormData(formData: FormData, files: File[]) {
    for (const file of files) {
      const rel =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      formData.append('files', file, rel);
    }
  }
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedGhlId, setCopiedGhlId] = useState<string | null>(null);
  const [newSite, setNewSite] = useState({
    id: '', name: '', type: 'landing', password: '', checkoutEmail: '', ghlLocationId: '', customDomain: '', isDemo: false, themePrimary: '#6366f1'
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [ghlSetupSite, setGhlSetupSite] = useState<Site | null>(null);
  const [ghlLocationInput, setGhlLocationInput] = useState('');
  const [ghlSaveError, setGhlSaveError] = useState('');
  const [ghlSaving, setGhlSaving] = useState(false);

  useEffect(() => {
    fetchSites().then(() => setIsLoggedIn(true)).catch(() => {});
  }, []);

  async function fetchSites() {
    const res = await fetch('/api/sites');
    if (!res.ok) throw new Error('Nem sikerült');
    const data = await res.json();
    setSites(data);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      if (!res.ok) { setLoginError('Hibás jelszó. Próbáld újra.'); return; }
      await fetchSites();
      setIsLoggedIn(true);
    } catch {
      setLoginError('Hálózati hiba. Ellenőrizd a kapcsolatot.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSite(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const sitePayload = {
        ...newSite,
        theme: newSite.themePrimary ? { primary: newSite.themePrimary } : undefined
      };
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sitePayload),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || 'Hiba történt'); return; }
      await fetchSites();
      setShowNewSiteModal(false);
      setShowChecklistModal(data);
      setNewSite({ id: '', name: '', type: 'landing', password: '', checkoutEmail: '', ghlLocationId: '', customDomain: '', isDemo: false, themePrimary: '#6366f1' });
    } catch {
      setCreateError('Hálózati hiba');
    } finally {
      setCreating(false);
    }
  }

  function copyLink(siteId: string) {
    const url = `${window.location.origin}/edit/${siteId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(siteId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyGhlMenuLink(siteId: string) {
    const url = ghlMenuAuthUrl('{{location.id}}', siteId);
    navigator.clipboard.writeText(url);
    setCopiedGhlId(siteId);
    setTimeout(() => setCopiedGhlId(null), 2500);
  }

  function copyGhlDirectLink(ghlLocationId: string, siteId: string) {
    const url = ghlMenuAuthUrl(ghlLocationId);
    navigator.clipboard.writeText(url);
    setCopiedGhlId(siteId);
    setTimeout(() => setCopiedGhlId(null), 2500);
  }

  function openGhlSetup(site: Site) {
    setGhlSetupSite(site);
    setGhlLocationInput(site.ghlLocationId || '');
    setGhlSaveError('');
  }

  async function saveGhlPairing(e: React.FormEvent) {
    e.preventDefault();
    if (!ghlSetupSite) return;
    setGhlSaving(true);
    setGhlSaveError('');
    try {
      const res = await fetch(`/api/sites/${ghlSetupSite._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghlLocationId: ghlLocationInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGhlSaveError(data.error || 'Mentés sikertelen');
        return;
      }
      await fetchSites();
      setGhlSetupSite({ ...ghlSetupSite, ghlLocationId: data.ghlLocationId });
    } catch {
      setGhlSaveError('Hálózati hiba');
    } finally {
      setGhlSaving(false);
    }
  }

  async function handleSiteReimport(siteId: string, opts: { zip?: File; folder?: File[] }) {
    const formData = new FormData();
    if (opts.folder && opts.folder.length > 0) {
      appendFolderToFormData(formData, opts.folder);
    } else if (opts.zip) {
      formData.append('file', opts.zip);
    } else {
      return;
    }
    try {
      const res = await fetch(`/api/sites/${siteId}/import-zip`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const msg = `Import kész! ${data.pagesCount || ''} oldal, ${data.fileCount || '?'} fájl, ${data.imageCount ?? '?'} kép.`;
        alert(data.warning ? `${msg}\n\n⚠️ ${data.warning}` : msg);
        await fetchSites();
      } else {
        alert(data.error || 'Hiba importáláskor!');
      }
    } catch {
      alert('Hálózati hiba importáláskor.');
    }
  }

  async function handleSyncLive(siteId: string) {
    try {
      const check = await fetch(`/api/sites/${siteId}/sync-live`, { method: 'POST' });
      const checkData = await check.json();
      if (checkData.needsConfirm) {
        if (!confirm(checkData.message + '\n\nEz felülírja a piszkozatot (draft). Folytatod?')) return;
      } else if (!check.ok && !checkData.needsConfirm) {
        alert(checkData.error || 'Hiba a szinkronizáció során!');
        return;
      } else if (check.ok && !checkData.needsConfirm) {
        alert('Az élő oldal megegyezik a mentett tartalommal — nincs teendő.');
        return;
      }

      const res = await fetch(`/api/sites/${siteId}/sync-live?confirm=true`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('Szinkronizáció sikeres! A szerkesztőben is frissülnek a szövegek.');
      } else {
        alert(data.error || 'Hiba a szinkronizáció során!');
      }
    } catch {
      alert('Hálózati hiba szinkronizációkor.');
    }
  }

  async function handleHtmlImport(e: React.FormEvent) {
    e.preventDefault();
    const localPathTrimmed = htmlImport.localPath?.trim() || '';
    if (htmlImportSource === 'folder' && !localPathTrimmed && htmlFolderFiles.length === 0) {
      setHtmlImportError('Írd be a helyi mappa útvonalát VAGY válassz kisebb mappát a böngészőben!');
      return;
    }
    if (htmlImportSource === 'zip' && !htmlZipFile) {
      setHtmlImportError('Válassz egy ZIP fájlt!');
      return;
    }
    setHtmlImporting(true);
    setHtmlImportError('');
    try {
      const formData = new FormData();
      formData.append('siteId', htmlImport.siteId);
      formData.append('name', htmlImport.name);
      formData.append('password', htmlImport.password);
      formData.append('liveUrl', htmlImport.liveUrl);
      formData.append('cloudflareProjectName', htmlImport.cloudflareProjectName.trim());
      if (htmlImport.ghlLocationId) formData.append('ghlLocationId', htmlImport.ghlLocationId);
      if (htmlImportSource === 'folder') {
        if (localPathTrimmed) {
          formData.append('localPath', localPathTrimmed);
        } else {
          appendFolderToFormData(formData, htmlFolderFiles);
        }
      } else if (htmlZipFile) {
        formData.append('file', htmlZipFile);
      }

      const res = await fetch('/api/sites/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setHtmlImportError(data.error || 'Import hiba');
        return;
      }

      await fetchSites();
      const importedSite: Site = data.site || {
        _id: data.siteId,
        name: htmlImport.name,
        password: htmlImport.password,
        siteMode: 'html_cloudflare',
        liveUrl: htmlImport.liveUrl,
        type: 'landing',
        createdAt: new Date().toISOString(),
      };
      setShowHtmlImportModal(false);
      setHtmlImport({ siteId: '', name: '', password: '', liveUrl: '', cloudflareProjectName: '', ghlLocationId: '', localPath: 'C:\\Users\\K\\Projects\\lg-hvac-website' });
      setHtmlFolderFiles([]);
      setHtmlZipFile(null);
      setHtmlImportSource('folder');
      setShowChecklistModal(importedSite);
    } catch {
      setHtmlImportError('Hálózati hiba');
    } finally {
      setHtmlImporting(false);
    }
  }

  function openLiveSite(site: Site) {
    if (site.siteMode === 'html_cloudflare' && site.liveUrl) {
      window.open(site.liveUrl, '_blank');
      return;
    }
    if (site.customDomain) {
      window.open(`https://${site.customDomain}`, '_blank');
      return;
    }
    window.open(`/site/${site._id}`, '_blank');
  }

  function generateHtmlPassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let pass = '';
    for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    setHtmlImport(h => ({ ...h, password: pass }));
  }

  function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let pass = '';
    for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    setNewSite(s => ({ ...s, password: pass }));
  }

  async function handleDeleteSite(siteId: string, siteName: string) {
    if (!confirm(`Biztosan törlöd a "${siteName}" site-ot?

Ez töröl minden tartalmat, terméket és médiát! Visszavonhatatlan!`)) return;
    try {
      const res = await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setSites(prev => prev.filter(s => s._id !== siteId));
      } else {
        alert(data.error || 'Törlés sikertelen!');
      }
    } catch {
      alert('Hálózati hiba törléskor.');
    }
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a0f 60%)',
      }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              width: '64px', height: '64px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', margin: '0 auto 16px',
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)',
            }}>🚀</div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>GoScale CMS</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Ügynökség dashboard — csak belső használatra</p>
          </div>
          <form onSubmit={handleLogin} className="card" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div style={{ marginBottom: '20px' }}>
              <label className="label">Ügynökség jelszó</label>
              <input id="agency-password" type="password" className="input" placeholder="••••••••••••"
                value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required autoFocus />
            </div>
            {loginError && (
              <div style={{
                padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)', fontSize: '13px', marginBottom: '16px',
              }}>⚠️ {loginError}</div>
            )}
            <button id="agency-login-btn" type="submit" className="btn btn-primary"
              disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? '⏳ Belépés...' : '🔐 Belépés'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            GoScale Webügynökség • Belső platform
          </p>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass" style={{
        borderBottom: '1px solid var(--border)', padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>🚀</div>
          <div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>GoScale CMS</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '8px' }}>Agency Dashboard</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-green">● Online</span>
          <button className="btn btn-secondary" onClick={() => setShowHtmlImportModal(true)}>
            📦 HTML ügyfél (ZIP)
          </button>
          <button id="new-site-btn" className="btn btn-primary" onClick={() => setShowNewSiteModal(true)}>
            + Demo site
          </button>
        </div>
      </header>

      <main style={{ padding: '40px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
          {[
            { label: 'Összes site', value: sites.length, icon: '🌐' },
            { label: 'Landing', value: sites.filter(s => s.type === 'landing').length, icon: '📄' },
            { label: 'Webshop', value: sites.filter(s => s.type === 'shop' || s.type === 'hybrid').length, icon: '🛒' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', background: 'var(--bg-secondary)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
              }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700' }}>{stat.value}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Sites heading */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Ügyfél site-ok</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{sites.length} site</span>
        </div>

        {sites.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
            <h3 style={{ marginBottom: '8px' }}>Még nincs site</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Hozd létre az első ügyfél site-ot!</p>
            <button className="btn btn-primary" onClick={() => setShowNewSiteModal(true)}>+ Új site létrehozása</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {sites.map((site, i) => {
              const typeInfo = TYPE_LABELS[site.type];
              const hasGhl = !!site.ghlLocationId;
              return (
                <div key={site._id} className="card animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s`, position: 'relative', overflow: 'hidden' }}>
                  {/* Accent line */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                    background: site.theme?.primary ? site.theme.primary : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{site.name}</h3>
                        {/* HTML CF badge */}
                        {site.siteMode === 'html_cloudflare' && (
                          <span style={{
                            fontSize: '10px', fontWeight: '700', background: 'rgba(16,185,129,0.15)',
                            color: '#10b981', padding: '2px 6px', borderRadius: '4px',
                            border: '1px solid rgba(16,185,129,0.3)',
                          }}>HTML CF</span>
                        )}
                        {/* DEMO badge */}
                        {site.isDemo && (
                          <span style={{
                            fontSize: '10px', fontWeight: '700', background: 'rgba(99,102,241,0.15)',
                            color: '#6366f1', padding: '2px 6px', borderRadius: '4px',
                            border: '1px solid rgba(99,102,241,0.3)',
                          }}>DEMO</span>
                        )}
                        {/* siteMode = demo_template, de volt DEMO label nélkül */}
                        {site.siteMode === 'demo_template' && !site.isDemo && (
                          <span style={{
                            fontSize: '10px', fontWeight: '700', background: 'rgba(99,102,241,0.1)',
                            color: '#818cf8', padding: '2px 6px', borderRadius: '4px',
                            border: '1px solid rgba(99,102,241,0.2)',
                          }}>DEMO SABLON</span>
                        )}
                        {hasGhl && (
                          <span style={{
                            fontSize: '10px', fontWeight: '700', background: 'rgba(234,179,8,0.15)',
                            color: '#ca8a04', padding: '2px 6px', borderRadius: '4px',
                            border: '1px solid rgba(234,179,8,0.3)',
                          }}>GHL</span>
                        )}
                      </div>
                      <code style={{
                        fontSize: '12px', color: 'var(--text-secondary)',
                        background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px',
                      }}>/{site._id}</code>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${typeInfo.color}`}>{typeInfo.label}</span>
                      <button
                        id={`delete-${site._id}`}
                        title="Site törlése"
                        onClick={() => handleDeleteSite(site._id, site.name)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--danger)', fontSize: '16px', lineHeight: 1,
                          padding: '2px 4px', borderRadius: '4px',
                          opacity: 0.5,
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                      >🗑️</button>
                    </div>
                  </div>

                  {/* Figyelmeztetés: inkonzisztens siteMode */}
                  {site.siteMode !== 'html_cloudflare' && site.liveUrl && (
                    <div style={{
                      padding: '8px 12px', marginBottom: '12px',
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--danger)',
                    }}>
                      ⚠️ Ez a site demo módban van, de van liveUrl beállítva. Töröld és importald újra HTML ügyfélként!
                    </div>
                  )}

                  {/* Info rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>🔑 Jelszó</span>
                      <code style={{ color: 'var(--accent-hover)' }}>{site.password}</code>
                    </div>
                    {site.customDomain && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>🌍 Domain</span>
                        <a href={`https://${site.customDomain}`} target="_blank" rel="noopener" style={{ color: '#6366f1', textDecoration: 'none' }}>
                          {site.customDomain}
                        </a>
                      </div>
                    )}
                    {site.checkoutEmail && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>📧 Email</span>
                        <span>{site.checkoutEmail}</span>
                      </div>
                    )}
                    {hasGhl && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>🔗 GHL Location</span>
                        <code style={{ fontSize: '11px', color: '#ca8a04' }}>{site.ghlLocationId}</code>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>📅 Létrehozva</span>
                      <span>{new Date(site.createdAt).toLocaleDateString('hu-HU')}</span>
                    </div>
                  </div>

                  {/* Actions — sor 1 */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <button id={`edit-${site._id}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                      onClick={() => router.push(`/edit/${site._id}`)}>
                      ✏️ Szerkesztő
                    </button>
                    <button id={`view-${site._id}`} className="btn btn-secondary btn-sm"
                      onClick={() => openLiveSite(site)}>
                      🌐 Élő
                    </button>
                    <button id={`copy-${site._id}`} className="btn btn-secondary btn-sm"
                      onClick={() => copyLink(site._id)}>
                      {copiedId === site._id ? '✅ Másolva!' : '📋 Link'}
                    </button>
                  </div>
                  
                  {/* Actions - HTML CF sor */}
                  {site.siteMode === 'html_cloudflare' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => router.push(`/agency/sites/${site._id}/fields`)}
                      >
                        🎯 Mezők beállítása
                      </button>
                      <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer', justifyContent: 'center' }}>
                        📁 Mappa
                        <input
                          type="file"
                          style={{ display: 'none' }}
                          // @ts-expect-error webkitdirectory nem minden típusdefinícióban van
                          webkitdirectory=""
                          directory=""
                          multiple
                          onChange={e => {
                            const list = Array.from(e.target.files || []);
                            if (list.length > 0) handleSiteReimport(site._id, { folder: list });
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer', justifyContent: 'center' }}>
                        📦 ZIP
                        <input type="file" accept=".zip" style={{ display: 'none' }} onChange={e => {
                          if (e.target.files?.[0]) {
                            handleSiteReimport(site._id, { zip: e.target.files[0] });
                            e.target.value = '';
                          }
                        }} />
                      </label>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleSyncLive(site._id)}>
                        🔄 Szinkron élőről
                      </button>
                    </div>
                  )}

                  {/* Actions — sor 2: GHL */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      id={`ghl-setup-${site._id}`}
                      className="btn btn-sm"
                      style={{
                        flex: 1, justifyContent: 'center', minWidth: '120px',
                        background: hasGhl ? 'rgba(234,179,8,0.1)' : 'rgba(99,102,241,0.08)',
                        color: hasGhl ? '#ca8a04' : 'var(--text-secondary)',
                        border: `1px solid ${hasGhl ? 'rgba(234,179,8,0.3)' : 'var(--border)'}`,
                      }}
                      onClick={() => openGhlSetup(site)}
                    >
                      {hasGhl ? '🔗 GHL beállítás' : '🔗 GHL párosítás'}
                    </button>
                    {hasGhl && (
                      <button
                        id={`ghl-copy-${site._id}`}
                        className="btn btn-sm"
                        style={{
                          flex: 1, justifyContent: 'center', minWidth: '120px',
                          background: copiedGhlId === site._id
                            ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
                          color: copiedGhlId === site._id ? 'var(--success)' : '#10b981',
                          border: `1px solid ${copiedGhlId === site._id ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.25)'}`,
                        }}
                        onClick={() => copyGhlDirectLink(site.ghlLocationId!, site._id)}
                      >
                        {copiedGhlId === site._id ? '✅ Másolva!' : '📋 GHL menü URL'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* HTML ügyfél import modal */}
      {showHtmlImportModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }} onClick={e => e.target === e.currentTarget && setShowHtmlImportModal(false)}>
          <div className="card animate-fade-in" style={{
            width: '100%', maxWidth: '520px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
            maxHeight: '90vh', overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>📦 Valódi ügyfél — HTML import</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowHtmlImportModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
              Válaszd ki az <strong>egész mappát</strong> (benne: HTML, CSS, JS, <strong>img</strong>). A látogatók ugyanazt a dizájnt látják Cloudflare-en.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`btn btn-sm ${htmlImportSource === 'folder' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setHtmlImportSource('folder')}
              >
                📁 Mappa
              </button>
              <button
                type="button"
                className={`btn btn-sm ${htmlImportSource === 'zip' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setHtmlImportSource('zip')}
              >
                📦 ZIP
              </button>
            </div>
            <form onSubmit={handleHtmlImport}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="label">Site ID *</label>
                  <input className="input" placeholder="pl. lg-klimatech" required
                    value={htmlImport.siteId}
                    onChange={e => setHtmlImport(h => ({ ...h, siteId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
                </div>
                <div>
                  <label className="label">Ügyfél neve *</label>
                  <input className="input" placeholder="pl. L&G Klimatech" required
                    value={htmlImport.name} onChange={e => setHtmlImport(h => ({ ...h, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Ügyfél szerkesztő jelszava *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input" required value={htmlImport.password}
                      placeholder="pl. klima — NEM az agency jelszó!"
                      onChange={e => setHtmlImport(h => ({ ...h, password: e.target.value }))} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={generateHtmlPassword}>🎲</button>
                  </div>
                </div>
                <div>
                  <label className="label">Élő weboldal címe *</label>
                  <input className="input" placeholder="https://lgklima01.pages.dev" required
                    value={htmlImport.liveUrl} onChange={e => setHtmlImport(h => ({ ...h, liveUrl: e.target.value }))} />
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    A teljes webcím, amit a böngészőben megnyitsz (https://…).
                  </p>
                </div>
                <div>
                  <label className="label">Cloudflare Pages projekt neve *</label>
                  <input className="input" placeholder="lgklima01" required
                    value={htmlImport.cloudflareProjectName}
                    onChange={e => setHtmlImport(h => ({ ...h, cloudflareProjectName: e.target.value }))} />
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Csak a <strong>név</strong> a Cloudflare dashboardon — pl. <code>lgklima01</code>, <em>nem</em> a teljes URL!
                  </p>
                </div>
                {htmlImportSource === 'folder' ? (
                  <>
                    <div>
                      <label className="label">Helyi mappa útvonal * (ajánlott)</label>
                      <input className="input" placeholder="C:\Users\K\Projects\lg-hvac-website"
                        value={htmlImport.localPath}
                        onChange={e => setHtmlImport(h => ({ ...h, localPath: e.target.value }))} />
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Nagy oldalakhoz (képekkel) ezt használd — nem tölti fel a böngészőben. Tedd vissza a képeket az <code>img</code> mappába!
                      </p>
                    </div>
                    <div>
                      <label className="label">Vagy böngészős mappa (max ~15 MB)</label>
                      <label className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                        📁 Mappa kiválasztása
                        <input
                          type="file"
                          style={{ display: 'none' }}
                          // @ts-expect-error webkitdirectory
                          webkitdirectory=""
                          directory=""
                          multiple
                          onChange={e => setHtmlFolderFiles(Array.from(e.target.files || []))}
                        />
                      </label>
                      {htmlFolderFiles.length > 0 && (
                        <p style={{ fontSize: '12px', color: 'var(--success)', marginTop: '8px' }}>
                          ✅ {htmlFolderFiles.length} fájl kiválasztva
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="label">ZIP fájl *</label>
                    <input type="file" accept=".zip" className="input"
                      onChange={e => setHtmlZipFile(e.target.files?.[0] || null)} />
                  </div>
                )}
                <div>
                  <label className="label">GHL Location ID (opcionális)</label>
                  <input className="input" placeholder="GHL sub-account ID"
                    value={htmlImport.ghlLocationId} onChange={e => setHtmlImport(h => ({ ...h, ghlLocationId: e.target.value }))} />
                </div>
                {htmlImportError && (
                  <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px' }}>
                    ⚠️ {htmlImportError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowHtmlImportModal(false)}>Mégse</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={htmlImporting}>
                    {htmlImporting ? '⏳ Import...' : '✅ Importálás'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Site Modal */}
      {showNewSiteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }} onClick={e => e.target === e.currentTarget && setShowNewSiteModal(false)}>
          <div className="card animate-fade-in" style={{
            width: '100%', maxWidth: '480px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
            maxHeight: '90vh', overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>🌐 Demo site (gyakorló)</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNewSiteModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateSite}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label">Site ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input id="new-site-id" className="input" placeholder="pl. kovacs-epito"
                    value={newSite.id}
                    onChange={e => setNewSite(s => ({ ...s, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    required pattern="[a-z0-9-]+" />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Csak kisbetű, szám és kötőjel. URL: /edit/<strong>{newSite.id || '...'}</strong>
                  </p>
                </div>

                <div>
                  <label className="label">Ügyfél neve <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input id="new-site-name" className="input" placeholder="pl. Kovács Építő Kft."
                    value={newSite.name} onChange={e => setNewSite(s => ({ ...s, name: e.target.value }))} required />
                </div>

                <div>
                  <label className="label">Típus</label>
                  <select id="new-site-type" className="select" value={newSite.type}
                    onChange={e => setNewSite(s => ({ ...s, type: e.target.value }))}>
                    <option value="landing">📄 Landing oldal</option>
                    <option value="shop">🛒 Webshop</option>
                    <option value="hybrid">🔀 Hybrid (landing + shop)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Jelszó <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input id="new-site-password" className="input" placeholder="Ügyfél belépési jelszava"
                      value={newSite.password} onChange={e => setNewSite(s => ({ ...s, password: e.target.value }))} required />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={generatePassword} style={{ whiteSpace: 'nowrap' }}>
                      🎲 Generál
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="label">Custom Domain (opcionális)</label>
                    <input id="new-site-domain" className="input" placeholder="www.ugyfel.hu"
                      value={newSite.customDomain} onChange={e => setNewSite(s => ({ ...s, customDomain: e.target.value }))} />
                  </div>
                  <div style={{ width: '100px' }}>
                    <label className="label">Témaszín</label>
                    <input type="color" className="input" style={{ padding: '0', height: '40px', cursor: 'pointer' }}
                      value={newSite.themePrimary} onChange={e => setNewSite(s => ({ ...s, themePrimary: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="label">Demo oldal?</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="new-site-isdemo" checked={newSite.isDemo}
                      onChange={e => setNewSite(s => ({ ...s, isDemo: e.target.checked }))} />
                    <label htmlFor="new-site-isdemo" style={{ fontSize: '13px' }}>Ez csak egy demo oldal, ami a referenciákban / belső célra készül</label>
                  </div>
                </div>

                <div>
                  <label className="label">Checkout email (opcionális)</label>
                  <input id="new-site-email" type="email" className="input" placeholder="megrendeles@ugyfel.hu"
                    value={newSite.checkoutEmail} onChange={e => setNewSite(s => ({ ...s, checkoutEmail: e.target.value }))} />
                </div>

                {/* GHL integráció */}
                <div style={{
                  background: 'rgba(234,179,8,0.06)',
                  border: '1px solid rgba(234,179,8,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '16px' }}>🔗</span>
                    <span style={{ fontWeight: '600', fontSize: '13px', color: '#ca8a04' }}>GoHighLevel integráció</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(opcionális)</span>
                  </div>
                  <label className="label">GHL Location ID</label>
                  <input
                    id="new-site-ghl"
                    className="input"
                    placeholder="pl. abc123xyz456 (GHL sub-account ID)"
                    value={newSite.ghlLocationId}
                    onChange={e => setNewSite(s => ({ ...s, ghlLocationId: e.target.value.trim() }))}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                    Ha megadod, az ügyfél jelszó nélkül tud belépni a GHL-ből.
                    A Location ID megtalálható: GHL → Settings → Business Profile → Location ID.
                  </p>
                </div>

                {createError && (
                  <div style={{
                    padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--danger)', fontSize: '13px',
                  }}>⚠️ {createError}</div>
                )}

                <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                    onClick={() => setShowNewSiteModal(false)}>Mégse</button>
                  <button id="create-site-submit" type="submit" className="btn btn-primary"
                    style={{ flex: 2, justifyContent: 'center' }} disabled={creating}>
                    {creating ? '⏳ Létrehozás...' : '✨ Site létrehozása'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GHL párosítás + Custom Menu útmutató */}
      {ghlSetupSite && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }} onClick={e => e.target === e.currentTarget && setGhlSetupSite(null)}>
          <div className="card animate-fade-in" style={{
            width: '100%', maxWidth: '560px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
            maxHeight: '90vh', overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>🔗 GHL — {ghlSetupSite.name}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setGhlSetupSite(null)}>✕</button>
            </div>

            {isLocalCmsUrl() && (
              <div style={{
                padding: '12px', marginBottom: '16px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                fontSize: '13px', color: 'var(--danger)', lineHeight: 1.5,
              }}>
                ⚠️ A GHL iframe <strong>HTTPS éles CMS címet</strong> igényel (pl. <code>https://cms.goscale.hu</code>).
                A <code>localhost</code> nem működik GHL menüből. Állítsd be a <code>NEXT_PUBLIC_APP_URL</code>-t deploy után.
              </div>
            )}

            <form onSubmit={saveGhlPairing}>
              <label className="label">GHL Location ID</label>
              <input
                className="input"
                placeholder="GHL → Settings → Business Profile → Location ID"
                value={ghlLocationInput}
                onChange={e => setGhlLocationInput(e.target.value)}
                style={{ marginBottom: '8px' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Ezt a sub-account egyedi azonosítója. Üresen hagyva törlődik a párosítás.
              </p>
              {ghlSaveError && (
                <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>{ghlSaveError}</p>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '20px' }} disabled={ghlSaving}>
                {ghlSaving ? 'Mentés...' : '💾 Location ID mentése'}
              </button>
            </form>

            {ghlSetupSite.ghlLocationId && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>GHL Custom Menu Link beállítás</h3>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>GHL Agency → <strong>Settings → Custom Menu Links → Create</strong></li>
                  <li><strong>Title:</strong> Weboldal szerkesztése</li>
                  <li><strong>Show in:</strong> Sub-account sidebar</li>
                  <li><strong>Open in:</strong> iFrame (vagy új lap)</li>
                  <li><strong>URL:</strong> másold az alábbi sort (pontosan):</li>
                </ol>
                <code style={{
                  display: 'block', marginTop: '12px', padding: '12px', borderRadius: '8px',
                  background: 'var(--bg-primary)', fontSize: '11px', wordBreak: 'break-all',
                  border: '1px solid var(--border)', color: '#ca8a04',
                }}>
                  {ghlMenuAuthUrl('{{location.id}}', ghlSetupSite._id)}
                </code>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
                  onClick={() => copyGhlMenuLink(ghlSetupSite._id)}
                >
                  {copiedGhlId === ghlSetupSite._id ? '✅ URL másolva!' : '📋 Custom Menu URL másolása'}
                </button>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.5 }}>
                  CMS alap URL: <code>{getCmsBaseUrl()}</code> — a GHL a <code>{'{{location.id}}'}</code> helyére automatikusan a sub-account ID-t teszi.
                </p>
              </div>
            )}

            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setGhlSetupSite(null)}>
              Bezárás
            </button>
          </div>
        </div>
      )}

      {/* Checklist Modal */}
      {showChecklistModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }} onClick={e => e.target === e.currentTarget && setShowChecklistModal(null)}>
          <div className="card animate-fade-in" style={{
            width: '100%', maxWidth: '600px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
            padding: '32px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Kész!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>{showChecklistModal.name} — {showChecklistModal.siteMode === 'html_cloudflare' ? 'HTML ügyfél importálva' : 'demo site létrehozva'}.</p>
            </div>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Következő lépések</h3>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {showChecklistModal.siteMode === 'html_cloudflare' ? (
                  <>
                    <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ background: '#ede9fe', color: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>1</div>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Cloudflare API token (.env.local)</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Add hozzá: <code>CLOUDFLARE_API_TOKEN</code> és <code>CLOUDFLARE_ACCOUNT_ID</code> — különben az Élesítés nem tölt fel Cloudflare-re.</p>
                      </div>
                    </li>
                    <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ background: '#ede9fe', color: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>2</div>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Szerkesztés + Élesítés</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nyisd meg a <a href={`/edit/${showChecklistModal._id}`} target="_blank" style={{ color: '#6366f1' }}>szerkesztőt</a>, módosítsd a szöveget, majd <strong>Élesítés</strong> → a Cloudflare oldal frissül (ugyanaz a kinézet).</p>
                      </div>
                    </li>
                    <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ background: '#ede9fe', color: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>3</div>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>GHL menü (opcionális)</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Site kártyán: <strong>GHL párosítás</strong> → Location ID → másold a Custom Menu URL-t.</p>
                      </div>
                    </li>
                  </>
                ) : (
                  <>
                    <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ background: '#ede9fe', color: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>1</div>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Gyakorló szerkesztő</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ez egy <strong>demo sablon</strong>, nem a valódi ügyfél HTML. Valódi ügyfélhez: <strong>HTML ügyfél (ZIP)</strong> gomb.</p>
                      </div>
                    </li>
                    <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ background: '#ede9fe', color: '#6366f1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>2</div>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Szerkesztő link</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <code>{window.location.origin}/edit/{showChecklistModal._id}</code> — jelszó: <strong>{showChecklistModal.password}</strong>
                        </p>
                      </div>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => setShowChecklistModal(null)}>
              Rendben, értettem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
