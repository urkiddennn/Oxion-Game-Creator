# Changelog - Oxion Game Creator

## [1.23.0] - 2026-05-13
### Added
- **Dynamic Object-Level Properties**: Isolated progress bar (`value`) and sprite repeater (`current_count`, `max_count`) variables, removing global overlap. Properties are now dynamic, customizable, and unique per created object instance.
- **Dynamic Position Tracking & Modifiers**: Added `x` and `y` configuration coordinates and `Get Coordinate` logic actions for Progress Bars, Sprite Repeaters, and GUI objects, allowing real-time attachment and offset mapping.
- **Smart Adaptive Property & Action Filter**: Upgraded modals to automatically hide progress bar, sprite repeater, or health-related properties unless the active object has the corresponding behavior, resulting in a cleaner and context-aware workspace.
- **Object-Level Visibility & Action System**: Added unified object appearance triggers (`is visible`, `is hidden`) and action commands (`set_visible`, `set_x`, `set_y`) running natively in the physical and GUI runner loop.

## [1.22.3] - 2026-05-13
### Added
- **Tilemap Workflow Streamlining**: Selecting a Tilemap object in the Objects sidebar now automatically selects its corresponding room instance (if already present), instantly opening the Tilemap Instance Painter. Additionally, placing a new Tilemap instance immediately transitions the editor to select/paint mode on that instance, completely removing the hassle of manual canvas clicks.

## [1.22.2] - 2026-05-13
### Optimized
- **TypedArrays Sprite Painter**: Fully refactored `SpriteEditor.tsx` to utilize flat, lightning-fast `Uint32Array` buffers with dynamic color caching (O(1) uint32-to-hex LUT), completely avoiding high-frequency nested array clone overhead and garbage-collector stuttering during draw/paint actions.
- **O(1) Tilemap Dimensions Caching**: Integrated a `WeakMap`-backed boundary tracking cache in the physics engine Visibility Culling loop, resolving maximum tile rows/columns lookup complexity in true O(1) without string operations.
- **State-Memoized Tilemap Layer Component**: Designed a standalone `LayerTilemapRenderer` component in `GamePlayer.tsx` and `RoomsScreen.tsx` that evaluates and memoizes coordinate offsets in a single run-pass on state modifications, removing high-frequency string splitting and coordinate parsing from layout updates.
- **Single-Pass Physics Boundaries**: Optimized solid-layer boundary parsing routines to resolve min/max constraints using simple single-pass loops rather than mapping/splitting multiple temporary arrays.

## [1.22.1] - 2026-05-13
### Fixed
- **Tilemap Boundary Removal**: Removed hardcoded room bounds checks (`roomWidth`/`roomHeight`) in both individual tilemap instance painting and active layer painting, enabling creators to paint and place tilesets anywhere in world space (inside or outside standard room boundaries).

## [1.21.1] - 2026-05-12
### Fixed
- **Synchronized Room Editor Gestures & Crash Protection**:
  - Eliminated drag/pan gesture conflicts inside the Room Editor (`RoomsScreen.tsx`) by introducing a coordinated `isDragging` state hook. Whenever an instance is dragged using the "Move" tool, background camera panning is temporarily disabled, preventing double-pan fight vectors and thread crashes.
  - Hardened Reanimated `SharedValue` bindings in `DraggableInstance` with strict type casting (`Number(...) || 0`) and fallback dimensions. This prevents crashes due to uninitialized/undefined coordinates or NaN states when opening projects.
- **Instant Project Persistence**:
  - Configured `updateInstancePosition`, `updateInstanceSize`, and `updateInstanceAngle` inside `useProjectStore.ts` to instantly trigger asynchronous writes to disk using `FileSystemManager.saveProjectJson`. This guarantees edits are fully persisted on disk immediately as they are made.

## [1.21.0] - 2026-05-12
### Added
- **Interactive Tile Width & Height Configuration**:
  - Implemented real-time numeric inputs for customized **Tile Width** and **Tile Height** direct from the Room Editor sidebar panel (`RoomsScreen.tsx`).
  - Editing tile dimensions instantly modifies grid slicing offsets and frame dimensions, updating the sprite's grid configuration dynamically on the fly.
- **High-Performance Nested Tileset Scrolling**:
  - Replaced the large-scale wrapping grid layout inside the sidebar with an elegant `<ScrollView nestedScrollEnabled={true}>` container with a clean `maxHeight: 180` limit.
  - This prevents sidebar expansion/overflow and ensures smooth, independent vertical scrolling for tilesets containing many frames without disrupting the parent sidebar's vertical scroll gestures.

### Fixed
- **Guarded Game Player Execution**:
  - Added robust null/undefined safety wrappers when iterating room instances (`currentRoom?.instances`) in the mobile runner physics pipeline (`GamePlayer.tsx`), completely eliminating occasional crash vectors when loading or switching room states.

## [1.20.0] - 2026-05-12
### Added
- **Unified Multi-Capability Layers & Streamlined Editors**:
  - Overhauled the layer systems inside the Room Editor (`RoomsScreen.tsx`) and the mobile runner (`GamePlayer.tsx`) to remove rigid, binary layer classifications ("Objects" layer vs "Tilemap" layer).
  - Designed every layer to natively support both custom sliced tileset grids and placement of interactive game object instances concurrently.
  - Implemented an elegant "Enable Tile Painting" switch toggle inside the Tilemap Painter panel to dynamically assign tileset sprites and grid configurations to any active layer.
  - Streamlined the Layer Panel sidebar, replacing redundant action buttons with automated inline indicators displaying the currently active tileset name.
  - Aligned editor visual rendering lists seamlessly with play-mode canvas buffers for consistent spatial-depth painting.

## [1.19.0] - 2026-05-12
### Added
- **Experimental Tilemap Feature Integration**:
  - Extended global database state layer (`useProjectStore.ts`) to support custom tilemap layers, including tileset sprite associations, coordinates, cell frame-slice assignments, and physical solid state triggers.
  - Implemented real-time interactive drag-painting, cell erasing, tileset selection, and viewport rendering controls directly in the Room Editor screen (`RoomsScreen.tsx`).
  - Integrated high-performance static block simulation in the physics engine (`GamePlayer.tsx`), allocating dynamic rectangular solid bodies mapped cleanly with collision labels and identifiers.
  - Rendered beautiful overlay sheets of sliced custom tile sprites via `PixelSprite` frame-slicer layers within the virtual player viewport canvas.

## [1.18.0] - 2026-05-12
### Added
- **Elegant Action Picker Reorganization**:
  - Eliminated visual clutter and duplicate categories inside the Action Picker Modal (`ObjectModals.tsx`).
  - Restructured all game-making capabilities into beautiful, distinct, descriptive categories: *Preset Actions*, *Movement & Physics*, *Lives & Stats*, *State & Visibility*, *UI, Text & Appearance*, *Progress Bar Actions*, *Game Audio*, *Scene & Room Control*, *Spawn Objects*, *Math & Expressions*, *Values & Environment*, and *Project Variables (Global)*.
- **Enhanced Collision & Overlapping Triggers**:
  - Added new visual condition trigger keyword **`is overlapping another object`** under the "COLLISIONS" category in the Trigger Picker list.
  - Dynamically runs on-tick bounding box detection to evaluate spatial overlapping between objects and executes script logic seamlessly.
- **Dynamic Size & Position Triggers**:
  - Added size & position evaluation trigger operators under "Size & Position": **`compare width`**, **`compare height`**, **`compare x`**, and **`compare y`**.
  - Enabled creators to specify conditional comparisons on an object's spatial dimensions and coordinates relative to values or variables.
- **Appearance & Visibility Triggers**:
  - Added new event triggers **`is flipped`** (evaluates horizontal scaling flipping) and **`is visible`** (evaluates rendering visibility) to the state observation capabilities of the trigger system.

## [1.17.0] - 2026-05-12
### Added
- **Fully Event and Action-Driven Player Movement**:
  - Re-engineered player movement logic inside `GamePlayer.tsx` to utilize built-in events (`builtin_left`, `builtin_right`, `builtin_up`, `builtin_down`, `builtin_jump`) and actions (`move_left`, `move_right`, `move_up`, `move_down`, `jump`), eliminating raw, hardcoded velocity overrides in the core update loop.
  - Users can now customize or override default player movement behaviors by registering standard event listeners on these built-in events.
- **Vertical Movement Action Commands (`move_up` & `move_down`)**:
  - Integrated native `move_up` and `move_down` action commands in both the mobile game runner (`GamePlayer.tsx`) and the HTML web exporter (`webExportTemplate.ts`).
  - Added visual action picker presets with Lucide icon indicators (`ArrowUp` & `ArrowDown`) inside the Movement & Rotation category in `ObjectModals.tsx`.
  - Added code autocomplete keywords to the suggestions dictionary in `ObjectInspectorModal.tsx`.
- **Desktop Keyboard Controls Support in Web Exports**:
  - Added robust keyboard controls (WASD, Arrow keys, Space, X) to exported games, enabling instant desktop playability of exported projects.

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
