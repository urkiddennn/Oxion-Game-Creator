# Changelog - Oxion Game Creator

## [1.16.1] - 2026-05-11
### Added
- **Typed Variables Support (Number, String, Boolean)**:
  - Upgraded the Variable Editor (`VariableRow`) inside the Object Inspector Modal into an elegant card layout.
  - Placed the variable name at the top of the card, with the type selector chips, value widgets, and promotion globe icon stacked neatly below.
  - Implemented a standard double-check deletion gesture: hold/long-press any variable card for 600ms to instantly delete it, completely removing cluttered cluttering action bars.
  - Supports automatic casting to proper types (`number`, `string`, `boolean`) on change or edit.
- **Dynamic Event Comparisons (WHEN...)**:
  - Integrated a new **Variables & Comparisons (WHEN...)** category in the Event Trigger Picker scroll list.
  - Dynamically populates custom compare variable trigger suggestions (e.g. `when: Global.variable > 0` or `when: self.variable == true`) for both local variables of the selected object and all project-wide global variables.
  - Engineered an edge-triggered, stateful evaluation loop running inside the `runScriptLogic` ticks that parses, monitors, and executes trigger actions exactly once upon false-to-true condition transitions.

## [1.16.0] - 2026-05-11
### Added
- **Play Store Game View Experience**:
  - Redesigned the community game modal to closely resemble a modern Play Store app view page, featuring large, rounded game icon displays, free-tier labels, play metrics, and likes stats.
- **Upload Screenshots / Previews support**:
  - Enhanced the "Publish to Community" process by allowing creators to pick up to 5 game screenshots/preview pictures from their device gallery using an interactive horizontal scrollbar.
  - Automatically serializes and attaches picked previews to the published game's remote record.
  - Rendered horizontal screenshot scrollbars inside the Play Store-inspired game detail pages.
- **Built-in Up & Down Buttons**:
  - Introduced customizable built-in vertical movement controls (Up & Down buttons) under Room settings, aligning them seamlessly with horizontal, jump, and shoot control styles.

## [1.15.4] - 2026-05-11
### Fixed
- **State Migration Bug**:
  - Resolved "State loaded from storage couldn't be migrated" error by implementing a proper `migrate` function for the Zustand persistence middleware.
- **Upload Object ID Serialization**:
  - Fixed an issue where legacy object scripts containing object references (e.g., `create_instance`, `spawn`) were not properly migrated to UUIDs when publishing a project to the community, causing them to fail when loaded from the server.
  - Added upload migrations for nested object property references including `explosionParticleId`, `particleObjectId`, `clickSpriteId`, and `releaseSpriteId`.

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
