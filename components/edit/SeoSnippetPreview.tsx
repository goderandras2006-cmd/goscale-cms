'use client';

interface SeoSnippetPreviewProps {
  title: string;
  description: string;
  siteUrl?: string;
}

function charColor(len: number, ideal: number, max: number): string {
  if (len === 0) return 'var(--text-secondary)';
  if (len <= ideal) return 'var(--success)';
  if (len <= max) return 'var(--warning)';
  return 'var(--danger)';
}

export function SeoSnippetPreview({ title, description, siteUrl }: SeoSnippetPreviewProps) {
  const displayUrl = siteUrl?.replace(/^https?:\/\//, '') || 'weboldal.hu';
  const titleLen = title.length;
  const descLen = description.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          padding: '16px',
          background: '#fff',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #e0e0e0',
          color: '#202124',
        }}
      >
        <div style={{ fontSize: '12px', color: '#4d5156', marginBottom: '4px' }}>
          {displayUrl} › ...
        </div>
        <div
          style={{
            fontSize: '18px',
            color: '#1a0dab',
            lineHeight: 1.3,
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title || 'Oldal cím (title)'}
        </div>
        <div style={{ fontSize: '14px', color: '#4d5156', lineHeight: 1.5 }}>
          {(description || 'Meta leírás — ez jelenik meg a Google találatok alatt.').slice(0, 160)}
          {description.length > 160 ? '…' : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
        <span style={{ color: charColor(titleLen, 50, 60) }}>
          Cím: {titleLen}/60 karakter {titleLen > 60 ? '(túl hosszú)' : ''}
        </span>
        <span style={{ color: charColor(descLen, 150, 160) }}>
          Leírás: {descLen}/160 karakter {descLen > 160 ? '(túl hosszú)' : ''}
        </span>
      </div>
    </div>
  );
}
