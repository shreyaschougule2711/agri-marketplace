import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export default function SmartMatching() {
  const { user } = useAuth();
  const isFarmer = user?.role !== 'buyer';
  const [crop, setCrop] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const handleSearch = async () => {
    if (!crop.trim()) return showToast('❌ Enter a crop type to search');
    setLoading(true);
    try {
      if (isFarmer) {
        const data = await api.findBuyers({ cropType: crop, quantity: Number(qty) || 100, priceExpected: Number(price) || 20 });
        setResults({ type: 'buyers', items: data.buyers, message: data.message });
      } else {
        const data = await api.findCrops({ cropType: crop, maxPrice: price ? Number(price) : undefined });
        setResults({ type: 'crops', items: data.listings, message: data.message });
      }
    } catch (e) { showToast('❌ ' + e.message); }
    setLoading(false);
  };

  const handleOrder = async (item) => {
    try {
      await api.placeCropOrder(item.id, { quantity: item.quantity });
      showToast(`✅ Order placed for ${item.quantity} ${item.unit || 'kg'} ${item.crop} from ${item.farmerName}!`);
    } catch (e) { showToast('❌ ' + e.message); }
  };

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="fade-in">
          <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>🤝 Smart {isFarmer ? 'Buyer' : 'Crop'} Matching</h1>
          <p className="text-muted" style={{ marginBottom: 24 }}>{isFarmer ? 'Find real buyers registered on the platform' : 'Search actual crop listings from farmers'}</p>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16 }}>🔍 Search</h3>
            <div className="grid-4">
              <div className="form-group"><label>Crop Type *</label><input className="form-input" placeholder="e.g. Tomato" value={crop} onChange={e => setCrop(e.target.value)} /></div>
              <div className="form-group"><label>Quantity (kg)</label><input className="form-input" type="number" placeholder="200" value={qty} onChange={e => setQty(e.target.value)} /></div>
              <div className="form-group"><label>{isFarmer ? 'Expected' : 'Max'} Price (₹/kg)</label><input className="form-input" type="number" placeholder="22" value={price} onChange={e => setPrice(e.target.value)} /></div>
              <div className="form-group"><label>&nbsp;</label><button className="btn btn-primary btn-block" onClick={handleSearch} disabled={loading}>{loading ? 'Searching...' : 'Find Matches'}</button></div>
            </div>
          </div>

          {results && (
            results.items.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</p>
                <h3>No Matches Found</h3>
                <p className="text-muted">{results.message || (isFarmer ? 'No buyers registered yet. Share the platform with potential buyers.' : 'No matching crop listings. Try different search criteria.')}</p>
              </div>
            ) : (
              <div>
                <h3 style={{ marginBottom: 16 }}>🎯 {results.items.length} Match{results.items.length > 1 ? 'es' : ''} Found</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {results.items.map((r, i) => (
                    <div className="card flex justify-between items-center" key={i} style={{ flexWrap: 'wrap', gap: 16 }}>
                      <div className="flex items-center gap-md">
                        <div className={`match-score ${r.matchScore > 80 ? 'match-high' : r.matchScore > 60 ? 'match-mid' : 'match-low'}`}>{r.matchScore}%</div>
                        <div>
                          <h3 style={{ fontSize: '1.05rem' }}>{results.type === 'buyers' ? (r.businessName || r.name) : r.farmerName}</h3>
                          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                            {results.type === 'buyers' ? `${r.type || 'Buyer'} · ${r.location?.state || ''}` : r.location}
                          </p>
                          {results.type === 'buyers' && r.sameDistrict && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>📍 Same District</span>}
                          {results.type === 'buyers' && r.sameState && !r.sameDistrict && <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>📍 Same State</span>}
                        </div>
                      </div>
                      <div className="flex gap-lg items-center" style={{ flexWrap: 'wrap' }}>
                        {results.type === 'crops' && <div style={{ textAlign: 'center' }}><div className="text-muted" style={{ fontSize: '0.75rem' }}>Price</div><div style={{ fontWeight: 700 }}>₹{r.price}/{r.unit || 'kg'}</div></div>}
                        {results.type === 'crops' && <div style={{ textAlign: 'center' }}><div className="text-muted" style={{ fontSize: '0.75rem' }}>Available</div><div style={{ fontWeight: 700 }}>{r.quantity} {r.unit || 'kg'}</div></div>}
                        {results.type === 'crops' && r.organic && <span className="badge badge-success">🌿 Organic</span>}
                        {results.type === 'buyers' && r.orderHistory > 0 && <span className="badge badge-info">{r.orderHistory} past orders</span>}
                        {r.phone && <span className="text-muted" style={{ fontSize: '0.85rem' }}>📞 {r.phone}</span>}
                        {results.type === 'crops' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleOrder(r)}>Place Order</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
        {toast && <div className={`toast ${toast.startsWith('✅') ? 'toast-success' : 'toast-error'}`}>{toast}</div>}
      </main>
    </div>
  );
}
