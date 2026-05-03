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
