---
name: degreed-design-system
description: Use when building or styling Degreed-branded interfaces or assets — production UI or throwaway prototypes/mocks — and you need the brand's design guidelines, colors, typography, fonts, assets, or UI kit components.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- **Two visual systems share one brand:** *Apollo* (marketing / auth / onboarding — display type, generous spacing) and *Fresco* (in-product — denser, 14px body, line-style icons). Pick the right one for the surface.
- **Token file:** `colors_and_type.css` — link or paste into any HTML file; everything keys off CSS variables.
- **Brand colors that matter:** True Blue `#0062E3` (primary chrome), Moon Shot `#0F1F2C` (headline ink), Fry Sauce `#FF7F64` (coral accent), Skys-the-Limit `#E9F7FE` (pale-blue wash). Don't introduce new hues.
- **Type:** Inter for everything except marketing display, which uses Antonia (heavy serif, 900 weight). Sentence case across UI; Title Case only for proper-noun features (Maestro, Pathways, Plans).
- **Icons:** copy from `assets/icons/` (Fresco line set). Never redraw, never use emoji or unicode glyphs.
- **Illustrations:** the "curious cat" set in `assets/illustrations/` is the brand's personality — use generously in empty states, onboarding, marketing.
- **Maestro is the AI:** when prototyping AI features, refer to it as Maestro (proper noun) and use its mark (`assets/logos/maestro-icon.svg`).

## When in doubt

- Start from a UI kit component (`ui_kits/web/` or `ui_kits/flutter/`) rather than from scratch.
- Lean conversational and warm in copy. Verb-first in CTAs.
- Density: marketing breathes (80–120px section gaps); product is dense (24–32px).
