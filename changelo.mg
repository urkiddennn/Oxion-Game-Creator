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
