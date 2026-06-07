import type { EditableField } from '@/lib/editable-fields';
import { getNestedValue, setNestedValue } from '@/lib/editable-fields';

export type SiteType = 'landing' | 'shop' | 'hybrid';

export const ALLOWED_LANDING_FIELDS = [
  'hero.title',
  'hero.subtitle',
  'hero.cta',
  'hero.imageUrl',
  'hero.badge',
  'hero.h1',
  'hero.lead',
  'about.title',
  'about.text',
  'about.imageUrl',
  'services',
  'contact.phone',
  'contact.email',
  'contact.address',
  'contact.mapUrl',
  'seo.title',
  'seo.description',
  'seo.keywords',
  'gallery',
  'testimonials',
  'shopText.heroTitle',
  'shopText.heroSubtitle',
  'shopText.cta',
  'sharedContact.tel',
  'sharedContact.phoneLabel',
  'sharedContact.email',
] as const;

export const ALLOWED_PRODUCT_FIELDS = [
  'name',
  'description',
  'priceHuf',
  'imageUrl',
  'category',
  'active',
  'slug',
] as const;

export const BLOCKED_FIELDS = [
  'layout',
  'template',
  'css',
  'html',
  'stripeKey',
  'paymentConfig',
  'webhookSecret',
  'checkoutLogic',
  'taxRate',
  'shippingConfig',
] as const;

export function isAllowedField(field: string, type: SiteType = 'landing'): boolean {
  const blocked = BLOCKED_FIELDS as readonly string[];
  if (blocked.includes(field)) return false;

  const allowed = ALLOWED_LANDING_FIELDS as readonly string[];
  const baseField = field.split('.')[0];
  return allowed.includes(field) || allowed.includes(baseField);
}

function sanitizeWithEditableFields(
  data: Record<string, unknown>,
  editableFields: EditableField[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of editableFields) {
    if (field.scope === 'global' || field.dataCmsKey === 'sharedContact') {
      const sc = data.sharedContact;
      if (sc && typeof sc === 'object') {
        result.sharedContact = { ...(sc as Record<string, unknown>) };
      }
      continue;
    }

    const pages = data.pages;
    if (!pages || typeof pages !== 'object') continue;

    for (const [slug, pageData] of Object.entries(pages as Record<string, unknown>)) {
      if (!fieldAppliesToSlug(field, slug)) continue;
      if (!pageData || typeof pageData !== 'object') continue;

      const value = getNestedValue(pageData as Record<string, unknown>, field.dataCmsKey);
      if (value === undefined) continue;

      if (!result.pages) result.pages = {};
      const pagesOut = result.pages as Record<string, Record<string, unknown>>;
      if (!pagesOut[slug]) pagesOut[slug] = {};
      setNestedValue(pagesOut[slug], field.dataCmsKey, value);
    }
  }

  if (data.sharedContact && typeof data.sharedContact === 'object') {
    const hasGlobalContact = editableFields.some(
      (f) => f.scope === 'global' || f.dataCmsKey === 'sharedContact'
    );
    if (hasGlobalContact) {
      result.sharedContact = { ...(data.sharedContact as Record<string, unknown>) };
    }
  }

  return result;
}

function fieldAppliesToSlug(field: EditableField, slug: string): boolean {
  if (field.pages.includes('*')) return true;
  return field.pages.includes(slug);
}

export function sanitizeContent(
  data: Record<string, unknown>,
  type: SiteType = 'landing',
  editableFields?: EditableField[]
): Record<string, unknown> {
  if (editableFields && editableFields.length > 0) {
    return sanitizeWithEditableFields(data, editableFields);
  }

  const sanitized = { ...data };
  for (const blocked of BLOCKED_FIELDS) {
    delete sanitized[blocked];
  }

  if (sanitized.pages && typeof sanitized.pages === 'object') {
    const sanitizedPages: Record<string, unknown> = {};
    for (const [slug, pageData] of Object.entries(sanitized.pages)) {
      if (typeof pageData === 'object' && pageData !== null) {
        const sanitizedPage = { ...pageData } as Record<string, unknown>;
        for (const blocked of BLOCKED_FIELDS) {
          delete sanitizedPage[blocked];
        }
        sanitizedPages[slug] = sanitizedPage;
      }
    }
    sanitized.pages = sanitizedPages;
  }

  return sanitized;
}
