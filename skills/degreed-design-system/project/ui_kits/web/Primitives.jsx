/* eslint-disable */
// Fresco-styled UI primitives — match Apollo + Fresco visual systems.

const Icon = ({ name, size = 16, color = 'currentColor' }) => (
  <img
    src={`../../assets/icons/${name}.svg`}
    width={size}
    height={size}
    alt=""
    style={{ display: 'inline-block', verticalAlign: 'middle', filter: color === 'currentColor' ? undefined : undefined }}
  />
);

const Avatar = ({ name = 'JD', src, size = 32, ring = false }) => {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? '#E2E8EB' : '#0062E3',
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.38),
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: ring ? '0 0 0 2px #fff, 0 0 0 4px #0062E3' : undefined,
      backgroundImage: src ? `url(${src})` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center',
      flexShrink: 0,
    }}>
      {!src && initials}
    </div>
  );
};

const Button = ({ variant = 'primary', size = 'md', icon, children, onClick, full, ...rest }) => {
  const heights = { sm: 32, md: 40, lg: 48 };
  const pads    = { sm: '0 12px', md: '0 16px', lg: '0 20px' };
  const fontSz  = { sm: 13, md: 14, lg: 15 };

  const variants = {
    primary:   { background: '#0062E3', color: '#fff', border: 'none' },
    secondary: { background: '#fff', color: '#0062E3', border: '1px solid #C9D3D8' },
    ghost:     { background: 'transparent', color: '#0062E3', border: 'none' },
    danger:    { background: '#DE0546', color: '#fff', border: 'none' },
    dark:      { background: '#0F1F2C', color: '#fff', border: 'none' },
  };

  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        ...variants[variant],
        height: heights[size], padding: pads[size],
        borderRadius: 8, font: `600 ${fontSz[size]}px/1 Inter, sans-serif`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', transition: 'all 120ms ease',
        width: full ? '100%' : undefined,
      }}
      onMouseEnter={(e) => {
        if (variant === 'primary') e.currentTarget.style.background = '#0854C5';
        if (variant === 'secondary') e.currentTarget.style.background = '#F4F6F7';
        if (variant === 'ghost') e.currentTarget.style.background = '#F4F6F7';
        if (variant === 'dark') e.currentTarget.style.background = '#353C42';
      }}
      onMouseLeave={(e) => { e.currentTarget.style.background = variants[variant].background; }}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
};

const Chip = ({ tone = 'subtle', children }) => {
  const tones = {
    subtle: { bg: '#F4F6F7', fg: '#44515A', border: '#E2E8EB' },
    brand:  { bg: '#E9F7FE', fg: '#0D4A9B', border: 'transparent' },
    success:{ bg: '#F0FDF4', fg: '#1A8244', border: 'transparent' },
    warning:{ bg: '#FFFDE7', fg: '#A66202', border: 'transparent' },
    danger: { bg: '#FFF0F2', fg: '#DE0546', border: 'transparent' },
    coral:  { bg: '#FFECE8', fg: '#C3008D', border: 'transparent' },
    solid:  { bg: '#0062E3', fg: '#fff',    border: 'transparent' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 24, padding: '0 10px',
      borderRadius: 9999,
      background: tones.bg, color: tones.fg, border: `1px solid ${tones.border}`,
      font: '590 12px/1 Inter, sans-serif',
    }}>{children}</span>
  );
};

const SkillChip = ({ name, level }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    height: 32, padding: '0 4px 0 12px',
    background: '#fff', border: '1px solid #C9D3D8', borderRadius: 9999,
    font: '590 13px/1 Inter, sans-serif', color: '#0F1F2C',
  }}>
    {name}
    <span style={{
      background: '#0062E3', color: '#fff',
      padding: '4px 8px', borderRadius: 9999,
      fontSize: 11, fontWeight: 700,
    }}>{level}</span>
  </span>
);

const Card = ({ children, hover = true, padding = 0, style }) => {
  const [h, setH] = React.useState(false);
  return (
    <div
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: '#fff',
        border: `1px solid ${h ? '#C9D3D8' : '#E2E8EB'}`,
        borderRadius: 12,
        boxShadow: h ? '0 4px 6px -1px rgba(53,60,66,0.10), 0 2px 4px -2px rgba(53,60,66,0.05)'
                     : '0 1px 2px rgba(53,60,66,0.08)',
        padding,
        transition: 'all 120ms ease',
        transform: h ? 'translateY(-1px)' : 'none',
        ...style,
      }}
    >{children}</div>
  );
};

const Eyebrow = ({ children, color = '#5B737F' }) => (
  <div style={{
    font: '800 11px/1 Inter, sans-serif',
    textTransform: 'uppercase', letterSpacing: '.04em',
    color,
  }}>{children}</div>
);

const SectionHeader = ({ eyebrow, title, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
    <div>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 style={{ margin: '6px 0 0', font: '700 24px/32px Inter, sans-serif', color: '#0F1F2C', letterSpacing: '-0.005em' }}>{title}</h2>
    </div>
    {action}
  </div>
);

Object.assign(window, { Icon, Avatar, Button, Chip, SkillChip, Card, Eyebrow, SectionHeader });
