import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const statusColors = { active: 'badge-success', negotiating: 'badge-warning', forming: 'badge-info', sold: 'badge-danger', closed: 'badge-danger' };
const cropIcons = { Tomato: '🍅', Onion: '🧅', Rice: '🌾', Cotton: '🧶', Potato: '🥔', Wheat: '🌾', Soybean: '🫘', Mango: '🥭', Chilli: '🌶️' };

export default function GroupSelling() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [chatGroup, setChatGroup] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [joinQty, setJoinQty] = useState({});
  const [toast, setToast] = useState('');
  const [createForm, setCreateForm] = useState({ groupName: '', cropType: 'Tomato', targetQuantity: '', pricePerUnit: '', description: '' });
  const chatEndRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadGroups = () => api.getGroups().then(d => { setGroups(d.groups); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { loadGroups(); }, []);

  const handleCreate = async () => {
    if (!createForm.groupName || !createForm.targetQuantity) return showToast('Fill in group name and target quantity');
    try {
      await api.createGroup(createForm);
      showToast('✅ Group created successfully!');
      setShowCreate(false);
      setCreateForm({ groupName: '', cropType: 'Tomato', targetQuantity: '', pricePerUnit: '', description: '' });
      loadGroups();
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const handleJoin = async (groupId) => {
    const qty = Number(joinQty[groupId]) || 0;
    if (qty <= 0) return showToast('Enter a valid quantity');
    try {
      const data = await api.joinGroup(groupId, qty);
      showToast('✅ ' + data.message);
      loadGroups();
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const openChat = async (group) => {
    setChatGroup(group);
    try {
      const data = await api.getGroupMessages(group.id);
      setChatMessages(data.messages);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { setChatMessages([]); }
  };

  const sendChat = async () => {
    if (!chatText.trim() || !chatGroup) return;
    try {
      const data = await api.sendGroupMessage(chatGroup.id, chatText);
      setChatMessages(m => [...m, data.message]);
      setChatText('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { showToast('❌ ' + e.message); }
  };

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="fade-in">
          <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>👥 Group Selling</h1>
              <p className="text-muted">Join farmer groups to sell collectively — data saved permanently</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>+ Create Group</button>
          </div>

          {showCreate && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Create New Group</h3>
              <div className="grid-3">
                <div className="form-group"><label>Group Name *</label><input className="form-input" placeholder="e.g. Potato Sellers Indore" value={createForm.groupName} onChange={e => setCreateForm(f => ({ ...f, groupName: e.target.value }))} /></div>
                <div className="form-group"><label>Crop Type</label><select className="form-input" value={createForm.cropType} onChange={e => setCreateForm(f => ({ ...f, cropType: e.target.value }))}>
                  {['Tomato','Onion','Potato','Rice','Wheat','Cotton','Soybean','Mango','Chilli','Turmeric'].map(c => <option key={c}>{c}</option>)}
                </select></div>
                <div className="form-group"><label>Target Quantity (kg) *</label><input className="form-input" type="number" placeholder="5000" value={createForm.targetQuantity} onChange={e => setCreateForm(f => ({ ...f, targetQuantity: e.target.value }))} /></div>
                <div className="form-group"><label>Price Per Unit (₹/kg)</label><input className="form-input" type="number" placeholder="25" value={createForm.pricePerUnit} onChange={e => setCreateForm(f => ({ ...f, pricePerUnit: e.target.value }))} /></div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Description</label><input className="form-input" placeholder="Describe your group..." value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div className="flex gap-sm" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={handleCreate}>Create Group</button>
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Chat Modal */}
          {chatGroup && (
            <div className="card" style={{ marginBottom: 24, border: '1px solid var(--primary)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                <h3>💬 Chat — {chatGroup.groupName}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setChatGroup(null)}>✕ Close</button>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', padding: 12, background: 'var(--bg)', borderRadius: 8, marginBottom: 12 }}>
                {chatMessages.length === 0 && <p className="text-muted text-center">No messages yet. Start the conversation!</p>}
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary-light)', fontSize: '0.85rem' }}>{m.senderName}</span>
                    <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: 8 }}>{new Date(m.timestamp).toLocaleString()}</span>
                    <p style={{ fontSize: '0.9rem', marginTop: 2 }}>{m.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-sm">
                <input className="form-input" style={{ flex: 1 }} placeholder="Type a message..." value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} />
                <button className="btn btn-primary" onClick={sendChat}>Send</button>
              </div>
            </div>
          )}

          {loading ? <div className="spinner" /> : (
            <div className="grid-2">
              {groups.map(g => {
                const isMember = g.members?.some(m => m.userId === user?.id);
                return (
                  <div className="card" key={g.id}>
                    <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                      <div className="flex items-center gap-sm">
                        <span style={{ fontSize: '2rem' }}>{cropIcons[g.cropType] || '🌿'}</span>
                        <div>
                          <h3 style={{ fontSize: '1.05rem' }}>{g.groupName}</h3>
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>📍 {g.district || g.location?.district}, {g.state || g.location?.state}</span>
                        </div>
                      </div>
                      <span className={`badge ${statusColors[g.status]}`}>{g.status}</span>
                    </div>
                    {g.description && <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>{g.description}</p>}
                    <div className="grid-3" style={{ marginBottom: 16 }}>
                      <div><div className="text-muted" style={{ fontSize: '0.75rem' }}>Members</div><div style={{ fontWeight: 700 }}>{g.memberCount}</div></div>
                      <div><div className="text-muted" style={{ fontSize: '0.75rem' }}>Price</div><div style={{ fontWeight: 700 }}>₹{g.pricePerUnit}/kg</div></div>
                      <div><div className="text-muted" style={{ fontSize: '0.75rem' }}>Quantity</div><div style={{ fontWeight: 700 }}>{g.totalQuantity?.toLocaleString()} kg</div></div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div className="flex justify-between" style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                        <span className="text-muted">Progress</span>
                        <span style={{ fontWeight: 600 }}>{g.progress}%</span>
                      </div>
                      <div className="progress"><div className="progress-bar" style={{ width: `${Math.min(g.progress, 100)}%` }} /></div>
                    </div>
                    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                      {!isMember ? (
                        <>
                          <input className="form-input" type="number" placeholder="Qty (kg)" style={{ width: 100, padding: '8px 12px' }} value={joinQty[g.id] || ''} onChange={e => setJoinQty(q => ({ ...q, [g.id]: e.target.value }))} />
                          <button className="btn btn-primary btn-sm" onClick={() => handleJoin(g.id)}>Join Group</button>
                        </>
                      ) : (
                        <span className="badge badge-success">✅ Member</span>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => openChat(g)}>💬 Chat</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
