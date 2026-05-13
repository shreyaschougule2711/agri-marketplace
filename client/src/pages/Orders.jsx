import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const statusColors = { pending: 'badge-warning', confirmed: 'badge-info', shipped: 'badge-info', delivered: 'badge-success', cancelled: 'badge-danger' };

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = () => api.getMyOrders().then(d => { setOrders(d.orders || []); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.updateOrderStatus(id, status);
      showToast(`✅ Order status updated to ${status}`);
      load();
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const total = (orders || []).reduce((a, o) => a + (o.status !== 'cancelled' ? (o.totalAmount || 0) : 0), 0);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="fade-in">
          <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>📦 Orders</h1>
          <p className="text-muted" style={{ marginBottom: 24 }}>Track all your {user?.role === 'farmer' ? 'sales' : user?.role === 'buyer' ? 'purchases' : 'platform orders'}</p>

          {loading ? <div className="spinner" /> : orders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ fontSize: '3rem', marginBottom: 16 }}>📭</p>
              <h3>No Orders Yet</h3>
              <p className="text-muted">{user?.role === 'farmer' ? 'When buyers order your crops, they will appear here.' : 'Place your first order from the Find Crops page.'}</p>
            </div>
          ) : (<>
            <div className="grid-3" style={{ marginBottom: 24 }}>
              <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Total Orders</div><div className="stat-value">{orders.length}</div></div>
              <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Pending</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{orders.filter(o => o.status === 'pending').length}</div></div>
              <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Total Value</div><div className="stat-value">₹{total.toLocaleString()}</div></div>
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Crop</th><th>Qty</th><th>Price</th><th>Total</th><th>{user?.role === 'farmer' ? 'Buyer' : 'Farmer'}</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>#{o.id}</td>
                      <td>{o.cropName}</td>
                      <td>{o.quantity} kg</td>
                      <td>₹{o.pricePerUnit}</td>
                      <td style={{ fontWeight: 600 }}>₹{o.totalAmount?.toLocaleString()}</td>
                      <td>{o.farmerName || o.buyerName}</td>
                      <td><span className={`badge ${statusColors[o.status]}`}>{o.status}</span></td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-sm">
                          {user?.role === 'farmer' && o.status === 'pending' && (<>
                            <button className="btn btn-primary btn-sm" onClick={() => updateStatus(o.id, 'confirmed')}>Confirm</button>
                            <button className="btn btn-danger btn-sm" onClick={() => updateStatus(o.id, 'cancelled')}>Cancel</button>
                          </>)}
                          {user?.role === 'farmer' && o.status === 'confirmed' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(o.id, 'shipped')}>Mark Shipped</button>}
                          {user?.role === 'buyer' && o.status === 'shipped' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(o.id, 'delivered')}>Received</button>}
                          {user?.role === 'buyer' && o.status === 'pending' && <button className="btn btn-danger btn-sm" onClick={() => updateStatus(o.id, 'cancelled')}>Cancel</button>}
                          {user?.role === 'admin' && !['delivered','cancelled'].includes(o.status) && (
                            <select className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }} value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>
                              <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}
        </div>
        {toast && <div className={`toast ${toast.startsWith('✅') ? 'toast-success' : 'toast-error'}`}>{toast}</div>}
      </main>
    </div>
  );
}
