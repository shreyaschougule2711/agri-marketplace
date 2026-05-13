import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import api from '../services/api';
import Sidebar from '../components/Sidebar';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function DemandForecast() {
  const [forecasts, setForecasts] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDemandForecast().then(d => { setForecasts(d.forecasts); setMessage(d.message || ''); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="layout"><Sidebar /><main className="main-content"><div className="spinner" /></main></div>;

  if (forecasts.length === 0) {
    return (
      <div className="layout"><Sidebar /><main className="main-content"><div className="fade-in">
        <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>📈 Demand Forecasting</h1>
        <div className="card" style={{ textAlign: 'center', padding: 48, marginTop: 24 }}>
          <p style={{ fontSize: '3rem', marginBottom: 16 }}>📭</p>
          <h3>No Forecast Data</h3>
          <p className="text-muted">{message || 'Add market prices and crop listings first. Demand forecasts are generated from real platform data.'}</p>
        </div>
      </div></main></div>
    );
  }

  const chartData = {
    labels: forecasts.map(c => c.crop),
    datasets: [{ label: 'Demand Score', data: forecasts.map(c => c.demandScore), backgroundColor: forecasts.map(c => c.demandScore > 60 ? 'rgba(34,197,94,0.7)' : c.demandScore > 40 ? 'rgba(245,158,11,0.7)' : 'rgba(239,68,68,0.7)'), borderRadius: 6 }]
  };
  const chartOpts = { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { color: '#475569' }, grid: { color: '#1e2235' } }, y: { ticks: { color: '#94a3b8' }, grid: { display: false } } } };

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="fade-in">
          <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>📈 Demand Forecasting</h1>
          <p className="text-muted" style={{ marginBottom: 24 }}>Analysis based on real platform activity and price history</p>

          <div className="chart-container" style={{ marginBottom: 24 }}><div className="chart-header"><h3>Crop Demand Scores</h3></div><Bar data={chartData} options={chartOpts} /></div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Crop</th><th>Demand Score</th><th>Current (₹)</th><th>Predicted (₹)</th><th>Change</th><th>Confidence</th><th>Recommendation</th></tr></thead>
              <tbody>
                {forecasts.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.crop}</td>
                    <td><div className="flex items-center gap-sm"><div className="progress" style={{ width: 80 }}><div className="progress-bar" style={{ width: `${c.demandScore}%`, background: c.demandScore > 60 ? 'var(--success)' : c.demandScore > 40 ? 'var(--warning)' : 'var(--danger)' }} /></div><span>{c.demandScore}%</span></div></td>
                    <td>₹{c.currentPrice}</td>
                    <td>₹{c.predictedPrice}</td>
                    <td><span className={`badge ${c.priceChange >= 0 ? 'badge-success' : 'badge-danger'}`}>{c.priceChange >= 0 ? '↑' : '↓'}{Math.abs(c.priceChange)}%</span></td>
                    <td>{c.confidence}%</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
