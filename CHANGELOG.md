# Changelog

## 0.1.0

Initial Windows desktop release.

### Added

- A Tauri dashboard and transparent, always-on-top leveling overlay.
- Automatic checkpoint progression from the local `exile-log-api` helper.
- Route tasks and imported Path of Building gem rewards in checkpoint details.
- A previous/current checkpoint section for tasks in the area just entered.
- Original route styling, colors, icons, and reward presentation in the overlay.
- Drag-only overlay positioning with game-window following and optional
  background hiding.
- Overlay scale, opacity, click-through editing, global shortcuts, tray
  controls, reconnect status, and diagnostics.
- A fake helper for local testing and an unsigned per-user NSIS installer.

### Security and privacy

- No game memory access, injection, input automation, telemetry, or game-file
  modification.
- Helper traffic is restricted to `ws://127.0.0.1:6754`.
- Source Sans Pro is bundled locally, and the desktop webview uses a
  restrictive Content Security Policy.
- Importing a build or route by URL uses the documented CORS proxy; pasting an
  import code does not make that request.

### Known limitations

- The helper must currently be installed and started separately.
- The installer is unsigned and can trigger Microsoft SmartScreen.
- Clean-machine, multi-monitor, high-DPI, and full-route replay coverage still
  require manual release testing.
