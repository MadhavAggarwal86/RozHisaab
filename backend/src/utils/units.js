// Units a product can be sold in. A product's price is per one of its unit; bill quantities are stored in that unit.
// Units of the same kind convert by `factor` (relative to the kind's base unit).
const UNITS = {
  pc: { kind: 'count', factor: 1 },
  dozen: { kind: 'count', factor: 12 },
  kg: { kind: 'weight', factor: 1000 },
  g: { kind: 'weight', factor: 1 },
  l: { kind: 'volume', factor: 1000 },
  ml: { kind: 'volume', factor: 1 },
};

export const UNIT_NAMES = Object.keys(UNITS);

// Spellings people (and the model) use for each unit
const ALIASES = {
  pc: ['pc', 'pcs', 'piece', 'pieces', 'unit', 'units', 'nos', 'no', 'packet', 'packets', 'pack'],
  dozen: ['dozen', 'dz', 'doz'],
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'],
  g: ['g', 'gm', 'gms', 'gram', 'grams', 'gr'],
  l: ['l', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters'],
  ml: ['ml', 'mls', 'millilitre', 'millilitres', 'milliliter', 'milliliters'],
};
const LOOKUP = new Map(Object.entries(ALIASES).flatMap(([unit, names]) => names.map((n) => [n, unit])));

// Returns the canonical unit name for a spelling, or null if it isn't recognised
export function normalizeUnit(value) {
  if (typeof value !== 'string') return null;
  return LOOKUP.get(value.trim().toLowerCase().replace(/\.$/, '')) ?? null;
}

// Converts `quantity` from one unit to another. Returns null when the units measure different things (e.g. g → pc).
export function convert(quantity, from, to) {
  const a = UNITS[from];
  const b = UNITS[to];
  if (!a || !b || a.kind !== b.kind) return null;
  return (quantity * a.factor) / b.factor;
}
