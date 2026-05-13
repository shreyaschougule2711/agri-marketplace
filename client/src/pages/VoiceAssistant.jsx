import { useState, useRef } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';

export default function VoiceAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '🌾 Namaste! I am your AgriConnect AI assistant. Ask me about crop prices, demand, weather, or say "help" to see what I can do. You can type or use the microphone!' }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [sending, setSending] = useState(false);
  const chatRef = useRef();

  const sendQuery = async (text) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const data = await api.voiceQuery(text, selectedLang);
      setMessages(m => [...m, { role: 'assistant', text: data.response }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: '⚠️ Sorry, I could not process that. Please try again.' }]);
    }
    setSending(false);
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      // Fallback: simulate
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        const queries = ['tomato price today', 'which crops in demand', 'today weather', 'help'];
        const q = queries[Math.floor(Math.random() * queries.length)];
        sendQuery(q);
      }, 2000);
      return;
    }

    if (isRecording) { setIsRecording(false); return; }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'mr' ? 'mr-IN' : selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'te' ? 'te-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsRecording(true);
    recognition.start();

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setIsRecording(false);
      sendQuery(text);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
  };

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="fade-in">
          <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>🎤 AI Voice Assistant</h1>
          <p className="text-muted" style={{ marginBottom: 24 }}>Ask questions in your language — powered by backend NLP</p>

          <div className="flex gap-md" style={{ marginBottom: 24 }}>
            <select className="form-input" value={selectedLang} onChange={e => setSelectedLang(e.target.value)} style={{ width: 180 }}>
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 हिन्दी</option>
              <option value="mr">🇮🇳 मराठी</option>
              <option value="ta">🇮🇳 தமிழ்</option>
              <option value="te">🇮🇳 తెలుగు</option>
            </select>
            <span className="badge badge-info">Connected to Backend API</span>
          </div>

          <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div className="voice-container">
              <button className={`voice-btn ${isRecording ? 'recording' : ''}`} onClick={toggleRecording}>
                {isRecording ? '⏹️' : '🎤'}
              </button>
              <p style={{ color: isRecording ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 500 }}>
                {isRecording ? '🔴 Listening... Speak now' : 'Tap to speak'}
              </p>
            </div>

            <div ref={chatRef} style={{ maxHeight: 400, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '12px 16px', borderRadius: 12,
                    background: m.role === 'user' ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'var(--bg)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                    whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: 1.5
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && <div style={{ display: 'flex' }}><div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Thinking...</div></div>}
            </div>

            <div className="flex gap-sm" style={{ marginTop: 16 }}>
              <input className="form-input" style={{ flex: 1 }} placeholder="Type your question..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendQuery(input)} disabled={sending} />
              <button className="btn btn-primary" onClick={() => sendQuery(input)} disabled={sending || !input.trim()}>Send</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
