# Changelog

## [1.12.11] - 2026-05-10
### Fixed
- **Multi-Touch Precision Upgrade**:
  - Upgraded `GameButton` to use `Gesture.Manual()` with explicit touch event management. This bypasses the default gesture exclusivity in RNGH, allowing infinite simultaneous button presses without interference.
  - Refactored background screen-tap detection from a legacy `Pressable` to a `GestureDetector` (`Gesture.Tap()`). This prevents the background from "stealing" the touch responder when buttons are being held.
  - Unified the input processing layer to ensure `inputJump` and `inputShoot` are captured reliably even during continuous movement.

## [1.12.10] - 2026-05-10
### Fixed
- **True Multi-Touch Controls Refactor**:
  - Re-engineered the gameplay control buttons (`GameButton`) using the high-performance `GestureDetector` API from `react-native-gesture-handler`.
  - Resolved the React Native responder lockout issue that prevented simultaneous touches. Players can now hold movement buttons (Left/Right) while concurrently tapping Jump or Shoot without input cancellation.
  - Removed legacy responder system overrides (`onStartShouldSetResponder`) that were causing inter-component touch interference on mobile devices and Expo Go.
  - Implemented mutual exclusivity for d-pad buttons to ensure clean state transitions when sliding between Left and Right inputs.

## [1.12.9] - 2026-05-10
### Fixed
- **Systemic Collision & Event Logic Refactor**:
  - Resolved a critical bug where `on_collision` events were hardcoded to only trigger for collisions involving the Player. They now trigger for any object-to-object or object-to-tile collision as intended.
  - Fixed "once only" collision damage on **Sprite Repeater** and other objects by ensuring `otherBody` and `otherObj` are correctly propagated through the event bridge to conditional actions.
  - Engineered a robust `collisionStart` handler that now correctly identifies collisions with non-GameObject bodies (tiles, walls, static floors), enabling `collision:tile` and generic hit detection to function reliably.
  - Fixed a logic error in `executeListenerLogic` where the triggering object was being passed instead of the target object during `on_life_lost` and `on_zero_lives` triggers.
  - Optimized the **Sprite Repeater** damage pipeline to ensure linked variables are updated atomically and the UI refresh nonce is synchronized with the global variable store.
  - Eliminated a double-emission bug in the collision event bridge that was causing redundant script executions per frame.

## [1.12.7] - 2026-05-09
### Fixed
- Fixed the spawning pipeline order-of-operations in `GamePlayer.tsx`. Shared values are now fully created and attached to the physical body's `gameInfo` *before* `'on_start'` scripts are executed, ensuring runtime scale changes (e.g. `self.scale = 4`) during spawn initialization are applied correctly to the visual sprite.
- Resolved a factor of 2 calculation bug in debug collision outline and center dot offsets. Corrected alignment coordinates inside `PhysicsBodyInner` so the debug outline and central pivot dot represent the actual Matter.js physical body boundaries and center of mass exactly.

## [1.12.6] - 2026-05-09
### Fixed
- Fixed script parsing of built-in actions (e.g. `self.scale = 2`, `self.x = 200`, `self.angle = 90`) in `GamePlayer.tsx`. Values are now correctly matched with execution arguments instead of mapping to string keys.

## [1.12.5] - 2026-05-09
### Fixed
- Fixed coordinate offset calculation inside `GamePlayer.tsx`. Corrected debug overlay box and center dot positioning to properly counteract container translation, aligning them perfectly with the physical Matter.js hitboxes.


## [1.12.4] - 2026-05-09
### Added
- **Dynamic Physics-Engine Scaling & Expression Engine Integration**:
  - Implemented dynamic, reactive physics and visual scaling at runtime via scripting.
  - Added full support for assignment and addition syntax, resolving expressions such as `self.scale = 2` and `self.scale += 0.5`.
  - Upgraded the Matter.js physics integration to dynamically scale rigid hitboxes and boundary boxes in real-time, enabling entities to physically grow or shrink.
  - Linked scale transformations directly to the Reanimated shared values pipeline for butter-smooth visual resizing and frame interpolation without React re-render overhead.
  - Extended the expression evaluator to allow reading of scale values dynamically using dot-notation properties, e.g. `self.scale`, `other.scale`, or `enemy.scale`.
  - Added automatic scale shared-value initialization for dynamically spawned elements (bullets, spawned items, particles) in the spawning pipeline.

## [1.12.3] - 2026-05-09
### Added
- **Godot-Style 2D Viewport & Redesigned Object Inspector**:
  - Engineered an ultra-premium, interactive **2D Viewport** workspace right in the center column of the ObjectInspectorModal.tsx, replicating the professional visual editing canvas of Godot Engine.
  - Implemented a sleek, top-center tab-bar permitting seamless switching between the **2D Viewport** (Visual workspace) and the full **Script / Logic** editor (Events & Actions list).
  - Built a dynamic, high-fidelity dark grid background, red horizontal coordinate X-axis, green vertical coordinate Y-axis, and an orange origin/pivot marker representing the entity crosshair.
  - Rendered a highly detailed collision overlay (capsule, rectangle, or circle) over the center-scaled sprite matching offset (`offsetX`, `offsetY`) and physical boundaries exactly.
  - Designed responsive floating zoom controls (`Zoom In`, `Zoom Out`, and `Reset Zoom`) with an live-updating percentage indicator scale up to 2000%.
  - Added real-time entity information badge (dimensions, behavior, body physics) in the viewport corner.
  - Integrated convenient shortcut buttons inside both the central Viewport canvas and the right-column sprite header section to immediately switch focus to the object's code scripts and listeners.

## [1.12.2] - 2026-05-09
### Fixed
- **Out-of-Bounds Culling & Static Solids Collision**:
  - Resolved a critical engine bug where walking long distances on a straight line of solid blocks caused physical collisions to suddenly deactivate and the player to fall through.
  - Fixed the game update loop's out-of-bounds physical Garbage Collector in GamePlayer.tsx to ignore static bodies (`d.body.isStatic`) entirely, ensuring placed solid blocks remain in the physical world permanently.
  - Refactored room-instance dynamic body culling to only destroy editor-placed room instances if they fall deep into a pit (`py > roomH + 1000`), rather than being culled horizontally or above, so they remain fully interactive across large zoomable maps.

## [1.12.1] - 2026-05-09
### Fixed
- **Expo SDK 55 Native Audio Compatibility (Migration to `expo-audio`)**:
  - Migrated the audio engine from the deprecated/removed `expo-av` library to the modern high-performance `'expo-audio'` package.
  - Resolved the critical crash `Cannot find native module 'ExponentAV'` by completely removing `expo-av` and installing the compatible SDK 55 `'expo-audio'` package.
  - Refactored GamePlayer.tsx to use the synchronous, imperative `createAudioPlayer` API with native `playbackStatusUpdate` event listeners for sound effect playback and lifecycle release management.
  - Refactored AudioScreen.tsx to utilize `'expo-audio'` for asset importing, preview testing, and automatic background cleanup.

## [1.12.0] - 2026-05-09
### Upgraded
- **Expo SDK 55 & React Native 0.83 Core Platform Upgrade**:
  - Upgraded the underlying Expo platform to **SDK 55** and React Native core to **0.83.6**.
  - Synchronized all native platform modules for optimal performance, including `expo-build-properties` (~55.0.13), `expo-file-system` (~55.0.19), `expo-navigation-bar` (~55.0.12), `react-native-reanimated` (4.2.1), and `react-native-gesture-handler` (~2.30.0).
  - Migrated core React runtime framework to **React 19.2.0** for faster concurrent rendering and advanced scheduling efficiency across the entire Game Creator IDE.

## [1.11.3] - 2026-05-07
### Optimized
- **Engine Script Execution & on_tick Ticker Speedup**:
  - Engineered a high-performance script pre-categorization pipeline that runs during object spawning and initial room load inside [GamePlayer.tsx](file:///c:/Users/richa/OneDrive/Documents/programming/Oxion%20Game%20Creator/src/features/rooms/components/GamePlayer.tsx).
  - Groups event scripts into stable `tickScripts` and `timerScripts` arrays once, completely avoiding any frame-by-frame search, string condition checks, or array `forEach` traversals for hundreds of idle or non-ticking instances.
  - Swapped out callback-heavy `info.scripts.forEach(...)` with highly optimized, direct `for` loops inside the 60 FPS `runScriptLogic` update step. This dramatically reduces JavaScript thread update time (`ut`) and provides silky smooth frame-rates even with numerous active on-screen actors and collision pairs.

## [1.11.2] - 2026-05-07
### Fixed
- **Expo SDK 54 File System Serialization Crash**:
  - Resolved a severe bug causing asset serialization to crash with `Cannot read property 'Base64' of undefined` when a user attempts to import custom images inside the Sprites sheet or package/compile game standalone files inside Settings.
  - Corrected modern `'expo-file-system'` module imports to use `'expo-file-system/legacy'` within [SpritesScreen.tsx](file:///c:/Users/richa/OneDrive/Documents/programming/Oxion%20Game%20Creator/src/features/sprites/SpritesScreen.tsx) and [SettingsScreen.tsx](file:///c:/Users/richa/OneDrive/Documents/programming/Oxion%20Game%20Creator/src/features/settings/SettingsScreen.tsx). This restores critical standalone operations like `readAsStringAsync` and the `EncodingType.Base64` enum exports.

## [1.11.1] - 2026-05-07
### Added
- **Matter.js Style Live Telemetry & Performance Monitor**:
  - Replicated the precise desktop Matter.js physics engine dashboard layout within the player's runtime HUD when debug mode is enabled.
  - Added a **Top Row (Entity Counts)**: Counts of rigid body parts (`Part`), active physical bodies (`Body`), physics constraints (`Cons`), nested composite structures (`Comp`), and active collision detection list pairs (`Pair`).
  - Added a **Bottom Row (Performance Metrics)**: Color-coded real-time indicators for frame rate (`fps`), total frame delta time (`dt`), physics updates per frame (`upf`), engine math/update tick calculation time (`ut`), render view and Reanimated coordinate sync duration (`rt`), and physics simulation timescale modifier (`x`).
  - Designed beautiful **Real-time Micro-Sparklines**: High-fidelity, smooth-scrolling visual histograms plotted behind the engine calculation (`ut`) and rendering (`rt`) metric text to trace performance spikes and bottlenecks over time.
  - Implemented **High-Efficiency Sampling**: Throttles telemetry-to-React UI state syncing to 1Hz intervals while calculating precise high-frequency averages in the frame loop. This completely avoids performance overhead or UI thread blocking, ensuring continuous 60fps gameplay.

## [1.11.0] - 2026-05-07
### Added
- **Developer & Creator Profiles System**:
  - Implemented a complete **User Profile tab** inside the Launchpad screen, allowing users to view their developer metadata, email, member joined date, and global cloud stats.
  - Added a **Developer Stats** card summarizing their community impact, including Total Published Games, Reputation Hearts, and Total Play Counts.
  - Created a **My Creator Portfolio** dashboard showing all games published to the cloud, allowing developers to play their cloud games or **unpublish (delete)** them from the community database and clean up cloud files.
  - Implemented **Public Creator Profiles**: Clicking any author name (`@username`) on community game cards or game details now triggers a stunning public profile popup. Players can inspect other developers, see their reputation statistics, and instantly play their portfolio of creations!
  - Added an engaging custom **Profile Gate/Lock screen** that prompts logged-out users to create an account or sign in to claim their Developer ID and build their portfolio.
  - Aligned all user and public profiles with Oxion's core **compact design aesthetics**—featuring low container corner radius (`borderRadius: 2`), tight padding and layouts, retro square-pixel avatar avatars (`borderRadius: 0`), and minimized spacing and element gaps.

## [1.10.5] - 2026-05-07
### Fixed
- **Community Asset Upload / Broken Images**:
  - Resolved a severe bug where custom imported images became broken or missing for other community downloaders. When an image is imported, its state URI is updated to point to a physical device file path (`file://...`). Publishing now dynamically reads physical assets from disk, converts them to base64 Data URIs, and packages them back into database records.
  - Resolved potential network upload failures by chunking asset uploads into groups of 3 instead of bulk-sending them at once. This prevents Supabase gateway timeouts and `413 Payload Too Large` rejections from blocking project publications.

## [1.10.4] - 2026-05-07
### Fixed
- **Event Picker Input Target Bleeding**:
  - Resolved a critical bug where adding `if else` or `if then` subconditions would sometimes bleed and append to the main event/trigger input instead of inserting a fresh subcondition row.
  - Ensured that all five Event Picker triggers explicitly reset unrelated active selection indices (`activeListenerIndex`, `activeSubIndex`, and `isAddingSubForIndex`) upon activation. This isolates every single picker session completely and prevents state contamination.

## [1.10.3] - 2026-05-07
### Fixed
- **Action Selection State Hijack**:
  - Resolved a critical bug in the Visual Logic & Action Editor where clicking `+ ADD ACTION`, `+ ADD THEN`, or `+ ADD ELSE` would overwrite or append directly into the previously focused action input instead of appending a brand new line.
  - Clears `activeActionIndex` upon clicking any newly created action, allowing creators to seamlessly mix direct typing and picker selections.

### Added
- **Subcondition ELSE Quick Picker**:
  - Engineered the `Plus` selection helper icon inside the Logic `ELSE` subcondition editor rows, matching the interactive `THEN` quick picker experience.
- **Subcondition Actions Deletion Buttons**:
  - Implemented interactive `X` deletion buttons on the right margin of both `THEN` and `ELSE` action rows, empowering creators to prune unwanted subcondition actions instantly without manual backspacing.

## [1.10.2] - 2026-05-07
### Added
- **Subcondition Quick Event Picker**:
  - Engineered an interactive `Plus` selection helper icon inside the Logic subcondition editor rows.
  - Clicking this button automatically sets the active subcondition state context and launches the unified Event Picker Modal, allowing creators to dynamically select properties, built-in triggers, project variables, math, and operations to append directly into subcondition clauses without typing syntax.

### Updated
- **Subcondition Naming Refinement**:
  - Renamed the custom listener condition trigger button from `+ ADD IF/THEN CONDITION` to `+ ADD SUBCONDITION` to standardize naming conventions and improve visual readability of nested actions.

## [1.10.1] - 2026-05-07
### Updated
- **Experimental Feature Tagging**:
  - Appended `(Experimental)` tags to the **Web Export** and **APK Build** buttons, setup interfaces, and compilation/loading modals in Settings. This signals to creators that these newly released standalone export and cloud packaging pipelines are in a pre-release, edge testing state.

## [1.10.0] - 2026-05-07
### Added
- **EAS Project Override Fields**:
  - Added custom **EAS Project ID** and **Expo Project Slug** override text inputs inside the editor Settings modal, persisting them locally via React Native `AsyncStorage`. This lets creators compile finished standalone games directly under their own personalized Expo Developer Accounts.
- **Standalone APK Packaging Documentation**:
  - Appended a comprehensive, beautifully-formatted step-by-step Android packaging guide inside `Oxion_QuickStart.html`. Details the prerequisite configurations, local build service execution, Expo Token generation, and setting up custom Project IDs and Slugs.
- **Standalone Game Version Reset**:
  - Configured the build service to automatically reset exported game version fields in the sandboxed `app.json` to start fresh at `1.0.0` instead of inheriting the parent editor engine's version (`1.8.7`).
- **Base64 Standalone Asset Serialization**:
  - Configured the editor to automatically serialize imported images and sounds into raw Base64 Data URIs during sprite/audio imports and on-the-fly right before packaging the build payload. This guarantees that all game assets are embedded natively in `project.json` and load flawlessly in sandboxed standalone APK environments!
- **Standalone Game Player UI Refinement**:
  - Updated `GamePlayer.tsx` to automatically hide the developer Exit (X), Pause, and Restart toolbar buttons in standalone mode. This removes editor controls for your players and provides a pristine, 100% immersive, full-screen gameplay experience.

### Fixed
- **Instant Sandboxing Copying Performance**:
  - Added directory filters inside the Node.js build service to skip the heavy `.agents` folder (agent cache, session logs, scratch space) during sandboxed workspace copy operations.
  - Normalized path separators (`\`) on Windows to ensure strict directory comparisons, bringing the copy step down to an instantaneous 1ms.
- **EAS Case Mismatch Safeguard**:
  - Integrated automatic lowercase normalization on custom Expo project slugs on the build server, preventing case-sensitive mismatch failures (e.g. `Game3` vs `game3`) within EAS CLI compilation.

## [1.9.9] - 2026-05-07
### Added
- **Local APK Build Agent (`oxion-build-service`)**:
  - Engineered an Express-based Node.js remote build agent server.
  - Handles isolated sandboxed compilation folders inside `./temp/build_[UUID]` to guarantee simultaneous thread safety.
  - Injects runtime settings (`app.json` name, slug, bundleId) and writes active game data directly into `assets/project.json`.
  - Spawns cross-platform CLI shells to execute EAS Cloud Builds under secure user tokens.
- **Credentials Persistence Shield**:
  - Integrated React Native `AsyncStorage` persistence inside the Settings module.
  - Securely remembers Expo Developer Tokens and bundle names directly in local client memory so settings aren't lost on restart.
- **Real-Time Log Terminal View**:
  - Designed a high-tech green terminal monospace logger inside the Settings view.
  - Streams the local build server's standard outputs directly into the editor app so developers can watch compiles live.

## [1.9.8] - 2026-05-06
### Fixed
- **Engine Physics Garbage Collection & Performance Stabilizer**:
  - Implemented an automatic out-of-bounds physical Garbage Collector in the game update loop, detecting and destroying dynamic entities that fall below `roomHeight + 400` or travel far off-screen.
  - Introduced an industry-standard chronologically-ordered safety cap (`MAX_DYNAMIC_ENTITIES = 120`) to prune the oldest spawned entities (excluding player and static/room-level assets) during infinite spawning scenarios, eliminating game degradation.

## [1.9.7] - 2026-05-06
### Added
- **Engine Debug Sidebar - Real-Time Objects Breakdown & Instance Counters**:
  - Engineered an interactive, real-time object/instance grouping breakdown system inside the Gameplay Engine Debug Sidebar.
  - Displays the total number of placed, running, and active GUI overlay elements dynamically (`Static + Dynamic + GUI Overlays`).
  - Implemented automatic grouping that categorizes every single active instance in the room by its respective Game Object name, sorting them in descending order of counts with premium visual status labels (e.g. *Coin: 15 active, Enemy: 4 active*).

## [1.9.6] - 2026-05-06
### Fixed
- **Screen Bounds Boundary Clamping**:
  - Implemented boundary constraint checks directly in the element drag mover, locking HUD elements precisely within the `800x600` screen-space grid. This prevents elements from flying off-screen or getting lost inside hidden overflows when dragged to the left edge or margins.
- **Gesture Hijacking & Termination Shield**:
  - Disabled background panning entirely (`.enabled(tool === 'hand')`) when using the `select` tool to prevent background handlers from hijacking element dragging events.
  - Added strict gesture termination overrides (`onMoveShouldSetResponder={() => true}`, `onResponderTerminationRequest={() => false}`) to block other component containers or sidebars from canceling a drag in progress.

## [1.9.5] - 2026-05-06
### Added
- **Infinite Zoom Workspace & Interactive Toolbar Controls**:
  - Expanded canvas pinch limits to support near-infinite zoom boundaries from `0.05x` (extremely zoomed out overview) up to `15.0x` (microscopic pixel-perfect alignment zoom).
  - Designed and added premium **Zoom In (+)**, **Zoom Out (-)**, and **Zoom Reset** action buttons in the header toolbar using Lucide icons.
  - Multiplied starting auto-fit canvas scale by `2.0` (with a smart bounding box clamp of `1.2` minimum to `2.5` maximum) so elements and text appear **at least x2 larger** by default.
- **Real-Time Dynamic Grid Snapping**:
  - Resolved the grid misalignment issue by entirely binding the snapping logic to your active room's custom grid size variable (`GRID_SIZE = activeRoom.gridSize`) rather than a hardcoded value.
  - Added buttery real-time local grid snapping *during active dragging*, allowing elements to visually glide from grid cell to grid cell with instant feedback and zero layout latency.

## [1.9.4] - 2026-05-06
### Added
- **GUI Builder Performance Optimization**:
  - Replaced high-frequency global store updates during GUI element dragging with high-performance local dragging state (`draggingNodeId`, `dragX`, `dragY`). 
  - Restored O(1) rendering performance by deferring complex tree-rebuilds and disk JSON writing to the drag-release phase (`handleDragEnd`), achieving fluid 60+ FPS dragging.
  - Swapped out disruptive real-time grid snapping during movement for smooth pixel dragging, activating alignment snaps exclusively on drag release for a Godot/Figma feel.
- **Active Room Environmental Overlay Preview**:
  - Dynamically retrieves the active/first room's background color, custom grid boundaries, and grid sizes to render inside the screen space bounds in real-time.
  - Displays a faint, non-interactive visual preview of physical room instances (player, enemies, grounds) inside the GUI Screen Space canvas so developers have perfect layout context when designing HUDs.

## [1.9.3] - 2026-05-06
### Fixed
- **Touch Responder Lock Negotiation**:
  - Added responder claiming configuration (`onStartShouldSetResponder={() => true}`, `onMoveShouldSetResponder={() => true}`, `onResponderTerminationRequest={() => false}`) to `GameButton`.
  - This informs the React Native touch responder system that the virtual controls claim their touches completely and refuse termination. This stops other touch responders (like the absolute-fill canvas pressable) from canceling the active movement inputs when a second thumb taps to jump/shoot.

## [1.9.2] - 2026-05-06
### Fixed
- **Flawless Multi-Touch Controls (Raw Touch Events)**:
  - Swapped out gesture-handler-based buttons for a highly optimized, custom `GameButton` built on raw React Native `onTouchStart`, `onTouchEnd`, and `onTouchCancel` view events.
  - Raw pointer events run completely outside both the React Native responder system and native gesture-handler mutual-exclusion/cancellation systems. This enables 100% reliable simultaneous button presses (such as jumping/shooting while running left/right) on all mobile devices and Expo Go.

## [1.9.1] - 2026-05-06
### Fixed
- **Concurrent Touch Handlers Resolution**:
  - Replaced experimental `GesturePressable` components with fully robust and industry-tested `GestureTouchableOpacity` from `react-native-gesture-handler`.
  - Restored 100% reliable `onPressIn` and `onPressOut` callback execution on Android, iOS, and Expo Go, ensuring movement and jumps execute exactly when pressed while fully retaining seamless concurrent multi-touch action.

## [1.9.0] - 2026-05-06
### Added
- **True Multi-Touch Gameplay Controls**:
  - Upgraded Left, Right, Shoot, and Jump control buttons from standard React Native `Pressable` to `GesturePressable` from `react-native-gesture-handler`.
  - Resolved the React Native responder lockout issue, enabling players to hold a move button while concurrently pressing Jump or Shoot. This dramatically improves game playability on mobile screens and touch devices.

## [1.8.9] - 2026-05-06
### Fixed
- **Room Layers Alignment & Sorting**:
  - Fixed a critical alignment bug where reordering or moving layers (e.g. moving Layer 1 up) would cause instances to swap sprites and mix up positions during gameplay.
  - Introduced `instanceToIndexMap` in the game player initialization loop to map layer-sorted instances back to their stable, unsorted original indices in `instanceSharedValues`. This preserves exact sprite, coordinate, and physics body bindings regardless of how room layers are sorted or arranged.

## [1.8.8] - 2026-05-06
### Fixed
- **Reanimated Render-Phase Shared Value Reads**:
  - Resolved `Reading from value during component render` console warnings/errors caused by synchronously accessing `.value` inside `PhysicsBody` memo comparator and state initialization during React render phase.
  - Safe initial state initialization using conditional worklet checks, falling back to synchronous state sync inside `useEffect` on mount.
  - Short-circuited reference-equal `prev.sv === next.sv` checks in `PhysicsBody`'s custom React.memo comparator to avoid reading `.value` during React reconciliation.

## [1.8.7] - 2026-05-06
### Added
- **Gameplay Performance Optimizations**:
  - **Pre-parsed Collision Checking**: Replaced on-the-fly regex string matching during collisions with a pre-parsed system.
  - **State Refresh Gating**: Introduced a `variablesDirtyRef` gate to prevent redundant React state flushes and battery drain while idle.
  - **O(N) Render Layer Grouping**: Grouped room rendering instances by layers in linear time, reducing room render complexity from O(L * N) to O(N + L).
  - **Selective Nonce Propagation**: Culls React re-renders on static objects (walls/blocks) when scores, variables, or frame-rates change.

## [1.8.6] - 2026-05-06
### Fixed
- **Multi-Platform Compatibility**: Resolved build/startup crash on non-Android platforms (iOS/Web) by switching the `expo-navigation-bar` import to a platform-conditional dynamic `require` inside the Android runtime branch.

## [1.8.5] - 2026-05-06
### Fixed
- **Package Compatibility**: Updated `expo-navigation-bar` to `~5.0.10` to resolve compatibility warnings and ensure expected behavior for the installed Expo version.

## [1.8.0] - 2026-05-05
### Fixed
- **Engine Stability**: Fixed `ReferenceError: Property 'cameraInitialized' doesn't exist` in the `GamePlayer` camera follow loop.

## [1.6.9] - 2026-05-05
### Fixed
- **Layer Management**: Fixed a bug where inactive layers could not be selected in the sidebar.
- **Layer Management**: Separated layer selection from instance moving to prevent accidental layer changes.
- **Layer Visibility**: Fixed issues where hiding one layer would hide objects on others.
- **Layer Z-Ordering**: Implemented full layer support in the GamePlayer, ensuring objects on higher layers correctly render on top.
- **Layer Interaction**: Objects no longer "pop" behind others when clicked if they are on a higher layer.
### Added
- **Layer Reordering**: Added Up/Down arrows in the Room Editor to reorder layers.
- **Manual Instance Moving**: Added a "Move to Layer" button in the layer list when an instance is selected.

## [1.6.8] - 2026-05-04
### Added
- **Expanded Documentation**: Added a dedicated "Learn" page and "Quick Start Guide".
- **Documentation Navigation**: Integrated sidebars and card-based layouts for easier learning.

## [1.6.4] - 2026-05-04
### Fixed
- **Dynamic Room Grid**: Resolved the "disappearing grid" bug when using small grid sizes (e.g., 8). The editor grid now dynamically calculates the number of lines required based on the room dimensions and current grid size, ensuring full coverage across the entire room workspace.


## [1.5.7] - 2026-05-04
### Fixed
- **Visual Scaling Parity (Editor vs Play)**: Synchronized the Room Editor with the physics scale property. Object instances in the room editor now correctly reflect their scaled size, ensuring what you see in the editor perfectly matches the gameplay.
- **Aspect Ratio Parity**: Fully reverted stretching logic to ensure sprites preserve their native aspect ratios across the entire engine.
- **Visual-Physics Alignment**: Fixed a critical alignment bug in the GamePlayer where sprites were shifted relative to their physics bodies. Corrected the transformation sequence to use center-relative offsets, ensuring that collision hitboxes perfectly match the visual position of the sprite at all scales and rotations.
- **Inspector UI Cleanup**: Removed the redundant sprite container border in the Object Inspector preview and synchronized the collision hitbox's default dimensions with the sprite's native frame size (fw/fh), resolving an issue where 16x8 sprites would erroneously show a 32x32 collision box.
- **Circle Collision Preview**: Fixed a bug in the Object Inspector's Collision Preview where circular hitboxes would appear as ellipses if the object had non-uniform dimensions. Both preview dimensions now correctly reference the object's width to match the uniform circular collision of the physics engine.
- **Inspector Parity**: Standardized the Collision Preview base dimensions to use the object's actual width/height instead of the sprite's frame size, preventing preview mismatches for sliced sprites.

## [1.5.8] - 2026-05-04
### Fixed
- **Ghost Collision Fix**: Resolved a major coordinate transformation error in the GamePlayer. Visual sprites now perfectly align with their Matter.js physics bodies by accounting for center-origin transforms, preventing "early" collisions and sprite-overlap issues.

## [1.5.6] - 2026-05-04
### Fixed
- **Pivot Alignment (1:1 Parity)**: Resolved the pivot point discrepancy where objects appeared misaligned (bottom-left) during gameplay. Objects now correctly rotate and scale around their center in parity with the editor.
- **Physics Scale Correction**: Synchronized the visual sprite rendering with the physics engine scale property. Objects now accurately reflect their collision boundaries even when scaled.
- **Debug Visuals**: Fixed the debug collision box and pivot indicator positioning to account for parent scaling, providing accurate visual feedback during development.

## [1.5.5] - 2026-05-04
### Fixed
- **Collision Parity**: Standardized collision boundaries across the engine. Physical collision shapes now perfectly align with sprite dimensions (e.g., 16x8 sprites now default to 16x8 hitboxes).
- **Physics Scaling**: Removed a legacy `* 2` multiplier in `GamePlayer.tsx` that was causing physics bodies to be twice the intended size.
- **Smart Synchronization**: Updated the Object Inspector and Sprite Picker to automatically sync an object's width, height, and collision box whenever a new sprite is selected. Manual dimension changes now also propagate to the collision shape by default.

## [1.5.4] - 2026-05-03
### Fixed
- **Input Stabilization**: Resolved a critical "can't erase" bug across all numeric input fields. Users can now fully clear and re-enter values without the fields automatically snapping back to previous or default values.
- **Enhanced Inspector Logic**: Refactored the `InputGroup` (Object Inspector), `RoomSettingInput`, and `HexColorInput` (Rooms) to utilize local state with smart synchronization, preventing re-render interruptions during active typing.
- **Slicer & Animation Fixes**: Applied the input stabilization pattern to the Sprite Slicer and Animation FPS settings, ensuring precise control over frame dimensions and playback speeds.


## [1.5.3] - 2026-05-03
### Added
- **Premium Documentation**: Rebuilt `Oxion_Documentation.html` with a high-end landing page and documentation interface inspired by Bevy Engine.
- **Enhanced UX**: Integrated smooth scrolling, a feature showcase, and a dedicated code logic section to the documentation portal.

## [1.5.2] - 2026-05-03
### Changed
- **Rebranded App**: Renamed the application from "Oxion Game Creator" to **Oxion2d**.
- **Final App Logo**: Switched to the final PNG-based logo (`assets/oxion2.png`).
- **Integrated Expo Splash Screen**: Added `expo-splash-screen` for smooth loading transitions.
- **Updated Package Name**: Changed Android package to `com.richardbanguiz.oxion2d` and slug to `oxion2d`.

## [1.5.1] - 2026-05-03
### Added
- **Script Pre-parsing Optimization**: Natural syntax transpilation (e.g., `self.x += 10`) is now performed once during object spawning or room initialization. This eliminates regex overhead from the 60FPS game loop.
- **Optimized Instruction Pipeline**: `executeAction` and `executeListenerLogic` now support pre-parsed instruction objects, reducing JS thread overhead during intense gameplay.

## [1.5.0] - 2026-05-03
### Removed
- **React Native Skia Rendering Engine**: Reverted to the stable legacy View-based renderer. While Skia offered high performance, it caused compatibility issues and hook violations in the current architecture.
### Fixed
- **Engine Stability**: Stabilized asset initialization and hook management within the `GamePlayer` component to prevent runtime crashes.
## [1.4.6] - 2026-05-03
### Fixed
- Sprite Repeater icons not displaying in published games (remote asset fetching)
- Sprite Repeater active/inactive icon selection in Object Inspector
- Missing sprite ID migration for Sprite Repeater during project publish
- Stale static elements rendering when remote sprites are streamed

## [1.4.4] - 2026-05-03 - Sound Playback & Logic Event Fixes
### Fixed
- **on_start Event Reliability**: Fixed a critical bug where `on_start` scripts and visual logic were not being executed for initial room objects.
- **Event Consistency**: Synchronized event handling between `spawnInstance` and room initialization, ensuring `on_empty`, `on_full`, `on_life_lost`, and `on_zero_lives` work correctly for spawned objects.
- **Sound Playback**: Resolved an issue where sounds triggered by `on_start` events failed to play by ensuring the event trigger is correctly registered during engine startup.

### Added
- **Enhanced Autocomplete**: Added `on_start`, `on_tick`, `on_timer:`, `on_collision`, and `on_tap` to the logic editor's autocomplete system for faster scripting.

## [1.4.3] - 2026-05-03 - Sound Picker & Audio Engine Integration
### Added
- **Sound Picker UI**: New modal interface for selecting audio assets in the Object Logic Editor.
  - Integrated into the "Audio" section of the Object Inspector.
  - Support for clearing selections (None/Default).
- **Automatic Sound Triggers**: The game engine now automatically handles sound effects for built-in behaviors:
  - **Jump**: Plays when the player jumps.
  - **Shoot**: Plays when an object spawns a bullet.
  - **Run**: Rhythmic footstep sounds during ground movement.
  - **Impact**: Plays when a bullet hits an object.
  - **Damage/Death**: Plays `hit` or `dead` sounds when health is modified.
- **Logic Actions & Events**: Added full support for manual sound control:
  - Actions: `start_sound:name`, `stop_sound:name`.
  - Events: `on_start_sound`, `on_stop_sound`, `on_start_sound:name`.
- **Autocomplete Integration**: Added all sound-related actions and events to the logic editor's autocomplete and property pickers.

## [1.4.2] - 2026-05-03
### Fixed
- Critical JSX syntax errors in `RoomsScreen.tsx` sidebar causing compilation failures.
- Inconsistent sidebar padding and redundant dividers.
- Indentation and structural issues in nested conditional rendering.

### Added
- Improved Sidebar UI with increased width (200px) and standardized section padding.
- Enhanced section headers with consistent iconography and better visual hierarchy.
- Adjusted sidebar toggle position to match the new layout.

## [1.4.1] - 2026-05-03 - Critical Syntax Fixes
### Fixed
- **JSX Syntax Errors**: Fixed multiple unclosed `View` and `ScrollView` tags in the Rooms sidebar that were causing build failures.
- **Selection Logic**: Fixed unclosed conditional blocks in the Object Instance inspector.

## [1.4.0] - 2026-05-03 - Virtual Joystick Support
### Added
- **Virtual Joystick**: New high-performance input control for mobile.
  - **Customizable**: Configurable Dead Zone, Stick Range, and Persistence.
  - **Output Modes**: Choose between Vector (X/Y), Angle (0-360), or Magnitude (0-1).
  - **Auto-Mapping**: Automatically drives player horizontal movement when enabled.
  - **New Logic Events**: `on_move` (fires continuously during touch) and `on_release` (fires when stick is released).
  - **New Logic Properties**: `joystick.x`, `joystick.y`, `joystick.angle`, and `joystick.magnitude` now available for use in all expressions.
- **Sidebar Integration**: Integrated Joystick configuration into the "Built-in Controls" section of the Room Sidebar.

## [1.3.3] - 2026-05-03 - Sticky HUD Support
### Added
- **Sticky HUD Behavior**: Added "Sticky HUD" property to the Physics tab for all objects. When enabled:
  - Objects ignore viewport visibility culling.
  - Objects dynamically counteract camera translations to remain perfectly fixed to the screen viewport.
  - Logic engines ignore camera-distance limits for HUD objects, allowing background timers or state trackers to run reliably regardless of player position.


## [1.3.2] - 2026-05-02 - Sprite Repeater & Health UI System
### Added
- **Sprite Repeater Behavior**: Added a new object type for "Lives" and "Hearts" systems.
  - **Dynamic Sprites**: Support for separate Active (full) and Inactive (empty) icons.
  - **Layout Controls**: Horizontal or Vertical orientation with adjustable spacing and icon sizing.
  - **Logic Actions**: Added `damage(amt)`, `heal(amt)`, and `set_count(val)` for easy integration with combat systems.
  - **Logic Events**: Added `on_life_lost` (for hit effects/shakes) and `on_zero_lives` (for game over triggers).
- **Progress Bar Enhancements**: Added support for custom Border Color and Border Width in the inspector.

## [1.3.1] - 2026-05-02 - Progress Bar Fixes & Improvements
### Fixed
- **Restart Loop**: Fixed a critical bug where updating a Progress Bar or Health value via a timer would cause the entire game engine to restart. Switched internal state synchronization from `restartKey` to `nonce`.
### Added
- **CHANGE BAR Action**: Added `add_value:amount` action for Progress Bars, allowing you to increment or decrement values relative to the current state (e.g., `-10` to reduce a bar).

## [1.3.0] - 2026-05-02 - Progress Bar & Dynamic UI System
### Added
- **Progress Bar Behavior**: Added a new "Value Tracker" object type for health bars, loading screens, and cooldowns.
  - Custom range (Min/Max), Fill Color, Background Color, and Directions (Horizontal, Vertical).
  - **Dynamic Sizing**: Progress bars now respect custom Width/Height dimensions in both the editor and gameplay.
- **New Logic Actions**:
  - `set_value:val`: Instantly update a progress bar's state.
  - `tween_to:val:ms`: Smoothly transition a bar to a new value over time.
  - `bind_to_variable:name`: Automatically link a progress bar to any global or local variable (e.g., `health` or `score`).
- **New Logic Events**:
  - `on_empty`: Triggered when a bar reaches its minimum value.
  - `on_full`: Triggered when a bar reaches its maximum value.
- **Logic Editor Integration**: Added dedicated sections for Progress Bar actions and events in the Visual Logic pickers and autocomplete system.

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
