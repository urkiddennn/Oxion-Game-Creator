# Changelog - Oxion Game Creator

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
