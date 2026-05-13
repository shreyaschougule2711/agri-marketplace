import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MarketPrices from './pages/MarketPrices';
import PricePrediction from './pages/PricePrediction';
import DemandForecast from './pages/DemandForecast';
import VoiceAssistant from './pages/VoiceAssistant';
import SmartMatching from './pages/SmartMatching';
import GroupSelling from './pages/GroupSelling';
import MyCrops from './pages/MyCrops';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/market-prices" element={<ProtectedRoute><MarketPrices /></ProtectedRoute>} />
        <Route path="/price-prediction" element={<ProtectedRoute><PricePrediction /></ProtectedRoute>} />
        <Route path="/demand-forecast" element={<ProtectedRoute><DemandForecast /></ProtectedRoute>} />
        <Route path="/voice-assistant" element={<ProtectedRoute><VoiceAssistant /></ProtectedRoute>} />
        <Route path="/smart-matching" element={<ProtectedRoute><SmartMatching /></ProtectedRoute>} />
        <Route path="/group-selling" element={<ProtectedRoute><GroupSelling /></ProtectedRoute>} />
        <Route path="/my-crops" element={<ProtectedRoute><MyCrops /></ProtectedRoute>} />
      </Routes>
    </>
  );
}
