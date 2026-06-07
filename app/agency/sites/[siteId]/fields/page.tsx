'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import type { EditableField, EditableFieldType } from '@/lib/editable-fields';

interface SiteInfo {
  _id: string;
  name: string;
  pages?: { slug: string; title: string; navLabel: string }[];
}

const FIELD_TYPES: { value: EditableFieldType; label: string }[] = [
  { value: 'text', label: 'Szöveg' },
  { value: 'richtext', label: 'Formázott szöveg (H1)' },
  { value: 'image', label: 'Kép (URL)' },
  { value: 'link', label: 'Link' },
  { value: 'phone', label: 'Telefon' },
  { value: 'email', label: 'Email' },
  { value: 'price', label: 'Ár' },
];

export default function AgencyFieldsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const router = useRouter();

  const [site, setSite] = useState<SiteInfo | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [activeSlug, setActiveSlug] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickMode, setPickMode] = useState(false);

  const [form, setForm] = useState({
    label: '',
    type: 'text' as EditableFieldType,
    dataCmsKey: '',
    pages: ['*'] as string[],
    scope: 'page' as 'page' | 'global',
    productSlot: false,
    childPath: [] as number[],
    pickedText: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [siteRes, fieldsRes] = await Promise.all([
        fetch(`/api/sites/${siteId}`),
        fetch(`/api/sites/${siteId}/fields`),
      ]);
      if (!siteRes.ok) throw new Error('Site nem található');
      if (!fieldsRes.ok) throw new Error('Mezők betöltése sikertelen');
      const siteData = await siteRes.json();
      const fieldsData = await fieldsRes.json();
      setSite(siteData);
      setFields(fieldsData.fields || []);
      if (siteData.pages?.length) {
        setActiveSlug(siteData.pages[0].slug);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'cms-pick') return;
      const tag = (e.data.tagName || '').toLowerCase();
      const isImg = tag === 'img';
      const suggestedKey = e.data.dataCms || (isImg ? 'hero.image' : 'custom.text');
      setForm((f) => ({
        ...f,
        childPath: e.data.childPath || [],
        pickedText: e.data.text || e.data.src || '',
        type: isImg ? 'image' : tag === 'h1' ? 'richtext' : f.type,
        dataCmsKey: f.dataCmsKey || suggestedKey,
        label: f.label || (e.data.text || '').slice(0, 40) || suggestedKey,
        pages: [activeSlug || '*'],
      }));
      setPickMode(false);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activeSlug]);

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label || !form.dataCmsKey) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          type: form.type,
          dataCmsKey: form.dataCmsKey,
          pages: form.pages,
          scope: form.scope,
          productSlot: form.productSlot,
          childPath: form.childPath.length ? form.childPath : undefined,
          slug: activeSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mentés sikertelen');
      setFields(data.fields || []);
      setForm({
        label: '',
        type: 'text',
        dataCmsKey: '',
        pages: [activeSlug || '*'],
        scope: 'page',
        productSlot: false,
        childPath: [],
        pickedText: '',
      });
      setPreviewKey(Date.now());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteField(fieldId: string) {
    if (!confirm('Törlöd ezt a mezőt? (A HTML jelölés megmarad)')) return;
    const res = await fetch(`/api/sites/${siteId}/fields/${fieldId}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setFields(data.fields || []);
    }
  }

  async function initDefaults() {
    const res = await fetch(`/api/sites/${siteId}/fields`, { method: 'PUT' });
    if (res.ok) {
      const data = await res.json();
      setFields(data.fields || []);
    }
  }

  const previewUrl = `/api/sites/${siteId}/preview?slug=${encodeURIComponent(activeSlug)}&mode=${pickMode ? 'picker' : ''}&t=${previewKey}`;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Betöltés...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <header style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        background: 'var(--bg-secondary)',
      }}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/agency')}>
          ← Vissza
        </button>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: '700' }}>Mezők beállítása</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{site?.name} ({siteId})</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={initDefaults}>
            Alapértelmezett mezők
          </button>
          <button
            className={`btn btn-sm ${pickMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPickMode((p) => !p)}
          >
            {pickMode ? '🎯 Kijelölés aktív' : '+ Mező hozzáadása (kattintás)'}
          </button>
        </div>
      </header>

      {error && (
        <div style={{ padding: '12px 24px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {site?.pages && site.pages.length > 1 && (
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {site.pages.map((p) => (
                <button
                  key={p.slug}
                  className={`btn btn-sm ${activeSlug === p.slug ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setActiveSlug(p.slug); setPreviewKey(Date.now()); }}
                >
                  {p.navLabel || p.title || p.slug || 'Főoldal'}
                </button>
              ))}
            </div>
          )}
          {pickMode && (
            <div style={{ padding: '8px 16px', background: 'rgba(99,102,241,0.1)', fontSize: '13px', color: 'var(--accent-hover)' }}>
              Kattints egy szövegre, képre vagy gombra az előnézeten a mező kijelöléséhez.
            </div>
          )}
          <iframe
            key={previewUrl}
            src={previewUrl}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title="Mező kijelölő előnézet"
          />
        </div>

        <aside style={{
          width: '360px',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Új / szerkesztett mező</h2>
            <form onSubmit={handleAddField} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {form.pickedText && (
                <div style={{ fontSize: '12px', padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}>
                  Kijelölve: &quot;{form.pickedText.slice(0, 60)}&quot;
                </div>
              )}
              <div>
                <label className="label">Címke (ügyfélnek)</label>
                <input className="input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required />
              </div>
              <div>
                <label className="label">data-cms kulcs</label>
                <input className="input" placeholder="hero.h1" value={form.dataCmsKey} onChange={(e) => setForm((f) => ({ ...f, dataCmsKey: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Típus</label>
                <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EditableFieldType }))}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hatókör</label>
                <select className="input" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as 'page' | 'global' }))}>
                  <option value="page">Oldal</option>
                  <option value="global">Globális</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <input type="checkbox" checked={form.productSlot} onChange={(e) => setForm((f) => ({ ...f, productSlot: e.target.checked, dataCmsKey: e.target.checked ? 'shop.productCard' : f.dataCmsKey }))} />
                Termék kártya sablon (webshop)
              </label>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Mentés...' : 'Mező mentése'}
              </button>
            </form>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Beállított mezők ({fields.length})</h2>
            {fields.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Még nincs mező. Kattints a „Mező hozzáadása” gombra, vagy állítsd be az alapértelmezetteket.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fields.map((f) => (
                  <li key={f.id} className="card" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{f.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{f.dataCmsKey}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{f.type} · {f.pages.join(', ')}</div>
                      </div>
                      <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleDeleteField(f.id)}>×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
