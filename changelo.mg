# Changelog

## [1.5.7] - 2026-05-04
### Fixed
- **True Nearest-Neighbor Rendering**: Rewrote `pixelsToBmp` to generate BMPs at the exact display resolution. Each source pixel maps to a precise rectangular block via integer division, so the `<Image>` component renders 1:1 with zero scaling — completely eliminating bilinear blur on all platforms including 16x16 sprites.

## [1.5.6] - 2026-05-04
### Fixed
- **Memory Alignment**: Fixed a `RangeError` in the BMP generation pipeline by ensuring the `Uint32Array` offset is 4-byte aligned (padded BMP header to 72 bytes).

## [1.5.5] - 2026-05-04
### Added
- **Optimized Nearest Neighbor Scaling**: Implemented a high-performance BMP generation pipeline using `Uint32Array` and fast block filling.
- **Pixel-Perfect Clarity**: Increased internal upscaling factors for small (16x16) sprites to ensure sharpness even with bilinear filtering.
- **Native Scaling Performance**: Added `resizeMethod="scale"` to Android image components to leverage native nearest-neighbor scaling where supported.

## [1.5.3] - 2026-05-03
### Fixed
- **Programmatic Immersive Mode**: Integrated `expo-navigation-bar` and enforced `overlay-swipe` (sticky-immersive) behavior in `App.tsx` to reliably hide the system navigation bar on Android.
- **Image Rendering Distortion**: Resolved a bug where large images appeared correctly in the editor but shrank to a square during gameplay by allowing objects to fall back to natural sprite dimensions.
- **Physics Synchronization**: Ensured physics body dimensions match instance-specific sizing in the room settings.

## [1.5.2] - 2026-05-03
### Changed
- **Rebranded App**: Renamed the application from "Oxion Game Creator" to **Oxion2d**.
- **Final App Logo**: Switched to the final PNG-based logo (`assets/oxion2.png`).
- **Integrated Expo Splash Screen**: Added `expo-splash-screen` for smooth loading transitions.
- **Updated Package Name**: Changed Android package to `com.richardbanguiz.oxion2d`.

## [1.5.1] - 2026-05-03
### Added
- **Script Pre-parsing Optimization**: Natural syntax transpilation (e.g., `self.x += 10`) is now performed once during object spawning or room initialization. This eliminates regex overhead from the 60FPS game loop.
- **Optimized Instruction Pipeline**: `executeAction` and `executeListenerLogic` now support pre-parsed instruction objects, reducing JS thread overhead during intense gameplay.

## [1.5.0] - 2026-05-03
### Removed
- React Native Skia Rendering Engine (reverted to legacy stable renderer for better compatibility)
### Fixed
- Stabilized asset initialization and hook management within the GamePlayer component

## [1.4.6] - 2026-05-03
### Fixed
- Sprite Repeater icons not displaying in published games (remote asset fetching)
- Sprite Repeater active/inactive icon selection in Object Inspector
- Missing sprite ID migration for Sprite Repeater during project publish
- Stale static elements rendering when remote sprites are streamed

## [1.4.4] - 2026-05-03
- Debugging Object Sound Initialization
- OnStart Sound Triggering fixed
