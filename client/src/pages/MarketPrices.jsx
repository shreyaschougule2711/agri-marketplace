import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export default function MarketPrices() {
  const { user } = useAuth();
  const [prices, setPrices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ cropName: '', price: '', unit: 'kg', market: '', state: '' });

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };
  const load = () => api.getMarketPrices().then(d => { setPrices(d.prices); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.cropName || !form.price) return showToast('❌ Crop name and price are required');
    try {
      await api.setMarketPrice(form);
      showToast(`✅ ${form.cropName} price updated to ₹${form.price}/${form.unit}`);
      setForm({ cropName: '', price: '', unit: 'kg', market: '', state: '' });
      load();
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const filtered = prices.filter(p => p.cropName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="fade-in">
          <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>🏪 Market Prices</h1>
              <p className="text-muted">{user?.role === 'admin' ? 'Add and update live crop prices' : 'Live prices updated by platform administrators'}</p>
            </div>
            {user?.role === 'admin' && <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add/Update Price</button>}
          </div>

          {showAdd && user?.role === 'admin' && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Set Market Price</h3>
              <div className="grid-3">
                <div className="form-group"><label>Crop Name *</label><input className="form-input" placeholder="e.g. Tomato" value={form.cropName} onChange={e => setForm(f => ({ ...f, cropName: e.target.value }))} /></div>
                <div className="form-group"><label>Price (₹) *</label><input className="form-input" type="number" step="0.01" placeholder="22.50" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
                <div className="form-group"><label>Unit</label><select className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}><option value="kg">per kg</option><option value="quintal">per quintal</option><option value="dozen">per dozen</option><option value="piece">per piece</option></select></div>
                <div className="form-group"><label>Market/Mandi</label><input className="form-input" placeholder="e.g. Pune APMC" value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))} /></div>
                <div className="form-group"><label>State</label><input className="form-input" placeholder="e.g. Maharashtra" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
                <div className="form-group"><label>&nbsp;</label><button className="btn btn-primary btn-block" onClick={handleAdd}>Update Price</button></div>
              </div>
            </div>
          )}

          <input className="form-input" placeholder="🔍 Search crops..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400, marginBottom: 24 }} />

          {loading ? <div className="spinner" /> : prices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ fontSize: '3rem', marginBottom: 16 }}>📭</p>
              <h3>No Market Prices Yet</h3>
              <p className="text-muted">{user?.role === 'admin' ? 'Click "Add/Update Price" to set the first crop price.' : 'Platform admin has not added market prices yet. Check back later.'}</p>
            </div>
          ) : (
            <div className="grid-3">
              {filtered.map((p, i) => (
                <div className="card" key={i}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: '1.1rem' }}>{p.cropName}</h3>
                    {p.market && <span className="text-muted" style={{ fontSize: '0.8rem' }}>📍 {p.market}</span>}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
                    ₹{p.price}<span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>/{p.unit}</span>
                  </div>
                  {p.state && <p className="text-muted" style={{ fontSize: '0.8rem' }}>State: {p.state}</p>}
                  <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>Updated: {new Date(p.updatedAt).toLocaleString()} {p.updatedByName ? `by ${p.updatedByName}` : ''}</p>
                  {user?.role === 'admin' && (
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => { setForm({ cropName: p.cropName, price: p.price, unit: p.unit, market: p.market || '', state: p.state || '' }); setShowAdd(true); }}>✏️ Edit</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
