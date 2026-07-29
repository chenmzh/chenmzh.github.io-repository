# Iron Dawn mobile camera pan design

## Problem

Mobile players can currently reposition the camera only through the minimap. One-finger dragging is reserved for box selection, which makes ordinary battlefield navigation slow and awkward.

## Interaction design

- On screens up to 1024px, camera-pan mode starts enabled.
- A short tap still selects an entity and double-tap still selects matching entities.
- Dragging the battlefield in camera-pan mode directly moves the world under the finger.
- A new highlighted `视野 / PAN` control in the mobile action bar toggles camera-pan mode.
- Turning camera-pan mode off restores drag-to-box-select without changing desktop mouse controls.
- Build placement and command targeting continue to take priority over camera dragging.

## Implementation

- `IronGame` owns `touchPanMode`, `setTouchPanMode()`, and `panCameraBy()`.
- Pointer drags are classified as `camera` or `select` at pointer-down time.
- Camera movement begins after a small drag threshold to preserve tap selection.
- `IronUI` synchronizes the button's pressed state, localized accessible label, and shell class.
- The mobile HUD changes from three to four equal action cells while retaining 44px touch targets.

## Verification

- Unit-test camera direction, clamping, default mode, and mode switching.
- Contract-test the new button, localization, active styles, and pointer mode routing.
- Run the full test suite and visually test drag navigation at phone and iPad sizes plus desktop regression.
