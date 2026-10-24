import mongoose from 'mongoose';
import { UNIT_NAMES } from '../utils/units.js';

const productSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Per-shop sequential id shown to the user (1, 2, 3…)
    itemId: { type: Number, required: true },
    itemName: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    // Price is per one `unit` (e.g. ₹15 per kg)
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: UNIT_NAMES, default: 'pc' },
  },
  { timestamps: true }
);

productSchema.index({ owner: 1, itemId: 1 }, { unique: true });

productSchema.methods.toJSON = function () {
  const { _id, itemId, itemName, description, price, unit } = this;
  return { _id, id: itemId, item_name: itemName, description, price, unit: unit || 'pc' };
};

export default mongoose.model('Product', productSchema);
