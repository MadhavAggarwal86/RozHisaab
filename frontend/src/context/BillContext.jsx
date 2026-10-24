import { createContext, useContext, useState } from 'react';

const emptyBill = { items: [], total: 0 };
const BillContext = createContext(null);

// The bill being built on the Billing tab. Shared so the assistant can fill it and the page can show it.
export function BillProvider({ children }) {
  const [bill, setBillState] = useState(emptyBill);
  // Earlier versions of the bill, newest last, so "undo" can step back
  const [previous, setPrevious] = useState([]);

  const setBill = (next) => {
    setPrevious((list) => [...list, bill]);
    setBillState(next);
  };

  const undo = () => {
    if (!previous.length) return false;
    setBillState(previous.at(-1));
    setPrevious((list) => list.slice(0, -1));
    return true;
  };

  const removeItem = (itemId) => {
    const items = bill.items.filter((i) => i.item_id !== itemId);
    setBill({ items, total: Math.round(items.reduce((sum, i) => sum + i.amount, 0) * 100) / 100 });
  };

  const clear = () => setBill(emptyBill);

  // After a bill is issued, start fresh; the issued bill can't be undone back into the editor
  const reset = () => {
    setBillState(emptyBill);
    setPrevious([]);
  };

  return (
    <BillContext.Provider value={{ bill, setBill, undo, removeItem, clear, reset }}>{children}</BillContext.Provider>
  );
}

export const useBill = () => useContext(BillContext);
