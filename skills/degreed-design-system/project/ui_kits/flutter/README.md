# Degreed Flutter UI Kit (mobile)

A working recreation of the Degreed Flutter mobile app. Two iPhone frames side-by-side: the left one is fully interactive (tap the bottom-nav tabs), the right shows the Profile screen.

## Screens

- **Home** — gradient True Blue hero, Maestro CTA card, "Continue learning" with progress, horizontally-scrolling recommendations, skill review.
- **Maestro** — full-screen chat with quick-reply chips and recommendation cards.
- **Profile** — avatar, three KPIs (Pathways / Skills / Learned), settings list.

## Files
- `MobilePrimitives.jsx` — `MIcon`, `MAvatar`, `MButton`, `MAppBar`, `MBottomNav`, `MCard`, `MEyebrow`.
- `Screens.jsx` — `MHomeScreen`, `MMaestroScreen`, `MProfileScreen`.
- `ios-frame.jsx` — device chrome (starter component).

## Visual sources
- `degreed-flutter/lib/` — screens, widgets, and Flutter `ThemeData` colors.
- `degreed-flutter/images/` — illustrations and icons.

This is a cosmetic recreation in React; production is Flutter. Kept simple to be reusable in mocks.
