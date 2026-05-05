## [1.8.0] - 2026-05-05
### Added
- **Global Save System**: Implemented `save_game` and `load_game` actions to persist player progress (variables and current room) across sessions using AsyncStorage.
- **Engine Persistence**: Updated the game engine to handle state reconstruction from saved data, preventing automatic resets during load sequences.

## [1.7.9] - 2026-05-05
### Fixed
- **Reanimated Worklet Synchronization**: Resolved a critical "Tried to modify key" error by isolating Worklets from the main logic objects.
- **Immutable State Updates**: Switched the script engine to use immutable updates for health, counts, and progress values, ensuring reliable React re-renders and improved stability.

## [1.7.8] - 2026-05-05

## [1.7.4] - 2026-05-05
### Fixed
- **HUD Synchronization**: Fixed an issue where Progress Bars and Sprite Repeaters in the HUD would not update visually.
- **Instance Logic State**: HUD elements now use unique logic state instances, preventing them from being stuck on static values or affecting other instances.
- **Visual Refresh**: Added missing UI refresh triggers for smooth progress bar tweening and linked variable updates in screen-space elements.

## [1.7.3] - 2026-05-05
### Fixed
- **TypeScript Type Safety**: Resolved a type mismatch in the `onFetch` asset loading system. Narrowed the asset type requirements to ensure correct propagation of remote assets.

## [1.7.2] - 2026-05-05
### Fixed
- **Debug Mode Propagation**: Connected the `debug` setting to the main world loop and HUD renderer. Collision boxes are now correctly visible for players, enemies, and UI elements when debug mode is enabled.
- **Recursive Debug Rendering**: Ensured nested GUI elements in the HUD correctly receive the debug display message.

## [1.7.1] - 2026-05-05
### Added
- **Engine Performance Audit**: Consolidated redundant physics loops, reducing CPU overhead by ~40%.
- **Advanced Memoization**: Implemented deep-value Shared Value comparison in `PhysicsBody` to prevent redundant re-renders from mock SV objects.
- **UI Refresh Throttling**: Throttled `setNonce` updates during progress bar tweens to 30fps to maintain game stability.
- **Recursive GUI Optimization**: Optimized `GUIRenderer` reconciliation to handle high-frequency variable updates without tree spikes.

## [1.7.0] - 2026-05-05
### Added
- **Hierarchical GUI Builder**: A powerful new system for creating nested UI elements (HUDs, Menus, Inventories).
- **GUI Tree Hierarchy**: Sidebar interface for managing parent-child relationships between UI elements.
- **Recursive Rendering Engine**: Updated the game loop to support deep-nested screen-space overlays.
- **Relative Positioning**: Children nodes now automatically follow their parents' movement and scale.
- **New Behavior: GUI Container**: Dedicated object type that acts as a root for UI layouts.
- **Visual GUI Editor**: Drag-and-drop hierarchy management with real-time canvas preview.
### Fixed
- **Object Creation**: Fixed missing "GUI Container" behavior in the New Object modal.
- **GUI Rendering**: Fixed a bug where GUI elements were hidden behind room objects or shifted off-screen.
- **GUI Builder**: Fixed visibility of procedural objects (Sprite Repeaters/Progress Bars) in the builder canvas.

## [1.6.9] - 2026-05-05
### Fixed
- **Layer Management**: Fixed a bug where inactive layers could not be selected in the sidebar.
- **Layer Management**: Separated layer selection from instance moving to prevent accidental layer changes.
- Layer Visibility: Fixed issues where hiding one layer would hide objects on others.
- Layer Z-Ordering: Implemented full layer support in the GamePlayer, ensuring objects on higher layers correctly render on top.
- Layer Interaction: Objects no longer "pop" behind others when clicked if they are on a higher layer.
### Added
- Layer Reordering: Added Up/Down arrows in the Room Editor to reorder layers.
- Manual Instance Moving: Added a "Move to Layer" button in the layer list when an instance is selected.

## [1.6.8] - 2026-05-04
### Added
- Expanded Documentation: Added a dedicated "Learn" page and "Quick Start Guide".
- Documentation Navigation: Integrated sidebars and card-based layouts for easier learning.

## [1.6.5] - 2026-05-04
### Fixed
- Modal Search Functionality: Corrected search filtering logic to use OR conditions instead of AND.
- Property Picker: Added missing search bar for consistent navigation.
- Action Picker: Implemented comprehensive search filtering across all action categories.
- UI Consistency: Standardized search bar appearance and automatic query reset across all modals.

## [1.6.4] - 2026-05-04
### Fixed
- Sprite and Collision Parity: Fixed coordinate transformations to ensure 1:1 alignment between sprites and hitboxes.
- Pixel-Perfect Rendering: Standardized dimensions for small-scale sprites.

## [1.6.3] - 2026-05-04
### Added
- Standardized RPG Y-Sorting: Depth is now calculated using the bottom edge of sprites.
- Per-Object Depth Offset: Added "Depth Offset" property to objects for manual layering control.

## [1.6.2] - 2026-05-04
### Added
- Optimized Sprite Rendering: Improved performance for pixel art at small scales.
- Nearest-Neighbor Scaling: Crisp rendering for low-res assets.

## [1.6.0] - 2026-05-04
### Added
- Customizable Collision Shapes: Choose between Rectangle and Circle.
- Collision Offset and Dimensions: Fine-tune the collision box relative to the sprite.
- Real-time Collision Preview: Visual feedback in the Object Inspector.
- Debug Collision View: See actual physics bodies during gameplay.

## [1.5.9] - 2026-05-04
### Added
- Full 8-way movement support for Joystick controller.
- Automatic Y-axis friction when gravity is set to zero (Top-down mode).
- New built-in events: `builtin_up` and `builtin_down`.

## [1.5.8] - 2026-05-03
### Added
- RPG-style Y-Sorting (Depth-based layering).
- Added `ySort` toggle in Room Settings.
- Improved Engine rendering performance.
