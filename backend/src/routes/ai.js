import { Router } from 'express';
import Product from '../models/Product.js';
import requireAuth from '../middleware/auth.js';
import { AiError, extractProducts, missingFields } from '../utils/inventoryAi.js';
import { buildBill, extractBillLines, validateLines } from '../utils/billingAi.js';

const router = Router();
router.use(requireAuth);

// All shops share one AI key, set as AI_API_KEY in the server's .env
function aiKey(res) {
  const key = process.env.AI_API_KEY?.trim();
  if (!key) res.status(503).json({ message: 'The assistant is not set up yet. Please try again later.' });
  return key;
}

// Turns a free-text message into a list of products using the shared AI key.
// Nothing is saved here; the client reviews the items and saves via POST /api/products.
router.post('/inventory/parse', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ message: 'Message is required' });
  if (message.length > 500) return res.status(400).json({ message: 'Message is too long' });

  const apiKey = aiKey(res);
  if (!apiKey) return;

  try {
    const items = await extractProducts(apiKey, message);
    res.json({ items: items.map((item) => ({ ...item, missing: missingFields(item) })) });
  } catch (err) {
    if (err instanceof AiError) return res.status(err.status).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Adds the products named in a free-text message to the current bill. The model only returns item ids and
// quantities; the bill (names, prices, amounts, total) is built here from the user's own products.
router.post('/billing/parse', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ message: 'Message is required' });
  if (message.length > 500) return res.status(400).json({ message: 'Message is too long' });

  const { value: current, error } = validateLines(req.body?.items ?? []);
  if (error) return res.status(400).json({ message: `Invalid bill: ${error}` });

  const apiKey = aiKey(res);
  if (!apiKey) return;

  const products = await Product.find({ owner: req.userId }).sort({ itemId: 1 }).limit(500);
  if (!products.length) return res.status(400).json({ message: 'Your inventory is empty. Add products first.' });

  try {
    const lines = await extractBillLines(apiKey, products, message);
    const bill = buildBill(products, [...current, ...lines]);
    res.json({ ...bill, matched: buildBill(products, lines).items.length });
  } catch (err) {
    if (err instanceof AiError) return res.status(err.status).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

export default router;
