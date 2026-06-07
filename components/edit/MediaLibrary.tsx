'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SiteImage {
  path: string;
  label: string;
  previewUrl: string;
  pageLabel: string;
  pageSlug: string;
  dataCmsKey: string;
}

interface MediaLibraryProps {
  siteId: string;
  onReplaced: () => void;
}

export function MediaLibrary({ siteId, onReplaced }: MediaLibraryProps) {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replacingPath, setReplacingPath] = useState<string | null>(null);
  const [successPath, setSuccessPath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingOldPathRef = useRef<string | null>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/images`);
      if (!res.ok) throw new Error('Nem sikerült betölteni a képeket');
      const data = await res.json();
      setImages(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  async function handleReplaceFile(oldPath: string, file: File) {
    setReplacingPath(oldPath);
    setUploadError('');
    setSuccessPath(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(`/api/sites/${siteId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Feltöltés sikertelen');

      const replaceRes = await fetch(`/api/sites/${siteId}/replace-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath: uploadData.url }),
      });
      const replaceData = await replaceRes.json();
      if (!replaceRes.ok) throw new Error(replaceData.error || 'Csere sikertelen');

      setSuccessPath(oldPath);
      setTimeout(() => setSuccessPath(null), 3000);

      await loadImages();
      onReplaced();
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setReplacingPath(null);
    }
  }

  function openFilePicker(imagePath: string) {
    pendingOldPathRef.current = imagePath;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const oldPath = pendingOldPathRef.current;
    if (file && oldPath) handleReplaceFile(oldPath, file);
    pendingOldPathRef.current = null;
  }

  // Oldalanként csoportosítás (az oldalak sorrendben)
  const groups = images.reduce<Record<string, { label: string; slug: string; images: SiteImage[] }>>(
    (acc, img) => {
      const key = img.pageSlug;
      if (!acc[key]) acc[key] = { label: img.pageLabel, slug: img.pageSlug, images: [] };
      acc[key].images.push(img);
      return acc;
    },
    {}
  );
  const groupEntries = Object.entries(groups);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Fejléc */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>🖼️ Képek cseréje</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Kattints bármelyik képre és töltsd fel az újat — azonnal megjelenik az előnézetben.
        </p>
      </div>

      {/* Rejtett file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />

      {/* Hiba üzenet */}
      {uploadError && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--danger)',
          fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>⚠️ {uploadError}</span>
          <button
            onClick={() => setUploadError('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '18px', lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* Töltés */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          ⏳ Képek betöltése...
        </div>
      )}

      {/* Fetch hiba */}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--danger)', fontSize: '13px' }}>
          ⚠️ {error}<br />
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }} onClick={loadImages}>Újra</button>
        </div>
      )}

      {/* Üres állapot */}
      {!loading && !error && images.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.7' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
          Még nem találhatók szerkeszthető képek az oldalon.<br />
          Importáld újra a weboldalt képekkel együtt!
        </div>
      )}

      {/* Képek csoportonként */}
      {!loading && !error && groupEntries.map(([slug, group]) => (
        <div key={slug}>

          {/* Oldal szeparátor — csak ha több oldal van */}
          {groupEntries.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
              <span style={{
                fontSize: '11px', fontWeight: '700',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
              }}>
                📄 {group.label}
              </span>
              <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
            </div>
          )}

          {/* 2-oszlopos grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {group.images.map((img) => {
              const isReplacing = replacingPath === img.path;
              const isSuccess = successPath === img.path;

              return (
                <ImageCard
                  key={img.dataCmsKey}
                  img={img}
                  isReplacing={isReplacing}
                  isSuccess={isSuccess}
                  onClick={() => !isReplacing && openFilePicker(img.path)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Alsó tipp */}
      {!loading && !error && images.length > 0 && (
        <p style={{
          fontSize: '11px', color: 'var(--text-secondary)',
          textAlign: 'center', lineHeight: '1.6',
          paddingTop: '8px', borderTop: '1px solid var(--border)',
        }}>
          {images.length} szerkeszthető kép · A közzétesz gombbal kerül ki az éles oldalra.
        </p>
      )}
    </div>
  );
}

// Különálló kártya komponens, hogy a hover CSS működjön
function ImageCard({
  img, isReplacing, isSuccess, onClick,
}: {
  img: SiteImage;
  isReplacing: boolean;
  isSuccess: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 'var(--radius-sm)',
        border: `2px solid ${isSuccess ? 'var(--success)' : hovered && !isReplacing ? 'var(--accent)' : 'var(--border)'}`,
        overflow: 'hidden',
        cursor: isReplacing ? 'wait' : 'pointer',
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.15s',
        transform: hovered && !isReplacing ? 'translateY(-2px)' : 'none',
        boxShadow: hovered && !isReplacing ? '0 4px 16px rgba(99,102,241,0.2)' : 'none',
        background: 'var(--bg-card)',
      }}
    >
      {/* Kép terület */}
      <div style={{
        height: '100px',
        background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <img
          src={img.previewUrl}
          alt={img.label}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: isReplacing ? 0.35 : 1,
            transition: 'opacity 0.2s',
          }}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = 'none';
            if (el.parentElement) {
              el.parentElement.innerHTML = '<div style="font-size:28px;color:var(--text-secondary)">🖼️</div>';
            }
          }}
        />

        {/* Hover: Csere felirat */}
        {hovered && !isReplacing && !isSuccess && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(99,102,241,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: 'rgba(0,0,0,0.75)',
              color: 'white',
              fontSize: '12px',
              fontWeight: '700',
              padding: '5px 12px',
              borderRadius: '14px',
            }}>
              🔄 Csere
            </span>
          </div>
        )}

        {/* Töltés */}
        {isReplacing && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
          }}>
            <span style={{ fontSize: '24px' }}>⏳</span>
          </div>
        )}

        {/* Siker */}
        {isSuccess && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(16,185,129,0.18)',
          }}>
            <span style={{ fontSize: '28px' }}>✅</span>
          </div>
        )}
      </div>

      {/* Kártya alap — felirat */}
      <div style={{
        padding: '7px 10px',
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        borderTop: '1px solid var(--border)',
        color: isSuccess ? 'var(--success)' : 'var(--text-primary)',
        background: hovered && !isReplacing ? 'rgba(99,102,241,0.06)' : undefined,
        transition: 'background 0.15s, color 0.2s',
      }}>
        {isSuccess ? '✅ Sikeresen cserélve' : img.label}
      </div>
    </div>
  );
}
