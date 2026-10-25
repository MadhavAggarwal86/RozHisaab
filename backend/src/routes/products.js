import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import requireAuth from '../middleware/auth.js';
import { productCreateLimiter } from '../middleware/rateLimit.js';
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

// Matches the same name ignoring case and extra spaces, e.g. "amul  butter" ≈ "Amul Butter"
const sameNameQuery = (itemName) => {
  const pattern = itemName.split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  return { $regex: `^\\s*${pattern}\\s*$`, $options: 'i' };
};

const formatPrice = (price, unit) => `₹${price.toFixed(2)}${unit === 'pc' ? '' : `/${unit}`}`;

const normalizeName = (name) => name.trim().replace(/\s+/g, ' ').toLowerCase();

// Returns a 409 body when the shop already has a product with this name (other than `excludeId`), so the client
// can ask the user whether to update that product's price or add a separate one. Same-priced matches win over others.
async function findConflict(owner, fields, excludeId) {
  const query = { owner, itemName: sameNameQuery(fields.itemName), ...(excludeId && { _id: { $ne: excludeId } }) };
  const matches = await Product.find(query).sort({ itemId: 1 });
  if (!matches.length) return null;

  const same = matches.find((p) => p.price === fields.price && (p.unit || 'pc') === fields.unit);
  const existing = same || matches[0];
  const current = formatPrice(existing.price, existing.unit || 'pc');
  return same
    ? { code: 'DUPLICATE_PRODUCT', existing, message: `${existing.itemName} is already in your inventory at ${current}.` }
    : {
        code: 'PRICE_MISMATCH',
        existing,
        message: `${existing.itemName} already exists at ${current}, but you entered ${formatPrice(fields.price, fields.unit)}.`,
      };
}

router.get('/', async (req, res) => {
  const products = await Product.find({ owner: req.userId }).sort({ itemId: 1 });
  res.json({ products });
});

router.post('/', productCreateLimiter, async (req, res) => {
  const { fields, error } = parseProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    // Set by the client only after the user has seen the warning and chosen to add a separate product
    if (req.body?.allow_duplicate !== true) {
      const conflict = await findConflict(req.userId, fields);
      if (conflict) return res.status(409).json(conflict);
    }

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

  // Renaming onto another product's name needs the same confirmation as adding it
  if (req.body?.allow_duplicate !== true) {
    const current = await Product.findOne({ _id: req.params.id, owner: req.userId }).select('itemName');
    if (!current) return res.status(404).json({ message: 'Product not found' });
    if (normalizeName(current.itemName) !== normalizeName(fields.itemName)) {
      const conflict = await findConflict(req.userId, fields, current._id);
      if (conflict) return res.status(409).json(conflict);
    }
  }

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
