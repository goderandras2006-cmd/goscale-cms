'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ServiceItem } from '@/models/Content';
import { EditOnboardingOverlay, useEditOnboarding } from '@/components/edit/EditOnboarding';
import { PublishStatusBar } from '@/components/edit/PublishStatusBar';
import { SeoSnippetPreview } from '@/components/edit/SeoSnippetPreview';
import { ImageUploadInput } from '@/components/edit/ImageUploadInput';
import { MediaLibrary } from '@/components/edit/MediaLibrary';
import {
  updatePreviewField,
  scrollPreviewToField,
  setPreviewSiteId,
} from '@/lib/edit-preview';

interface Product {
  _id: string;
  name: string;
  description: string;
  priceHuf: number;
  imageUrl: string;
  category: string;
  active: boolean;
  slug: string;
}

interface EditableFieldInfo {
  id: string;
  label: string;
  type: string;
  pages: string[];
  dataCmsKey: string;
  scope: 'page' | 'global';
}

interface SiteInfo {
  _id: string;
  name: string;
  type: 'landing' | 'shop' | 'hybrid';
  siteMode?: 'html_cloudflare' | 'demo_template';
  liveUrl?: string;
  checkoutEmail?: string;
  lastDeployedAt?: string;
  pages?: { slug: string; title: string; navLabel: string; order: number }[];
  editableFields?: EditableFieldInfo[];
}

type TabType = 'hero' | 'about' | 'services' | 'contact' | 'seo' | 'shop' | 'products' | 'media';

export default function EditPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [site, setSite] = useState<SiteInfo | null>(null);
  const [content, setContent] = useState<any>({});
  const [publishedContent, setPublishedContent] = useState<any>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [publishMsg, setPublishMsg] = useState('');
  const [publishError, setPublishError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('hero');
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [activePageSlug, setActivePageSlug] = useState<string>('');
  const [previewKey, setPreviewKey] = useState(0);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [selectedField, setSelectedField] = useState<EditableFieldInfo | null>(null);
  const [fieldEditValue, setFieldEditValue] = useState('');
  // Képcsere panel: kattintott kép eredeti path-ja az oldalon
  const [imageReplacePanel, setImageReplacePanel] = useState<{ originalPath: string; dataCmsKey: string } | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');

  // Embed mód: GHL iframe-ben fut (URL ?embed=1 vagy cms_embed cookie)
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get('embed') === '1' ||
    (typeof document !== 'undefined' && document.cookie.includes('cms_embed=1'));

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', priceHuf: 0, imageUrl: '', category: 'Általános', active: true,
  });

  const { showOnboarding, dismissOnboarding } = useEditOnboarding(
    siteId,
    isLoggedIn && site?.siteMode === 'html_cloudflare'
  );

  useEffect(() => {
    loadData().then(() => setIsLoggedIn(true)).catch(() => {});
  }, [siteId]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  async function loadData() {
    const res = await fetch(`/api/content/${siteId}`);
    if (!res.ok) throw new Error('Auth szükséges');
    const data = await res.json();
    setContent(data.draft || {});
    setPublishedContent(data.published || {});
    setSite(data.site);

    if (data.site?.pages && data.site.pages.length > 0) {
      setActivePageSlug(data.site.pages[0].slug);
    }

    if (data.site?.type === 'shop' || data.site?.type === 'hybrid') {
      const prodRes = await fetch(`/api/products/${siteId}`);
      if (prodRes.ok) setProducts(await prodRes.json());
    }
  }

  useEffect(() => {
    if (!isLoggedIn || site?.siteMode !== 'html_cloudflare') return;

    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'cms-edit') return;
      const key = e.data.dataCmsKey as string;
      const fields = site?.editableFields || [];
      const field = fields.find((f) => f.dataCmsKey === key) || {
        id: key,
        label: key,
        type: e.data.fieldType || 'text',
        pages: ['*'],
        dataCmsKey: key,
        scope: 'page' as const,
      };

      // Képre kattintás: speciális képcsere panel
      const isImageField = field.type === 'image' || e.data.fieldType === 'image' || key.startsWith('image.');
      if (isImageField) {
        const currentSrc = e.data.currentValue || '';
        // Az src-ből kinyerjük az eredeti path-ot (preview-asset URL-ből visszafejtve)
        let originalPath = currentSrc;
        if (currentSrc.includes('preview-asset?path=')) {
          try {
            originalPath = decodeURIComponent(currentSrc.split('path=')[1]?.split('&')[0] || currentSrc);
          } catch { originalPath = currentSrc; }
        }
        setImageReplacePanel({ originalPath, dataCmsKey: key });
        setImageUploadError('');
        return;
      }

      setSelectedField(field);
      const isRichtext = field.type === 'richtext';
      setFieldEditValue(
        isRichtext && e.data.innerHtml
          ? e.data.innerHtml
          : (e.data.currentValue || '')
      );
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isLoggedIn, site?.editableFields, site?.siteMode]);

  useEffect(() => {
    if (!isLoggedIn || site?.siteMode !== 'html_cloudflare') return;
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    const onLoad = () => setPreviewSiteId(iframe, siteId);
    iframe.addEventListener('load', onLoad);
    if (iframe.contentDocument?.readyState === 'complete') {
      setPreviewSiteId(iframe, siteId);
    }
    return () => iframe.removeEventListener('load', onLoad);
  }, [isLoggedIn, site?.siteMode, previewKey, siteId]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, password: loginPassword }),
      });
      if (!res.ok) {
        setLoginError('Hibás jelszó. Kérje az ügynökségtől a helyes jelszót.');
        return;
      }
      await loadData();
      setIsLoggedIn(true);
    } catch {
      setLoginError('Hálózati hiba.');
    } finally {
      setLoginLoading(false);
    }
  }

  function updateContent(path: string[], value: unknown) {
    setContent((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) {
        if (!obj[path[i]]) obj[path[i]] = {};
        obj = obj[path[i]];
      }
      obj[path[path.length - 1]] = value;
      return next;
    });
    setIsDirty(true);
  }

  function getUpdatePath(...fields: string[]) {
    if (site?.pages && site.pages.length > 0) {
      return ['pages', activePageSlug, ...fields];
    }
    return fields;
  }

  function getFieldContentPath(field: EditableFieldInfo): string[] {
    if (field.scope === 'global' || field.dataCmsKey === 'sharedContact') {
      return ['sharedContact'];
    }
    const parts = field.dataCmsKey.split('.');
    if (site?.pages && site.pages.length > 0) {
      return ['pages', activePageSlug, ...parts];
    }
    return parts;
  }

  function buildContentWithFieldEdit(
    prev: Record<string, unknown>,
    field: EditableFieldInfo,
    value: string
  ): Record<string, unknown> {
    const next = JSON.parse(JSON.stringify(prev)) as Record<string, unknown>;
    const path = field.scope === 'global' || field.dataCmsKey === 'sharedContact'
      ? ['sharedContact', field.dataCmsKey.split('.').pop() || 'tel']
      : getFieldContentPath(field);
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) {
      if (!obj[path[i]] || typeof obj[path[i]] !== 'object') obj[path[i]] = {};
      obj = obj[path[i]] as Record<string, unknown>;
    }
    obj[path[path.length - 1]] = value;
    return next;
  }

  async function saveContentData(data: Record<string, unknown>, silent = false) {
    setSaving(true);
    if (!silent) setSaveMsg('');
    try {
      const res = await fetch(`/api/content/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, type: site?.type }),
      });
      if (res.ok) {
        if (!silent) {
          setSaveMsg('Mentve!');
          setTimeout(() => setSaveMsg(''), 2500);
        }
        setIsDirty(false);
        return true;
      }
    } finally {
      setSaving(false);
    }
    return false;
  }

  async function handleFieldDone() {
    if (!selectedField) return;
    const newContent = buildContentWithFieldEdit(content, selectedField, fieldEditValue);
    setContent(newContent);
    updatePreviewField(
      previewIframeRef.current,
      selectedField.dataCmsKey,
      fieldEditValue,
      selectedField.type
    );
    setSelectedField(null);
    // Automatikus mentés panel bezárásakor (embed módban is, minden módban)
    await saveContentData(newContent, true);
  }

  // Panel bezárás automatikus mentéssel (Mégse esetén is menti a már gépelt értéket)
  const handleFieldCancel = useCallback(() => {
    setSelectedField(null);
    // Embed módban auto-ment bezáráskor is
    if (isEmbed && isDirty) {
      saveContentData(content, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbed, isDirty, content]);

  async function handleRestorePublished() {
    if (!confirm('Visszaállítod az utolsó éles verziót? A nem élesített piszkozat változásai elvesznek.')) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/content/${siteId}/restore`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setContent(data.data);
        setIsDirty(false);
        setPreviewKey(Date.now());
        setSaveMsg('Visszaállítva az éles verzióra');
        setTimeout(() => setSaveMsg(''), 3000);
      }
    } finally {
      setRestoring(false);
    }
  }

  function fieldAppliesToActivePage(field: EditableFieldInfo): boolean {
    if (field.pages.includes('*')) return true;
    return field.pages.includes(activePageSlug);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/content/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: content, type: site?.type }),
      });
      if (res.ok) {
        setSaveMsg('✅ Mentve!');
        setIsDirty(false);
        setTimeout(() => setSaveMsg(''), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!confirm('Biztosan közzéteszed a változtatásokat? 30–60 másodperc múlva megjelenik a weboldalon.')) return;
    setPublishing(true);
    setPublishMsg('');
    setPublishError('');
    try {
      if (isDirty) {
        await saveContentData(content, true);
      }
      const res = await fetch(`/api/content/${siteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) {
        setPublishMsg(data.message || 'Sikeresen élesítve! 30–60 mp múlva frissül az oldal.');
        setIsDirty(false);
        setPublishedContent(content);
        setPreviewKey(Date.now());
        if (site) setSite({ ...site, lastDeployedAt: new Date().toISOString() });
        setTimeout(() => setPublishMsg(''), 8000);
      } else {
        setPublishError(data.error || 'Élesítés sikertelen.');
        setTimeout(() => setPublishError(''), 8000);
      }
    } finally {
      setPublishing(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/products/${siteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      if (res.ok) {
        const p = await res.json();
        setProducts(prev => [...prev, p]);
        setShowAddProduct(false);
        setNewProduct({ name: '', description: '', priceHuf: 0, imageUrl: '', category: 'Általános', active: true });
      }
    } catch {}
  }

  async function handleUpdateProduct(productId: string, updates: Partial<Product>) {
    try {
      const res = await fetch(`/api/products/${siteId}/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts(prev => prev.map(p => p._id === productId ? updated : p));
        setEditingProductId(null);
      }
    } catch {}
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm('Biztosan törlöd ezt a terméket?')) return;
    try {
      await fetch(`/api/products/${siteId}/${productId}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p._id !== productId));
    } catch {}
  }

  function updateService(index: number, field: keyof ServiceItem, value: string) {
    const services = [...(activePageData.services || [])];
    services[index] = { ...services[index], [field]: value };
    updateContent(getUpdatePath('services'), services);
  }

  function addService() {
    const services = [...(activePageData.services || []), { title: '', desc: '', icon: '⭐' }];
    updateContent(getUpdatePath('services'), services);
  }

  function removeService(index: number) {
    const services = (activePageData.services || []).filter((_: any, i: number) => i !== index);
    updateContent(getUpdatePath('services'), services);
  }

  // === LOGIN SCREEN ===
  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a0f 60%)',
      }}>
        <div style={{ width: '100%', maxWidth: '380px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              width: '64px', height: '64px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', margin: '0 auto 16px',
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)',
            }}>✏️</div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>Tartalom szerkesztő</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Add meg a jelszót, amit az ügynökségtől kaptál
            </p>
            <code style={{
              display: 'inline-block', marginTop: '8px',
              background: 'var(--bg-card)', padding: '4px 12px',
              borderRadius: '6px', fontSize: '13px', color: 'var(--accent-hover)',
            }}>/{siteId}</code>
          </div>

          <form onSubmit={handleLogin} className="card">
            <div style={{ marginBottom: '20px' }}>
              <label className="label">Belépési jelszó</label>
              <input
                id="site-password"
                type="password"
                className="input"
                placeholder="••••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            {loginError && (
              <div style={{
                padding: '10px 14px', marginBottom: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)', fontSize: '13px',
              }}>
                ⚠️ {loginError}
              </div>
            )}

            <button
              id="site-login-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loginLoading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loginLoading ? '⏳ Belépés...' : '🔐 Belépés'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            🔒 GoScale által biztosított biztonságos platform
          </p>
        </div>
      </div>
    );
  }

  const hasShop = site?.type === 'shop' || site?.type === 'hybrid';
  const hasLanding = site?.type === 'landing' || site?.type === 'hybrid';
  const hasMultiplePages = site?.pages && site.pages.length > 0;
  const isHtmlMode = site?.siteMode === 'html_cloudflare';

  const tabs = ([
    { id: 'hero' as TabType, label: 'Hero / Főcím', emoji: '🖼️', show: hasLanding || isHtmlMode },
    { id: 'about' as TabType, label: 'Rólunk', emoji: '📝', show: hasLanding && !isHtmlMode },
    { id: 'services' as TabType, label: 'Szolgáltatások', emoji: '⚙️', show: hasLanding && !isHtmlMode },
    { id: 'contact' as TabType, label: 'Kapcsolat', emoji: '📞', show: true },
    { id: 'seo' as TabType, label: 'SEO', emoji: '🔍', show: true },
    { id: 'shop' as TabType, label: 'Bolt szövegei', emoji: '🏪', show: hasShop && !isHtmlMode },
    { id: 'products' as TabType, label: 'Termékek', emoji: '📦', show: hasShop },
    { id: 'media' as TabType, label: 'Médiatár', emoji: '🗂️', show: isHtmlMode },
  ] as { id: TabType; label: string; emoji: string; show: boolean }[]).filter(t => t.show);

  const activePageData = (() => {
    if (isHtmlMode) {
      // HTML módban: content.pages[slug] struktúra
      return content.pages?.[activePageSlug] || {};
    }
    return hasMultiplePages ? (content.pages?.[activePageSlug] || {}) : content;
  })();

  // HTML módban a lokális preview API-t használjuk (X-Frame-Options miatt SOHA nem liveUrl!)
  // Demo módban a Next.js /site/... sablont
  const previewUrl = isHtmlMode
    ? `/api/sites/${siteId}/preview?slug=${encodeURIComponent(activePageSlug)}&mode=edit&t=${previewKey}`
    : `/site/${siteId}${hasMultiplePages && activePageSlug ? `/${activePageSlug}` : ''}`;

  const visibleEditableFields = (site?.editableFields || []).filter(fieldAppliesToActivePage);

  const hasUnpublishedChanges =
    !isDirty && JSON.stringify(content) !== JSON.stringify(publishedContent);

  const canPublish = isHtmlMode && (isDirty || hasUnpublishedChanges) && !publishing;

  // Az "Élő oldal" gomb mindig a Cloudflare-en lévő nak mutat (ha html mód)
  const liveExternalUrl = isHtmlMode && site?.liveUrl
    ? site.liveUrl
    : `/site/${siteId}${hasMultiplePages && activePageSlug ? `/${activePageSlug}` : ''}`;

  // === EDITOR SCREEN ===
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {showOnboarding && <EditOnboardingOverlay onDismiss={dismissOnboarding} />}

      {/* ============================================================
          FEJLÉC — Embed módban leegyszerűsített
          ============================================================ */}
      {isEmbed ? (
        /* EMBED fejléc: csak a cég neve + Közzétesz gomb */
        <header className="glass" style={{
          borderBottom: '1px solid var(--border)',
          padding: '0 16px',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px', height: '28px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
            }}>✏️</div>
            <span style={{ fontWeight: '700', fontSize: '14px' }}>{site?.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Sikeres közzétesz visszajelzés */}
            {publishMsg && (
              <span style={{
                fontSize: '12px', color: 'white',
                background: 'var(--success)',
                padding: '3px 10px', borderRadius: '16px',
                fontWeight: '600',
              }}>{publishMsg}</span>
            )}
            {publishError && (
              <span style={{ fontSize: '12px', color: 'var(--danger)' }}>⚠️ {publishError}</span>
            )}
            {/* Piszkozat jelző */}
            {(isDirty || hasUnpublishedChanges) && !publishMsg && (
              <span style={{ fontSize: '12px', color: 'var(--warning)' }}>● Nem közzétett változás</span>
            )}
            {/* Élő oldal link */}
            {site?.liveUrl && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', padding: '5px 10px' }}
                onClick={() => window.open(liveExternalUrl, '_blank')}
              >
                🌐 Megtekintés
              </button>
            )}
            {/* Közzétesz */}
            <button
              id="publish-btn"
              className="btn btn-success btn-sm"
              onClick={handlePublish}
              disabled={publishing || (isHtmlMode && !canPublish)}
              title={isHtmlMode && !canPublish ? 'Nincs közzéteendő változtatás' : undefined}
              style={{ fontWeight: '700' }}
            >
              {publishing ? '⏳ Közzétesz...' : '🚀 Közzétesz'}
            </button>
          </div>
        </header>
      ) : (
        /* NORMÁL fejléc: minden gombbal */
        <header className="glass" style={{
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>✏️</div>
            <div>
              <span style={{ fontWeight: '700', fontSize: '15px' }}>{site?.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>szerkesztő</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {saveMsg && <span style={{ fontSize: '13px', color: 'var(--success)' }}>{saveMsg}</span>}
            {publishMsg && (
              <span style={{
                fontSize: '13px', color: 'white',
                background: 'var(--success)',
                padding: '4px 12px', borderRadius: '20px',
                fontWeight: '600',
              }}>{publishMsg}</span>
            )}
            {isDirty && <span className="badge badge-yellow">● Nem mentett</span>}
            {isHtmlMode && hasShop && !showAdvancedForm && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setShowAdvancedForm(true); setActiveTab('products'); }}
              >
                📦 Termékek
              </button>
            )}
            {isHtmlMode && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAdvancedForm((v) => !v)}
              >
                {showAdvancedForm ? '🎯 Vizuális' : '⚙️ Haladó'}
              </button>
            )}
            <button
              id="preview-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => window.open(liveExternalUrl, '_blank')}
            >
              🌐 Élő oldal
            </button>
            <button
              id="save-btn"
              className="btn btn-secondary btn-sm"
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              {saving ? '⏳' : '💾'} Mentés
            </button>
            {isHtmlMode && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleRestorePublished}
                disabled={restoring}
                title="Visszaállítja az utolsó éles verziót"
              >
                {restoring ? '...' : '↩️ Visszaállítás'}
              </button>
            )}
            <button
              id="publish-btn"
              className="btn btn-success btn-sm"
              onClick={handlePublish}
              disabled={publishing || (isHtmlMode && !canPublish)}
              title={isHtmlMode && !canPublish ? 'Nincs közzéteendő változtatás' : undefined}
            >
              {publishing ? '⏳ Közzétesz...' : '🚀 Közzétesz'}
            </button>
          </div>
        </header>
      )}

      {/* PublishStatusBar csak normál módban */}
      {isHtmlMode && !isEmbed && (
        <PublishStatusBar
          isDirty={isDirty}
          hasUnpublishedChanges={hasUnpublishedChanges}
          lastDeployedAt={site?.lastDeployedAt}
          publishMsg={publishMsg}
          errorMsg={publishError}
        />
      )}

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — Embed módban és HTML vizuális módban rejtett */}
        {(!isHtmlMode || (showAdvancedForm && !isEmbed)) && (
        <aside style={{
          width: isHtmlMode ? '260px' : '280px',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Page Selector (if multi-page) */}
          {hasMultiplePages && (
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <label className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Szerkesztett oldal</label>
              <select 
                className="input" 
                value={activePageSlug}
                onChange={e => setActivePageSlug(e.target.value)}
                style={{ cursor: 'pointer', fontWeight: '600' }}
              >
                {site?.pages?.map(p => (
                  <option key={p.slug} value={p.slug}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tabs */}
          <nav style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Form content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {/* HERO */}
            {activeTab === 'hero' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>🖼️ Hero szekció</h3>
                
                {isHtmlMode ? (
                  <>
                    <div style={{
                      padding: '12px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}>
                      💡 Ezek a mezők a Cloudflare-en lévő HTML sablonba fognak beépülni.
                    </div>
                    <div>
                      <label className="label">Főcím (H1)</label>
                      <input className="input" placeholder="Nagy, figyelemfelkeltő cím..."
                        value={activePageData.hero?.h1 || ''}
                        onChange={e => updateContent(getUpdatePath('hero', 'h1'), e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Alcím / bevezető (Lead)</label>
                      <textarea className="textarea" placeholder="Rövid, meggyőző leírás..."
                        value={activePageData.hero?.lead || ''}
                        onChange={e => updateContent(getUpdatePath('hero', 'lead'), e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="label">Jelvény / badge (opcionális)</label>
                      <input className="input" placeholder="pl. ⭐ 500+ elégedett ügyfél"
                        value={activePageData.hero?.badge || ''}
                        onChange={e => updateContent(getUpdatePath('hero', 'badge'), e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Főcím</label>
                      <input className="input" placeholder="Nagy, figyelemfelkeltő cím..."
                        value={activePageData.hero?.title || ''}
                        onChange={e => updateContent(getUpdatePath('hero', 'title'), e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Alcím / leírás</label>
                      <textarea className="textarea" placeholder="Rövid, meggyőző leírás..."
                        value={activePageData.hero?.subtitle || ''}
                        onChange={e => updateContent(getUpdatePath('hero', 'subtitle'), e.target.value)} />
                    </div>
                    <div>
                      <label className="label">CTA gomb szövege</label>
                      <input className="input" placeholder="pl. Ingyenes ajánlat"
                        value={activePageData.hero?.cta || ''}
                        onChange={e => updateContent(getUpdatePath('hero', 'cta'), e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Háttérkép URL</label>
                      <input className="input" placeholder="https://..."
                        value={activePageData.hero?.imageUrl || ''}
                        onChange={e => updateContent(getUpdatePath('hero', 'imageUrl'), e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ABOUT */}
            {activeTab === 'about' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>📝 Rólunk szekció</h3>
                <div>
                  <label className="label">Cím</label>
                  <input className="input" placeholder="pl. Kik vagyunk?"
                    value={activePageData.about?.title || ''}
                    onChange={e => updateContent(getUpdatePath('about', 'title'), e.target.value)} />
                </div>
                <div>
                  <label className="label">Szöveg</label>
                  <textarea className="textarea" style={{ minHeight: '120px' }} placeholder="Mutatkozzatok be..."
                    value={activePageData.about?.text || ''}
                    onChange={e => updateContent(getUpdatePath('about', 'text'), e.target.value)} />
                </div>
                <div>
                  <label className="label">Kép URL (opcionális)</label>
                  <input className="input" placeholder="https://..."
                    value={activePageData.about?.imageUrl || ''}
                    onChange={e => updateContent(getUpdatePath('about', 'imageUrl'), e.target.value)} />
                </div>
              </div>
            )}

            {/* SERVICES */}
            {activeTab === 'services' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700' }}>⚙️ Szolgáltatások</h3>
                  <button className="btn btn-secondary btn-sm" onClick={addService}>+ Új</button>
                </div>
                {(activePageData.services || []).map((svc: any, i: number) => (
                  <div key={i} className="card" style={{ padding: '14px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => removeService(i)} style={{ padding: '4px 8px', fontSize: '12px' }}>×</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ width: '60px' }}>
                          <label className="label" style={{ fontSize: '10px' }}>Ikon</label>
                          <input className="input" style={{ textAlign: 'center', fontSize: '20px' }}
                            value={svc.icon || ''} onChange={e => updateService(i, 'icon', e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="label" style={{ fontSize: '10px' }}>Cím</label>
                          <input className="input" placeholder="Szolgáltatás neve"
                            value={svc.title || ''} onChange={e => updateService(i, 'title', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: '10px' }}>Leírás</label>
                        <textarea className="textarea" style={{ minHeight: '60px' }} placeholder="Rövid leírás"
                          value={svc.desc || ''} onChange={e => updateService(i, 'desc', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                {(activePageData.services || []).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Adj hozzá szolgáltatásokat a + Új gombbal
                  </div>
                )}
              </div>
            )}

            {/* CONTACT */}
            {activeTab === 'contact' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>📞 Kapcsolat</h3>
                {isHtmlMode ? (
                  <>
                    <div style={{
                      padding: '12px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}>
                      💡 Ezek a beállítások globálisak (minden oldalon megjelennek a fejlécben / láblécben).
                    </div>
                    <div>
                      <label className="label">Telefon (link)</label>
                      <input className="input" placeholder="+36301234567"
                        value={content.sharedContact?.tel || ''}
                        onChange={e => updateContent(['sharedContact', 'tel'], e.target.value)} />
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>A hívás link hivatkozása szóközök nélkül.</p>
                    </div>
                    <div>
                      <label className="label">Telefon (megjelenített)</label>
                      <input className="input" placeholder="+36 30 123 4567"
                        value={content.sharedContact?.phoneLabel || ''}
                        onChange={e => updateContent(['sharedContact', 'phoneLabel'], e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input type="email" className="input" placeholder="info@ceg.hu"
                        value={content.sharedContact?.email || ''}
                        onChange={e => updateContent(['sharedContact', 'email'], e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="label">Telefon</label>
                      <input className="input" placeholder="+36 1 234 5678"
                        value={activePageData.contact?.phone || ''}
                        onChange={e => updateContent(getUpdatePath('contact', 'phone'), e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input type="email" className="input" placeholder="info@ceg.hu"
                        value={activePageData.contact?.email || ''}
                        onChange={e => updateContent(getUpdatePath('contact', 'email'), e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Cím</label>
                      <input className="input" placeholder="1051 Budapest, Fő utca 1."
                        value={activePageData.contact?.address || ''}
                        onChange={e => updateContent(getUpdatePath('contact', 'address'), e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SEO */}
            {activeTab === 'seo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>🔍 SEO beállítások</h3>
                <SeoSnippetPreview
                  title={activePageData.seo?.title || ''}
                  description={activePageData.seo?.description || ''}
                  siteUrl={site?.liveUrl}
                />
                <div>
                  <label className="label">Oldal cím (title)</label>
                  <input className="input" placeholder="Cégnév — Fő kulcsszó | Város"
                    value={activePageData.seo?.title || ''}
                    onChange={e => updateContent(getUpdatePath('seo', 'title'), e.target.value)} />
                </div>
                <div>
                  <label className="label">Meta leírás</label>
                  <textarea className="textarea" placeholder="Rövid, meggyőző leírás a Google találathoz..."
                    value={activePageData.seo?.description || ''}
                    onChange={e => updateContent(getUpdatePath('seo', 'description'), e.target.value)} />
                </div>
                <div>
                  <label className="label">Kulcsszavak (vesszővel elválasztva)</label>
                  <input className="input" placeholder="pl. kivitelezés, felújítás, Budapest"
                    value={activePageData.seo?.keywords || ''}
                    onChange={e => updateContent(getUpdatePath('seo', 'keywords'), e.target.value)} />
                </div>
              </div>
            )}

            {/* SHOP TEXT */}
            {activeTab === 'shop' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>🏪 Bolt szövegei</h3>
                <div>
                  <label className="label">Bolt főcím</label>
                  <input className="input" placeholder="A bolt neve / szlogenje"
                    value={activePageData.shopText?.heroTitle || ''}
                    onChange={e => updateContent(getUpdatePath('shopText', 'heroTitle'), e.target.value)} />
                </div>
                <div>
                  <label className="label">Bolt alcím</label>
                  <textarea className="textarea" placeholder="Rövid bemutatkozás..."
                    value={activePageData.shopText?.heroSubtitle || ''}
                    onChange={e => updateContent(getUpdatePath('shopText', 'heroSubtitle'), e.target.value)} />
                </div>
                <div>
                  <label className="label">CTA gomb szövege</label>
                  <input className="input" placeholder="pl. Termékek megtekintése"
                    value={activePageData.shopText?.cta || ''}
                    onChange={e => updateContent(getUpdatePath('shopText', 'cta'), e.target.value)} />
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {activeTab === 'products' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700' }}>📦 Termékek</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddProduct(true)}>+ Termék</button>
                </div>

                {products.map(product => (
                  <div key={product._id} className="card" style={{ padding: '12px' }}>
                    {editingProductId === product._id ? (
                      <ProductEditForm
                        siteId={siteId}
                        product={product}
                        onSave={(updates) => handleUpdateProduct(product._id, updates)}
                        onCancel={() => setEditingProductId(null)}
                      />
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{product.name}</div>
                            <div style={{ color: 'var(--accent-hover)', fontWeight: '700', fontSize: '14px', marginTop: '2px' }}>
                              {product.priceHuf.toLocaleString('hu-HU')} Ft
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {product.category} • {product.active ? '✅ Aktív' : '⛔ Inaktív'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}
                              onClick={() => setEditingProductId(product._id)}>✏️</button>
                            <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }}
                              onClick={() => handleDeleteProduct(product._id)}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {products.length === 0 && !showAddProduct && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Még nincs termék. Add hozzá az elsőt!
                  </div>
                )}

                {showAddProduct && (
                  <div className="card" style={{ padding: '14px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>+ Új termék</h4>
                    <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label className="label" style={{ fontSize: '10px' }}>Termék neve *</label>
                        <input className="input" placeholder="pl. Tölgyfa asztal" required
                          value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: '10px' }}>Ár (Ft) *</label>
                        <input type="number" className="input" placeholder="49000" required min="0"
                          value={newProduct.priceHuf || ''} onChange={e => setNewProduct(p => ({ ...p, priceHuf: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: '10px' }}>Kategória</label>
                        <input className="input" placeholder="pl. Kerti bútor"
                          value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: '10px' }}>Leírás</label>
                        <textarea className="textarea" style={{ minHeight: '60px' }} placeholder="Rövid termékleírás..."
                          value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      {isHtmlMode ? (
                        <ImageUploadInput
                          siteId={siteId}
                          value={newProduct.imageUrl}
                          onChange={(url) => setNewProduct((p) => ({ ...p, imageUrl: url }))}
                          label="Termék képe"
                        />
                      ) : (
                        <div>
                          <label className="label" style={{ fontSize: '10px' }}>Kép URL</label>
                          <input className="input" placeholder="https://..."
                            value={newProduct.imageUrl} onChange={e => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))} />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                        <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowAddProduct(false)}>Mégse</button>
                        <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 2 }}>Hozzáad</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MÉDIATÁR */}
          {activeTab === 'media' && isHtmlMode && (
            <div style={{ padding: '20px' }}>
              <MediaLibrary
                siteId={siteId}
                onReplaced={() => setPreviewKey(Date.now())}
              />
            </div>
          )}
        </aside>
        )}

        {/* Preview panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', position: 'relative' }}>
          {/* Preview sáv */}
          <div style={{
            padding: isEmbed ? '8px 16px' : '12px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg-secondary)',
          }}>
            {isEmbed ? (
              /* Embed mód: egyszerű hint */
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                ✏️ Kattints bármely szövegre vagy képre a szerkesztéshez
              </span>
            ) : (
              /* Normál mód */
              <>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>ELŐNÉZET</span>
                <a
                  href={isHtmlMode ? liveExternalUrl : previewUrl.split('?')[0]}
                  target="_blank"
                  rel="noopener"
                  style={{
                    fontSize: '12px',
                    color: 'var(--accent-hover)',
                    textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  {isHtmlMode ? '🌍 Élő (Cloudflare)' : '🔗 Megnyitás új lapfülön'}
                </a>
                {isDirty && (
                  <span style={{ fontSize: '12px', color: 'var(--warning)' }}>
                    {isHtmlMode
                      ? '⚠️ Nem mentett változás — Mentés + Közzétesz után frissül a Cloudflare-en!'
                      : '⚠️ Az előnézet az élesített tartalmat mutatja. Mentsd és élesítsd a változtatokat!'}
                  </span>
                )}
                {isHtmlMode && !showAdvancedForm && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                    Kattints a kiemelt szövegre vagy képre a szerkesztéshez
                  </span>
                )}
              </>
            )}
          </div>

          {/* Oldal-navigátor: embed módban mindig látható, normál módban csak vizuális nézetben */}
          {isHtmlMode && hasMultiplePages && (isEmbed || !showAdvancedForm) && (
            <div style={{
              padding: '8px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              background: isEmbed ? 'var(--bg-card)' : undefined,
            }}>
              {!isEmbed && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Oldalak:</span>
              )}
              {site?.pages?.map((p) => (
                <button
                  key={p.slug}
                  className={`btn btn-sm ${activePageSlug === p.slug ? 'btn-primary' : 'btn-secondary'}`}
                  style={isEmbed ? { fontSize: '13px', padding: '6px 14px' } : {}}
                  onClick={() => { setActivePageSlug(p.slug); setPreviewKey(Date.now()); }}
                >
                  {isEmbed ? `📄 ${p.navLabel || p.title}` : (p.navLabel || p.title)}
                </button>
              ))}
            </div>
          )}
          <iframe
            ref={previewIframeRef}
            id="site-preview"
            src={previewUrl}
            style={{
              flex: 1,
              border: 'none',
              width: '100%',
            }}
            title="Élő előnézet"
          />
          {isHtmlMode && !showAdvancedForm && visibleEditableFields.length > 0 && (
            <div style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              maxHeight: '80px',
              overflow: 'auto',
            }}>
              {visibleEditableFields.map((f) => (
                <button
                  key={f.id}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px' }}
                  onClick={() => {
                    setSelectedField(f);
                    const path = getFieldContentPath(f);
                    let val: unknown = content;
                    for (const p of path) {
                      val = (val as Record<string, unknown>)?.[p];
                    }
                    setFieldEditValue(String(val ?? ''));
                    scrollPreviewToField(previewIframeRef.current, f.dataCmsKey);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {selectedField && isHtmlMode && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              width: '320px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              zIndex: 100,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <strong style={{ fontSize: '14px' }}>{selectedField.label}</strong>
                <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }} onClick={handleFieldCancel}>×</button>
              </div>
              {selectedField.type === 'image' ? (
                <ImageUploadInput
                  siteId={siteId}
                  value={fieldEditValue}
                  onChange={setFieldEditValue}
                  label={selectedField.label}
                />
              ) : selectedField.type === 'richtext' || selectedField.type === 'text' ? (
                <textarea
                  className="textarea"
                  style={{ minHeight: '80px', marginBottom: '12px' }}
                  value={fieldEditValue}
                  onChange={(e) => setFieldEditValue(e.target.value)}
                />
              ) : (
                <input
                  className="input"
                  style={{ marginBottom: '12px' }}
                  value={fieldEditValue}
                  onChange={(e) => setFieldEditValue(e.target.value)}
                />
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={handleFieldCancel}
                >
                  {isEmbed ? '× Bezár' : 'Mégse'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 2 }}
                  onClick={handleFieldDone}
                  disabled={saving}
                >
                  {saving ? 'Mentés...' : isEmbed ? '✅ Kész' : 'Kész'}
                </button>
              </div>
            </div>
          )}

          {/* KÉPCSERE PANEL — iframe kép-kattintásra jelenik meg */}
          {imageReplacePanel && isHtmlMode && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              width: '340px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: 'var(--radius)',
              padding: '16px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              zIndex: 100,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ fontSize: '14px' }}>🖼️ Kép cseréje</strong>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 8px' }}
                  onClick={() => { setImageReplacePanel(null); setImageUploadError(''); }}
                >×</button>
              </div>

              {/* Jelenlegi kép */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Jelenlegi kép:</div>
                <div style={{
                  background: 'var(--bg-primary)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  maxHeight: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src={`/api/sites/${siteId}/preview-asset?path=${encodeURIComponent(imageReplacePanel.originalPath)}`}
                    alt=""
                    style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', wordBreak: 'break-all' }}>
                  {imageReplacePanel.originalPath}
                </div>
              </div>

              {/* Feltöltő */}
              <ImageUploadInput
                siteId={siteId}
                value={''}
                label="Új kép feltöltése"
                onChange={async (newUrl) => {
                  if (!newUrl || !imageReplacePanel) return;
                  setImageUploading(true);
                  setImageUploadError('');
                  try {
                    const res = await fetch(`/api/sites/${siteId}/replace-image`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        oldPath: imageReplacePanel.originalPath,
                        newPath: newUrl,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Csere sikertelen');
                    setImageReplacePanel(null);
                    setPreviewKey(Date.now());
                  } catch (e) {
                    setImageUploadError((e as Error).message);
                  } finally {
                    setImageUploading(false);
                  }
                }}
              />

              {imageUploadError && (
                <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px' }}>⚠️ {imageUploadError}</p>
              )}
              {imageUploading && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>⏳ Alkalmazás...</p>
              )}

              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => { setImageReplacePanel(null); setImageUploadError(''); }}
                >
                  Mégse
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => { setShowAdvancedForm(true); setActiveTab('media'); setImageReplacePanel(null); }}
                >
                  🗂️ Médiatár
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline product edit form component
function ProductEditForm({
  siteId,
  product,
  onSave,
  onCancel,
}: {
  siteId: string;
  product: Product;
  onSave: (updates: Partial<Product>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: product.name,
    description: product.description,
    priceHuf: product.priceHuf,
    imageUrl: product.imageUrl,
    category: product.category,
    active: product.active,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div>
        <label className="label" style={{ fontSize: '10px' }}>Név</label>
        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="label" style={{ fontSize: '10px' }}>Ár (Ft)</label>
        <input type="number" className="input" value={form.priceHuf}
          onChange={e => setForm(f => ({ ...f, priceHuf: Number(e.target.value) }))} />
      </div>
      <div>
        <label className="label" style={{ fontSize: '10px' }}>Kategória</label>
        <input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
      </div>
      <div>
        <label className="label" style={{ fontSize: '10px' }}>Leírás</label>
        <textarea className="textarea" style={{ minHeight: '60px' }} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <ImageUploadInput
        siteId={siteId}
        value={form.imageUrl}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
        label="Termék képe"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="checkbox" id="active-check" checked={form.active}
          onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
        <label htmlFor="active-check" style={{ fontSize: '13px' }}>Aktív (megjelenik a shopban)</label>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onCancel}>Mégse</button>
        <button className="btn btn-primary btn-sm" style={{ flex: 2 }} onClick={() => onSave(form)}>Mentés</button>
      </div>
    </div>
  );
}
