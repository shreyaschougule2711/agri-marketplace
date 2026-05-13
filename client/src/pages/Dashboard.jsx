import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats().then(d => { setStats(d.stats); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="layout"><Sidebar /><main className="main-content"><div className="spinner" /></main></div>;

  const s = stats || {};

  const farmerCards = [
    { label: 'My Active Listings', value: s.myActiveListings || 0, icon: '🌱' },
    { label: 'My Revenue', value: `₹${(s.myRevenue || 0).toLocaleString()}`, icon: '💰' },
    { label: 'My Orders', value: s.myOrders || 0, icon: '📦', extra: s.pendingOrders > 0 ? `${s.pendingOrders} pending` : null },
    { label: 'My Groups', value: s.myGroups || 0, icon: '👥' },
  ];
  const buyerCards = [
    { label: 'My Orders', value: s.myOrders || 0, icon: '📦', extra: s.pendingOrders > 0 ? `${s.pendingOrders} pending` : null },
    { label: 'Total Spent', value: `₹${(s.mySpent || 0).toLocaleString()}`, icon: '💳' },
    { label: 'Available Crops', value: s.activeCrops || 0, icon: '🌿' },
    { label: 'Active Groups', value: s.activeGroups || 0, icon: '👥' },
  ];
  const adminCards = [
    { label: 'Total Farmers', value: s.totalFarmers || 0, icon: '👨‍🌾' },
    { label: 'Total Buyers', value: s.totalBuyers || 0, icon: '🛒' },
    { label: 'Platform Revenue', value: `₹${(s.revenue || 0).toLocaleString()}`, icon: '📈' },
    { label: 'Market Prices Set', value: s.marketPriceCount || 0, icon: '💲' },
  ];

  const cards = user?.role === 'admin' ? adminCards : user?.role === 'buyer' ? buyerCards : farmerCards;

  const hasActivity = (s.topCrops?.length > 0) || (s.recentOrders?.length > 0);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="fade-in">
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>Welcome, {user?.name} 👋</h1>
            <p className="text-muted">
              {user?.role === 'farmer' ? 'Manage your farm listings and track sales' :
               user?.role === 'buyer' ? 'Browse crops and manage orders' :
               'Platform administration and analytics'}
            </p>
          </div>

          <div className="grid-4" style={{ marginBottom: 32 }}>
            {cards.map((c, i) => (
              <div className="card stat-card" key={i}>
                <div className="flex justify-between items-center">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>{c.label}</span>
                  <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
                </div>
                <div className="stat-value" style={{ color: 'var(--text)' }}>{c.value}</div>
                {c.extra && <div className="stat-change down" style={{ color: 'var(--warning)' }}>⏳ {c.extra}</div>}
              </div>
            ))}
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>⚡ Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {user?.role === 'farmer' ? (<>
                  <Link to="/my-crops" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>🌱 Manage My Crops</Link>
                  <Link to="/voice-assistant" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>🎤 Ask Voice Assistant</Link>
                  <Link to="/price-prediction" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>📊 Price Predictions</Link>
                  <Link to="/group-selling" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>👥 Group Selling</Link>
                  <Link to="/smart-matching" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>🤝 Find Buyers</Link>
                </>) : user?.role === 'buyer' ? (<>
                  <Link to="/market-prices" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>💰 Market Prices</Link>
                  <Link to="/smart-matching" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>🔍 Search Crops</Link>
                  <Link to="/group-selling" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>👥 Farmer Groups</Link>
                  <Link to="/demand-forecast" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>📈 Demand Forecast</Link>
                </>) : (<>
                  <Link to="/market-prices" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>💲 Manage Market Prices</Link>
                  <Link to="/demand-forecast" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>📈 Demand Reports</Link>
                  <Link to="/group-selling" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>👥 Monitor Groups</Link>
                </>)}
              </div>
            </div>

            <div className="card">
              {!hasActivity ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <p style={{ fontSize: '3rem', marginBottom: 12 }}>📭</p>
                  <h3 style={{ marginBottom: 8 }}>No Activity Yet</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                    {user?.role === 'farmer' ? 'Start by adding your crops to the marketplace.' :
                     user?.role === 'buyer' ? 'Browse available crops and place your first order.' :
                     'Set up market prices and monitor platform activity.'}
                  </p>
                </div>
              ) : (<>
                {s.topCrops?.length > 0 && (<>
                  <h3 style={{ marginBottom: 16 }}>📊 Top Crops on Platform</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {s.topCrops.map((c, i) => (
                      <div key={i} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 600 }}>{c.cropName}</span>
                        <span className="text-muted">{c.listings} listings · {c.volume?.toLocaleString()} kg</span>
                      </div>
                    ))}
                  </div>
                </>)}
                {s.recentOrders?.length > 0 && (<>
                  <h3 style={{ marginBottom: 12 }}>📋 Recent Orders</h3>
                  {s.recentOrders.slice(0, 5).map((o, i) => (
                    <div key={i} className="flex justify-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <span>{o.farmerName} → {o.buyerName}: {o.cropName}</span>
                      <span style={{ fontWeight: 600 }}>₹{o.totalAmount?.toLocaleString()} <span className={`badge ${o.status === 'delivered' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>{o.status}</span></span>
                    </div>
                  ))}
                </>)}
              </>)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
