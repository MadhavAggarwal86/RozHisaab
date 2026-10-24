import { Router } from 'express';
import mongoose from 'mongoose';
import Bill from '../models/Bill.js';
import Product from '../models/Product.js';
import requireAuth from '../middleware/auth.js';
import { buildBill, validateLines } from '../utils/billingAi.js';

const router = Router();
router.use(requireAuth);

const MAX_DESCRIPTION = 200;

// Oldest first (ascending bill number), as shown in Billing History
router.get('/', async (req, res) => {
  const bills = await Bill.find({ owner: req.userId }).sort({ billNumber: 1 });
  res.json({ bills });
});

// Dashboard numbers. `since` is the start of "today" in the client's timezone (ISO string).
router.get('/summary', async (req, res) => {
  const since = new Date(req.query.since);
  if (Number.isNaN(since.getTime())) return res.status(400).json({ message: 'Invalid "since" date' });

  const owner = new mongoose.Types.ObjectId(req.userId);
  const [today, recent, bestSellers] = await Promise.all([
    Bill.aggregate([
      { $match: { owner, createdAt: { $gte: since } } },
      { $group: { _id: null, sales: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Bill.find({ owner }).sort({ billNumber: -1 }).limit(20),
    Bill.aggregate([
      { $match: { owner } },
      { $unwind: '$items' },
      { $group: { _id: '$items.itemId', name: { $last: '$items.itemName' }, unit: { $last: '$items.unit' }, quantity: { $sum: '$items.quantity' } } },
      { $sort: { quantity: -1, name: 1 } },
      { $limit: 5 },
    ]),
  ]);

  res.json({
    today_sales: today[0]?.sales || 0,
    bills_today: today[0]?.count || 0,
    recent_bills: recent,
    best_sellers: bestSellers.map((b) => ({ item_id: b._id, item_name: b.name, unit: b.unit || 'pc', quantity: b.quantity })),
  });
});

// Daily sales for the last `days` days plus the `days` before them, for the dashboard chart.
// `tz` is the client's IANA timezone so days start at the shop's midnight.
router.get('/sales', async (req, res) => {
  const days = [7, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
  const tz = typeof req.query.tz === 'string' && /^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/.test(req.query.tz) ? req.query.tz : 'UTC';
  const since = new Date(req.query.since);
  if (Number.isNaN(since.getTime())) return res.status(400).json({ message: 'Invalid "since" date' });

  // `since` is the start of today; go back 2 × days − 1 more days
  const from = new Date(since.getTime() - (2 * days - 1) * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000);
  try {
    const rows = await Bill.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(req.userId), createdAt: { $gte: from } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } }, total: { $sum: '$total' } } },
    ]);
    res.json({ days, totals: Object.fromEntries(rows.map((r) => [r._id, Math.round(r.total * 100) / 100])) });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Could not load sales' });
  }
});

// Issues a bill from { items: [{ item_id, quantity }], description }. Names, prices and the total
// come from the user's current products, never from the client.
router.post('/', async (req, res) => {
  const { value: lines, error } = validateLines(req.body?.items);
  if (error) return res.status(400).json({ message: error });
  if (!lines.length) return res.status(400).json({ message: 'The bill has no items' });

  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  if (description.length > MAX_DESCRIPTION) {
    return res.status(400).json({ message: `Description must be at most ${MAX_DESCRIPTION} characters` });
  }

  const products = await Product.find({ owner: req.userId, itemId: { $in: lines.map((l) => l.item_id) } });
  const { items, total } = buildBill(products, lines);
  if (items.length !== new Set(lines.map((l) => l.item_id)).size) {
    return res.status(400).json({ message: 'Some items on the bill are no longer in your inventory' });
  }

  try {
    const last = await Bill.findOne({ owner: req.userId }).sort({ billNumber: -1 }).select('billNumber');
    const bill = await Bill.create({
      owner: req.userId,
      billNumber: (last?.billNumber || 0) + 1,
      description: description || items.map((i) => i.item_name).join(', ').slice(0, MAX_DESCRIPTION),
      items: items.map((i) => ({ itemId: i.item_id, itemName: i.item_name, price: i.price, quantity: i.quantity, unit: i.unit, amount: i.amount })),
      total,
    });
    res.status(201).json({ bill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not save the bill' });
  }
});

export default router;
