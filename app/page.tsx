import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a0f 60%)',
      fontFamily: 'var(--font-inter), sans-serif',
    }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: '80px', height: '80px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '36px', margin: '0 auto 24px',
          boxShadow: '0 0 60px rgba(99, 102, 241, 0.4)',
        }}>🚀</div>
        <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '12px', color: '#f0f0ff' }}>
          GoScale CMS Platform
        </h1>
        <p style={{ color: '#9090b0', fontSize: '16px', marginBottom: '40px', maxWidth: '400px' }}>
          Ügyfél tartalom szerkesztő platform webügynökségek számára
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/agency" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', padding: '14px 28px', borderRadius: '12px',
            fontSize: '15px', fontWeight: '700', textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
          }}>
            🏢 Agency Dashboard
          </Link>
          <Link href="/site/demo-epito" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.08)', color: '#f0f0ff',
            padding: '14px 28px', borderRadius: '12px',
            fontSize: '15px', fontWeight: '600', textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            🌐 Demo site
          </Link>
        </div>
        <div style={{ marginTop: '32px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/edit/demo-epito" style={{ color: '#9090b0', fontSize: '13px', textDecoration: 'none' }}>
            ✏️ Demo szerkesztő (epito123)
          </Link>
          <span style={{ color: '#3a3a5a' }}>•</span>
          <Link href="/site/demo-webshop/shop" style={{ color: '#9090b0', fontSize: '13px', textDecoration: 'none' }}>
            🛒 Demo webshop
          </Link>
        </div>
      </div>
    </div>
  );
}
