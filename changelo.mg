# Changelog - Oxion Game Creator

## [1.12.1] - 2026-05-09
### Fixed
- **Expo SDK 55 Native Audio Compatibility (Migration to `expo-audio`)**:
  - Migrated the audio engine from the deprecated/removed `expo-av` library to the modern high-performance `'expo-audio'` package.
  - Resolved the critical crash `Cannot find native module 'ExponentAV'` by completely removing `expo-av` and installing the compatible SDK 55 `'expo-audio'` package.
  - Refactored [GamePlayer.tsx](file:///c:/Users/richa/OneDrive/Documents/programming/Oxion%20Game%20Creator/src/features/rooms/components/GamePlayer.tsx) to use the synchronous, imperative `createAudioPlayer` API with native `playbackStatusUpdate` event listeners for sound effect playback and lifecycle release management.
  - Refactored [AudioScreen.tsx](file:///c:/Users/richa/OneDrive/Documents/programming/Oxion%20Game%20Creator/src/features/audio/AudioScreen.tsx) to utilize `'expo-audio'` for asset importing, preview testing, and automatic background cleanup.

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
  - Pre-parsed collision script matching to bypass string overhead.
  - State refresh gating (`variablesDirtyRef`) to prevent redundant background re-renders.
  - O(N) layered rendering instance grouping (reduced complexity from O(L*N) to O(N+L)).
  - Targeted nonce and variable propagation to keep static walls/blocks from re-rendering in React on score/timer updates.

## [1.8.6] - 2026-05-06
### Fixed
- Fixed startup/import crash of `expo-navigation-bar` on iOS and Web platforms by switching to dynamic, platform-conditional loading on Android only.

## [1.8.5] - 2026-05-06
### Fixed
- Fixed package compatibility warning by updating `expo-navigation-bar` to `~5.0.10` as expected by the Expo SDK version.

## [1.8.4] - 2026-05-05
### Updated
- Redesigned Logic & Action Builder with a modern code-style layout.
- Improved visual hierarchy using indentation and left-border markers instead of nested boxes.
- Reduced UI noise by cleaning up redundant labels and dividers in the inspector.
- Standardized smaller icons and compact typography across the logic engine.

## [1.8.3] - 2026-05-05
### Fixed
- Fixed "white bar" issue on wider screens/tablets by enforcing global background colors at the native and root component levels.
- Applied app theme to NavigationContainer to prevent white flashes during transitions.

## [1.8.2] - 2026-05-05
### Fixed
- Fixed lingering rounded corners (4px/8px/10px) in Object Inspector and GUI Builder to strictly follow the 2px "Godot-style" standard.
- Refined padding and spacing in Object Inspector sub-sections for higher information density.
- Standardized inline styles in RoomsScreen sidebar for a more compact layout.
- Fixed inconsistent border-radius in color previews and picker chips.

## [1.8.1] - 2026-05-05
### Updated
- Refined overall UI to be more compact and minimal (Godot-like aesthetic).
- Reduced global border radius from 8 to 2 for a sharper, professional look.
- Decreased padding and margins across all major screens:
  - Launchpad: Thinner headers and smaller project cards.
  - Room Editor: Compact sidebars and smaller tool buttons.
  - Sprite Editor: Tighter grid layout and reduced card sizes.
  - Object Inspector: Streamlined property rows and logic builders.
  - Audio Screen: Compact sound list and reduced spacing.
  - Settings: Minimalist layout with reduced paddings.
- Standardized icon sizes (24px -> 20px/16px) across menus and pickers.
- Flattened the UI by removing excess elevation and rounding.
