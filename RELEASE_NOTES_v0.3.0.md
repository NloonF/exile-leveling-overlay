# Exile Leveling Overlay v0.3.0

This release expands the overlay into a more complete in-game companion, with an interactive passive tree, flexible controls, and a Steps overlay that adapts cleanly to routes of any size.

## Highlights

- Added a dedicated passive-tree overlay for imported Path of Building builds.
- Added independent passive-tree visibility, opacity, size, position, zoom, and panning controls.
- Added configurable keyboard shortcuts, including an in-app shortcut recorder.
- Added hold-to-interact support for hovering and navigating the passive tree.
- Added a clickable completion control to the Steps overlay. Manually completing a step pauses auto-progress so the route remains predictable.
- Added corner resizing to both overlay windows and unified their layout-editing workflow.

## Steps overlay improvements

- Oversized checkpoints now automatically scale their contents to fit the chosen overlay dimensions.
- The overlay no longer requires scrolling while playing.
- Short checkpoints remain at full size, while unusually detailed checkpoints shrink only as much as necessary.
- Manually resized dimensions are now preserved after finishing layout editing.
- Route details retain imported build rewards, gem choices, quest hand-ins, purchases, and other checkpoint subtasks.

## Passive tree improvements

- Passive trees are bundled correctly in production and NSIS installations.
- Zoom range is now 25%–500%.
- The tree can be dragged with the mouse while interaction mode is held.
- Node tooltips, hover behavior, viewport sizing, and packaged tree rendering have been improved.

## Interface and reliability

- Overlay settings were reorganized into clearer monochrome sections.
- Overlay visibility and editing controls now show their active state.
- Auto-progress starts disabled, while the Steps overlay starts enabled.
- Status messaging now reports when the app is waiting for Path of Exile to launch.
- Background window synchronization no longer interrupts active overlay resizing.

## Installation

Download and run `Exile Leveling Overlay_0.3.0_x64-setup.exe` from the assets below.

Windows may display a SmartScreen warning because this preview release is not yet code-signed.

## Notes

- Windows only.
- Code signing is planned for a later release.
- The integrated log reader monitors Path of Exile's `Client.txt`; no separate helper installation is required.

Thanks to the original Exile Leveling project and to `exile-log-api` for the foundations that made this fork possible.
