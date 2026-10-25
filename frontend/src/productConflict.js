import { perUnit } from './units.js';

const normalizeName = (name = '') => name.trim().replace(/\s+/g, ' ').toLowerCase();

export const formatPrice = (price, unit = 'pc') => `₹${Number(price).toFixed(2)}${perUnit(unit)}`;

// Mirrors the check in POST /api/products: returns { code, existing } when a product with the same name
// is already in the inventory, preferring one at the same price. Returns null otherwise.
export function findConflict(products, item) {
  const name = normalizeName(item.item_name);
  const matches = products.filter((p) => normalizeName(p.item_name) === name).sort((a, b) => a.id - b.id);
  if (!name || !matches.length) return null;

  const price = Number(item.price);
  const unit = item.unit || 'pc';
  const same = matches.find((p) => p.price === price && (p.unit || 'pc') === unit);
  return { code: same ? 'DUPLICATE_PRODUCT' : 'PRICE_MISMATCH', existing: same || matches[0] };
}

// The same shape from a 409 thrown by api(), for when the local product list was out of date
export const conflictFromError = (err) =>
  err.status === 409 && err.data?.existing ? { code: err.data.code, existing: err.data.existing } : null;

// PUT body for "Update price": keeps the existing name, and its description unless a new one was entered
export const priceUpdateBody = (existing, item) => ({
  item_name: existing.item_name,
  description: item.description?.trim() || existing.description,
  price: item.price,
  unit: item.unit || 'pc',
});
