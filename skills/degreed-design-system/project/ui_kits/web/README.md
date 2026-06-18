# Degreed Web UI Kit — Apollo + Fresco

A working recreation of the Degreed in-product home screen with Maestro chat, built from the Angular codebase's design tokens and component patterns.

## What's here
- `index.html` — interactive demo: top nav with search, hero greeting, content recommendations, pathways, skill review, and a slide-in Maestro chat panel.
- `Primitives.jsx` — `Icon`, `Avatar`, `Button`, `Chip`, `SkillChip`, `Card`, `Eyebrow`, `SectionHeader`.
- `TopNav.jsx` — sticky 64px header with logo, primary nav, search, Maestro button, notifications, avatar.
- `HomeBlocks.jsx` — `HeroGreeting`, `ContentCard`, `ContinueRow`, `SkillReview`.
- `MaestroPanel.jsx` — Maestro chat sheet with quick replies + recommendation cards.

## Visual sources
- Apollo Tailwind palette → `fe-workspace/libs/shared/apollo/tailwind/src/lib/colors.ts`
- Fresco CSS variables → `fe-workspace/libs/shared/fresco/styles/variables.css`
- Apollo button shapes → `fe-workspace/libs/shared/apollo/tailwind/src/components/buttons.ts`
- Fresco icons → `fe-workspace/libs/shared/fresco/assets/icons/medium/*-16.svg`

## Notes
- This is a cosmetic recreation: no real data, no real auth. Click "Ask Maestro" or any "Refine with Maestro" button to open the chat panel.
- All colors come from `colors_and_type.css` at the project root.
