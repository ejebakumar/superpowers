# Degreed Design System

A working design system for **Degreed** — the AI-powered Learning Experience Platform (LXP) — distilled from two production codebases:

- **`fe-workspace/`** — the Angular Nx monorepo behind the web app (`degreed.com`). The shared visual layer lives in two libraries:
  - `libs/shared/apollo/` — the **Apollo** marketing/onboarding system (Tailwind config, color palette, typography). Public surfaces, login, settings.
  - `libs/shared/fresco/` — the **Fresco** in-app system (CSS variables, icon set, web components). The logged-in product.
- **`degreed-flutter/`** — the Flutter mobile app, mirroring the Fresco visual language with Material-style widgets.

> Sources are local mounts (read-only). Asset copies + extracted tokens in this project are the durable artifacts.

---

## What Degreed is

Degreed is an enterprise **Learning Experience Platform** that aggregates learning content (courses, articles, videos, books, podcasts) from across the internet and from a customer's internal catalog into a single career-development workspace. The flagship AI assistant is **Maestro** — a chat-driven recommender that answers learner questions and surfaces relevant pathways, plans, mentors, and groups.

### Surfaces represented in this system

| Surface | Codebase | Stack | Visual system |
|---|---|---|---|
| **Web app** (logged-in product) | `fe-workspace/` | Angular + Nx + Tailwind | **Fresco** (in-product) |
| **Marketing / Auth / Onboarding** | `fe-workspace/libs/shared/apollo` | Angular + Tailwind | **Apollo** (display type, marketing scale) |
| **Mobile app** | `degreed-flutter/` | Flutter | Mirrors Fresco tokens |

---

## Index — what's in this folder

```
README.md                  ← you are here
SKILL.md                   ← invocation instructions for agents
colors_and_type.css        ← all CSS vars (palette, type, radii, shadows, spacing)
fonts/                     ← Antonia (display) — see "Font substitutions"
assets/
  logos/                   ← Degreed wordmark + icon, Maestro mark
  icons/                   ← 40+ Fresco SVG icons (16px line-style)
  illustrations/           ← branded PNG illustrations (the "curious cat" set)
preview/                   ← cards rendered in the Design System tab
ui_kits/
  web/                     ← Apollo + Fresco component recreations (React/JSX)
    index.html             ← interactive walk-through
    *.jsx                  ← Sidebar, ContentCard, MaestroChat, Button, …
  flutter/                 ← Mobile screen recreations (React/JSX, mobile chrome)
    index.html             ← Home / Maestro / Profile click-through
    *.jsx
```

---

## Content fundamentals

**Voice.** Conversational, warm, second-person. Copy is written *to* the learner, not about them. Marketing leans benefit-led ("**Develop your career on your terms**"); in-product strings are direct and verb-first ("Add to plan", "Mark complete", "Save for later").

**Tone.** Encouraging without being saccharine. Maestro especially uses friendly hedges — "I think you might like…", "Want me to show you a few options?". Mistakes are gentle: "We couldn't find that. Try a different keyword?"

**Casing.**
- **Sentence case** for UI labels, buttons, menu items, headings: "Skill review", "Continue learning", "Add to plan".
- Title Case is reserved for proper-noun product features: **Maestro**, **Skill Review**, **Pathways**, **Plans**.
- ALL CAPS only for tiny meta labels (12px, letter-spacing 0.02em) — section eyebrows like "RECOMMENDED FOR YOU".

**Pronouns.** "You" / "your" for the learner. "We" for Degreed-the-platform when the system is doing something on the learner's behalf ("We've recommended these based on your skills"). Never "us".

**Vocabulary.** Distinct nouns matter — get these right:
- *Pathways* — curated, ordered learning sequences (not "courses" or "tracks").
- *Plans* — the learner's personal queue (not "saved", not "library").
- *Skills* — the unit of taxonomy. Always plural.
- *Maestro* — the AI assistant, never "the AI" or "the bot".
- *Content* / *items* — generic catch-all when type doesn't matter.

**Numbers & units.** Durations as "5m", "1h 20m". Skill ratings on a 0–8 scale. Dates relative when recent ("2d ago"), absolute when older ("Mar 14").

**Emoji.** Not used in product UI. Marketing illustrations carry the personality instead — see `assets/illustrations/`.

**Punctuation.** Sentence fragments are fine in cards and CTAs. Avoid trailing periods on single-line button labels and section headers. Use the Oxford comma.

**Sample copy** (lifted/typical):
> "Welcome back, Jordan. Pick up where you left off?"
> "Maestro can help you find your next thing to learn."
> "You're 3 hours away from finishing **Practical SQL**."
> "Add to plan" · "Mark complete" · "Rate this content"
> Eyebrow: "RECOMMENDED PATHWAYS"

---

## Visual foundations

### Color
- **Brand True Blue** `#0062E3` is the only "loud" brand color in the product. Used for primary buttons, links, focus rings, brand chrome. Marketing uses it as a flat backdrop, full-bleed.
- **Moon Shot** `#0F1F2C` is the headline ink — near-black with a hint of cool, paired with True Blue.
- **Fry Sauce** `#FF7F64` (coral) and **Gold Metal** `#FED141` are *seasoning*, not base colors. They show up in illustrations, badges, and one-off marketing accents — never as primary surfaces.
- **Skys-the-Limit** `#E9F7FE` is the calm pale-blue panel/wash used behind hero blocks.
- **Neutrals** lean cool — they're built off `#353C42` (Moon Shot's family). Backgrounds are `#FBFBFB` page / `#FFFFFF` surface / `#F4F6F7` subtle. Borders default to `#E2E8EB`.
- The Apollo tailwind preset extends a full **primary / accent (purple) / pink / success / warning / danger** scale with 50–950 stops; reach for these for charts and status, not for primary chrome.

### Type
- **Antonia H1 Black** — display serif. Used **only** for marketing hero moments, login welcome, big quotes. Heavy weight (900), tight leading (~1.05), True Blue or Moon Shot.
- **Inter** — every other surface. Apollo headings step 36/30/24/18px (700–800 weight). In-app body is **14px / 22px line / 400 weight**. Fresco's true semibold is **590** (an oddity worth preserving when you read the variables file).
- 12px `.caps` in 800 weight, uppercase, 0.02em tracking — the eyebrow/section-meta treatment.
- No light weights. No italics outside body emphasis.

### Spacing & layout
- Tailwind 4-px grid. Cards use **24px** internal padding by default; tight cards drop to 16px.
- Page max-widths: marketing 1200, in-app 1440, Maestro chat column 720.
- Section vertical rhythm in marketing is generous — 80–120px between blocks. In-app is denser, 24–32px.
- "Fixed elements": top nav 64px, mobile bottom nav 56px, sidebar 240px expanded / 64px collapsed.

### Radii
- **8px** is the default for buttons and content cards.
- **12px** for larger cards (Pathway cards, modal sheets).
- **16px** on marketing/empty-state hero blocks.
- **9999px (pill)** for chips, avatars, status pills, segmented controls.
- Inputs are **6px**.

### Shadows
- Cards: `0 1px 2px rgba(53,60,66,0.08)` — barely-there, paired with a 1px border.
- Hover lift: bumps to `0 4px 6px -1px rgba(53,60,66,0.10)` with a 100ms ease-out translate-y-(-1px).
- Modals: `0 20px 25px -5px rgba(53,60,66,0.10)`.
- Inner shadows are not used. There is no neumorphism.

### Borders
- 1px solid, neutral-200 (`#E2E8EB`) almost everywhere. Strong-state borders go neutral-300.
- Focus ring is **2px solid `#9DC6FC`** with a 2px offset — the Apollo `--default-focus-ring` token.

### Backgrounds & imagery
- **Solid color blocks** dominate marketing — full-bleed True Blue or Skys-the-Limit panels with the curious-cat illustration set front-and-center.
- **No gradients** in the product. Marketing occasionally uses a subtle blue-to-blue radial behind hero illustrations, but it's rare.
- **No textures, no patterns, no grain.** The illustrations carry the warmth.
- Photography is rare; when used, it's bright, naturally-lit, people-centric.

### Animation
- **Quick & quiet.** 100–200ms with `cubic-bezier(0.4, 0, 0.2, 1)` (Tailwind's `ease-in-out`).
- Fades and 4–8px translate-y for entrances.
- No bounce, no spring, no Lottie except in onboarding success-state moments.

### Hover / press states
- **Buttons:** primary darkens by ~one shade (`primary-800` → `primary-900`); ghost buttons gain a `neutral-100` background.
- **Cards:** 1px border darkens to neutral-300, shadow lifts to `--shadow-lg`, optional 1px translate-y up.
- **Press:** subtle 1px translate-y down + drop shadow back to baseline. No scale transforms.
- **Links:** True Blue, underline on hover.

### Transparency & blur
- Sparingly. Mobile's bottom nav uses 90% white with a `backdrop-filter: blur(20px)` over scrolling content. Toasts/menus are fully opaque.

### Iconography
- The product runs on the **Fresco icon set** — line-style 16/24/32px SVGs, 1.5px stroke weight, rounded caps. They're optimized for stroke `currentColor` so they inherit text color. About 200 icons; the most-used 40+ are in `assets/icons/`. No emoji.
- The Flutter app uses a small subset of these icons plus PNG illustrations from the curious-cat set.
- Maestro has its own small mark (`assets/logos/maestro-icon.svg`).

### Cards
- White surface, 1px `neutral-200` border, 8–12px radius, `--shadow-sm`. Optional 16:9 thumbnail flush to top, 16–20px padding for body. Title in semibold-590, meta row in `--fg-muted` 12px.

### Imagery vibe
- Warm, friendly, hand-illustrated. The signature is the **"curious cat"** illustration family — pastel scenes (mug + steam, paper airplane, mountain path, puzzle cube, etc.) over flat pale-blue or champagne backgrounds. Always cropped generously; never tightly bordered.

---

## Iconography

- **Primary set:** Fresco SVGs (`fe-workspace/libs/shared/fresco/assets/icons/medium/*-16.svg`). Line style, 16×16, 1.5px stroke, `currentColor`-safe. **Copy these in** when designing — don't redraw.
- **Mobile:** Flutter app uses Fresco icons via `flutter_svg`, plus Material defaults for navigation glyphs.
- **Larger contexts:** Fresco also ships 24px and 32px sets in `large/` — copy those if you need bigger.
- **No emoji** in product surfaces.
- **No unicode glyphs** as icons (no `★`, no `→`).
- **Logos & marks:**
  - `assets/logos/degreed-logo.png` — primary wordmark.
  - `assets/logos/degreed-icon.svg` — square mark.
  - `assets/logos/maestro-icon.svg` & `maestro-avatar.svg` — Maestro AI marks.
- **Illustrations** (PNG, ~600–1200px wide): use full-bleed in empty states, onboarding, marketing.

If you need an icon that isn't in the Fresco set, prefer **Lucide** (`https://unpkg.com/lucide@latest`) — same line/stroke weight, same vibe — and flag the substitution.

---

## Font substitutions

- **Antonia H1 Black** — used for the marketing display type. The codebase ships `AntoniaH1-Black.otf`; this project may not have an exact license-clean replacement bundled. **If `fonts/AntoniaH1-Black.otf` is missing, the system falls back to Georgia** (closest readily-available transitional serif). Please drop the licensed file into `fonts/` to render hero copy correctly.
- **Inter** — loaded via Google Fonts in HTML files. License-clean, no substitution needed.

---

## Reading order for an agent

1. `README.md` (this file) — context + tone.
2. `colors_and_type.css` — paste into HTML to get all tokens.
3. `assets/` — copy what you need; don't redraw.
4. `ui_kits/web/index.html` — see Apollo + Fresco components in motion.
5. `ui_kits/flutter/index.html` — see the mobile recreation.
6. `preview/` — atomic token cards.
