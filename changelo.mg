# Changelog

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
