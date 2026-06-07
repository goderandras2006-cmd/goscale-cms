import { connectDB } from '@/lib/mongodb';
import Content from '@/models/Content';
import Site from '@/models/Site';
import Product from '@/models/Product';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ siteId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  try {
    await connectDB();
    const content = await Content.findOne({ siteId, status: 'published' }).lean();
    const data = content?.data as Record<string, unknown> | undefined;
    const seo = data?.seo as { title?: string; description?: string } | undefined;
    const shopText = data?.shopText as { heroTitle?: string } | undefined;
    return {
      title: shopText?.heroTitle ? `${shopText.heroTitle} — Webshop` : `${siteId} Webshop`,
      description: seo?.description || '',
    };
  } catch {
    return { title: 'Webshop' };
  }
}

export default async function ShopPage({ params }: Props) {
  const { siteId } = await params;

  await connectDB();
  const site = await Site.findById(siteId).lean() as { _id: string; name: string; type: string } | null;
  if (!site || (site.type !== 'shop' && site.type !== 'hybrid')) notFound();

  const published = await Content.findOne({ siteId, status: 'published' }).lean() as { data: Record<string, unknown> } | null;
  const data = published?.data || {};
  const shopText = data.shopText as { heroTitle?: string; heroSubtitle?: string; cta?: string } | undefined;
  const hero = data.hero as { title?: string; imageUrl?: string } | undefined;

  const products = await Product.find({ siteId, active: true }).sort({ order: 1 }).lean();

  // Group by category
  const categories: Record<string, typeof products> = {};
  for (const p of products) {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  }
  const categoryNames = Object.keys(categories);

  return (
    <div style={{ background: '#ffffff', color: '#111827', fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Navigation */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href={`/site/${siteId}`} style={{
          fontWeight: '800', fontSize: '18px', color: '#111827', textDecoration: 'none',
        }}>
          ← {site.name}
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {categoryNames.map(cat => (
            <a key={cat} href={`#cat-${cat}`} style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>
              {cat}
            </a>
          ))}
        </div>
      </nav>

      {/* Shop Hero */}
      <section style={{
        background: hero?.imageUrl
          ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${hero.imageUrl}') center/cover`
          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        padding: '80px 32px',
        textAlign: 'center',
        color: 'white',
      }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: '900', marginBottom: '16px' }}>
          {shopText?.heroTitle || site.name}
        </h1>
        {shopText?.heroSubtitle && (
          <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
            {shopText.heroSubtitle}
          </p>
        )}
      </section>

      {/* Products */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 32px' }}>
        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Hamarosan!</h2>
            <p>A termékek feltöltése folyamatban van.</p>
          </div>
        )}

        {categoryNames.map(cat => (
          <div key={cat} id={`cat-${cat}`} style={{ marginBottom: '60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800' }}>{cat}</h2>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>{categories[cat].length} termék</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}>
              {categories[cat].map(p => (
                <Link key={String(p._id)} href={`/site/${siteId}/shop/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: 'white', borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    border: '1px solid #f3f4f6',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                  }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '220px',
                        background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '48px',
                      }}>📦</div>
                    )}
                    <div style={{ padding: '20px' }}>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {p.category}
                      </div>
                      <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '12px', lineHeight: '1.3' }}>{p.name}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '22px', fontWeight: '800', color: '#6366f1' }}>
                          {p.priceHuf.toLocaleString('hu-HU')} Ft
                        </span>
                        <span style={{
                          background: '#6366f1', color: 'white',
                          padding: '6px 14px', borderRadius: '8px',
                          fontSize: '13px', fontWeight: '600',
                        }}>
                          Részletek →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </main>

      <footer style={{
        padding: '32px', background: '#111827', color: '#6b7280',
        textAlign: 'center', fontSize: '14px',
      }}>
        <p>{site.name} Webshop • Powered by <a href="https://goscale.hu" style={{ color: '#6366f1', textDecoration: 'none' }}>GoScale</a></p>
      </footer>
    </div>
  );
}
