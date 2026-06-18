# Accessibility Patterns — WCAG 2.2 AA

Patterns and code examples for WCAG 2.2 AA compliance in the Degreed frontend (Angular + Flutter).

**Standard:** WCAG 2.2 Level AA
**Reference:** https://www.w3.org/WAI/WCAG22/quickref/?levels=aaa

---

## 1. ARIA Label Patterns

### 1.1 Icon-Only Buttons

Buttons with only an icon MUST have an accessible name.

```html
<!-- BAD: No accessible name -->
<button (click)="delete()">
  <dg-icon name="trash"></dg-icon>
</button>

<!-- GOOD: Using sr-only span (preferred) -->
<button (click)="delete()">
  <dg-icon name="trash" aria-hidden="true"></dg-icon>
  <span class="tw-sr-only">Delete item</span>
</button>

<!-- GOOD: Using aria-label -->
<button (click)="delete()" aria-label="Delete item">
  <dg-icon name="trash" aria-hidden="true"></dg-icon>
</button>

<!-- GOOD: Using aria-labelledby (when label exists elsewhere) -->
<span id="delete-label" class="tw-sr-only">Delete item</span>
<button (click)="delete()" aria-labelledby="delete-label">
  <dg-icon name="trash" aria-hidden="true"></dg-icon>
</button>
```

**When to use which:**
- `tw-sr-only` span: Preferred — text is in the DOM, translatable, searchable
- `aria-label`: Quick solution — but not translatable via standard i18n
- `aria-labelledby`: When the label text already exists elsewhere in the DOM

### 1.2 Icon-Only Links

```html
<!-- BAD -->
<a [routerLink]="['/settings']">
  <dg-icon name="gear"></dg-icon>
</a>

<!-- GOOD -->
<a [routerLink]="['/settings']">
  <dg-icon name="gear" aria-hidden="true"></dg-icon>
  <span class="tw-sr-only">Settings</span>
</a>
```

### 1.3 Form Inputs Without Visible Labels

When a visible label isn't possible (e.g., search fields with placeholder only):

```html
<!-- BAD: Placeholder is NOT an accessible name -->
<input type="search" placeholder="Search...">

<!-- GOOD: aria-label provides accessible name -->
<input type="search" placeholder="Search..." aria-label="Search content">

<!-- BETTER: Hidden label (translatable) -->
<label for="search-input" class="tw-sr-only">Search content</label>
<input id="search-input" type="search" placeholder="Search...">
```

### 1.4 Decorative vs Informative Icons

```html
<!-- Decorative icon (next to text): hide from AT -->
<button>
  <dg-icon name="plus" aria-hidden="true"></dg-icon>
  Add New Item
</button>

<!-- Informative icon (conveys meaning): needs alt -->
<span role="img" aria-label="Warning">
  <dg-icon name="warning"></dg-icon>
</span>
Status: Error occurred
```

---

## 2. ARIA Disabled Pattern

**CRITICAL:** Use `aria-disabled` instead of native `disabled` attribute.

### Why?

| Attribute | Focusable | Announced | Clickable | Tooltip Works |
|-----------|-----------|-----------|-----------|---------------|
| `disabled` | NO | "dimmed" | NO | NO |
| `aria-disabled="true"` | YES | "dimmed" | YES (must prevent in code) | YES |

Native `disabled` removes the button from tab order — users can't discover it exists.

### 2.1 Disabled Button Pattern

```html
<!-- BAD: Native disabled -->
<button disabled>Submit</button>

<!-- GOOD: aria-disabled with visual + behavioral handling -->
<button
  [attr.aria-disabled]="isDisabled"
  [class.apo-button--disabled]="isDisabled"
  (click)="!isDisabled && onSubmit()">
  Submit
</button>
```

```typescript
// Component
@Input() isDisabled = false;

onSubmit() {
  if (this.isDisabled) return; // Guard in handler
  // ... submit logic
}
```

```scss
// Styles
.apo-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 2.2 Disabled Link Pattern

```html
<!-- BAD -->
<a [routerLink]="['/next']" [class.disabled]="!canProceed">Next</a>

<!-- GOOD -->
<a
  [routerLink]="canProceed ? ['/next'] : null"
  [attr.aria-disabled]="!canProceed"
  [class.apo-link--disabled]="!canProceed"
  (click)="!canProceed && $event.preventDefault()">
  Next
</a>
```

### 2.3 Disabled Form Field Pattern

```html
<!-- For form fields, native disabled IS acceptable -->
<!-- But if you need the value submitted, use readonly + aria-disabled -->

<input
  [readonly]="isLocked"
  [attr.aria-disabled]="isLocked"
  [value]="lockedValue">
```

---

## 3. Focus Management Patterns

### 3.1 Modal/Dialog Focus Trap

```typescript
// When modal opens
@ViewChild('closeButton') closeButton: ElementRef;
@ViewChild('modalContainer') modalContainer: ElementRef;

private previousFocus: HTMLElement;

open() {
  this.previousFocus = document.activeElement as HTMLElement;
  this.isOpen = true;

  // Move focus into modal after render
  setTimeout(() => {
    this.closeButton.nativeElement.focus();
  });
}

close() {
  this.isOpen = false;

  // Restore focus to trigger element
  this.previousFocus?.focus();
}

// Trap focus within modal
@HostListener('keydown', ['$event'])
onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    this.close();
    return;
  }

  if (event.key === 'Tab') {
    const focusableElements = this.modalContainer.nativeElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }
}
```

```html
<!-- Modal template -->
<div
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  #modalContainer>

  <h2 id="modal-title">{{ title }}</h2>

  <button #closeButton aria-label="Close dialog" (click)="close()">
    <dg-icon name="close" aria-hidden="true"></dg-icon>
  </button>

  <ng-content></ng-content>
</div>
```

### 3.2 Dropdown/Menu Focus

```typescript
// Arrow key navigation in dropdown
@HostListener('keydown', ['$event'])
onKeydown(event: KeyboardEvent) {
  const items = this.menuItems.toArray();
  const currentIndex = items.findIndex(item =>
    item.nativeElement === document.activeElement
  );

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex].nativeElement.focus();
      break;

    case 'ArrowUp':
      event.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex].nativeElement.focus();
      break;

    case 'Escape':
      this.close();
      this.triggerButton.nativeElement.focus();
      break;

    case 'Home':
      event.preventDefault();
      items[0].nativeElement.focus();
      break;

    case 'End':
      event.preventDefault();
      items[items.length - 1].nativeElement.focus();
      break;
  }
}
```

### 3.3 Visible Focus Indicator

```scss
// NEVER remove focus outlines without replacement
// BAD
button:focus { outline: none; }

// GOOD: Custom focus ring
button:focus-visible {
  outline: 2px solid var(--apo-color-focus);
  outline-offset: 2px;
}

// Use Apollo's focus utilities
.apo-focus-ring {
  &:focus-visible {
    @apply tw-ring-2 tw-ring-offset-2 tw-ring-focus;
  }
}
```

---

## 4. Live Region Patterns

For dynamic content that updates without page reload.

### 4.1 Status Messages

```html
<!-- Polite: Announced after current speech -->
<div aria-live="polite" aria-atomic="true" class="tw-sr-only">
  {{ statusMessage }}
</div>

<!-- Assertive: Interrupts current speech (use sparingly) -->
<div aria-live="assertive" aria-atomic="true" class="tw-sr-only">
  {{ errorMessage }}
</div>
```

```typescript
// Update triggers announcement
showSuccess() {
  this.statusMessage = 'Item saved successfully';
}

showError() {
  this.errorMessage = 'Failed to save. Please try again.';
}
```

### 4.2 Loading States

```html
<!-- Loading indicator -->
<div *ngIf="isLoading" role="status" aria-live="polite">
  <dg-spinner aria-hidden="true"></dg-spinner>
  <span class="tw-sr-only">Loading content, please wait...</span>
</div>

<!-- Content loaded -->
<div *ngIf="!isLoading" role="status" aria-live="polite">
  <span class="tw-sr-only">Content loaded</span>
  <!-- actual content -->
</div>
```

### 4.3 Toast/Notification

```html
<div
  role="alert"
  aria-live="assertive"
  class="toast"
  [class.toast--success]="type === 'success'"
  [class.toast--error]="type === 'error'">

  <dg-icon [name]="iconName" aria-hidden="true"></dg-icon>
  <span>{{ message }}</span>

  <button aria-label="Dismiss notification" (click)="dismiss()">
    <dg-icon name="close" aria-hidden="true"></dg-icon>
  </button>
</div>
```

---

## 5. Form Patterns

### 5.1 Required Fields

```html
<!-- BAD: Visual only -->
<label>Name *</label>
<input type="text">

<!-- GOOD: Programmatically required -->
<label for="name">
  Name
  <span aria-hidden="true" class="required-indicator">*</span>
</label>
<input id="name" type="text" required aria-required="true">
```

### 5.2 Error Messages

```html
<!-- Error associated with field -->
<label for="email">Email</label>
<input
  id="email"
  type="email"
  [attr.aria-invalid]="emailError ? 'true' : null"
  [attr.aria-describedby]="emailError ? 'email-error' : null">
<div id="email-error" *ngIf="emailError" role="alert" class="error-message">
  {{ emailError }}
</div>
```

### 5.3 Field Descriptions/Hints

```html
<label for="password">Password</label>
<input
  id="password"
  type="password"
  aria-describedby="password-hint password-error">
<div id="password-hint" class="hint">
  Must be at least 8 characters with one number
</div>
<div id="password-error" *ngIf="passwordError" role="alert" class="error">
  {{ passwordError }}
</div>
```

### 5.4 Autocomplete (WCAG 1.3.5)

```html
<!-- Personal data fields MUST have autocomplete -->
<input type="text" autocomplete="name" name="fullName">
<input type="email" autocomplete="email" name="email">
<input type="tel" autocomplete="tel" name="phone">
<input type="text" autocomplete="street-address" name="address">
<input type="text" autocomplete="postal-code" name="zip">
<input type="text" autocomplete="country-name" name="country">
```

---

## 6. Color & Contrast Patterns

### 6.1 Don't Rely on Color Alone

```html
<!-- BAD: Color only indicates status -->
<span class="status-green">Active</span>
<span class="status-red">Inactive</span>

<!-- GOOD: Icon + text + color -->
<span class="status status--active">
  <dg-icon name="check-circle" aria-hidden="true"></dg-icon>
  Active
</span>
<span class="status status--inactive">
  <dg-icon name="x-circle" aria-hidden="true"></dg-icon>
  Inactive
</span>
```

### 6.2 Contrast Requirements (WCAG 2.2 AA)

| Element | Minimum Ratio |
|---------|---------------|
| Normal text (< 18px) | 4.5:1 |
| Large text (>= 18px or >= 14px bold) | 3:1 |
| UI components & graphics | 3:1 |
| Focus indicators | 3:1 |

```scss
// Use Apollo design tokens — they meet contrast requirements
color: var(--apo-color-text-primary);      // 4.5:1 on background
color: var(--apo-color-text-secondary);    // 4.5:1 on background
color: var(--apo-color-text-on-primary);   // 4.5:1 on primary
```

---

## 7. Touch Target Size (WCAG 2.5.8)

**Minimum:** 24x24 CSS pixels
**Recommended:** 44x44 CSS pixels

```scss
// Ensure minimum touch target
.icon-button {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

// For inline actions, use padding to expand hit area
.inline-action {
  padding: 12px; // Expands 20px icon to 44px touch target
}
```

---

## 8. Motion & Animation (WCAG 2.3.3)

### Respect prefers-reduced-motion

```scss
// Default: with animation
.fade-in {
  animation: fadeIn 300ms ease-in;
}

// Reduced motion: instant or minimal
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
  }

  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

```typescript
// Check in code
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  // Run animation
}
```

---

## 9. Keyboard Interaction Patterns

### Standard Keyboard Behaviors

| Component | Keys |
|-----------|------|
| Button | Enter, Space → activate |
| Link | Enter → follow |
| Checkbox | Space → toggle |
| Radio | Arrow keys → move selection |
| Tab panel | Arrow keys → switch tabs |
| Menu | Arrow keys → navigate, Enter → select, Escape → close |
| Modal | Escape → close, Tab → cycle within |
| Dropdown | Arrow keys → navigate, Enter → select, Escape → close |
| Slider | Arrow keys → adjust value |

### Example: Tab Panel

```html
<div role="tablist" aria-label="Settings tabs">
  <button
    *ngFor="let tab of tabs; let i = index"
    role="tab"
    [id]="'tab-' + i"
    [attr.aria-selected]="selectedIndex === i"
    [attr.aria-controls]="'panel-' + i"
    [tabindex]="selectedIndex === i ? 0 : -1"
    (click)="selectTab(i)"
    (keydown)="onTabKeydown($event, i)">
    {{ tab.label }}
  </button>
</div>

<div
  *ngFor="let tab of tabs; let i = index"
  role="tabpanel"
  [id]="'panel-' + i"
  [attr.aria-labelledby]="'tab-' + i"
  [hidden]="selectedIndex !== i">
  <ng-container *ngTemplateOutlet="tab.content"></ng-container>
</div>
```

```typescript
onTabKeydown(event: KeyboardEvent, index: number) {
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      this.selectTab((index + 1) % this.tabs.length);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      this.selectTab((index - 1 + this.tabs.length) % this.tabs.length);
      break;
    case 'Home':
      event.preventDefault();
      this.selectTab(0);
      break;
    case 'End':
      event.preventDefault();
      this.selectTab(this.tabs.length - 1);
      break;
  }
}
```

---

## 10. Apollo Component A11y Coverage

These Apollo components handle a11y internally — use them instead of building custom:

| Component | Handles |
|-----------|---------|
| `apo-button` | Focus ring, disabled state, keyboard |
| `apo-dialog` | Focus trap, Escape close, aria-modal |
| `apo-modal` | Focus trap, Escape close, aria-modal |
| `apo-tabs` | Arrow key navigation, aria-selected |
| `apo-dropdown` | Focus, keyboard nav, aria-expanded |
| `apo-toast` | aria-live, role="alert" |
| `apo-form-field` | Label association, error binding |
| `apo-checkbox` | Proper role, keyboard |
| `apo-radio-group` | Arrow key navigation |
| `apo-tooltip` | aria-describedby |

**Always check Apollo first** before building custom interactive components.

---

## Quick Reference Card

```
ARIA Labels:
  Icon button    → <span class="tw-sr-only">Label</span> OR aria-label
  Decorative     → aria-hidden="true"

Disabled:
  Button/Link    → aria-disabled="true" (NOT disabled)
  + prevent click in handler
  + visual disabled style

Focus:
  Modal open     → focus first interactive element
  Modal close    → restore focus to trigger
  Custom widget  → visible focus ring on :focus-visible

Live regions:
  Status updates → aria-live="polite"
  Errors/alerts  → aria-live="assertive" OR role="alert"

Forms:
  Required       → aria-required="true" + required
  Error          → aria-invalid="true" + aria-describedby
  Hint           → aria-describedby

Keyboard:
  Button         → Enter/Space
  Navigation     → Arrow keys
  Close/Cancel   → Escape
```
