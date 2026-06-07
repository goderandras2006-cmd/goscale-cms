import mongoose, { Schema } from 'mongoose';
import type { EditableField } from '@/lib/editable-fields';

export interface ISite {
  _id: string;
  name: string;
  type: 'landing' | 'shop' | 'hybrid';
  siteMode: 'html_cloudflare' | 'demo_template';
  password: string;
  checkoutEmail?: string;
  checkoutUrl?: string;
  ghlLocationId?: string; // GoHighLevel Location ID (sub-account ID)
  pages?: { slug: string; title: string; navLabel: string; order: number }[];
  customDomain?: string;
  domainVerified?: boolean;
  isDemo?: boolean;
  theme?: { primary: string };
  liveUrl?: string;
  cloudflareProjectName?: string;
  cloudflareAccountId?: string;
  lastDeployedAt?: Date;
  lastSyncedAt?: Date;
  templateVersion?: number;
  templateDir?: string;
  templateFiles?: Record<string, string>;
  editableFields?: EditableField[];
  createdAt: Date;
  updatedAt: Date;
}

const SiteSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['landing', 'shop', 'hybrid'], default: 'landing' },
    siteMode: { type: String, enum: ['html_cloudflare', 'demo_template'], default: 'demo_template' },
    password: { type: String, required: true },
    checkoutEmail: { type: String },
    checkoutUrl: { type: String },
    ghlLocationId: { type: String, sparse: true }, // GHL Location ID → auto-login
    pages: { type: [{ slug: String, title: String, navLabel: String, order: Number }], default: [] },
    customDomain: { type: String, sparse: true },
    domainVerified: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    theme: { type: { primary: String } },
    liveUrl: { type: String },
    cloudflareProjectName: { type: String },
    cloudflareAccountId: { type: String },
    lastDeployedAt: { type: Date },
    lastSyncedAt: { type: Date },
    templateVersion: { type: Number, default: 1 },
    templateDir: { type: String },
    // FONTOS: Map helyett Mixed — a Mongoose Map típus validációs problémákat okoz
    // nagy HTML tartalmakkal. A plain object így megbízhatóan tárolódik.
    templateFiles: { type: Schema.Types.Mixed, default: undefined },
    editableFields: {
      type: [{
        id: String,
        label: String,
        // Mongoose: a "type" mezőnév ütközik a séma type kulccsal → { type: String } kell
        type: { type: String },
        pages: [String],
        dataCmsKey: String,
        scope: { type: String, enum: ['page', 'global'] },
        productSlot: Boolean,
        selector: String,
        htmlFile: String,
      }],
      default: [],
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

// Index a gyors GHL location lookup-hoz
SiteSchema.index({ ghlLocationId: 1 }, { sparse: true });

// Dev hot-reload: séma változáskor újrafordítás
if (mongoose.models.Site) {
  delete mongoose.models.Site;
}

export default mongoose.model<ISite>('Site', SiteSchema);
