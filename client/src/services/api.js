const API = `http://${window.location.hostname}:5000/api`;

function getHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request(method, path, body) {
  const opts = { method, headers: getHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const api = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: (data) => request('POST', '/auth/register', data),
  getMe: () => request('GET', '/auth/me'),
  updateProfile: (data) => request('PUT', '/auth/profile', data),
  getUsers: () => request('GET', '/auth/users'),

  getCrops: (params = '') => request('GET', `/crops${params ? '?' + params : ''}`),
  getMyCrops: () => request('GET', '/crops/my'),
  getCrop: (id) => request('GET', `/crops/${id}`),
  addCrop: (data) => request('POST', '/crops', data),
  updateCrop: (id, data) => request('PUT', `/crops/${id}`, data),
  deleteCrop: (id) => request('DELETE', `/crops/${id}`),
  placeCropOrder: (id, data) => request('POST', `/crops/${id}/order`, data),
  getMyOrders: () => request('GET', '/crops/orders/my'),
  updateOrderStatus: (id, status) => request('PUT', `/crops/orders/${id}/status`, { status }),

  getMarketPrices: () => request('GET', '/crops/market-prices'),
  setMarketPrice: (data) => request('POST', '/crops/market-prices', data),
  getPriceHistory: (crop) => request('GET', `/crops/price-history/${crop}`),

  getPricePrediction: (crop) => request('GET', `/predictions/price/${crop}`),
  getDemandForecast: () => request('GET', '/predictions/demand'),
  voiceQuery: (text, language) => request('POST', '/predictions/voice-query', { text, language }),

  findBuyers: (data) => request('POST', '/matching/find-buyers', data),
  findCrops: (data) => request('POST', '/matching/find-crops', data),

  getGroups: () => request('GET', '/groups'),
  getGroup: (id) => request('GET', `/groups/${id}`),
  createGroup: (data) => request('POST', '/groups', data),
  joinGroup: (id, quantity) => request('POST', `/groups/${id}/join`, { quantity }),
  sendGroupMessage: (id, text) => request('POST', `/groups/${id}/message`, { text }),
  getGroupMessages: (id) => request('GET', `/groups/${id}/messages`),

  getDashboardStats: () => request('GET', '/dashboard/stats'),
};

export default api;
