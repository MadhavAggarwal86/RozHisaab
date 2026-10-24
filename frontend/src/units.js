export const UNITS = ['pc', 'kg', 'g', 'l', 'ml', 'dozen'];

// "0.25 kg" reads better as "250 g" on a bill
export function formatQuantity(quantity, unit = 'pc') {
  const round = (n) => Math.round(n * 1000) / 1000;
  if (unit === 'kg' && quantity < 1) return `${round(quantity * 1000)} g`;
  if (unit === 'l' && quantity < 1) return `${round(quantity * 1000)} ml`;
  return unit === 'pc' ? String(round(quantity)) : `${round(quantity)} ${unit}`;
}

export const perUnit = (unit = 'pc') => (unit === 'pc' ? '' : `/${unit}`);
