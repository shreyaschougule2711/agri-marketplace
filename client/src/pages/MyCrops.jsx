import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';

export default function MyCrops() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ cropName: '', category: 'vegetable', quantity: '', pricePerUnit: '', quality: 'standard', organic: false, unit: 'kg', description: '' });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const loadCrops = () => api.getMyCrops().then(d => { setCrops(d.crops); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { loadCrops(); }, []);

  const resetForm = () => { setForm({ cropName: '', category: 'vegetable', quantity: '', pricePerUnit: '', quality: 'standard', organic: false, unit: 'kg', description: '' }); setEditId(null); setShowAdd(false); };

  const handleAdd = async () => {
    if (!form.cropName || !form.quantity || !form.pricePerUnit) return showToast('❌ Crop name, quantity, and price are required');
    try {
      await api.addCrop(form);
      showToast('✅ Crop listing added!');
      resetForm();
      loadCrops();
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const handleEdit = (crop) => {
    setEditId(crop.id);
    setForm({ cropName: crop.cropName, category: crop.category, quantity: crop.quantity, pricePerUnit: crop.pricePerUnit, quality: crop.quality, organic: !!crop.organic, unit: crop.unit, description: crop.description || '' });
    setShowAdd(true);
  };

  const handleUpdate = async () => {
    try {
      await api.updateCrop(editId, form);
      showToast('✅ Crop updated!');
      resetForm();
      loadCrops();
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this crop listing?')) return;
    try {
      await api.deleteCrop(id);
      showToast('✅ Crop deleted');
      loadCrops();
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const totalQty = crops.reduce((a, c) => a + c.quantity, 0);
  const totalRev = crops.reduce((a, c) => a + c.quantity * c.pricePerUnit, 0);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="fade-in">
          <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>🌱 My Crop Listings</h1>
              <p className="text-muted">Manage your crops — all data stored permanently in database</p>
            </div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowAdd(!showAdd); }}>+ Add Crop</button>
          </div>

          {showAdd && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>{editId ? 'Edit Crop' : 'Add New Crop'}</h3>
              <div className="grid-3">
                <div className="form-group"><label>Crop Name *</label><input className="form-input" placeholder="e.g. Tomato" value={form.cropName} onChange={e => setForm(f => ({ ...f, cropName: e.target.value }))} /></div>
                <div className="form-group"><label>Category</label><select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}><option value="vegetable">Vegetable</option><option value="fruit">Fruit</option><option value="grain">Grain</option><option value="pulse">Pulse</option><option value="spice">Spice</option><option value="oilseed">Oilseed</option><option value="cash_crop">Cash Crop</option></select></div>
                <div className="form-group"><label>Quality</label><select className="form-input" value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))}><option value="premium">Premium</option><option value="standard">Standard</option><option value="economy">Economy</option></select></div>
                <div className="form-group"><label>Quantity (kg) *</label><input className="form-input" type="number" placeholder="200" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div className="form-group"><label>Price (₹/kg) *</label><input className="form-input" type="number" placeholder="22" value={form.pricePerUnit} onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))} /></div>
                <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}><input type="checkbox" checked={form.organic} onChange={e => setForm(f => ({ ...f, organic: e.target.checked }))} /> 🌿 Organic</label></div>
                <div className="form-group" style={{ gridColumn: 'span 3' }}><label>Description</label><input className="form-input" placeholder="Describe your crop..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div className="flex gap-sm" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={editId ? handleUpdate : handleAdd}>{editId ? 'Update Crop' : 'Add Listing'}</button>
                <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              </div>
            </div>
          )}

          <div className="grid-3" style={{ marginBottom: 24 }}>
            <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Total Listings</div><div className="stat-value">{crops.length}</div></div>
            <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Total Quantity</div><div className="stat-value">{totalQty.toLocaleString()} kg</div></div>
            <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Est. Revenue</div><div className="stat-value">₹{totalRev.toLocaleString()}</div></div>
          </div>

          {loading ? <div className="spinner" /> : crops.length === 0 ? (
            <div className="card text-center" style={{ padding: 48 }}>
              <p style={{ fontSize: '3rem', marginBottom: 16 }}>🌱</p>
              <h3>No crops listed yet</h3>
              <p className="text-muted">Click "Add Crop" to list your first crop for sale</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Crop</th><th>Category</th><th>Quantity</th><th>Price</th><th>Quality</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {crops.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.cropName} {c.organic ? '🌿' : ''}</td>
                      <td><span className="badge badge-info">{c.category}</span></td>
                      <td>{c.quantity?.toLocaleString()} {c.unit}</td>
                      <td style={{ fontWeight: 600 }}>₹{c.pricePerUnit}/{c.unit}</td>
                      <td><span className={`badge ${c.quality === 'premium' ? 'badge-success' : c.quality === 'standard' ? 'badge-warning' : 'badge-danger'}`}>{c.quality}</span></td>
                      <td><span className={`badge ${c.status === 'available' ? 'badge-success' : c.status === 'reserved' ? 'badge-warning' : 'badge-info'}`}>{c.status}</span></td>
                      <td>
                        <div className="flex gap-sm">
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(c)}>✏️ Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {toast && <div className={`toast ${toast.startsWith('✅') ? 'toast-success' : 'toast-error'}`}>{toast}</div>}
      </main>
    </div>
  );
}
