# Desktop architecture baseline

The React frontend remains the owner of routes, guide progress, and build
profiles. Jotai atoms in `web/src/state` persist those choices in browser
storage. The existing progression write path is `activeEdgeAtom`: it compares
the next route area with the helper's generated-area message.

All helper wire-format knowledge belongs in
`web/src/integrations/logApiProtocol.ts`. `logApiClient.ts` owns the WebSocket
lifecycle and bounded exponential reconnect schedule. It emits only typed
events and redacted diagnostics. `areaProgression.ts` contains the pure
one-edge progression decision used by the Jotai write atom.

Automatic progression is opt-in and persisted. Pausing is session-scoped:
the helper remains connected and diagnostics continue updating, but area
events do not reach the progression atom.

The Tauri native layer owns desktop lifecycle concerns: dashboard/tray,
overlay windows, native preferences, global shortcuts, and Windows
game-window tracking. It must not own a second route engine.

For v1, users keep selecting/importing routes and profiles through the
existing dashboard UI. The future overlay will consume a derived snapshot
rather than reading guide atoms directly.

## Overlay snapshot pipeline

`overlaySnapshot.ts` is a pure adapter from the current route, active edge,
auto-progress state, and helper state to a versioned `OverlaySnapshot`.
`overlaySnapshotAtom` supplies game-data labels but contains no second
progression engine.

For each area checkpoint, the snapshot includes both its nested hints and the
edge-less route tasks that follow it before the next area checkpoint. This is
how town actions such as quest hand-ins remain visible as overlay details.
Imported-build `gem_step` entries are converted into `Take`/`Buy` details
using the shared gem data. Details are not count-limited; the native overlay
window grows to the available monitor height as its content changes.

The dashboard publishes each meaningful snapshot through a Tauri command.
The Rust `SnapshotCache` retains only the latest JSON value. A newly created
overlay window will call `get_overlay_snapshot` before subscribing to later
updates, so it cannot start blank after recreation. Until the overlay window
exists, the dashboard's expandable snapshot preview exposes the same object
for manual verification.

## Overlay window

The `overlay` Tauri window loads `#/overlay` and renders only the cached or
published `OverlaySnapshot`; it does not mount the dashboard, WebSocket
client, or guide store. The window is transparent, frameless, always on top,
hidden from the taskbar, and mouse-click-through by default.

The dashboard owns persisted scale, opacity, and dragged-position preferences.
It can show/hide the overlay and enter a deliberate 30-second edit mode. Edit
mode temporarily accepts pointer input and then returns to click-through in
the Rust process even if the dashboard is hidden. While editing, the overlay
header starts native Windows dragging. Finishing or timing out publishes
game-client-relative coordinates when PoE is detected and screen coordinates
otherwise. There are no competing anchor or numeric position controls.

## Windows game-window attachment

`poe_window.rs` enumerates visible top-level windows and verifies candidates
from their executable image name (`PathOfExile*.exe`), never from a title
alone. A 250 ms native poll records the client rectangle and whether the game
window is foreground. The overlay follows client movement with its persisted
drag offset. The auto-hide preference hides it only when a detected PoE window
is in the background; no detection leaves manual placement available.

Older screen-coordinate preferences are converted to client-relative
coordinates on first successful attachment without moving the overlay.

Closing the dashboard exits the Tauri application, including the hidden
overlay and tray process.
