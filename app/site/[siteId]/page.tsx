import { connectDB } from '@/lib/mongodb';
import Content from '@/models/Content';
import Site from '@/models/Site';
import Product from '@/models/Product';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ siteId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  try {
    await connectDB();
    const content = await Content.findOne({ siteId, status: 'published' }).lean();
    const data = content?.data as any;
    // Check if multi-page structure exists, otherwise fallback to flat
    const pageData = data?.pages?.[''] || data;
    const seo = pageData?.seo;
    return {
      title: seo?.title || siteId,
      description: seo?.description || '',
      keywords: seo?.keywords || '',
    };
  } catch {
    return { title: siteId };
  }
}

export default async function SitePage({ params }: Props) {
  const { siteId } = await params;

  await connectDB();
  const site = await Site.findById(siteId).lean() as any;
  if (!site) notFound();

  const published = await Content.findOne({ siteId, status: 'published' }).lean() as any;
  const data = published?.data || {};

  // Check if multi-page structure exists
  const pageData = data.pages?.[''] || data;

  const hero = pageData.hero;
  const about = pageData.about;
  const services = pageData.services || [];
  const testimonials = pageData.testimonials || [];
  const contact = pageData.contact;
  const seo = pageData.seo;

  const hasShop = site.type === 'shop' || site.type === 'hybrid';
  const isShopOnly = site.type === 'shop';
  const pages = site.pages || [];
  const themeColor = site.theme?.primary || '#6366f1';

  // For shop-only: fetch featured products
  let featuredProducts: any[] = [];
  if (hasShop) {
    const prods = await Product.find({ siteId, active: true }).sort({ order: 1 }).limit(6).lean();
    featuredProducts = prods.map(p => ({
      _id: String(p._id),
      name: p.name,
      priceHuf: p.priceHuf,
      imageUrl: p.imageUrl,
      slug: p.slug,
      category: p.category,
    }));
  }

  return (
    <div style={{ background: '#ffffff', color: '#111827', fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Navigation */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href={`/site/${siteId}`} style={{ fontWeight: '800', fontSize: '18px', color: '#111827', textDecoration: 'none' }}>
          {site.name}
        </Link>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {pages.length > 0 ? (
            pages.sort((a: any, b: any) => a.order - b.order).map((p: any) => (
              <Link key={p.slug} href={`/site/${siteId}/${p.slug}`} style={{ fontSize: '14px', color: p.slug === '' ? themeColor : '#6b7280', textDecoration: 'none', fontWeight: p.slug === '' ? '700' : '500' }}>
                {p.navLabel}
              </Link>
            ))
          ) : (
            !isShopOnly && (
              <>
                <a href="#about" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>Rólunk</a>
                <a href="#services" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>Szolgáltatások</a>
                <a href="#contact" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>Kapcsolat</a>
              </>
            )
          )}
          
          {hasShop && (
            <Link href={`/site/${siteId}/shop`} style={{
              background: themeColor, color: 'white',
              padding: '8px 20px', borderRadius: '8px',
              fontSize: '14px', fontWeight: '600', textDecoration: 'none',
            }}>
              🛒 Webshop
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      {hero && (
        <section style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: hero.imageUrl
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${hero.imageUrl}') center/cover`
            : `linear-gradient(135deg, ${themeColor} 0%, #111827 100%)`,
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '80px 32px',
            textAlign: 'center',
            color: 'white',
          }}>
            {hero.badge && (
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                padding: '6px 16px', borderRadius: '100px',
                fontSize: '14px', fontWeight: '600',
                marginBottom: '24px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                {hero.badge}
              </div>
            )}
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 72px)',
              fontWeight: '900',
              lineHeight: '1.1',
              marginBottom: '24px',
              textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}>
              {hero.title}
            </h1>
            {hero.subtitle && (
              <p style={{
                fontSize: 'clamp(16px, 2vw, 22px)',
                opacity: 0.9,
                lineHeight: '1.6',
                marginBottom: '40px',
                maxWidth: '600px',
                margin: '0 auto 40px',
              }}>
                {hero.subtitle}
              </p>
            )}
            {hero.cta && (
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {pages.length > 0 ? (
                  <Link href={`/site/${siteId}/kapcsolat`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'white', color: themeColor,
                    padding: '16px 36px', borderRadius: '12px',
                    fontSize: '16px', fontWeight: '700',
                    textDecoration: 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s',
                  }}>
                    {hero.cta} →
                  </Link>
                ) : (
                  <a href="#contact" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'white', color: themeColor,
                    padding: '16px 36px', borderRadius: '12px',
                    fontSize: '16px', fontWeight: '700',
                    textDecoration: 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s',
                  }}>
                    {hero.cta} →
                  </a>
                )}
                
                {hasShop && (
                  <Link href={`/site/${siteId}/shop`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    padding: '16px 36px', borderRadius: '12px',
                    fontSize: '16px', fontWeight: '600',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}>
                    🛒 Webshop
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* About Section */}
      {about && about.text && (
        <section id="about" style={{
          padding: '100px 32px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: about.imageUrl ? '1fr 1fr' : '1fr',
            gap: '60px',
            alignItems: 'center',
          }}>
            <div>
              <div style={{
                display: 'inline-block',
                background: `${themeColor}22`,
                color: themeColor,
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
              }}>
                Rólunk
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '20px', lineHeight: '1.2' }}>
                {about.title || 'Ki vagyunk mi?'}
              </h2>
              <p style={{ fontSize: '17px', color: '#4b5563', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {about.text}
              </p>
            </div>
            {about.imageUrl && (
              <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.12)' }}>
                <img src={about.imageUrl} alt="Rólunk" style={{ width: '100%', height: '400px', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Services Section */}
      {services.length > 0 && (
        <section id="services" style={{
          padding: '100px 32px',
          background: '#f9fafb',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <div style={{
                display: 'inline-block',
                background: `${themeColor}22`, color: themeColor,
                padding: '4px 12px', borderRadius: '6px',
                fontSize: '12px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px',
              }}>Szolgáltatások</div>
              <h2 style={{ fontSize: '36px', fontWeight: '800' }}>Amiben segíthetünk</h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '24px',
            }}>
              {services.map((svc: any, i: number) => (
                <div key={i} style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '32px 24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  border: '1px solid #f3f4f6',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>{svc.icon}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>{svc.title}</h3>
                  <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>{svc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products (for hybrid) */}
      {hasShop && featuredProducts.length > 0 && site.type === 'hybrid' && (
        <section style={{ padding: '100px 32px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              display: 'inline-block', background: `${themeColor}22`, color: themeColor,
              padding: '4px 12px', borderRadius: '6px', fontSize: '12px',
              fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px',
            }}>Termékeink</div>
            <h2 style={{ fontSize: '36px', fontWeight: '800' }}>Kiemelt ajánlatok</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {featuredProducts.map(p => (
              <Link key={p._id} href={`/site/${siteId}/shop/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: 'white', borderRadius: '16px', overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid #f3f4f6',
                  transition: 'transform 0.2s',
                }}>
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{p.category}</div>
                    <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>{p.name}</h3>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: themeColor }}>
                      {p.priceHuf.toLocaleString('hu-HU')} Ft
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href={`/site/${siteId}/shop`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: themeColor, color: 'white',
              padding: '14px 32px', borderRadius: '12px',
              fontSize: '15px', fontWeight: '700', textDecoration: 'none',
            }}>
              Összes termék megtekintése →
            </Link>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section style={{ padding: '80px 32px', background: '#f9fafb' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '48px' }}>Mit mondanak rólunk?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {testimonials.map((t: any, i: number) => (
                <div key={i} style={{
                  background: 'white', borderRadius: '16px', padding: '28px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  border: '1px solid #f3f4f6',
                  textAlign: 'left',
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    {'⭐'.repeat(t.rating || 5)}
                  </div>
                  <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.7', marginBottom: '16px', fontStyle: 'italic' }}>
                    „{t.text}"
                  </p>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      {contact && (contact.phone || contact.email || contact.address) && (
        <section id="contact" style={{
          padding: '100px 32px',
          background: `linear-gradient(135deg, ${themeColor}, #111827)`,
          color: 'white',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '16px' }}>Vegyük fel a kapcsolatot!</h2>
            <p style={{ opacity: 0.85, fontSize: '18px', marginBottom: '48px' }}>
              Állunk rendelkezésre, hívjon fel vagy írjon nekünk.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              {contact.phone && (
                <a href={`tel:${contact.phone}`} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  padding: '16px 32px', borderRadius: '12px',
                  color: 'white', textDecoration: 'none',
                  fontSize: '18px', fontWeight: '600',
                  border: '1px solid rgba(255,255,255,0.2)',
                  width: '100%', maxWidth: '400px', justifyContent: 'center',
                }}>
                  📞 {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  padding: '16px 32px', borderRadius: '12px',
                  color: 'white', textDecoration: 'none',
                  fontSize: '18px', fontWeight: '600',
                  border: '1px solid rgba(255,255,255,0.2)',
                  width: '100%', maxWidth: '400px', justifyContent: 'center',
                }}>
                  ✉️ {contact.email}
                </a>
              )}
              {contact.address && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  opacity: 0.85,
                  fontSize: '16px',
                  marginTop: '8px',
                }}>
                  📍 {contact.address}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{
        padding: '32px',
        background: '#111827',
        color: '#6b7280',
        textAlign: 'center',
        fontSize: '14px',
      }}>
        <p>{site.name} • Weboldal készítette <a href="https://goscale.hu" style={{ color: themeColor, textDecoration: 'none' }}>GoScale</a></p>
      </footer>
    </div>
  );
}
