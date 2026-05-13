import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: '🎤', title: 'AI Voice Assistant', desc: 'Speak in your regional language. Get instant crop prices, weather updates, and market insights through voice.' },
  { icon: '📈', title: 'Demand Forecasting', desc: 'ML-powered demand prediction using real market data, seasonal trends, and platform activity.' },
  { icon: '💰', title: 'Price Prediction', desc: 'Accurate crop price forecasting based on actual price history tracked by platform administrators.' },
  { icon: '🤝', title: 'Smart Matching', desc: 'AI algorithm connects you with the best buyers or crops based on real profiles, location, and quality.' },
  { icon: '👥', title: 'Group Selling', desc: 'Join farmer groups to sell collectively. Negotiate better prices through bulk deals with verified buyers.' },
  { icon: '📊', title: 'Live Dashboard', desc: 'Real-time analytics with your actual listings, orders, revenue tracking, and market insights.' },
];

const steps = [
  { num: '01', title: 'Register', desc: 'Create your account as a farmer or buyer with your real details and location.' },
  { num: '02', title: 'List or Browse', desc: 'Farmers list crops with price and quality. Buyers search and filter listings.' },
  { num: '03', title: 'Match & Trade', desc: 'AI matches the best buyers/sellers. Place orders, negotiate, and track everything.' },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="fade-in">
      {/* Hero */}
      <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="grid-2" style={{ alignItems: 'center', gap: 48 }}>
          <div>
            <span className="badge badge-success" style={{ fontSize: '0.85rem', marginBottom: 16, display: 'inline-block' }}>🌱 AI-Powered Agricultural Platform</span>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontFamily: 'var(--font-display)', lineHeight: 1.15, marginBottom: 20 }}>
              Empowering Farmers<br />with <span style={{ color: 'var(--primary-light)' }}>Smart Technology</span>
            </h1>
            <p className="text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.7, marginBottom: 32, maxWidth: 500 }}>
              Connect directly with buyers, predict crop prices using real data, get AI voice assistance in your language, and sell collectively for better profits.
            </p>
            <div className="flex gap-md">
              <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn btn-primary btn-lg">{isAuthenticated ? 'Go to Dashboard' : 'Get Started →'}</Link>
              <Link to="/login" className="btn btn-secondary btn-lg">Login</Link>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8rem', animation: 'float 4s ease-in-out infinite' }}>🌾</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 48, fontFamily: 'var(--font-display)' }}>Platform Features</h2>
        <div className="grid-3">
          {features.map((f, i) => (
            <div className="card feature-card" key={i}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>{f.icon}</span>
              <h3 style={{ marginBottom: 8 }}>{f.title}</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '60px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 48, fontFamily: 'var(--font-display)' }}>How It Works</h2>
        <div className="grid-3">
          {steps.map((s, i) => (
            <div className="card" key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>{s.num}</div>
              <h3 style={{ marginBottom: 8 }}>{s.title}</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 600, margin: '0 auto', padding: 48, background: 'linear-gradient(135deg, var(--card), rgba(34,197,94,0.1))' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: 12, fontFamily: 'var(--font-display)' }}>Ready to Transform Your Farming?</h2>
          <p className="text-muted" style={{ marginBottom: 24 }}>Join the platform and start selling smarter today. Real data, real connections, real results.</p>
          <Link to="/register" className="btn btn-primary btn-lg">Create Free Account →</Link>
        </div>
      </section>
    </div>
  );
}
