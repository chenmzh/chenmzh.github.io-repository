# Iron Dawn mobile and iPad adaptation

## Goal

Make the published Iron Dawn RTS fully playable on phones and iPads in portrait and landscape without removing desktop controls.

## Design

- Keep the battlefield full-screen and move secondary desktop HUD panels into touch-friendly drawers on narrow/coarse-pointer screens.
- Add a bottom mobile action bar for production, minimap, and camera focus.
- Preserve the order deck with 44px or larger touch targets and horizontal overflow where space is limited.
- Use Pointer Events for tap, drag selection, and stylus/mouse parity.
- Respect device safe areas and dynamic viewport height.
- Keep all controls bilingual and keyboard/mouse behavior unchanged on desktop.

## Verification

- Static mobile contract tests for markup, responsive CSS, manifest, i18n, and Pointer Events.
- Existing game logic tests remain green.
- Browser checks at 390x844, 844x390, 768x1024, and 1024x768.
- Publish through a reviewed branch and verify the live GitHub Pages URL.
