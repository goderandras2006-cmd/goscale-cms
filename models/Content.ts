import mongoose, { Schema, Document } from 'mongoose';

export interface ServiceItem {
  title: string;
  desc: string;
  icon: string;
}

export interface TestimonialItem {
  name: string;
  text: string;
  rating: number;
}

export interface PageData {
  hero?: {
    title?: string;
    subtitle?: string;
    cta?: string;
    imageUrl?: string;
    badge?: string;
    h1?: string; // HTML import
    lead?: string; // HTML import
  };
  about?: {
    title?: string;
    text?: string;
    imageUrl?: string;
  };
  services?: ServiceItem[];
  gallery?: string[];
  testimonials?: TestimonialItem[];
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
    mapUrl?: string;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  shopText?: {
    heroTitle?: string;
    heroSubtitle?: string;
    cta?: string;
  };
}

export interface ContentData extends PageData {
  pages?: Record<string, PageData>;
  sharedContact?: { // HTML import
    tel?: string;
    phoneLabel?: string;
    email?: string;
  };
}

export interface IContent extends Document {
  siteId: string;
  status: 'draft' | 'published';
  version: number;
  data: ContentData;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
  {
    siteId: { type: String, required: true, index: true },
    status: { type: String, enum: ['draft', 'published'], required: true },
    version: { type: Number, default: 1 },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Összetett index siteId + status alapján (gyors lekérdezés)
ContentSchema.index({ siteId: 1, status: 1 }, { unique: true });

export default mongoose.models.Content || mongoose.model<IContent>('Content', ContentSchema);
