# Changelog

## [1.2.4] - 2026-05-02 - Animation & Gameplay Stability
### Fixed
- **Worklet Animations**: Fixed 'Animations not working' bug by implementing robust animation state fallback (auto-selecting first animation if "idle" is missing) and case-insensitive state matching.
- **Transform-Based Spritesheets**: Migrated spritesheet offsets from `left/top` to `translateX/translateY` for better performance on Android and to avoid layout jitter.
- **UI-Thread Animation Timer**: Moved the global frame timer from the JS thread loop to `useFrameCallback`, ensuring animations run with high precision on the UI thread even during heavy physics calculations.
- **Worklet Context Fix**: Fixed worklet capture issues in `PhysicsBodyBase` to ensure the latest animation state is always applied.

## [1.2.3] - 2026-05-02 - Build Fix & ProGuard Refinement
### Fixed
- **Gradle Build Failure**: Fixed the "Unknown Gradle error" during EAS build by adding explicit ProGuard "keep" rules for Reanimated and TurboModules.
- **Resource Shrinking**: Disabled `enableShrinkResourcesInReleaseBuilds` which was causing reference errors in the Android build pipeline.

## [1.2.2] - 2026-05-02 - Build Size Optimization
### Performance
- **ProGuard/R8 Enabled**: Enabled ProGuard for Android builds via `expo-build-properties`. This minifies the Java/Kotlin code and removes unused classes, typically reducing APK size by 5–15MB.
- **Resource Shrinking**: Enabled `enableShrinkResourcesInReleaseBuilds` to strip away unused resources (drawables, layouts) from the final Android binary.
- **Version Sync**: Synchronized `package.json` and `app.json` versions to 1.2.2.

## [1.2.1] - 2026-05-02 - Game Loop FPS Optimizations
### Performance
- **Cached Body Lookups**: `Matter.Composite.allBodies()` is now called **once per frame** and cached. Previously it was called 3–4× per frame (in camera search, `resolveValue`, and `point_towards`), each allocating a new array on every physics tick.
- **Lower Physics Iterations**: Reduced `positionIterations` from 10→6 and `velocityIterations` from 10→4 (back to Matter.js defaults). The previous values were 60–150% higher than needed, wasting CPU every physics step.
- **Removed Redundant `on_tick` Event Emit**: `DeviceEventEmitter.emit('on_tick')` was fired every frame but had no listeners (attachListeners explicitly skips `on_tick`). Removed the dead emit to eliminate event dispatch overhead.
- **Cached Camera Target Body**: The camera follow loop now caches the target `Matter.Body` in a ref and only re-searches when the ref is null (e.g. after a room restart). Previously it called `allBodies().find()` on every frame even when the target never changed.
- **Camera Target Ref Reset on Restart**: `cameraTargetBodyRef` is now explicitly cleared when the game loop restarts, preventing stale body references after room transitions.
- **UI-Thread Viewport Culling**: Implemented high-performance viewport culling in `PhysicsBodyBase` using Reanimated worklets. Off-screen objects now have `display: 'none'` applied entirely on the UI thread, significantly reducing GPU draw calls and layout overhead without blocking the JS thread.
- **Room Grid Visibility**: The room editor grid is now rendered on top of all objects (with `zIndex: 10000`), ensuring it remains visible while painting or placing objects over large sprites.
- **Editable Grid Size**: Added a "Grid Size" property to the Room Settings sidebar. Users can now dynamically change the snapping and visual grid resolution for each room.
- **Sidebar Dividers**: Added subtle horizontal divider lines between sidebar sections (Instances, Room Settings, Camera, Controls), improving visual organization and scannability of the room editor's properties.
- **Scrollable High-Density Color Grid**: Upgraded the color picker to a wide-layout, scrollable grid featuring over **70 curated colors**.

## [1.2.0] - 2026-05-01 - Rendering Performance Overhaul
### Performance
- **Dynamic Viewport Culling**: Static instances are now skipped during React rendering if their bounding box falls outside the current camera viewport + 128px margin. In large rooms (100+ objects) with an active camera this can reduce rendered components by 80–95%.
- **O(1) Sprite Lookup**: Replaced `Array.find()` with `spriteMap.get()` in the `staticElements` render path, eliminating a full sprite-array scan per instance per frame.
- **Layer Visibility Short-Circuit**: Invisible layers now exit immediately with `null` before iterating their instances.
- **Viewport Sync at 15fps**: A lightweight camera-position sync (`viewportCam` state) runs at ~15fps to drive culling without adding bridge overhead to the 60fps physics loop.


## [1.1.1] - 2026-05-01 - Debug Sidebar Refinements
### Added
- **Sidebar Close Button**: Added a dedicated close button to the debug sidebar for better UX.
- **Integrated Debug Info**: Relocated Camera, Viewport, and Tracking info into the debug sidebar, keeping the main game view clean.

## [1.1.0] - 2026-05-01 - Debug System Enhancements
### Added
- **Engine Debug Sidebar**: Added a toggleable sidebar (Database icon) in debug mode to inspect real-time engine state.
  - Inspect Global Variables.
  - Inspect Local Variables for all active instances.
  - View Room metadata and live instance counts.
- **Conditional Debug Overlay**: The camera and room debug information (CAM, Room, View, etc.) is now hidden during normal gameplay and only visible when "Play Debug" is active.

### Changed
- **UI/UX**: Compacted the top control bar in GamePlayer to include the new debug toggle.

## [2026-05-01] - Camera Follow & Coordinate Fixes
### Fixed
- **Camera Tracking Failure**: Fixed the issue where the camera viewport wouldn't follow the player by aligning world-to-screen coordinate mapping (incorporating screen scale).
- **Viewport Misalignment**: Removed default centering from the game viewport which caused the canvas to be offset incorrectly when moving the camera.
- **Robust Target Search**: Improved the target body resolution logic to reliably find the player by ID, Behavior, or Name (case-insensitive) in every frame.
- **Initial Camera Snapping**: Added logic to snap the camera to the player on the first frame of room entry, eliminating jarring jumps.
- **Duplicate Variable Error**: Fixed the "Cannot redeclare block-scoped variable" error for `isPlayingRef`.

### Added
- **Dynamic Camera Following**: Re-implemented the camera tracking system with smooth LERP (Linear Interpolation) for a professional feel.
- **Clamped Viewport**: The camera now automatically stays within room boundaries, preventing the "black void" from showing.
- **Adaptive Resolution**: Added a reference resolution system (800x600) that scales perfectly regardless of room size, ensuring scrolling works in both tiny and massive rooms.

### Fixed
- **Performance Leak (Re-render Storm)**: Fixed a critical performance issue where every object re-rendered on every frame.
  - Implemented `React.memo` with a custom comparison that skips re-renders for static objects (walls, tiles) during variable updates.
  - Throttled UI state updates to 30 FPS while maintaining 60 FPS physics.
- **Camera Transform Order**: Fixed a bug where zooming would "offset" the camera incorrectly by re-ordering translation and scale operations.
- **Logic Culling**: Finalized the logic culling system. Objects outside the visible viewport now stop processing scripts and rendering, drastically boosting FPS.

## [2026-05-01] - Camera Follow & Viewport Culling
### Added
- **Camera Follow**: The game engine now reads Room camera settings (`targetObjectId`, `smoothing`, `zoom`, `enabled`) and smoothly follows the target object using per-frame lerp. Enable it from the Room Settings panel in the editor.
- **Viewport Culling**: Objects (both static room instances and dynamically spawned objects) are now skipped during render if they fall outside the current camera viewport + a 64px margin. This significantly reduces draw calls in large rooms.

### Changed
- **Canvas rendering**: The game canvas is now an `Animated.View` driven by `cameraX`/`cameraY` shared values, enabling zero-lag camera movement entirely on the UI thread.

## [2026-05-01] - Visual Logic Engine Full Synchronization
### Fixed
- **`on_start` Execution**: Fixed `on_start` listener actions (e.g., `var_set:var_0:0`) not firing when created via the Visual Logic Editor. Actions are now deferred 100ms after engine initialization to ensure React state is fully settled before scripts run.
- **`on_timer` / `on_tick` Visual Logic**: Fixed timers and tick events created in the Object Inspector not executing during gameplay. Engine now reads `immediateActions` and `subConditions` from the Visual Logic Editor data structure.
- **String Concatenation Bug**: Fixed `var_add` producing string concatenation (e.g., `0111...`) instead of numeric addition. Variable storage and arithmetic now forcibly casts all values through `Number()`.
- **Bare Variable Text Display**: Text objects now resolve bare variable names (e.g., `var_0` without `{}` brackets) as live values.
- **Collision & Tap Events**: Fixed collision and tap listener events not dispatching to all matching objects.

### Changed
- **Visual Logic → Engine Bridge**: Engine now fully supports the new Visual Logic Editor format (`immediateActions`, `subConditions`, `elseActions`) for all events: `on_start`, `on_tick`, `on_timer`, `on_tap`, `on_collision`.
- **Legacy Script Compatibility**: Legacy text-based scripts (`on_timer:1000 DO var_add:var_0:1`) remain fully supported alongside the new Visual Logic format.

## [Current] - Logic Engine Stabilization & Performance
### Fixed
- **Engine Stability**: Resolved critical `SyntaxError` and `Invalid hook call` crashes in the GamePlayer.
  - Eliminated nested hook violations by hoisting all `useRef` and `useFrameCallback` calls to the component top level.
  - Fixed brace-balancing errors and scoping issues (e.g., `targetMap` not found) during the core engine refactor.
- **Logic Execution**: Hardened the expression evaluator and action dispatcher.
  - Fixed issues where global variables (e.g., `Global.var_0`) were not correctly triggering conditional logic.
  - Restored `on_start`, `on_tick`, and `timer` triggers for dynamic objects and room instances.
  - Re-implemented `spawnInstance` with proper physics and listener attachment.

### Changed
- **60 FPS Refactor**: Fully transitioned the game loop to `useFrameCallback` on the UI thread.
  - Synchronized Matter.js physics updates with frame deltas for consistent movement across devices.
  - Implemented worklet-compatible logic subroutines to bypass the JS/UI bridge bottleneck.
- **GamePlayer Engine Optimization**:
  - **New Triggers**: Added native support for `on_start` (initialization) and `on_timer:MS` (recurring timed events) scripts.
  - **Scripting Improvements**: Implemented support for the `do` keyword in action strings and added robust whitespace trimming for scripted commands.
  - **Dynamic Scripting**: Enabled `on_tick` and `on_timer` execution for dynamically spawned objects (bullets, particles).
  - **Worklet Animations**: Refactored sprite frame animations to run entirely on the UI thread using a global shared-value timer.
  - **Throttled React State**: Reduced variable and instance state synchronization from 100ms to 500ms, drastically cutting down full-tree re-renders.
  - **Direct Style Updates**: Moved per-frame property updates (image offsets, positions) to `useAnimatedStyle` to bypass React's reconciliation.
  - **Script Execution**: Optimized logic parsing by pre-calculating action strings, reducing string operations in the 60 FPS hot loop.
  - **Text Cache**: Implemented a caching layer for text resolution to avoid redundant RegEx operations.

## [Current] - Logic & UI Streamlining
### Changed
- **Logic Interface**: Unified the scripting experience by transitioning to a "text-first" workflow.
  - Removed redundant 'AND/OR' toggle buttons from main triggers to prevent UI clutter.
  - Removed explicit property picker icons in favor of direct typing and smart autocomplete.
  - **List-First Sub-Conditions**: The "+ ADD SUB-CONDITION" button now immediately opens the Event Picker, ensuring logic is defined at creation.
- **UI Consolidation**: Simplified the Object Inspector logic row to prioritize text input for high-performance scripting.
- **Wait Until Logic**:
  - Added `Wait Until` as an event trigger: Fires once when the specified condition becomes true.
  - Added `Wait Until` as a sub-condition: Delays the execution of actions within a logic block until the condition is met (Temporal Wait).
  - Integrated `Wait Until` into the Event Picker for easy access.

## [2026-05-02]
### Added
- Community Screen:
  - **Like System**: Users can now like published games.
  - **Comments System**: Users can post comments on game detail pages.
  - **Play Count**: Automatic increment of play count when a game is launched.
  - **Search**: Search bar added to the header for finding games by title.
  - **Game Detail Modal**: Dedicated modal for viewing game details, description, and statistics.

### Changed
- **Game Display**: Switched from a simple list to a 2-column grid for better discovery.
- **Comments UI**: Added "Latest" and "Top" sorting tabs for comments.
- **Auth**: Prevent liking/commenting if not logged in; prompts auth modal instead.

## [2026-05-01]
### Updated
- Community Screen: Changed game display layout from list style to a high-density 5-column grid for optimized browsing and a modern storefront aesthetic.
- Performance: Optimized game engine to target a consistent 60 FPS.
    - Implemented a single-pass update loop to reduce JS thread overhead.
    - Added O(1) object lookups for expressions via `targetMap`.
    - Throttled variable/nonce updates to 200ms to prevent expensive room re-renders.
    - Tuned physics iterations and enabled body sleeping for idle objects.
- Graphics: Improved sprite sharpness for a "Pixel Perfect" look.
    - Increased internal BMP upscale factor to 8x to ensure clarity on high-density displays.
    - Optimized image rendering properties to prevent anti-aliasing blur during gameplay.
- UI/UX: Fixed Object Library grid layout.
    - Adjusted column count to 6 and optimized card sizing to prevent items from overflowing the screen.
- Features: Button Visuals, Scaling & Touch Interaction.
    - Added 'On Click' and 'On Release' sprite support for Button behaviors.
    - Implemented a new 'Scale' property for all objects (`self.scale`).
    - Added `set_scale` and `add_scale` logic actions.
    - Updated Object Inspector with intuitive controls for scaling and button visuals.
    - Added `on_release` (object) and `on_screen_tap` (global) events.
    - Added `tap_x` and `tap_y` variables for precise touch-driven logic.
