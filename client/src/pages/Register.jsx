import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'farmer', phone: '', language: 'en', location: { state: '', district: '', village: '' }, farmSize: '', businessName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return setError('Name, email, and password are required');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    setError('');
    const result = await register(form);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.message || 'Registration failed');
  };

  const u = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const ul = (key, val) => setForm(f => ({ ...f, location: { ...f.location, [key]: val } }));

  const STATES = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: '2.5rem' }}>🌱</span>
          <h1 style={{ fontSize: '1.6rem', marginTop: 8 }}>Create Your Account</h1>
          <p className="text-muted">Join AgriConnect and start trading</p>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group"><label>Full Name *</label><input className="form-input" placeholder="Your full name" value={form.name} onChange={e => u('name', e.target.value)} required /></div>
            <div className="form-group"><label>Email *</label><input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => u('email', e.target.value)} required /></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label>Password *</label><input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => u('password', e.target.value)} required /></div>
            <div className="form-group"><label>Confirm Password *</label><input className="form-input" type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={e => u('confirmPassword', e.target.value)} required /></div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>I am a *</label>
              <select className="form-input" value={form.role} onChange={e => u('role', e.target.value)}>
                <option value="farmer">👨‍🌾 Farmer</option>
                <option value="buyer">🛒 Buyer</option>
              </select>
            </div>
            <div className="form-group"><label>Phone</label><input className="form-input" type="tel" placeholder="Mobile number" value={form.phone} onChange={e => u('phone', e.target.value)} /></div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Language</label>
              <select className="form-input" value={form.language} onChange={e => u('language', e.target.value)}>
                <option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option><option value="ta">தமிழ்</option><option value="te">తెలుగు</option><option value="gu">ગુજરાતી</option><option value="kn">ಕನ್ನಡ</option>
              </select>
            </div>
            <div className="form-group">
              <label>State</label>
              <select className="form-input" value={form.location.state} onChange={e => ul('state', e.target.value)}>
                <option value="">Select state</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label>District</label><input className="form-input" placeholder="Your district" value={form.location.district} onChange={e => ul('district', e.target.value)} /></div>
            <div className="form-group"><label>{form.role === 'farmer' ? 'Village' : 'City'}</label><input className="form-input" placeholder={form.role === 'farmer' ? 'Village name' : 'City name'} value={form.location.village} onChange={e => ul('village', e.target.value)} /></div>
          </div>
          {form.role === 'farmer' && (
            <div className="form-group"><label>Farm Size</label><input className="form-input" placeholder="e.g. 5 acres" value={form.farmSize} onChange={e => u('farmSize', e.target.value)} /></div>
          )}
          {form.role === 'buyer' && (
            <div className="form-group"><label>Business Name</label><input className="form-input" placeholder="Your company/shop name" value={form.businessName} onChange={e => u('businessName', e.target.value)} /></div>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 16 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
