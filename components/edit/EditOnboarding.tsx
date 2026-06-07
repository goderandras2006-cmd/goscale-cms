'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'goscale_cms_onboarding_done';

export function useEditOnboarding(siteId: string, enabled: boolean) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const key = `${STORAGE_KEY}_${siteId}`;
    if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
      setShow(true);
    }
  }, [siteId, enabled]);

  function dismiss() {
    localStorage.setItem(`${STORAGE_KEY}_${siteId}`, '1');
    setShow(false);
  }

  return { showOnboarding: show, dismissOnboarding: dismiss };
}

const steps = [
  {
    emoji: '✏️',
    title: 'Kattints bármely szövegre',
    desc: 'A weboldalon kiemelt szövegekre kattintva azonnal szerkesztheted őket.',
    color: '#6366f1',
  },
  {
    emoji: '🖼️',
    title: 'Kattints bármely képre',
    desc: 'A képekre kattintva egy kattintással feltölthetsz új képet.',
    color: '#8b5cf6',
  },
  {
    emoji: '🚀',
    title: 'Közzétesz — és kész!',
    desc: 'A „Közzétesz" gombbal a változtatásaid megjelennek az éles weboldalon.',
    color: '#10b981',
  },
];

export function EditOnboardingOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const isLast = activeStep === steps.length - 1;
  const step = steps[activeStep];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div
        className="card"
        style={{
          maxWidth: '400px',
          width: '100%',
          padding: '32px 28px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Bezárás */}
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute', top: '12px', right: '14px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '18px', lineHeight: 1,
          }}
          title="Kihagyom"
        >×</button>

        {/* Lépés ikon */}
        <div style={{
          width: '72px', height: '72px',
          background: `${step.color}22`,
          border: `2px solid ${step.color}55`,
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px',
          margin: '0 auto 20px',
          transition: 'all 0.3s',
        }}>
          {step.emoji}
        </div>

        {/* Tartalom */}
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px', lineHeight: 1.3 }}>
          {step.title}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.6' }}>
          {step.desc}
        </p>

        {/* Lépés indikátor */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {steps.map((_, i) => (
            <div
              key={i}
              onClick={() => setActiveStep(i)}
              style={{
                width: i === activeStep ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === activeStep ? step.color : 'var(--border)',
                cursor: 'pointer',
                transition: 'all 0.25s',
              }}
            />
          ))}
        </div>

        {/* Gombok */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeStep > 0 && (
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setActiveStep(s => s - 1)}
            >
              Vissza
            </button>
          )}
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={() => isLast ? onDismiss() : setActiveStep(s => s + 1)}
          >
            {isLast ? '✅ Rendben, kezdjük!' : 'Következő →'}
          </button>
        </div>
      </div>
    </div>
  );
}
