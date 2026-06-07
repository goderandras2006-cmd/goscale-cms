'use client';

interface PublishStatusBarProps {
  isDirty: boolean;
  hasUnpublishedChanges: boolean;
  lastDeployedAt?: string;
  publishMsg?: string;
  errorMsg?: string;
}

export function PublishStatusBar({
  isDirty,
  hasUnpublishedChanges,
  lastDeployedAt,
  publishMsg,
  errorMsg,
}: PublishStatusBarProps) {
  let status: 'live' | 'draft' | 'unsaved' = 'live';
  let label = 'Élőben van — nincs függőben lévő változás';
  let color = 'var(--success)';

  if (isDirty) {
    status = 'unsaved';
    label = 'Nem mentett változás — mentsd el, mielőtt élesítesz';
    color = 'var(--warning)';
  } else if (hasUnpublishedChanges) {
    status = 'draft';
    label = 'Mentve (piszkozat) — az élesítés után látható a weboldalon';
    color = 'var(--accent-hover)';
  }

  return (
    <div
      style={{
        padding: '8px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        fontSize: '13px',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {lastDeployedAt && status === 'live' && (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          Utolsó élesítés: {new Date(lastDeployedAt).toLocaleString('hu-HU')}
        </span>
      )}
      {publishMsg && (
        <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: '600' }}>
          {publishMsg}
        </span>
      )}
      {errorMsg && (
        <span style={{ marginLeft: 'auto', color: 'var(--danger)', fontWeight: '600' }}>
          {errorMsg}
        </span>
      )}
    </div>
  );
}
