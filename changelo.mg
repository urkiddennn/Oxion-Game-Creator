# Changelog - Oxion Game Creator

## [1.15.3] - 2026-05-10
### Added
- **Project Recovery System**:
  - Implemented an automatic project recovery mechanism that scans the physical device storage (`FileSystem.documentDirectory`) for projects missing from the application state.
  - Ensures that projects are restored even if the application's internal memory (`AsyncStorage`) is cleared during updates or system maintenance.
  - Added versioned persistence logic (Version 1) to the global store for safer state migrations in future updates.
- **Enhanced Storage Management**:
  - Added `listProjects` and `loadProject` utilities to the `FileSystemManager` to decouple project indexing from the main application state.

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
  - Configured all user-interactive Gestures (`screenTapGesture`, `pan`, and `tap`) with native `.runOnJS(true)` thread execution, ensuring 100% reliable touch responder execution under Hermes/JSC.

## [1.13.9] - 2026-05-10
...
