# Desktop architecture

The React frontend owns routes, guide progress, and build profiles. Jotai
atoms in `web/src/state` persist those choices in WebView storage. The
progression write path compares a typed generated-area event with the next
route edge and advances at most one checkpoint.

The Tauri native layer owns desktop lifecycle concerns: dashboard and overlay
windows, native preferences, global shortcuts, the tray, Windows game-window
tracking, URL downloads, and the integrated `LatestClient.txt` reader. It does
not own a second route engine.

Automatic progression starts disabled for every application session.
Disabling it stops log tailing. Pausing keeps the tail attached but prevents
area events from reaching the progression atom.

## Overlay snapshot pipeline

`overlaySnapshot.ts` is a pure adapter from the current route, active edge,
auto-progress state, and log-reader state to a versioned `OverlaySnapshot`.
For each area checkpoint, it includes nested hints and the route tasks that
follow it before the next area checkpoint. Imported-build `gem_step` entries
are converted into styled Take/Buy details using shared gem data.

The dashboard publishes snapshots through a Tauri command. Rust retains only
the latest JSON value, allowing the overlay window to recover its state after
creation or reload.

## Overlay window

The `overlay` Tauri window loads `#/overlay` and renders only the cached or
published snapshot. It is transparent, frameless, always on top, hidden from
the taskbar, and mouse-click-through by default.

The overlay starts enabled. Edit mode remains active until the user chooses
**Edit layout** again, **Finish editing**, or Escape. While editing, its header
starts native Windows dragging. Finishing publishes game-client-relative
coordinates when PoE is detected and screen coordinates otherwise.

Invalid off-screen coordinates are recovered onto the primary monitor. The
dashboard also provides an explicit **Reset position** action.

## Windows game-window attachment

`poe_window.rs` enumerates visible top-level windows and verifies candidates
against an explicit allowlist of Path of Exile 1 executable names. Path of
Exile 2 and lookalike prefixes are rejected. A native poll records the client
rectangle and whether the game window is foreground.

The overlay follows client movement with its persisted drag offset. Optional
auto-hide applies only when a detected PoE window is in the background. Older
screen-coordinate preferences are converted to client-relative coordinates
after the first successful attachment.

## Integrated log reader

`log_api.rs` derives the active client log path, or uses a validated manual
`LatestClient.txt` location. It attaches at end-of-file and converts only new,
complete generated-area records into typed Tauri events. It does not expose a
WebSocket, localhost port, raw-log frontend interface, or external-helper
fallback.

The tailer accounts for truncation, replacement, partial writes, invalid
UTF-8, temporary access failures, and Path of Exile restarts. Rust interprets
only the area record; route matching and advancement remain in the frontend.

## Native URL importer

User-triggered build and route URLs are downloaded by Rust over HTTPS. Hosts
and every redirect are allowlisted, responses have a 2 MB limit, and requests
time out. The WebView does not use a public CORS proxy.

Closing the dashboard exits the complete Tauri process, including the hidden
overlay, tray, and log reader.
