# Changelog

## [1.16.1] - 2026-05-10
### Updated
- Contributions Page: Data is now fetched dynamically from Supabase database instead of being hardcoded.


## [1.16.0] - 2026-05-10
### Added
- Contributions Page: A new section in the Launchpad to showcase project contributors and donators.


## [1.15.9] - 2026-05-10
### Fixed
- Stability: Added null checks in `DynamicTextNode` and fixed closure issues in `screenPanGesture` to prevent crashes.
- Gesture Compatibility: Switched to `Gesture.Exclusive` for better gesture coordination.


## [1.15.8] - 2026-05-10
### Optimized
- Drag Responsiveness: Moved `screenPanGesture` to the UI thread and added `minDistance(0)` for instant touch tracking.
- Text Rendering: Updated `DynamicTextNode` to use both `text` and `value` props for broader platform compatibility with real-time updates.


## [1.15.7] - 2026-05-10
### Added
- Real-time Drag Tracking: Added `screenPanGesture` to continuously update `tap_x` and `tap_y` during touch movement, enabling smooth real-time coordinate tracking for `set_text` and other actions.


## [1.15.6] - 2026-05-10
### Fixed
- Reanimated UI Thread Error: Fixed "trying to access setNativeProps on UI thread" by switching `DynamicTextNode` to `useAnimatedProps`.


## [1.15.5] - 2026-05-10
### Fixed
- Real-time `set_text` reactivity: Fixed an issue where `on_tick set_text:get_drag_x` was choking due to high-frequency React re-renders. Now uses a reactive template system that updates at 60fps on the UI thread.


## [1.15.4] - 2026-05-10
### Fixed
- PhysicsBody and GUIRenderer props synchronization.

## [1.15.3] - 2026-05-10
### Optimized
- Real-time Text Updates: Optimized `set_text` with Reanimated and Native Props to support 60fps dynamic text (e.g., tracking `tap_x`, `tap_y` without React re-renders).

## [1.15.2] - 2026-05-10
### Added
- Comprehensive Text Styling in Object Inspector (Width, Height, BG Color, Padding, Border Radius).
- Font Size integrated into Font row for better UX.

## [1.15.1] - 2026-05-10
### Fixed
- set_text reactivity in on_tick using instanceOverrides.
- DynamicTextNode expression resolving for tap_x/tap_y.
### Added
- Text styling actions: set_text_color, set_bg_color, set_text_size, set_text_align.
- Palette icon for UI styling actions.

## [1.15.0] - 2026-05-10
### Added
- **Dynamic Text Support (`set_text` Action)**:
  - Engineered the highly versatile `set_text` action, allowing objects to dynamically update their text content at runtime.
  - Supports absolute string assignments (e.g. `set_text:Hello World`).
  - Supports dynamic property resolution for variables and entity attributes (e.g. `set_text:Global.score`, `set_text:Player.x`).
  - Supports complex bracketed expressions for real-time formatting (e.g. `set_text:{Global.health}%`).
  - Integrated visual presets into the **Action Picker Modal** under a new *UI & Text* category.
- **Enhanced Drag & Interaction Coordinates**:
  - Added native aliases **`get_drag_x`** and **`get_drag_y`** to the expression engine for cleaner dragging scripts.
  - Integrated these aliases into the **Property Picker Modal** under *Room & Environment* and *Values & Environment* for visual selection.
- **Object Triggers Rename & Optimization**:
  - Refined the Logic Editor by renaming *Object Comparison Triggers* to the more concise **Object Triggers**.
  - Optimized the UI layout for multi-object tracking and comparison scripts.

## [1.14.0] - 2026-05-10
### Added
- **Interactive Object Dragging (`on_drag` Event)**:
  - Engineered standard React Native Gesture Handler `Gesture.Pan()` combined with `Gesture.Tap()` using `Gesture.Simultaneous(pan, tap)` on physics bodies to support absolute dragging.
  - Calculates precise, viewport-scale-agnostic world-space coordinates during dragging gestures and emits high-performance `builtin_drag` events.
  - Syncs real-time drag coordinates into `tap_x` and `tap_y` global variables for seamless script reference.
- **Unified "Go To" Teleportation Action (`go_to`)**:
  - Implemented the highly requested `go_to` teleportation action inside the update execution loop.
  - Supports **`go_to:touch`** / **`go_to:tap`** / **`go_to:drag`** to instantly snap the physics body to the current dragging or tapping coordinates.
  - Supports **`go_to:X:Y`** to warp to absolute coordinate positions or parsed visual expressions.
  - Supports **`go_to:TargetName`** to snap instantly to another active object's center coordinates in the room.
  - Automatically dampens active velocities and forces upon teleporting to prevent slipping or sliding.
  - Integrated visual presets into the **Action Picker Modal** under *Movement & Rotation* and added syntax to the code **suggestions autocomplete array**.

### Fixed
- **Hermes Thread Serialization Crash**:
  - Eliminated UI-to-JS thread serialization crashes caused by inline worklet arrow function wrappers passed to `runOnJS`.
  - Configured all user-interactive Gestures (`screenTapGesture`, `pan`, and `tap`) with native `.runOnJS(true)` thread execution, ensuring 100% stable touch responder execution under Hermes/JSC.

## [1.13.9] - 2026-05-10
...
