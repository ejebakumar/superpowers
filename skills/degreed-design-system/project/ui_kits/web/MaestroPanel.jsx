/* eslint-disable */
// Maestro chat panel — slides in from the right.

const MaestroPanel = ({ open, onClose }) => {
  const [messages, setMessages] = React.useState([
    { from: 'maestro', text: "Hi Jordan — I'm Maestro. I can help you find your next thing to learn, build a plan, or review a skill. What are you working on?" },
  ]);
  const [input, setInput] = React.useState('');

  const send = (text) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { from: 'me', text }]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [...m, {
        from: 'maestro',
        text: "Got it. I think you'd enjoy these three pathways — they build on your current SQL skill and lean into analytics.",
        suggestions: [
          { title: 'Analytics for Product Managers', meta: 'Pathway · 6h' },
          { title: 'SQL for Decision-Makers', meta: 'Course · 4h' },
          { title: 'Storytelling with Data', meta: 'Book · 8h' },
        ],
      }]);
    }, 600);
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 440, background: '#fff',
      boxShadow: '-12px 0 32px rgba(15,31,44,0.10)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50, animation: 'slideIn 200ms ease-out',
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #E2E8EB',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <img src="../../assets/logos/maestro-icon.svg" width={28} height={28} />
        <div style={{ flex: 1 }}>
          <div style={{ font: '700 15px/1 Inter, sans-serif', color: '#0F1F2C' }}>Maestro</div>
          <div style={{ font: '500 12px/1.4 Inter, sans-serif', color: '#1A8244', marginTop: 3 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#28BF65', marginRight: 6 }} />
            Online · powered by AI
          </div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }}>
          <img src="../../assets/icons/cross.svg" width={16} height={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
          }}>
            <div style={{
              padding: '10px 14px', borderRadius: 16,
              background: m.from === 'me' ? '#0062E3' : '#F4F6F7',
              color: m.from === 'me' ? '#fff' : '#0F1F2C',
              borderTopRightRadius: m.from === 'me' ? 4 : 16,
              borderTopLeftRadius:  m.from === 'me' ? 16 : 4,
              font: '400 14px/20px Inter, sans-serif',
            }}>{m.text}</div>
            {m.suggestions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {m.suggestions.map((s, j) => (
                  <div key={j} style={{
                    padding: '12px 14px', background: '#fff',
                    border: '1px solid #E2E8EB', borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#E9F7FE',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <img src="../../assets/icons/course.svg" width={16} height={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: '590 13px/18px Inter, sans-serif', color: '#0F1F2C' }}>{s.title}</div>
                      <div style={{ font: '500 11px/1 Inter, sans-serif', color: '#5B737F', marginTop: 3 }}>{s.meta}</div>
                    </div>
                    <img src="../../assets/icons/plus.svg" width={14} height={14} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #E2E8EB' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {['Recommend a pathway', 'What should I learn next?', 'Help me plan'].map((q) => (
            <button key={q} onClick={() => send(q)} style={{
              padding: '6px 12px', height: 28, background: '#fff',
              border: '1px solid #C9D3D8', borderRadius: 9999,
              font: '500 12px/1 Inter, sans-serif', color: '#44515A', cursor: 'pointer',
            }}>{q}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F4F6F7', borderRadius: 10, padding: '4px 4px 4px 14px' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Ask Maestro anything…"
            style={{ flex: 1, height: 36, background: 'transparent', border: 'none', outline: 'none', font: '400 14px/1 Inter, sans-serif', color: '#0F1F2C' }}
          />
          <button onClick={() => send(input)} style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#0062E3', color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="../../assets/icons/arrow-right.svg" width={14} height={14} style={{ filter: 'brightness(0) invert(1)' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { MaestroPanel });
