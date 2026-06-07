import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import Site from '@/models/Site';
import Content from '@/models/Content';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ siteId: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId, slug } = await params;
  try {
    await connectDB();
    const product = await Product.findOne({ siteId, slug }).lean();
    if (!product) return { title: 'Termék nem található' };
    return {
      title: `${product.name} — ${product.priceHuf.toLocaleString('hu-HU')} Ft`,
      description: product.description,
    };
  } catch {
    return { title: 'Termék' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { siteId, slug } = await params;

  await connectDB();
  const site = await Site.findById(siteId).lean() as { _id: string; name: string; type: string; checkoutEmail?: string; checkoutUrl?: string } | null;
  if (!site) notFound();

  const product = await Product.findOne({ siteId, slug, active: true }).lean();
  if (!product) notFound();

  // Related products
  const related = await Product.find({
    siteId, active: true, slug: { $ne: slug }, category: product.category,
  }).limit(3).lean();

  const checkoutTarget = site.checkoutUrl || (site.checkoutEmail ? `mailto:${site.checkoutEmail}?subject=Megrendelés: ${product.name}&body=Sziasztok!%0A%0AMeg szeretném rendelni: ${encodeURIComponent(product.name)}%0AÁr: ${product.priceHuf.toLocaleString('hu-HU')} Ft%0A%0AKöszönöm!` : '#');

  return (
    <div style={{ background: '#ffffff', color: '#111827', fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Navigation */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <Link href={`/site/${siteId}/shop`} style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← Vissza a shopba
        </Link>
        <span style={{ color: '#d1d5db' }}>|</span>
        <span style={{ fontWeight: '700', fontSize: '15px' }}>{site.name}</span>
      </nav>

      {/* Product */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 32px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          alignItems: 'start',
        }}>
          {/* Image */}
          <div style={{ borderRadius: '20px', overflow: 'hidden', background: '#f9fafb', aspectRatio: '1' }}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%', minHeight: '400px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '80px', color: '#d1d5db',
              }}>📦</div>
            )}
          </div>

          {/* Details */}
          <div style={{ position: 'sticky', top: '80px' }}>
            <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              {product.category}
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: '900', lineHeight: '1.2', marginBottom: '20px' }}>
              {product.name}
            </h1>

            <div style={{ fontSize: '40px', fontWeight: '800', color: '#6366f1', marginBottom: '32px' }}>
              {product.priceHuf.toLocaleString('hu-HU')} Ft
            </div>

            {product.description && (
              <div style={{
                background: '#f9fafb', borderRadius: '12px',
                padding: '20px', marginBottom: '32px',
                fontSize: '16px', lineHeight: '1.7', color: '#4b5563',
                whiteSpace: 'pre-wrap',
              }}>
                {product.description}
              </div>
            )}

            <a
              href={checkoutTarget}
              id="order-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                padding: '18px 36px', borderRadius: '14px',
                fontSize: '18px', fontWeight: '700', textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                marginBottom: '16px',
                width: '100%',
                textAlign: 'center',
              }}
            >
              📩 Megrendelem
            </a>

            <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
              Az ajánlat iránt érdeklődőknek email-ben visszajelzünk.
            </p>

            <div style={{
              display: 'flex', gap: '8px', flexWrap: 'wrap',
              marginTop: '24px', paddingTop: '24px',
              borderTop: '1px solid #f3f4f6',
            }}>
              {['✅ Garancia', '🚚 Szállítás', '💬 Kérdése van?'].map(tag => (
                <span key={tag} style={{
                  background: '#f3f4f6', color: '#6b7280',
                  padding: '6px 14px', borderRadius: '100px',
                  fontSize: '13px', fontWeight: '600',
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div style={{ marginTop: '80px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '32px' }}>Kapcsolódó termékek</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {related.map(p => (
                <Link key={String(p._id)} href={`/site/${siteId}/shop/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: 'white', borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    border: '1px solid #f3f4f6',
                  }}>
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />}
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>{p.name}</h3>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: '#6366f1' }}>
                        {p.priceHuf.toLocaleString('hu-HU')} Ft
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer style={{
        padding: '32px', background: '#111827', color: '#6b7280',
        textAlign: 'center', fontSize: '14px', marginTop: '80px',
      }}>
        <p>{site.name} • <a href="https://goscale.hu" style={{ color: '#6366f1', textDecoration: 'none' }}>GoScale</a></p>
      </footer>
    </div>
  );
}
