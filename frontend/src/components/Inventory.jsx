import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DeleteIcon, EditIcon } from './icons.jsx';
import PriceInput from './PriceInput.jsx';
import PriceConflictModal from './PriceConflictModal.jsx';
import { perUnit } from '../units.js';
import { conflictFromError, findConflict, priceUpdateBody } from '../productConflict.js';

const emptyForm = { item_name: '', description: '', price: '', unit: 'pc' };

export default function Inventory() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newProduct, setNewProduct] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  // Same-name product found while adding; the user decides what to do before anything is saved
  const [conflict, setConflict] = useState(null);
  // The same when a row is renamed to another product's name
  const [editConflict, setEditConflict] = useState(null);
  // Row being edited: changes live only in `draft` until "Save changes" is pressed
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadProducts = () =>
    api('/products', { token })
      .then((data) => setProducts(data.products))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadProducts();
    // The assistant panel announces when it has added a product
    window.addEventListener('products-changed', loadProducts);
    return () => window.removeEventListener('products-changed', loadProducts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const saveNewProduct = async (allowDuplicate = false) => {
    setError('');
    setAdding(true);
    try {
      const body = allowDuplicate ? { ...newProduct, allow_duplicate: true } : newProduct;
      const { product } = await api('/products', { method: 'POST', body, token });
      setProducts((list) => [...list, product]);
      setNewProduct(emptyForm);
      setConflict(null);
    } catch (err) {
      // The server also checks, in case the list here is out of date
      const serverConflict = conflictFromError(err);
      if (serverConflict) setConflict(serverConflict);
      else setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const addProduct = (e) => {
    e.preventDefault();
    const localConflict = findConflict(products, newProduct);
    if (localConflict) return setConflict(localConflict);
    saveNewProduct();
  };

  const updateExistingPrice = async () => {
    setError('');
    setAdding(true);
    try {
      const { existing } = conflict;
      const { product } = await api(`/products/${existing._id}`, { method: 'PUT', body: priceUpdateBody(existing, newProduct), token });
      setProducts((list) => list.map((p) => (p._id === product._id ? product : p)));
      setNewProduct(emptyForm);
      setConflict(null);
    } catch (err) {
      setConflict(null);
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (product) => {
    setError('');
    setEditingId(product._id);
    setDraft({ item_name: product.item_name, description: product.description, price: String(product.price), unit: product.unit || 'pc' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyForm);
  };

  const saveChanges = async (allowDuplicate = false) => {
    if (!allowDuplicate) {
      const editing = products.find((p) => p._id === editingId);
      const renamed = editing && editing.item_name.trim().toLowerCase() !== draft.item_name.trim().toLowerCase();
      const localConflict = renamed && findConflict(products.filter((p) => p._id !== editingId), draft);
      if (localConflict) return setEditConflict(localConflict);
    }

    setError('');
    setSaving(true);
    try {
      const body = allowDuplicate ? { ...draft, allow_duplicate: true } : draft;
      const { product } = await api(`/products/${editingId}`, { method: 'PUT', body, token });
      setProducts((list) => list.map((p) => (p._id === product._id ? product : p)));
      setEditConflict(null);
      cancelEdit();
    } catch (err) {
      const serverConflict = conflictFromError(err);
      if (serverConflict) setEditConflict(serverConflict);
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.item_name}"?`)) return;
    setError('');
    try {
      await api(`/products/${product._id}`, { method: 'DELETE', token });
      setProducts((list) => list.filter((p) => p._id !== product._id));
      if (editingId === product._id) cancelEdit();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateDraft = (e) => setDraft({ ...draft, [e.target.name]: e.target.value });
  const updateNew = (e) => setNewProduct({ ...newProduct, [e.target.name]: e.target.value });

  return (
    <section className="card inventory">
      <h2>Inventory</h2>
      {error && <div className="error">{error}</div>}

      <form className="add-product" onSubmit={addProduct}>
        <input name="item_name" placeholder="Item name" value={newProduct.item_name} onChange={updateNew} required />
        <textarea name="description" placeholder="Description" rows={1} value={newProduct.description} onChange={updateNew} />
        <PriceInput price={newProduct.price} unit={newProduct.unit} onChange={updateNew} required />
        <button type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add product'}</button>
      </form>

      {conflict && (
        <PriceConflictModal
          conflict={conflict}
          item={newProduct}
          busy={adding}
          onUpdate={updateExistingPrice}
          onAddNew={() => saveNewProduct(true)}
          onClose={() => setConflict(null)}
        />
      )}
      {editConflict && (
        <PriceConflictModal
          conflict={editConflict}
          item={draft}
          busy={saving}
          onAddNew={() => saveChanges(true)}
          addNewLabel="Save as separate product"
          onClose={() => setEditConflict(null)}
        />
      )}

      {loading ? (
        <p className="subtitle">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="subtitle">No products yet. Add your first one above.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Item name</th>
                <th>Description</th>
                <th>Price (₹)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) =>
                editingId === p._id ? (
                  <tr key={p._id}>
                    <td>{p.id}</td>
                    <td><input name="item_name" value={draft.item_name} onChange={updateDraft} /></td>
                    <td><textarea name="description" rows={1} value={draft.description} onChange={updateDraft} /></td>
                    <td><PriceInput price={draft.price} unit={draft.unit} onChange={updateDraft} compact /></td>
                    <td className="actions">
                      <button onClick={() => saveChanges()} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                      <button className="secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={p._id}>
                    <td>{p.id}</td>
                    <td>{p.item_name}</td>
                    <td className="description">{p.description}</td>
                    <td>{p.price.toFixed(2)}<span className="unit-tag">{perUnit(p.unit)}</span></td>
                    <td className="actions">
                      <button className="secondary icon-button" onClick={() => startEdit(p)} disabled={editingId !== null} title="Edit" aria-label={`Edit ${p.item_name}`}><EditIcon /></button>
                      <button className="danger icon-button" onClick={() => deleteProduct(p)} title="Delete" aria-label={`Delete ${p.item_name}`}><DeleteIcon /></button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
