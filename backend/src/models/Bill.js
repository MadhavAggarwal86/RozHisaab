import mongoose from 'mongoose';

// Items are a snapshot taken when the bill is issued, so later price or name changes don't alter old bills
const billItemSchema = new mongoose.Schema(
  {
    itemId: { type: Number, required: true },
    itemName: { type: String, required: true },
    price: { type: Number, required: true },
    // Quantity is in `unit`, the product's unit at the time of the bill
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'pc' },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Per-shop sequential bill number (1, 2, 3…)
    billNumber: { type: Number, required: true },
    description: { type: String, default: '', trim: true },
    items: { type: [billItemSchema], required: true },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);

billSchema.index({ owner: 1, billNumber: 1 }, { unique: true });

billSchema.methods.toJSON = function () {
  const { _id, billNumber, description, items, total, createdAt } = this;
  return {
    _id,
    bill_number: billNumber,
    description,
    total,
    issued_at: createdAt,
    items: items.map((i) => ({ item_id: i.itemId, item_name: i.itemName, price: i.price, quantity: i.quantity, unit: i.unit || 'pc', amount: i.amount })),
  };
};

export default mongoose.model('Bill', billSchema);
