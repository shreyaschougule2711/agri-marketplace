import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <span style={{ fontSize: '1.6rem' }}>🌾</span> AgriConnect
      </Link>
      <div className="nav-links">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/market-prices" className="nav-link">Prices</Link>
            <Link to="/voice-assistant" className="nav-link">🎤 Voice AI</Link>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0 8px' }}>
              {user?.name} <span className="badge badge-success" style={{ marginLeft: 4 }}>{user?.role}</span>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}
