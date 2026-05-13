import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const farmerLinks = [
  { section: 'Overview' },
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/my-crops', icon: '🌱', label: 'My Crops' },
  { to: '/orders', icon: '📦', label: 'Orders' },
  { section: 'AI Tools' },
  { to: '/voice-assistant', icon: '🎤', label: 'Voice Assistant' },
  { to: '/price-prediction', icon: '💰', label: 'Price Prediction' },
  { to: '/demand-forecast', icon: '📈', label: 'Demand Forecast' },
  { section: 'Trade' },
  { to: '/market-prices', icon: '🏪', label: 'Market Prices' },
  { to: '/smart-matching', icon: '🤝', label: 'Find Buyers' },
  { to: '/group-selling', icon: '👥', label: 'Group Selling' },
];

const buyerLinks = [
  { section: 'Overview' },
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/orders', icon: '📦', label: 'My Orders' },
  { section: 'Market' },
  { to: '/market-prices', icon: '🏪', label: 'Market Prices' },
  { to: '/smart-matching', icon: '🔍', label: 'Find Crops' },
  { to: '/group-selling', icon: '👥', label: 'Farmer Groups' },
  { section: 'Analytics' },
  { to: '/price-prediction', icon: '💰', label: 'Price Trends' },
  { to: '/demand-forecast', icon: '📈', label: 'Demand Forecast' },
  { to: '/voice-assistant', icon: '🎤', label: 'Voice Assistant' },
];

const adminLinks = [
  { section: 'Overview' },
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { section: 'Management' },
  { to: '/market-prices', icon: '💲', label: 'Market Prices' },
  { to: '/orders', icon: '📦', label: 'All Orders' },
  { to: '/group-selling', icon: '👥', label: 'Groups' },
  { section: 'Analytics' },
  { to: '/price-prediction', icon: '💰', label: 'Price Analysis' },
  { to: '/demand-forecast', icon: '📈', label: 'Demand Analysis' },
  { to: '/voice-assistant', icon: '🎤', label: 'Voice Assistant' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const links = user?.role === 'buyer' ? buyerLinks : user?.role === 'admin' ? adminLinks : farmerLinks;

  return (
    <aside className="sidebar">
      <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Signed in as</p>
        <p style={{ fontWeight: 600 }}>{user?.name}</p>
        <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : user?.role === 'buyer' ? 'badge-info' : 'badge-success'}`} style={{ marginTop: 4 }}>{user?.role}</span>
      </div>
      {links.map((link, i) =>
        link.section ? (
          <div className="sidebar-section" key={i}>{link.section}</div>
        ) : (
          <Link to={link.to} className={`sidebar-link ${location.pathname === link.to ? 'active' : ''}`} key={i}>
            <span>{link.icon}</span> {link.label}
          </Link>
        )
      )}
    </aside>
  );
}
