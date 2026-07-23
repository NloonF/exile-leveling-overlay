# Troubleshooting

## Waiting for log helper

- Confirm `exile-log-api` is running.
- Confirm it listens on `127.0.0.1:6754`.
- Start the desktop app before or after the helper; it reconnects
  automatically with bounded backoff.
- Another application occupying port `6754` must be stopped or reconfigured.

## Events arrive but the route does not advance

- Auto-progress must be enabled and not paused.
- Only the next expected area advances the route.
- Use the dashboard's last-event and expected-area diagnostics to compare the
  helper event with the route.

## PoE not found — manual placement

- Use a standard `PathOfExile*.exe` client in borderless or windowed mode.
- If PoE runs as administrator, run both applications at the same privilege
  level so Windows permits process identification.
- Restarting is not required; detection polls automatically.

## Overlay disappears while using the dashboard

With **Auto-hide outside PoE** enabled, focusing the dashboard makes PoE a
background application. Edit mode temporarily overrides auto-hide. Disable
the preference if the overlay should stay visible while alt-tabbed.

## Overlay is misplaced

Open edit mode while PoE is running and drag the overlay to the desired
location. The saved position is relative to the game client and follows
window and monitor movement. Without PoE, dragging saves a manual screen
position.

## Global shortcut unavailable

Choose another shortcut in the dashboard. Windows rejects a global shortcut
when another application already registered the same combination.

## Installer or app will not start

- Use 64-bit Windows 10 or Windows 11.
- Install or repair Microsoft Edge WebView2 Runtime.
- Unsigned private-test builds may trigger SmartScreen; verify the artifact's
  repository and workflow origin before allowing it.
