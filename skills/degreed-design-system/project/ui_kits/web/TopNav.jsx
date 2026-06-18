/* eslint-disable */
// Top navigation + collapsible sidebar that mirrors the Fresco in-app chrome.

const TopNav = ({ user, onMaestro, onProfile, query, setQuery }) => (
  <header style={{
    height: 64, background: '#fff', borderBottom: '1px solid #E2E8EB',
    display: 'flex', alignItems: 'center', padding: '0 24px',
    gap: 24, position: 'sticky', top: 0, zIndex: 5,
  }}>
    <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <img src="../../assets/logos/degreed-icon.svg" width={28} height={28} alt="" />
      <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, color: '#0F1F2C' }}>Degreed</span>
    </a>

    <nav style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
      {['Home', 'Pathways', 'Plans', 'Skills', 'Catalog'].map((t, i) => (
        <a key={t} href="#" style={{
          padding: '8px 12px', borderRadius: 8,
          font: '590 14px/1 Inter, sans-serif',
          color: i === 0 ? '#0062E3' : '#44515A',
          background: i === 0 ? '#EDF9FF' : 'transparent',
          textDecoration: 'none',
        }}>{t}</a>
      ))}
    </nav>

    <div style={{ flex: 1, maxWidth: 420, marginLeft: 'auto', position: 'relative' }}>
      <img src="../../assets/icons/magnifying-glass.svg" width={16} height={16}
           style={{ position: 'absolute', left: 12, top: 12, opacity: .55 }} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the catalog…"
        style={{
          width: '100%', height: 40, padding: '0 12px 0 36px',
          background: '#F4F6F7', border: '1px solid transparent',
          borderRadius: 8, font: '400 14px/1 Inter, sans-serif',
          color: '#0F1F2C', outline: 'none',
        }}
        onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#0062E3'; e.target.style.boxShadow = '0 0 0 2px #9DC6FC'; }}
        onBlur={(e) => { e.target.style.background = '#F4F6F7'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
      />
    </div>

    <button onClick={onMaestro} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      height: 40, padding: '0 14px', borderRadius: 9999,
      background: '#0F1F2C', color: '#fff', border: 'none', cursor: 'pointer',
      font: '600 13px/1 Inter, sans-serif',
    }}>
      <img src="../../assets/logos/maestro-icon.svg" width={18} height={18} />
      Ask Maestro
    </button>

    <button style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative' }}>
      <img src="../../assets/icons/bell.svg" width={20} height={20} />
      <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#FF7F64', border: '2px solid #fff' }} />
    </button>

    <button onClick={onProfile} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
      <Avatar name={user.name} size={36} />
    </button>
  </header>
);

Object.assign(window, { TopNav });
