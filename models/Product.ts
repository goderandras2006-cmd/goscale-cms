import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  siteId: string;
  slug: string;
  name: string;
  description: string;
  priceHuf: number;
  imageUrl: string;
  category: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    siteId: { type: String, required: true, index: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    priceHuf: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: '' },
    category: { type: String, default: 'Általános' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ siteId: 1, slug: 1 }, { unique: true });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
