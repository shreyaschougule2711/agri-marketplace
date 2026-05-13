import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../services/api';
import Sidebar from '../components/Sidebar';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function PricePrediction() {
  const [cropInput, setCropInput] = useState('');
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [knownCrops, setKnownCrops] = useState([]);

  useEffect(() => {
    api.getMarketPrices().then(d => {
      const names = [...new Set(d.prices.map(p => p.cropName))];
      setKnownCrops(names);
      if (names.length > 0) { setSelected(names[0]); fetchPrediction(names[0]); }
    }).catch(() => {});
  }, []);

  const fetchPrediction = (crop) => {
    if (!crop) return;
    setLoading(true);
    setSelected(crop);
    api.getPricePrediction(crop).then(d => { setData(d.prediction); setLoading(false); }).catch(() => setLoading(false));
  };

  if (knownCrops.length === 0 && !loading) {
    return (
      <div className="layout"><Sidebar /><main className="main-content"><div className="fade-in">
        <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>💰 Crop Price Prediction</h1>
        <div className="card" style={{ textAlign: 'center', padding: 48, marginTop: 24 }}>
          <p style={{ fontSize: '3rem', marginBottom: 16 }}>📭</p>
          <h3>No Price Data Available</h3>
          <p className="text-muted">Market prices have not been set yet. Ask your platform admin to add prices first, then predictions will be generated from real data.</p>
        </div>
      </div></main></div>
    );
  }

  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  let chartData = null;
  if (data && !data.noData) {
    const hist = data.historicalPrices || [];
    const fore = data.forecastPrices || [];
    const labels = [...hist.map(h => fmt(h.date)), ...fore.map(f => fmt(f.date))];
    const histPrices = [...hist.map(h => h.price), ...fore.map(() => null)];
    const forePrices = [...hist.map(() => null), ...fore.map(f => f.price)];
    if (hist.length > 0 && fore.length > 0) { histPrices[hist.length] = hist[hist.length - 1].price; forePrices[hist.length - 1] = hist[hist.length - 1].price; }
    chartData = {
      labels,
      datasets: [
        { label: 'Historical Price', data: histPrices, borderColor: '#22c55e', backgroundColor: 'rgba(22,163,74,0.1)', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'Predicted Price', data: forePrices, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, borderDash: [5, 5], tension: 0.3, pointRadius: 0 },
      ]
    };
  }

  const chartOpts = { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#475569', maxTicksLimit: 10 }, grid: { color: '#1e2235' } }, y: { ticks: { color: '#475569', callback: v => '₹' + v }, grid: { color: '#1e2235' } } } };

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="fade-in">
          <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>💰 Crop Price Prediction</h1>
          <p className="text-muted" style={{ marginBottom: 24 }}>Predictions based on real price history from platform database</p>

          <div className="flex gap-sm" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
            {knownCrops.map(c => (
              <button key={c} onClick={() => fetchPrediction(c)} className={`btn ${selected === c ? 'btn-primary' : 'btn-secondary'} btn-sm`}>{c}</button>
            ))}
          </div>
          <div className="flex gap-sm" style={{ marginBottom: 24 }}>
            <input className="form-input" placeholder="Or type a crop name..." value={cropInput} onChange={e => setCropInput(e.target.value)} style={{ maxWidth: 250 }} />
            <button className="btn btn-secondary btn-sm" onClick={() => { if (cropInput.trim()) fetchPrediction(cropInput.trim()); }}>Predict</button>
          </div>

          {loading && <div className="spinner" />}

          {data && !loading && (data.noData ? (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</p>
              <h3>No Data for "{data.crop}"</h3>
              <p className="text-muted">{data.message}</p>
            </div>
          ) : (
            <>
              <div className="grid-4" style={{ marginBottom: 24 }}>
                <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Current Price</div><div className="stat-value" style={{ color: 'var(--text)' }}>₹{data.currentPrice}</div><div className="text-muted" style={{ fontSize: '0.8rem' }}>per kg</div></div>
                <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Predicted (7 day)</div><div className="stat-value" style={{ color: 'var(--accent)' }}>₹{data.predictedPrice}</div><div className={`stat-change ${data.priceChange >= 0 ? 'up' : 'down'}`}>{data.priceChange >= 0 ? '↑' : '↓'} {Math.abs(data.priceChange)}%</div></div>
                <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Confidence</div><div className="stat-value" style={{ color: 'var(--info)' }}>{data.confidence}%</div><div className="text-muted" style={{ fontSize: '0.8rem' }}>{data.dataSource?.includes('Real') ? '✅ Real data' : '⚠️ Limited data'}</div></div>
                <div className="card stat-card"><div className="text-muted" style={{ fontSize: '0.8rem' }}>Recommendation</div><div style={{ fontWeight: 700, fontSize: '0.95rem', color: data.trend === 'up' ? 'var(--success)' : data.trend === 'down' ? 'var(--danger)' : 'var(--warning)', marginTop: 8 }}>{data.recommendation}</div></div>
              </div>

              {chartData && (
                <div className="chart-container" style={{ marginBottom: 24 }}>
                  <div className="chart-header"><h3>Price Trend & Forecast — {data.crop}</h3></div>
                  <Line data={chartData} options={chartOpts} />
                </div>
              )}

              <div className="card">
                <h3 style={{ marginBottom: 16 }}>📊 Analysis Factors</h3>
                <div className="grid-4">
                  {(data.factors || []).map((f, i) => (
                    <div key={i} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{f.name}</div>
                      <span className={`badge ${f.impact === 'positive' ? 'badge-success' : f.impact === 'negative' ? 'badge-danger' : 'badge-warning'}`}>{f.impact}</span>
                      <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>{f.detail}</p>
                    </div>
                  ))}
                </div>
                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 12 }}>📌 Data source: {data.dataSource}</p>
              </div>
            </>
          ))}
        </div>
      </main>
    </div>
  );
}
