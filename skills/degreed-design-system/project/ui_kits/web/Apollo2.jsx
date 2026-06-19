/* eslint-disable */
// Apollo2.jsx — additional components recreated DIRECTLY from source:
//   - Apollo Tailwind plugin (libs/shared/apollo/tailwind/src/components/*)
//   - Fresco Angular modules (libs/shared/fresco/src/lib/modules/**)
//   - LXP UI components (libs/lxp/ui/src/components/**)
// Each component cites the file it was distilled from.

// ─────────────────────────────────────────────────────────────────────────────
// Apollo Buttons (apollo/tailwind/src/components/buttons.ts) — full set:
// primary, destructive, secondary-outline, secondary-filled, tertiary,
// tertiary-neutral, tertiary-destructive, ghost-{purple,neutral,green,yellow,red}.
// Sizes: small (default), medium, large (primary only).
// ─────────────────────────────────────────────────────────────────────────────
const ApolloButton = ({ variant = 'primary', size = 'small', icon, iconOnly, disabled, children, onClick }) => {
  const palette = {
    primary:               { bg: '#0062E3', bgH: '#004FB6', bgA: '#003E8F', fg: '#fff' },
    destructive:           { bg: '#DE0546', bgH: '#B00437', bgA: '#83032A', fg: '#fff' },
    'secondary-outline':   { bg: '#fff',    bgH: '#F4F6F7', bgA: '#E2E8EB', fg: '#353C42', ring: '#C9D3D8' },
    'secondary-filled':    { bg: '#F4F6F7', bgH: '#E2E8EB', bgA: '#C9D3D8', fg: '#353C42' },
    tertiary:              { bg: 'transparent', bgH: '#E5EFFF', bgA: '#CFE0FF', fg: '#0062E3' },
    'tertiary-neutral':    { bg: 'transparent', bgH: '#F4F6F7', bgA: '#E2E8EB', fg: '#353C42' },
    'tertiary-destructive':{ bg: 'transparent', bgH: '#FFE5E9', bgA: '#FFCCD3', fg: '#DE0546' },
    'ghost-purple':        { bg: 'transparent', bgH: '#E2D5FB', bgA: '#C9B0F7', fg: '#3A0E7A' },
    'ghost-neutral':       { bg: 'transparent', bgH: '#E2E8EB', bgA: '#C9D3D8', fg: '#0F1F2C' },
    'ghost-green':         { bg: 'transparent', bgH: '#C7F3D5', bgA: '#9AE7B5', fg: '#0F4823' },
    'ghost-yellow':        { bg: 'transparent', bgH: '#FFF1A8', bgA: '#FFE470', fg: '#5C3F00' },
    'ghost-red':           { bg: 'transparent', bgH: '#FFCCD3', bgA: '#FFA0AC', fg: '#65061B' },
  }[variant];
  const dims =
    size === 'large'  ? { h: 40, px: 16, fs: 14 } :
    size === 'medium' ? { h: 32, px: 16, fs: 12 } :
                        { h: 24, px: 8,  fs: 12 };
  const [hover, setHover] = React.useState(false);
  const bg = disabled ? '#F4F6F7' : hover ? palette.bgH : palette.bg;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        height: dims.h, padding: iconOnly ? 0 : `0 ${dims.px}px`,
        width: iconOnly ? dims.h : 'auto',
        background: bg, color: disabled ? '#7C8B93' : palette.fg,
        border: 'none', borderRadius: 8,
        boxShadow: palette.ring && !disabled ? `0 0 0 1px ${palette.ring}` : 'none',
        font: `600 ${dims.fs}px/16px Inter`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        outline: '2px solid transparent',
        outlineOffset: 2,
        transition: 'background 100ms ease',
      }}>
      {icon && <img src={`../../assets/icons/${icon}.svg`} width={dims.fs + 2} height={dims.fs + 2} alt="" />}
      {!iconOnly && children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Apollo Badges (apollo/tailwind/src/components/badges.ts) — danger / accent /
// success / warning. 24px height, uppercase, 1px ring + tinted bg.
// ─────────────────────────────────────────────────────────────────────────────
const ApolloBadge = ({ variant = 'accent', children }) => {
  const palette = {
    danger:  { bg: '#FFE5E9', fg: '#65061B', ring: '#FFA0AC' },
    accent:  { bg: '#F4ECFE', fg: '#3A0E7A', ring: '#C9B0F7' },
    success: { bg: '#E5FAEC', fg: '#0F4823', ring: '#9AE7B5' },
    warning: { bg: '#FFFDE7', fg: '#5C3F00', ring: '#FFE470' },
  }[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 24, padding: '0 8px', borderRadius: 9999,
      background: palette.bg, color: palette.fg,
      boxShadow: `0 0 0 1px ${palette.ring}`,
      font: '800 12px/16px Inter',
      textTransform: 'uppercase', letterSpacing: '0.02em',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>{children}</span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Apollo Checkbox (apollo/tailwind/src/components/checkbox.ts)
// ─────────────────────────────────────────────────────────────────────────────
const ApolloCheckbox = ({ checked, onChange, disabled, children }) => {
  const id = React.useId();
  return (
    <label htmlFor={id} style={{
      display: 'inline-flex', alignItems: 'flex-start', gap: 4,
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? '#5B737F' : '#0F1F2C',
      font: `${checked ? 600 : 400} 14px/20px Inter`,
    }}>
      <input id={id} type="checkbox" checked={!!checked} disabled={disabled}
        onChange={e => onChange?.(e.target.checked)}
        style={{
          appearance: 'none', WebkitAppearance: 'none',
          width: 16, height: 16, marginTop: 2,
          background: checked ? '#0062E3' : '#F4F6F7',
          border: `1px solid ${disabled ? '#A3B5BD' : checked ? '#0062E3' : '#C9D3D8'}`,
          borderStyle: disabled ? 'dashed' : 'solid',
          borderRadius: 3, position: 'relative', cursor: 'inherit',
          backgroundImage: checked
            ? "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E\")"
            : 'none',
          backgroundSize: 'contain',
        }} />
      <span style={{ marginLeft: 4 }}>{children}</span>
    </label>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Apollo Radio (apollo/tailwind/src/components/radios.ts)
// ─────────────────────────────────────────────────────────────────────────────
const ApolloRadio = ({ name, value, checked, onChange, disabled, children }) => {
  const id = React.useId();
  return (
    <label htmlFor={id} style={{
      display: 'inline-flex', alignItems: 'flex-start', gap: 4,
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? '#5B737F' : '#0F1F2C',
      font: `${checked ? 600 : 400} 14px/20px Inter`,
    }}>
      <span style={{
        width: 16, height: 16, marginTop: 2, borderRadius: '50%',
        background: '#F4F6F7',
        border: `${checked ? 5 : 1}px solid ${disabled ? '#A3B5BD' : checked ? '#0062E3' : '#C9D3D8'}`,
        borderStyle: disabled ? 'dashed' : 'solid',
        boxSizing: 'border-box', flexShrink: 0,
      }} />
      <input id={id} type="radio" name={name} value={value}
        checked={!!checked} disabled={disabled} onChange={() => onChange?.(value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      <span style={{ marginLeft: 4 }}>{children}</span>
    </label>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// df-button (Fresco button-basic) — Fresco-styled button for the in-product
// surfaces. Variants: primary, secondary, tag, danger, destructive, passive,
// ghost, clear. Sizes: default, small, extra-small, square.
// Source: fresco/forms/buttons/components/button-basic
// ─────────────────────────────────────────────────────────────────────────────
const DfButton = ({ variant = 'primary', size = 'default', square, disabled, inactive, children, onClick }) => {
  const palette = {
    primary:     { bg: '#0062E3', fg: '#fff',     border: '#0062E3', bgH: '#004FB6' },
    secondary:   { bg: '#fff',    fg: '#0F1F2C',  border: '#C9D3D8', bgH: '#F4F6F7' },
    tag:         { bg: '#F4F6F7', fg: '#0F1F2C',  border: '#C9D3D8', bgH: '#E2E8EB' },
    danger:      { bg: '#DE0546', fg: '#fff',     border: '#DE0546', bgH: '#B00437' },
    destructive: { bg: '#fff',    fg: '#DE0546',  border: '#DE0546', bgH: '#FFE5E9' },
    passive:     { bg: '#F4F6F7', fg: '#5B737F',  border: '#E2E8EB', bgH: '#E2E8EB' },
    ghost:       { bg: 'transparent', fg: '#0062E3', border: 'transparent', bgH: '#E5EFFF' },
    clear:       { bg: 'transparent', fg: '#0F1F2C', border: 'transparent', bgH: '#F4F6F7' },
  }[variant];
  const dims =
    size === 'extra-small' ? { h: 32, px: 12, fs: 13 } :
    size === 'small'       ? { h: 40, px: 16, fs: 14 } :
                             { h: 48, px: 20, fs: 14 };
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} disabled={disabled || inactive}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        height: dims.h, padding: square ? 0 : `0 ${dims.px}px`,
        width: square ? dims.h : 'auto',
        background: disabled ? '#F4F6F7' : hover ? palette.bgH : palette.bg,
        color: disabled ? '#A3B5BD' : palette.fg,
        border: `1px solid ${disabled ? '#E2E8EB' : palette.border}`,
        borderRadius: 6, font: `600 ${dims.fs}px/1 Inter`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: inactive ? 0.6 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>{children}</button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// df-button-action (Fresco) — pill button with icon + label, has "active" state.
// Used for follow / save / share. Source: fresco/forms/buttons/button-action
// ─────────────────────────────────────────────────────────────────────────────
const DfButtonAction = ({ icon, active, size = 'small', square, onClick, children }) => {
  const dims =
    size === 'extra-small' ? { h: 32, px: 16 } :
    size === 'medium'      ? { h: 48, px: 28 } :
                             { h: 40, px: 24 };
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        height: dims.h, padding: square ? 0 : `0 ${dims.px}px`,
        width: square ? dims.h : 'auto',
        border: `1px solid ${active ? '#0062E3' : hover ? 'transparent' : '#C9D3D8'}`,
        borderRadius: square ? 3 : 1000,
        background: active ? '#0062E3' : '#fff',
        color: active ? '#fff' : hover ? '#0062E3' : '#5B737F',
        font: '600 14px/1 Inter',
        cursor: 'pointer',
        boxShadow: hover ? '0 6px 20px 0 rgba(15,31,44,0.20)' : 'none',
        transition: 'all 100ms ease-in',
      }}>
      {icon && <img src={`../../assets/icons/${icon}.svg`} width={16} height={16} alt=""
        style={{ filter: active ? 'invert(1) brightness(2)' : undefined }} />}
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// df-input-decorator (Fresco) — wraps an input with prepend/append slots.
// Source: fresco/forms/inputs/components/input-decorator
// ─────────────────────────────────────────────────────────────────────────────
const InputDecorator = ({ prepend, append, prependType = 'default', appendType = 'default',
  value, onChange, placeholder }) => {
  const slot = (kind, content, type) => {
    const base = {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: kind === 'button' ? 0 : '0 12px',
      fontWeight: 500, fontSize: 14, color: '#5B737F',
      borderTop: '1px solid #C9D3D8', borderBottom: '1px solid #C9D3D8',
      [kind === 'prepend' ? 'borderLeft' : 'borderRight']: '1px solid #C9D3D8',
      background: type === 'well' ? 'rgba(15,31,44,0.03)' : '#fff',
      borderTopLeftRadius: kind === 'prepend' ? 6 : 0,
      borderBottomLeftRadius: kind === 'prepend' ? 6 : 0,
      borderTopRightRadius: kind === 'append' ? 6 : 0,
      borderBottomRightRadius: kind === 'append' ? 6 : 0,
      minWidth: type === 'well' ? 48 : 'auto',
    };
    return <div style={base}>{content}</div>;
  };
  return (
    <div style={{ display: 'flex', height: 48, borderRadius: 6 }}>
      {prepend && slot('prepend', prepend, prependType)}
      <input value={value || ''} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
        style={{
          flex: 1, height: 48, padding: '0 12px', boxSizing: 'border-box',
          border: '1px solid #C9D3D8', borderLeft: prepend ? 'none' : '1px solid #C9D3D8',
          borderRight: append ? 'none' : '1px solid #C9D3D8',
          borderTopLeftRadius: prepend ? 0 : 6, borderBottomLeftRadius: prepend ? 0 : 6,
          borderTopRightRadius: append ? 0 : 6, borderBottomRightRadius: append ? 0 : 6,
          font: '400 14px/1 Inter', outline: 'none', minWidth: 0,
        }} />
      {append && slot('append', append, appendType)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// df-label-marker (Fresco) — small subdued helper marker used on form labels.
// Source: fresco/forms/label-marker
// ─────────────────────────────────────────────────────────────────────────────
const LabelMarker = ({ children }) => (
  <span style={{ font: '500 16px/32px Inter', color: 'rgba(15,31,44,0.61)' }}>{children}</span>
);

// ─────────────────────────────────────────────────────────────────────────────
// df-local-notification (Fresco) — flat tinted notification box.
// Source: fresco/local-notification
// ─────────────────────────────────────────────────────────────────────────────
const LocalNotification = ({ type = 'info', size = 'medium', children }) => {
  const palette = {
    success: { bg: '#E5FAEC', fg: '#0F4823', icon: 'checkmark-circle' },
    warning: { bg: '#FFFDE7', fg: '#5C3F00', icon: 'exclamation-circle' },
    error:   { bg: '#FFE5E9', fg: '#65061B', icon: 'exclamation-circle' },
    info:    { bg: 'rgba(15,31,44,0.08)', fg: '#0F1F2C', icon: 'info' },
  }[type];
  const dims = size === 'small' ? { p: '12px 18px', fs: 12, gap: 6 } : { p: '18px 24px', fs: 14, gap: 12 };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: dims.gap,
      padding: dims.p, borderRadius: 6,
      background: palette.bg, color: palette.fg,
    }}>
      <img src={`../../assets/icons/${palette.icon}.svg`} width={16} height={16} alt={type} />
      <p style={{ margin: 0, font: `500 ${dims.fs}px/1.5 Inter` }}>{children}</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// df-spinner (Fresco) — 4-bar rotating CSS spinner. Contexts: container,
// textInput, video, button. Source: fresco/placeholders/spinner
// ─────────────────────────────────────────────────────────────────────────────
const DfSpinner = ({ context = 'default', isSpinning = true }) => {
  if (!isSpinning) return null;
  const sizes = { default: 16, container: 48, video: 48, button: 16, textInput: 16 };
  const sz = sizes[context];
  const bw = context === 'container' || context === 'video' ? 4 : 2;
  return (
    <>
      <style>{`@keyframes dg-ring{to{transform:rotate(360deg)}}`}</style>
      <span style={{ display: 'inline-block', width: sz, height: sz, position: 'relative',
        color: context === 'video' ? '#fff' : '#0062E3' }}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} style={{
            position: 'absolute', inset: 0, width: sz, height: sz, boxSizing: 'border-box',
            border: `${bw}px solid currentcolor`, borderRadius: '50%',
            borderColor: 'currentcolor transparent transparent transparent',
            animation: 'dg-ring 0.85s cubic-bezier(0.5, 0, 0.5, 1) infinite',
            animationDelay: i < 2 ? '-0.25s' : `${-i * 0.1}s`,
          }} />
        ))}
      </span>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// df-popover (Fresco) — small white card, used by tooltips, menus, and dropdowns.
// Source: fresco/popover
// ─────────────────────────────────────────────────────────────────────────────
const Popover = ({ placement = 'bottom', children }) => (
  <div style={{
    position: 'relative', display: 'inline-block', minWidth: 200,
    background: '#fff', border: '1px solid rgba(15,31,44,0.18)',
    borderRadius: 6, boxShadow: '0 1px 2px rgba(15,31,44,0.18)',
    overflow: 'auto',
  }}>
    <div style={{ padding: 12 }}>{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Accordion (Fresco styles/components/_accordion.scss) — cdk-accordion shape
// ─────────────────────────────────────────────────────────────────────────────
const Accordion = ({ items }) => {
  const [open, setOpen] = React.useState(0);
  return (
    <div style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(15,31,44,0.08)', background: '#fff', display: 'block' }}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const isLast = i === items.length - 1;
        return (
          <div key={i} style={{ borderBottom: isLast ? 'none' : '1px solid #E2E8EB' }}>
            <button onClick={() => setOpen(isOpen ? -1 : i)}
              style={{
                width: '100%', padding: '24px 24px', textAlign: 'left',
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                font: '600 15px/22px Inter', color: '#0F1F2C',
              }}>
              <span>{item.title}</span>
              <span style={{ color: 'rgba(15,31,44,0.61)', fontSize: 18, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 150ms' }}>⌃</span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 24px 24px', background: 'rgba(15,31,44,0.03)', font: '400 14px/22px Inter', color: '#44515A' }}>
                <div style={{ paddingTop: 16 }}>{item.body}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton (lxp/ui/components/skeleton) — loading placeholders.
// Source: skeleton.component.html (huge switch over types). Reproducing
// the most common variants: line, block, circle + composed: card, tile, user,
// avatar, group, kpi, formfield, table, list, tag, search-result-card.
// ─────────────────────────────────────────────────────────────────────────────
const SkBase = ({ w, h, r = 8, style }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,#E2E8EB 0%,#F4F6F7 50%,#E2E8EB 100%)',
    backgroundSize: '200% 100%',
    animation: 'sk-shimmer 1.4s ease-in-out infinite',
    ...style,
  }} />
);
const Skeleton = ({ type = 'card', layout = 'basic' }) => {
  const Line = (p) => <SkBase h={12} {...p} />;
  const Block = (p) => <SkBase {...p} />;
  const Circle = ({ size }) => <SkBase w={size} h={size} r={size / 2} />;
  const Card = (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Circle size={32} />
        <div style={{ flex: 1 }}><Line w="75%" /></div>
      </div>
      <div style={{ marginBottom: 16 }}><Line w="58%" /></div>
      {layout === 'image' && <Block w="100%" h={84} style={{ marginBottom: 16 }} />}
      {layout === 'video' && <Block w="100%" h={168} style={{ marginBottom: 16, borderRadius: 12 }} />}
      <div style={{ display: 'grid', gap: 8 }}>
        <Line w="100%" /><Line w="100%" /><Line w="100%" /><Line w="75%" />
      </div>
    </div>
  );
  const Tile = (
    <div style={{ border: '1px solid #E2E8EB', borderRadius: 12, overflow: 'hidden', minHeight: 290 }}>
      {layout === 'video' && <Block w="100%" h={120} r={0} />}
      <div style={{ padding: 16 }}>
        <Line w="20%" /><div style={{ height: 8 }} />
        <Line w="75%" /><div style={{ height: 8 }} />
        <Line w="50%" /><div style={{ height: 8 }} />
        {layout === 'image' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Block w="40%" h={84} />
            <div style={{ flex: 1, display: 'grid', gap: 8 }}>
              <Line /><Line /><Line w="60%" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
  const User = (
    <div style={{ border: '1px solid #E2E8EB', borderRadius: 12, padding: 24, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Circle size={64} /></div>
      <div style={{ display: 'grid', gap: 8, padding: '0 24px' }}>
        <Line w="75%" style={{ marginInline: 'auto' }} /><Line w="58%" style={{ marginInline: 'auto' }} />
      </div>
    </div>
  );
  const Group = (
    <div style={{ border: '1px solid #E2E8EB', borderRadius: 12, padding: '24px 0', textAlign: 'center', minHeight: 256 }}>
      <div style={{ display: 'grid', gap: 8, padding: '0 24px', marginBottom: 16 }}>
        <Line w="75%" style={{ marginInline: 'auto' }} /><Line w="58%" style={{ marginInline: 'auto' }} />
      </div>
      <div style={{ display: 'flex', gap: -6, justifyContent: 'center' }}>
        {[0, 1, 2, 3, 4, 5].map(i => <div key={i} style={{ marginLeft: i ? -6 : 0 }}><Circle size={36} /></div>)}
      </div>
    </div>
  );
  const Kpi = (
    <div style={{ border: '1px solid #E2E8EB', borderRadius: 12, padding: 16, height: 128, display: 'grid', placeContent: 'center', gap: 12 }}>
      <Line w={64} style={{ marginInline: 'auto' }} /><Line w={140} style={{ marginInline: 'auto' }} />
    </div>
  );
  const FormField = <Block w="100%" h={48} r={4} />;
  const TableRow = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '12px 0' }}>
      {[0, 1, 2, 3].map(i => <Line key={i} />)}
    </div>
  );
  const Avatar = <Circle size={32} />;
  const Tag = (
    <div style={{ border: '1px solid #E2E8EB', borderRadius: 12, padding: 24, textAlign: 'center', minHeight: 256 }}>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}><Circle size={74} /></div>
      <div style={{ display: 'grid', gap: 8, padding: '0 24px' }}>
        <Line w="58%" style={{ marginInline: 'auto' }} /><Line w="42%" style={{ marginInline: 'auto' }} />
      </div>
    </div>
  );
  const SearchResult = (
    <div style={{ display: 'flex', gap: 16, padding: '12px 0' }}>
      <Block w={96} h={54} r={6} />
      <div style={{ flex: 1, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', gap: 12 }}><Line w={57} /><Line w={57} /></div>
        <Line w="100%" h={24} /><Line w="100%" /><Line w="54%" />
      </div>
    </div>
  );
  const variants = { card: Card, tile: Tile, user: User, group: Group, kpi: Kpi, formfield: FormField, table: TableRow, avatar: Avatar, tag: Tag, 'search-result-card': SearchResult };
  return (
    <>
      <style>{`@keyframes sk-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {variants[type] || Card}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// dgx-thumbs (lxp/ui) — paired thumbs-up / thumbs-down toggle buttons.
// Source: lxp/ui/components/thumbs
// ─────────────────────────────────────────────────────────────────────────────
const Thumbs = ({ liked, disliked, size = 'default', onLike, onDislike }) => {
  const sz = size === 'large' ? 36 : 28;
  const Btn = ({ active, icon, onClick, label }) => (
    <button onClick={onClick} aria-label={label}
      style={{
        width: sz, height: sz, borderRadius: '50%', border: 'none',
        background: 'transparent', cursor: 'pointer',
        color: active ? '#0062E3' : '#5B737F',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <img src={`../../assets/icons/${icon}.svg`} width={size === 'large' ? 20 : 16} height={size === 'large' ? 20 : 16} alt=""
        style={{ filter: active ? 'invert(28%) sepia(92%) saturate(2076%) hue-rotate(199deg) brightness(95%) contrast(101%)' : undefined }} />
    </button>
  );
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Btn active={liked} icon="thumbs-up" onClick={onLike} label="Like" />
      <Btn active={disliked} icon="thumbs-down" onClick={onDislike} label="Dislike" />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// dgx-action-button (lxp/ui) — pill button, has square/none variants, sizes
// xs/sm/md, secondary tint, compact mode. Source: lxp/ui/components/action-button
// ─────────────────────────────────────────────────────────────────────────────
const ActionButton = ({ icon, active, design = 'pill', size = 'sm', secondary, compact, disabled, children, onClick, ariaPressed }) => {
  const dims =
    size === 'xs' ? { h: 32, px: compact ? 8 : 16 } :
    size === 'md' ? { h: 48, px: compact ? 16 : 28 } :
                    { h: 40, px: compact ? 12 : 24 };
  const [hover, setHover] = React.useState(false);
  const radius = design === 'square' ? 3 : design === 'none' ? 0 : 1000;
  const padding = design === 'square' ? '16px 12px' : `0 ${dims.px}px`;
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={ariaPressed}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: icon && children ? 12 : 0,
        height: design === 'square' ? 'auto' : dims.h,
        padding, lineHeight: design === 'square' ? '1' : `${dims.h}px`,
        background: active ? '#0062E3' : secondary ? 'rgba(15,31,44,0.08)' : design === 'none' ? 'transparent' : '#fff',
        color: active ? '#fff' : hover && design !== 'none' ? '#0062E3' : 'rgba(15,31,44,0.61)',
        border: design === 'none' ? 'none' : `1px solid ${active ? '#0062E3' : hover ? 'transparent' : '#C9D3D8'}`,
        borderRadius: radius,
        font: '600 14px Inter', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
        boxShadow: hover && design !== 'none' ? '0 6px 20px rgba(15,31,44,0.2)' : 'none',
        transition: 'all 100ms ease-in', overflow: 'hidden',
      }}>
      {icon && <img src={`../../assets/icons/${icon}.svg`} width={16} height={16} alt=""
        style={{ filter: active ? 'invert(1) brightness(2)' : undefined }} />}
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// InsightsCard (lxp/ui) — title + description + optional metric + optional image,
// optional clickable. Source: lxp/ui/components/insights-card
// ─────────────────────────────────────────────────────────────────────────────
const InsightsCard = ({ title, description, metricCount, metricLabel, image, footer, link }) => (
  <div tabIndex={link ? 0 : -1} role={link ? 'button' : undefined}
    style={{
      display: 'flex', flexDirection: 'column', borderRadius: 12, background: '#fff',
      paddingLeft: 16, boxShadow: '0 4px 6px -2px rgba(15,31,44,0.06), 0 8px 16px -4px rgba(15,31,44,0.08)',
      cursor: link ? 'pointer' : 'default', minHeight: 144,
    }}>
    <div style={{ display: 'flex', flexGrow: 1, gap: 16, padding: '16px 16px 16px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1 }}>
        <div style={{ display: 'flex' }}>
          <div style={{ flexGrow: 1, paddingRight: 16 }}>
            <h2 style={{ margin: 0, font: '800 16px/24px Inter', color: '#353C42' }}>{title}</h2>
            <p style={{ margin: '4px 0 0', font: '400 12px/18px Inter', color: 'rgba(15,31,44,0.61)' }}>{description}</p>
          </div>
          {metricCount !== undefined && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ font: '700 30px/1 Inter', textAlign: 'center' }}>{metricCount}</div>
              <div style={{ font: '800 11px/1 Inter', textTransform: 'uppercase', color: 'rgba(15,31,44,0.61)', textAlign: 'center', marginTop: -4 }}>{metricLabel}</div>
            </div>
          )}
        </div>
        {footer && <footer style={{ marginTop: 12 }}>{footer}</footer>}
      </div>
      {image && <img src={image} alt="" style={{ aspectRatio: '1 / 1', height: 112, borderRadius: 8, objectFit: 'cover' }} />}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FileUploader (lxp/ui) — drop area with plus icon + label, "compact" + "full".
// Source: lxp/ui/components/file-uploader
// ─────────────────────────────────────────────────────────────────────────────
const FileUploader = ({ template = 'full', label = 'Drag and drop or browse files', helper, sizing }) => {
  const [focused, setFocused] = React.useState(false);
  const compact = template === 'compact';
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: compact ? 'flex-start' : 'center',
        textAlign: compact ? 'left' : 'center',
        padding: compact ? 8 : '64px 24px',
        border: `2px dashed ${focused ? '#0062E3' : '#C9D3D8'}`, borderRadius: 12,
        color: focused ? '#0062E3' : 'rgba(15,31,44,0.61)',
        background: focused ? 'rgba(0,98,227,0.04)' : '#fff',
        cursor: 'pointer', transition: 'all 150ms ease',
      }}
      onClick={() => setFocused(true)} onMouseLeave={() => setFocused(false)}>
        {compact ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(15,31,44,0.08)', alignItems: 'center', justifyContent: 'center', color: '#0062E3', fontSize: 16,
            }}>+</span>
            <span style={{ font: '500 14px Inter' }}>{label}</span>
          </span>
        ) : (
          <div>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: 'rgba(15,31,44,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              color: focused ? '#0062E3' : 'rgba(15,31,44,0.61)', fontSize: 24,
            }}>+</div>
            <div style={{ font: '500 16px Inter' }}>{label}</div>
          </div>
        )}
      </div>
      {helper && <div style={{ marginTop: 4, font: '400 12px Inter', color: 'rgba(15,31,44,0.61)' }}>{helper}</div>}
      {sizing && <div style={{ marginTop: 4, font: '400 12px Inter', color: 'rgba(15,31,44,0.61)' }}>{sizing}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SpinnerButton (Fresco placeholders/spinner-button) — button that flips into
// a spinner state. Used heavily on save / submit actions.
// ─────────────────────────────────────────────────────────────────────────────
const SpinnerButton = ({ isBusy, variant = 'primary', children, onClick, disabled }) => (
  <DfButton variant={variant} disabled={disabled || isBusy} onClick={onClick}>
    {isBusy ? <DfSpinner context="button" /> : null}
    <span style={{ marginLeft: isBusy ? 8 : 0 }}>{isBusy ? 'Saving…' : children}</span>
  </DfButton>
);

// ─────────────────────────────────────────────────────────────────────────────
// FormField — assembled label + InputDecorator + helper + error pattern.
// Pulls together LabelMarker + Fresco input styles for forms.
// ─────────────────────────────────────────────────────────────────────────────
const FormField = ({ label, optional, helper, error, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
      <label style={{ font: '600 14px/22px Inter', color: '#0F1F2C' }}>{label}</label>
      {optional && <LabelMarker>(optional)</LabelMarker>}
    </div>
    {children}
    {helper && !error && <div style={{ marginTop: 4, font: '400 12px Inter', color: '#5B737F' }}>{helper}</div>}
    {error && <div role="alert" style={{ marginTop: 4, font: '400 12px Inter', color: '#DE0546' }}>{error}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Modal — Fresco-styled dialog shell using popover token language.
// Standardized from common usage in fresco's modal patterns.
// ─────────────────────────────────────────────────────────────────────────────
const Modal = ({ open, title, subtitle, children, footer, onClose, size = 'md' }) => {
  if (!open) return null;
  const widths = { sm: 480, md: 640, lg: 800 };
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,31,44,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div role="dialog" aria-modal onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: widths[size], maxHeight: '90vh',
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15,31,44,0.25)',
        }}>
        <header style={{ padding: '24px 24px 16px', borderBottom: '1px solid #E2E8EB' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, font: '700 20px/28px Inter', color: '#0F1F2C' }}>{title}</h2>
              {subtitle && <p style={{ margin: '4px 0 0', font: '400 14px/22px Inter', color: '#44515A' }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Close" style={{
              width: 32, height: 32, border: '1px solid #E2E8EB', borderRadius: 6,
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><img src="../../assets/icons/x-mark.svg" width={14} height={14} alt="" /></button>
          </div>
        </header>
        <div style={{ padding: 24, overflow: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <footer style={{ padding: '16px 24px', borderTop: '1px solid #E2E8EB', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#FBFBFB' }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

Object.assign(window, {
  ApolloButton, ApolloBadge, ApolloCheckbox, ApolloRadio,
  DfButton, DfButtonAction, DfSpinner, SpinnerButton,
  InputDecorator, LabelMarker, FormField,
  LocalNotification, Popover, Accordion, Modal,
  Skeleton, Thumbs, ActionButton, InsightsCard, FileUploader,
});
