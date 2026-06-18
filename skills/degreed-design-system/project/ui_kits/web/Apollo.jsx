/* eslint-disable */
// Apollo components — direct recreations of components from
// fe-workspace/libs/shared/apollo/angular/src/lib/components/*

// ─────────────────────────────────────────────────────────────────────────────
// Alert (da-alert) — left-border, theme-tinted background, optional buttons.
// Source: components/alert/alert.component.html
// ─────────────────────────────────────────────────────────────────────────────
const Alert = ({ theme = 'info', title, subtitle, items = [], buttons = [], onAction }) => {
  const tones = {
    info:      { bg: '#F4F6F7', fg: '#0F1F2C', border: '#5B737F', icon: 'info' },
    success:   { bg: '#F0FDF4', fg: '#0F4823', border: '#1A8244', icon: 'checkmark-circle' },
    warning:   { bg: '#FFFDE7', fg: '#5C3F00', border: '#A66202', icon: 'exclamation-circle' },
    error:     { bg: '#FFF0F2', fg: '#65061B', border: '#DE0546', icon: 'exclamation-circle' },
    highlight: { bg: '#F4ECFE', fg: '#3A0E7A', border: '#7B2DE6', icon: 'info' },
  }[theme];
  const isComplex = !!(subtitle || items.length || buttons.length);
  return (
    <div role={theme === 'error' || theme === 'warning' ? 'alert' : 'status'}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px 12px 12px',
        borderLeft: `4px solid ${tones.border}`, borderRadius: 8,
        background: tones.bg, color: tones.fg, fontSize: 12,
      }}>
      <img src={`../../assets/icons/${tones.icon}.svg`} width={16} height={16} alt={theme} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: isComplex ? 600 : 500 }}>{title}</div>
        {isComplex && (
          <div style={{ marginTop: 4 }}>
            {subtitle && <div style={{ fontSize: 12, fontWeight: 600 }}>{subtitle}</div>}
            {items.length > 0 && (
              <ul style={{ margin: '4px 0 0 18px', padding: 0, lineHeight: 1.5 }}>
                {items.map((it, i) => <li key={i}>{it.text}</li>)}
              </ul>
            )}
            {buttons.length > 0 && (
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                {buttons.map((b, i) => (
                  <button key={i} onClick={() => onAction?.(b.id)}
                    style={{ background: 'transparent', border: 'none', color: tones.border, font: '600 12px Inter', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                    {b.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar (da-avatar) — sizes ExtraSmall(16) / Small(24) / Medium(32) /
// Large(48) / ExtraLarge(64) / ExtraExtraLarge(112), optional badge.
// Source: components/avatar/avatar.component.{html,ts}
// ─────────────────────────────────────────────────────────────────────────────
const ApolloAvatar = ({ src, alt = '', size = 'sm', badgeIcon, name }) => {
  const sizes = { xs: 16, sm: 24, md: 32, lg: 48, xl: 64, xxl: 112 };
  const px = sizes[size];
  const src = name || alt || '';
  const initials = src.includes(' ')
    ? src.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : src.slice(0, 2).toUpperCase();
  return (
    <div style={{ position: 'relative', width: px, height: px, display: 'inline-flex' }}>
      {src ? (
        <img src={src} alt={alt} style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#F4F6F7' }} />
      ) : (
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: '#F4F6F7', border: '1px solid #C9D3D8',
          color: '#353C42', display: 'flex', alignItems: 'center', justifyContent: 'center',
          font: `700 ${Math.round(px * 0.36)}px Inter`, letterSpacing: '0.02em',
        }}>{initials || <img src="../../assets/icons/person.svg" width={px*0.5} height={px*0.5} alt="" />}</div>
      )}
      {badgeIcon && px >= 32 && (
        <div style={{
          position: 'absolute', right: -2, bottom: 2, width: 16, height: 16, borderRadius: '50%',
          background: '#0F1F2C', border: '1px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={`../../assets/icons/${badgeIcon}.svg`} width={10} height={10} alt="" style={{ filter: 'invert(1) brightness(2)' }} />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb (da-breadcrumb) — neutral-100 background bar, "/" separators.
// Source: components/breadcrumb/breadcrumb.component.html
// ─────────────────────────────────────────────────────────────────────────────
const Breadcrumb = ({ items }) => (
  <nav aria-label="Breadcrumb" style={{ background: '#F4F6F7', padding: '4px 16px', fontSize: 12 }}>
    <ol style={{ display: 'flex', alignItems: 'center', listStyle: 'none', margin: 0, padding: 0, gap: 0 }}>
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <li key={i} style={{ display: 'flex', alignItems: 'center' }}>
            {isLast ? (
              <span aria-current="page" style={{ color: '#0F1F2C', cursor: 'default' }}>{it.label}</span>
            ) : (
              <a href={it.link || '#'} style={{ color: '#0062E3', textDecoration: 'none' }}>{it.label}</a>
            )}
            {!isLast && <span style={{ margin: '0 8px', color: '#5B737F' }}>/</span>}
          </li>
        );
      })}
    </ol>
  </nav>
);

// ─────────────────────────────────────────────────────────────────────────────
// Tabs (da-tabs / da-tab-bar in 'button' mode) — pill-style toggle bar.
// Source: components/tabs/tabs.component.html
// ─────────────────────────────────────────────────────────────────────────────
const Tabs = ({ tabs, active, onChange }) => (
  <div role="tablist" style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#F4F6F7', borderRadius: 9999 }}>
    {tabs.map(t => {
      const isActive = t.id === active;
      return (
        <button key={t.id} role="tab" aria-selected={isActive} onClick={() => onChange(t.id)}
          style={{
            height: 32, padding: '0 16px', borderRadius: 9999, border: 'none', cursor: 'pointer',
            background: isActive ? '#fff' : 'transparent',
            color: isActive ? '#0F1F2C' : '#44515A',
            font: '590 13px/1 Inter',
            boxShadow: isActive ? '0 1px 2px rgba(53,60,66,0.10)' : 'none',
            transition: 'all 100ms ease',
          }}>{t.label}</button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SearchField (da-search-field) — floating-label input with magnifier + clear.
// Source: components/search-field/search-field.component.html
// ─────────────────────────────────────────────────────────────────────────────
const SearchField = ({ label = 'Search', value, onChange, onClear }) => {
  const [focused, setFocused] = React.useState(false);
  const id = React.useId();
  const floated = focused || !!value;
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input id={id} type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder=" "
        style={{
          width: '100%', height: 48, padding: '0 36px 0 36px', boxSizing: 'border-box',
          border: `1px solid ${focused ? '#0062E3' : '#C9D3D8'}`, borderRadius: 8,
          background: '#fff', font: '400 14px/1 Inter', color: '#0F1F2C', outline: 'none',
          transition: 'border-color 120ms ease',
        }} />
      <img src="../../assets/icons/magnifying-glass.svg" width={16} height={16} alt=""
        style={{ position: 'absolute', left: 12, top: 16, opacity: 0.6, pointerEvents: 'none' }} />
      <label htmlFor={id} style={{
        position: 'absolute', left: floated ? 8 : 36, top: floated ? -8 : 14,
        font: floated ? '500 11px/1 Inter' : '400 14px/1 Inter',
        color: focused ? '#0062E3' : '#5B737F', background: '#fff',
        padding: floated ? '0 4px' : 0, transition: 'all 200ms ease',
        pointerEvents: 'none',
      }}>{label}</label>
      {value && (
        <button onClick={onClear} aria-label="Clear"
          style={{ position: 'absolute', right: 8, top: 12, width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="../../assets/icons/x-mark.svg" width={14} height={14} alt="" />
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TextInput (da-text-input) — same floating label, no magnifier.
// Source: components/text-input/text-input.component.html
// ─────────────────────────────────────────────────────────────────────────────
const TextInput = ({ label, value, onChange, error, helper, required, readonly }) => {
  const [focused, setFocused] = React.useState(false);
  const id = React.useId();
  const floated = focused || !!value;
  const invalid = !!error;
  const borderColor = invalid ? '#DE0546' : focused ? '#0062E3' : '#C9D3D8';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input id={id} value={value || ''} readOnly={readonly}
          onChange={e => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder=" "
          style={{
            width: '100%', height: 48, padding: '0 12px', boxSizing: 'border-box',
            border: `1px solid ${borderColor}`, borderRadius: 8,
            background: readonly ? '#F4F6F7' : '#fff',
            font: '400 14px/1 Inter', color: invalid ? '#DE0546' : '#0F1F2C',
            outline: 'none', transition: 'border-color 120ms ease',
          }} />
        <label htmlFor={id} style={{
          position: 'absolute', left: floated ? 8 : 12, top: floated ? -8 : 14,
          font: floated ? '500 11px/1 Inter' : '400 14px/1 Inter',
          color: invalid ? '#DE0546' : focused ? '#0062E3' : '#5B737F',
          background: '#fff', padding: floated ? '0 4px' : 0,
          transition: 'all 200ms ease', pointerEvents: 'none',
        }}>{label}{required && <span style={{ color: '#DE0546' }}> *</span>}</label>
      </div>
      {helper && !error && <div style={{ marginTop: 4, fontSize: 12, color: '#5B737F' }}>{helper}</div>}
      {error && <div role="alert" style={{ marginTop: 4, fontSize: 12, color: '#DE0546' }}>{error}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState (da-empty-state) — circular icon + title + subtitle + actions.
// Source: components/empty-state/empty-state.component.{html,ts}
// ─────────────────────────────────────────────────────────────────────────────
const EmptyState = ({ mode = 'default', title, subtitle, actions = [] }) => {
  const tones = {
    default: { bg: '#F4ECFE', fg: '#7B2DE6', icon: 'star' },
    info:    { bg: '#F4F6F7', fg: '#5B737F', icon: 'info' },
    error:   { bg: '#FFE5E9', fg: '#DE0546', icon: 'exclamation-circle' },
  }[mode];
  return (
    <div role="status" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', minHeight: 320, textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', background: tones.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <img src={`../../assets/icons/${tones.icon}.svg`} width={24} height={24} alt={mode}
          style={{ filter: mode === 'error' ? 'invert(15%) sepia(94%) saturate(7392%) hue-rotate(338deg) brightness(89%) contrast(99%)' : undefined }} />
      </div>
      <h2 style={{ margin: '0 0 8px', font: '600 20px/28px Inter', color: '#0F1F2C' }}>{title}</h2>
      <p style={{ margin: '0 0 24px', font: '400 14px/22px Inter', color: '#44515A', maxWidth: 420 }}>{subtitle}</p>
      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {actions.slice(0, 3).map((a, i) => (
            <Button key={i} variant={a.variant || 'primary'} icon={a.icon} onClick={a.action}>{a.label}</Button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pagination (da-pagination) — first / prev / numbers (1-based, with ellipses) / next / last.
// Source: components/pagination/pagination.component.html
// ─────────────────────────────────────────────────────────────────────────────
const Pagination = ({ page, total, onChange }) => {
  const pages = [];
  const window_ = 1;
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || (p >= page - window_ && p <= page + window_)) pages.push(p);
    else if (pages[pages.length - 1] !== -1) pages.push(-1);
  }
  const NavBtn = ({ glyph, label, target, disabled }) => (
    <li>
      <button disabled={disabled} aria-label={label} onClick={() => !disabled && onChange(target)}
        style={{
          width: 24, height: 24, borderRadius: 8, border: 'none',
          background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
          color: disabled ? '#A3B5BD' : '#0F1F2C',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          font: '600 12px Inter',
        }}>{glyph}</button>
    </li>
  );
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 24px' }}>
      <div style={{ font: '400 12px Inter', color: '#44515A' }}>
        Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total * 10)} of {total * 10}
      </div>
      <ul style={{ display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none', margin: 0, padding: 0 }}>
        <NavBtn glyph="«" label="First" target={1} disabled={page === 1} />
        <NavBtn glyph="‹" label="Previous" target={Math.max(1, page - 1)} disabled={page === 1} />
        {pages.map((p, i) => (
          <li key={i}>
            {p === -1 ? (
              <span style={{ display: 'inline-flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', color: '#5B737F' }}>…</span>
            ) : (
              <button onClick={() => onChange(p)}
                aria-selected={page === p}
                style={{
                  height: 24, padding: '0 8px', borderRadius: 8, border: 'none',
                  background: page === p ? '#E2E8EB' : 'transparent',
                  fontWeight: page === p ? 600 : 400,
                  color: '#0F1F2C', cursor: 'pointer', font: `${page === p ? 600 : 400} 12px Inter`,
                }}>{p}</button>
            )}
          </li>
        ))}
        <NavBtn glyph="›" label="Next" target={Math.min(total, page + 1)} disabled={page === total} />
        <NavBtn glyph="»" label="Last" target={total} disabled={page === total} />
      </ul>
    </nav>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Toast (da-toast) — white card, theme-tinted icon, optional action button.
// Source: components/toast/toast.component.html
// ─────────────────────────────────────────────────────────────────────────────
const Toast = ({ type = 'default', title, message, actionLabel, onAction, onClose }) => {
  const iconColor = {
    default: '#5B737F', info: '#7B2DE6', success: '#1A8244',
    warning: '#A66202', error: '#DE0546',
  }[type];
  const iconName = {
    default: 'info', info: 'info', success: 'checkmark-circle',
    warning: 'exclamation-circle', error: 'exclamation-circle',
  }[type];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4, padding: 16, width: 360,
      background: '#fff', borderRadius: 8,
      boxShadow: '0 20px 25px -5px rgba(53,60,66,0.10), 0 8px 10px -6px rgba(53,60,66,0.10)',
      outline: '1px solid #E2E8EB',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <img src={`../../assets/icons/${iconName}.svg`} width={20} height={20} alt={type} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && <div style={{ font: '590 14px/20px Inter', color: '#0F1F2C', marginBottom: 2 }}>{title}</div>}
          <div style={{ font: '400 12px/18px Inter', color: '#44515A' }}>{message}</div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" style={{ width: 24, height: 24, border: '1px solid #E2E8EB', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="../../assets/icons/x-mark.svg" width={12} height={12} alt="" />
          </button>
        )}
      </div>
      {actionLabel && (
        <div style={{ marginLeft: 32, marginTop: 4 }}>
          <button onClick={onAction} style={{ background: 'transparent', border: 'none', color: '#0062E3', font: '600 13px Inter', cursor: 'pointer', padding: 0 }}>{actionLabel}</button>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { Alert, ApolloAvatar, Breadcrumb, Tabs, SearchField, TextInput, EmptyState, Pagination, Toast });
