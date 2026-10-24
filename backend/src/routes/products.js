import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import requireAuth from '../middleware/auth.js';
import { normalizeUnit } from '../utils/units.js';

const router = Router();
router.use(requireAuth);

// Returns { fields } on success or { error } with a user-facing message
function parseProduct(body = {}) {
  const itemName = typeof body.item_name === 'string' ? body.item_name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const price = Number(body.price);
  const unit = body.unit == null || body.unit === '' ? 'pc' : normalizeUnit(body.unit);

  if (!itemName) return { error: 'Item name is required' };
  if (body.price === '' || body.price == null || !Number.isFinite(price) || price < 0) {
    return { error: 'Price must be a number of 0 or more' };
  }
  if (!unit) return { error: 'Unit must be one of pc, dozen, kg, g, l, ml' };
  return { fields: { itemName, description, price, unit } };
}

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

router.get('/', async (req, res) => {
  const products = await Product.find({ owner: req.userId }).sort({ itemId: 1 });
  res.json({ products });
});

router.post('/', async (req, res) => {
  const { fields, error } = parseProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const last = await Product.findOne({ owner: req.userId }).sort({ itemId: -1 }).select('itemId');
    const product = await Product.create({ ...fields, owner: req.userId, itemId: (last?.itemId || 0) + 1 });
    res.status(201).json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not add product' });
  }
});

router.put('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const { fields, error } = parseProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, owner: req.userId },
    fields,
    { new: true, runValidators: true }
  );
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product });
});

router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const product = await Product.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ ok: true });
});

export default router;
