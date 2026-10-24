import { UNITS } from '../units.js';

const LABELS = { pc: 'piece', kg: 'kg', g: 'gram', l: 'litre', ml: 'ml', dozen: 'dozen' };

// One joined field: "₹ [price] / [unit]". Fires onChange with { target: { name, value } } like a normal input.
export default function PriceInput({ price, unit, onChange, compact = false, required = false }) {
  return (
    <div className={`price-input${compact ? ' compact' : ''}`}>
      <span className="price-prefix">₹</span>
      <input name="price" type="number" min="0" step="0.01" placeholder="Price" value={price ?? ''} onChange={onChange} required={required} />
      <span className="price-divider">/</span>
      <select name="unit" value={unit || 'pc'} onChange={onChange} aria-label="Priced per">
        {UNITS.map((u) => <option key={u} value={u}>{LABELS[u]}</option>)}
      </select>
    </div>
  );
}
