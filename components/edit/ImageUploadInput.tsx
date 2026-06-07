'use client';

import { useState, useRef } from 'react';

interface ImageUploadInputProps {
  siteId: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUploadInput({ siteId, value, onChange, label = 'Kép' }: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/sites/${siteId}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Feltöltés sikertelen');
      onChange(data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const previewSrc = value
    ? value.startsWith('http') || value.startsWith('/')
      ? value
      : `/api/sites/${siteId}/preview-asset?path=${encodeURIComponent(value)}`
    : '';

  return (
    <div>
      <label className="label">{label}</label>
      {previewSrc && (
        <img
          src={previewSrc}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '120px',
            objectFit: 'contain',
            marginBottom: '8px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
          }}
        />
      )}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Feltöltés...' : 'Fájl kiválasztása'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
      <input
        className="input"
        placeholder="vagy illeszd be a kép URL-jét"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}
