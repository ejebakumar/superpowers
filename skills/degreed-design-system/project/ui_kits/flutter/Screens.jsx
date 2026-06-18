/* eslint-disable */
// Mobile screens: Home, Plan, Maestro chat, Skills.

const MHomeScreen = ({ user, openMaestro }) => (
  <div style={{ background: '#FBFBFB', minHeight: '100%', paddingBottom: 16 }}>
    {/* Hero greeting */}
    <div style={{
      background: 'linear-gradient(160deg, #0062E3 0%, #0854C5 100%)',
      padding: '20px 20px 24px', color: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <MAvatar name={user.name} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ font: '500 12px/1 Inter, sans-serif', opacity: 0.85 }}>Welcome back</div>
          <div style={{ font: '700 16px/1.2 Inter, sans-serif', marginTop: 3 }}>{user.name}</div>
        </div>
        <button style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.16)', border: 'none', position: 'relative' }}>
          <img src="../../assets/icons/bell.svg" width={20} height={20} style={{ filter: 'brightness(0) invert(1)' }} />
          <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#FF7F64', border: '2px solid #0062E3' }} />
        </button>
      </div>
      <div style={{ font: '700 22px/28px Inter, sans-serif', letterSpacing: '-0.01em' }}>
        You're 3 hours from finishing<br />Practical SQL.
      </div>
    </div>

    {/* Maestro CTA */}
    <div style={{ padding: '16px 16px 0' }}>
      <button onClick={openMaestro} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        background: '#fff', border: '1px solid #E2E8EB', borderRadius: 14,
        padding: 14, cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#0F1F2C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="../../assets/logos/maestro-icon.svg" width={22} height={22} style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: '700 14px/1 Inter, sans-serif', color: '#0F1F2C' }}>Ask Maestro</div>
          <div style={{ font: '400 12px/16px Inter, sans-serif', color: '#5B737F', marginTop: 3 }}>What should I learn next?</div>
        </div>
        <MIcon name="chevron-right" size={16} />
      </button>
    </div>

    {/* Continue learning */}
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h2 style={{ margin: 0, font: '700 17px/22px Inter, sans-serif', color: '#0F1F2C' }}>Continue learning</h2>
        <span style={{ font: '590 13px/1 Inter, sans-serif', color: '#0062E3' }}>See all</span>
      </div>
      <MCard padding={0}>
        <div style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 10, background: 'linear-gradient(135deg,#E9F7FE,#D6F0FF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MIcon name="course" size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <MEyebrow>Course · Coursera</MEyebrow>
            <div style={{ font: '590 14px/18px Inter, sans-serif', color: '#0F1F2C', marginTop: 4 }}>Practical SQL for Analysts</div>
            <div style={{ marginTop: 8, height: 5, background: '#E2E8EB', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: '68%', height: '100%', background: '#0062E3' }} />
            </div>
            <div style={{ font: '500 11px/1 Inter, sans-serif', color: '#5B737F', marginTop: 6 }}>68% · 3h left</div>
          </div>
        </div>
      </MCard>
    </div>

    {/* Recommended */}
    <div style={{ padding: '0 16px 16px' }}>
      <h2 style={{ margin: '0 0 10px', font: '700 17px/22px Inter, sans-serif', color: '#0F1F2C' }}>Recommended for you</h2>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -16px', padding: '4px 16px 8px', scrollSnapType: 'x mandatory' }}>
        {[
          { type: 'Pathway', title: 'Become a Staff Engineer', meta: '12h · 8 items', illust: 'mountain-path', bg: '#E9F7FE' },
          { type: 'Course', title: 'Designing Data-Intensive Applications', meta: '6h 40m', illust: 'learning-book', bg: '#FFFAEC' },
          { type: 'Article', title: 'Decisions under uncertainty', meta: '12 min', illust: 'puzzle-cube', bg: '#FFECE8' },
        ].map((c, i) => (
          <div key={i} style={{ flex: '0 0 240px', scrollSnapAlign: 'start' }}>
            <MCard padding={0}>
              <div style={{ height: 130, background: c.bg, borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <img src={`../../assets/illustrations/${c.illust}.png`} style={{ height: 100, maxWidth: '80%', objectFit: 'contain' }} />
                <div style={{ position: 'absolute', top: 10, left: 10, padding: '4px 10px', background: '#0F1F2C', color: '#fff', font: '700 10px/1 Inter, sans-serif', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em' }}>{c.type}</div>
              </div>
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ font: '590 14px/19px Inter, sans-serif', color: '#0F1F2C' }}>{c.title}</div>
                <div style={{ font: '500 11px/1 Inter, sans-serif', color: '#5B737F', marginTop: 6 }}>{c.meta}</div>
              </div>
            </MCard>
          </div>
        ))}
      </div>
    </div>

    {/* Skills due */}
    <div style={{ padding: '0 16px' }}>
      <MCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFECE8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MIcon name="dart" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <MEyebrow color="#C3008D">Skill review</MEyebrow>
            <div style={{ font: '700 15px/1.2 Inter, sans-serif', color: '#0F1F2C', marginTop: 2 }}>3 skills due this week</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {[['React',5],['SQL',3],['Leadership',2]].map(([n, l]) => (
            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 4px 0 10px', background: '#fff', border: '1px solid #C9D3D8', borderRadius: 999, font: '590 12px/1 Inter, sans-serif' }}>
              {n}<span style={{ background: '#0062E3', color: '#fff', padding: '3px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{l}</span>
            </span>
          ))}
        </div>
        <MButton variant="secondary">Start review</MButton>
      </MCard>
    </div>
  </div>
);

const MMaestroScreen = () => {
  const [messages, setMessages] = React.useState([
    { from: 'maestro', text: "Hi Jordan — I'm Maestro. What are you working on?" },
  ]);
  const [input, setInput] = React.useState('');
  const send = (text) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { from: 'me', text }]);
    setInput('');
    setTimeout(() => setMessages(m => [...m, {
      from: 'maestro',
      text: "Got it — here are three picks based on your SQL skill.",
      suggestions: [
        { title: 'Analytics for PMs', meta: 'Pathway · 6h' },
        { title: 'SQL for Decision-Makers', meta: 'Course · 4h' },
      ],
    }]), 500);
  };
  return (
    <div style={{ background: '#FBFBFB', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 16px 12px', background: '#0F1F2C', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="../../assets/logos/maestro-logo.png" width={40} height={40} style={{ borderRadius: 10 }} />
        <div style={{ flex: 1 }}>
          <div style={{ font: '700 16px/1 Inter, sans-serif' }}>Maestro</div>
          <div style={{ font: '500 11px/1.4 Inter, sans-serif', opacity: 0.7, marginTop: 3 }}>Powered by AI</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 16,
              background: m.from === 'me' ? '#0062E3' : '#fff',
              color: m.from === 'me' ? '#fff' : '#0F1F2C',
              border: m.from === 'me' ? 'none' : '1px solid #E2E8EB',
              borderTopRightRadius: m.from === 'me' ? 4 : 16,
              borderTopLeftRadius:  m.from === 'me' ? 16 : 4,
              font: '400 14px/19px Inter, sans-serif',
            }}>{m.text}</div>
            {m.suggestions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {m.suggestions.map((s, j) => (
                  <div key={j} style={{ padding: 10, background: '#fff', border: '1px solid #E2E8EB', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#E9F7FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MIcon name="course" size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: '590 13px/17px Inter, sans-serif', color: '#0F1F2C' }}>{s.title}</div>
                      <div style={{ font: '500 11px/1 Inter, sans-serif', color: '#5B737F', marginTop: 2 }}>{s.meta}</div>
                    </div>
                    <MIcon name="plus" size={14} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: 12, borderTop: '1px solid #E2E8EB', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
          {['Recommend a pathway', 'Plan my week'].map(q => (
            <button key={q} onClick={() => send(q)} style={{ flexShrink: 0, height: 28, padding: '0 12px', background: '#F4F6F7', border: 'none', borderRadius: 999, font: '500 12px/1 Inter, sans-serif', color: '#44515A' }}>{q}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F4F6F7', borderRadius: 12, padding: 4 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="Ask Maestro…" style={{ flex: 1, height: 36, padding: '0 12px', background: 'transparent', border: 'none', outline: 'none', font: '400 14px/1 Inter, sans-serif' }} />
          <button onClick={() => send(input)} style={{ width: 36, height: 36, borderRadius: 10, background: '#0062E3', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="../../assets/icons/arrow-right.svg" width={14} height={14} style={{ filter: 'brightness(0) invert(1)' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

const MProfileScreen = ({ user }) => (
  <div style={{ background: '#FBFBFB', minHeight: '100%', padding: '16px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 24px' }}>
      <MAvatar name={user.name} size={88} />
      <div style={{ font: '700 20px/1 Inter, sans-serif', color: '#0F1F2C', marginTop: 14 }}>{user.name}</div>
      <div style={{ font: '500 13px/1 Inter, sans-serif', color: '#5B737F', marginTop: 6 }}>Senior Data Analyst</div>
      <div style={{ display: 'flex', gap: 32, marginTop: 18 }}>
        {[['12','Pathways'],['46','Skills'],['183h','Learned']].map(([n,l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ font: '700 20px/1 Inter, sans-serif', color: '#0F1F2C' }}>{n}</div>
            <div style={{ font: '500 11px/1 Inter, sans-serif', color: '#5B737F', marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
    <MCard padding={0}>
      {[
        ['gear', 'Account settings'],
        ['bell', 'Notifications'],
        ['award', 'Achievements'],
        ['info', 'Help & support'],
      ].map(([icon, label], i, arr) => (
        <div key={label} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: i < arr.length - 1 ? '1px solid #F4F6F7' : 'none' }}>
          <MIcon name={icon} size={20} />
          <div style={{ flex: 1, font: '590 14px/1 Inter, sans-serif', color: '#0F1F2C' }}>{label}</div>
          <MIcon name="chevron-right" size={14} />
        </div>
      ))}
    </MCard>
  </div>
);

Object.assign(window, { MHomeScreen, MMaestroScreen, MProfileScreen });
