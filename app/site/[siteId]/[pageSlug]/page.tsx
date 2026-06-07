import { connectDB } from '@/lib/mongodb';
import Content from '@/models/Content';
import Site from '@/models/Site';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ siteId: string; pageSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId, pageSlug } = await params;
  try {
    await connectDB();
    const content = await Content.findOne({ siteId, status: 'published' }).lean();
    const data = content?.data as any;
    const pageData = data?.pages?.[pageSlug];
    if (!pageData) return { title: siteId };
    const seo = pageData?.seo;
    return {
      title: seo?.title || `${pageSlug} - ${siteId}`,
      description: seo?.description || '',
      keywords: seo?.keywords || '',
    };
  } catch {
    return { title: siteId };
  }
}

export default async function SiteSubPage({ params }: Props) {
  const { siteId, pageSlug } = await params;

  await connectDB();
  const site = await Site.findById(siteId).lean() as any;
  if (!site) notFound();

  const published = await Content.findOne({ siteId, status: 'published' }).lean() as any;
  const data = published?.data || {};

  const pages = site.pages || [];
  const pageDef = pages.find((p: any) => p.slug === pageSlug);
  
  // If page is not defined in site.pages or no content for it, show 404
  if (!pageDef) notFound();

  const pageData = data.pages?.[pageSlug] || {};

  const hero = pageData.hero;
  const about = pageData.about;
  const services = pageData.services || [];
  const testimonials = pageData.testimonials || [];
  const contact = pageData.contact;

  const hasShop = site.type === 'shop' || site.type === 'hybrid';
  const themeColor = site.theme?.primary || '#6366f1';

  return (
    <div style={{ background: '#ffffff', color: '#111827', fontFamily: 'var(--font-inter), sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
          {pages.length > 0 && pages.sort((a: any, b: any) => a.order - b.order).map((p: any) => (
            <Link key={p.slug} href={`/site/${siteId}${p.slug ? `/${p.slug}` : ''}`} style={{ fontSize: '14px', color: p.slug === pageSlug ? themeColor : '#6b7280', textDecoration: 'none', fontWeight: p.slug === pageSlug ? '700' : '500' }}>
              {p.navLabel}
            </Link>
          ))}
          
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

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        {hero && (
          <section style={{
            padding: '60px 32px',
            background: hero.imageUrl
              ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${hero.imageUrl}') center/cover`
              : `linear-gradient(135deg, ${themeColor} 0%, #111827 100%)`,
            color: 'white',
            textAlign: 'center',
          }}>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: '900', marginBottom: '16px' }}>{hero.title || pageDef.title}</h1>
            {hero.subtitle && <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>{hero.subtitle}</p>}
          </section>
        )}

        {/* About Section */}
        {about && about.text && (
          <section style={{ padding: '80px 32px', maxWidth: '900px', margin: '0 auto' }}>
            {about.title && <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '24px', color: themeColor }}>{about.title}</h2>}
            {about.imageUrl && <img src={about.imageUrl} alt={about.title || 'Kép'} style={{ width: '100%', height: 'auto', borderRadius: '16px', marginBottom: '32px' }} />}
            <div style={{ fontSize: '16px', color: '#4b5563', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
              {about.text}
            </div>
          </section>
        )}

        {/* Services Section */}
        {services.length > 0 && (
          <section style={{ padding: '80px 32px', background: '#f9fafb' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
                {services.map((svc: any, i: number) => (
                  <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>{svc.icon}</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>{svc.title}</h3>
                    <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>{svc.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Contact Section */}
        {contact && (contact.phone || contact.email || contact.address) && (
          <section id="contact" style={{ padding: '80px 32px', background: `linear-gradient(135deg, ${themeColor}, #111827)`, color: 'white' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '32px' }}>Kapcsolat</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                    padding: '16px 32px', borderRadius: '12px', color: 'white', textDecoration: 'none', fontSize: '18px', fontWeight: '600',
                  }}>📞 {contact.phone}</a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                    padding: '16px 32px', borderRadius: '12px', color: 'white', textDecoration: 'none', fontSize: '18px', fontWeight: '600',
                  }}>✉️ {contact.email}</a>
                )}
                {contact.address && <div style={{ opacity: 0.85, fontSize: '16px', marginTop: '8px' }}>📍 {contact.address}</div>}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{ padding: '32px', background: '#111827', color: '#6b7280', textAlign: 'center', fontSize: '14px', marginTop: 'auto' }}>
        <p>{site.name} • Weboldal készítette <a href="https://goscale.hu" style={{ color: themeColor, textDecoration: 'none' }}>GoScale</a></p>
      </footer>
    </div>
  );
}
