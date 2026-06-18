/* eslint-disable */
// Mobile primitives matching Degreed Flutter app's visual language.

const MIcon = ({ name, size = 24, color }) => (
  <img src={`../../assets/icons/${name}.svg`} width={size} height={size} alt=""
    style={{ display: 'block', filter: color === '#fff' ? 'brightness(0) invert(1)' : undefined }} />
);

const MAvatar = ({ name = 'JD', size = 36 }) => {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#0062E3', color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.36),
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>{initials}</div>
  );
};

const MButton = ({ variant = 'primary', children, onClick, full = true }) => {
  const styles = {
    primary: { background: '#0062E3', color: '#fff' },
    secondary: { background: '#fff', color: '#0062E3', border: '1.5px solid #0062E3' },
    ghost: { background: 'transparent', color: '#0062E3' },
  }[variant];
  return (
    <button onClick={onClick} style={{
      ...styles, height: 48, padding: '0 20px',
      borderRadius: 12, border: styles.border || 'none',
      font: '600 15px/1 Inter, sans-serif',
      width: full ? '100%' : undefined,
      cursor: 'pointer',
    }}>{children}</button>
  );
};

const MAppBar = ({ title, leading, trailing }) => (
  <div style={{
    height: 56, padding: '0 12px', display: 'flex', alignItems: 'center',
    background: '#fff', borderBottom: '1px solid #E2E8EB',
    position: 'sticky', top: 0, zIndex: 5,
  }}>
    {leading || <button style={{ width: 40, height: 40, border: 'none', background: 'transparent' }}><MIcon name="menu" size={22} /></button>}
    <div style={{ flex: 1, font: '700 17px/1 Inter, sans-serif', color: '#0F1F2C', textAlign: 'left', marginLeft: 4 }}>{title}</div>
    {trailing}
  </div>
);

const MBottomNav = ({ active, setActive }) => {
  const items = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'plan', icon: 'page', label: 'Plan' },
    { id: 'maestro', icon: null, label: 'Maestro' },
    { id: 'skills', icon: 'dart', label: 'Skills' },
    { id: 'profile', icon: 'person', label: 'Profile' },
  ];
  return (
    <div style={{
      height: 64, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid #E2E8EB',
      display: 'flex', alignItems: 'center',
      position: 'sticky', bottom: 0, zIndex: 4,
    }}>
      {items.map((it) => {
        const isActive = active === it.id;
        if (it.id === 'maestro') return (
          <button key={it.id} onClick={() => setActive(it.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 20,
              background: '#0F1F2C', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(15,31,44,0.25)',
            }}>
              <img src="../../assets/logos/maestro-icon.svg" width={22} height={22} style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <span style={{ font: '600 10px/1 Inter, sans-serif', color: '#0F1F2C' }}>Maestro</span>
          </button>
        );
        return (
          <button key={it.id} onClick={() => setActive(it.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            <MIcon name={it.icon} size={22} />
            <span style={{ font: `${isActive ? 700 : 500} 10px/1 Inter, sans-serif`, color: isActive ? '#0062E3' : '#5B737F' }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const MCard = ({ children, padding = 16 }) => (
  <div style={{
    background: '#fff', borderRadius: 12, border: '1px solid #E2E8EB',
    boxShadow: '0 1px 2px rgba(53,60,66,0.06)',
    padding,
  }}>{children}</div>
);

const MEyebrow = ({ children, color = '#5B737F' }) => (
  <div style={{ font: '800 10px/1 Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '.05em', color }}>{children}</div>
);

Object.assign(window, { MIcon, MAvatar, MButton, MAppBar, MBottomNav, MCard, MEyebrow });
