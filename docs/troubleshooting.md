# Troubleshooting

## Waiting for PoE to launch

- Do not start a separate helper during normal use; the reader is built in.
- Start the desktop app normally, enable auto-progress, and wait a few seconds
  while the running Path of Exile 1 client is detected.
- Open **Advanced log location** to provide the full path to
  `LatestClient.txt` when automatic detection is unavailable.
- The reader does not open a network port and does not require a firewall
  exception.
- If PoE is already running but the status does not change, verify the log
  location, then close all overlay windows, confirm the process has exited in
  Task Manager, and start it again.

## Events arrive but the route does not advance

- Auto-progress must be enabled and not paused.
- Only the next expected area advances the route.
- Use the dashboard's last-event and expected-area diagnostics to compare the
  log event with the route.

## PoE not found — manual placement

- Use a supported Path of Exile 1 client in borderless or windowed mode. Path
  of Exile 2 is intentionally ignored.
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
position. Choose **Reset position** if a previous monitor configuration made
the overlay inaccessible.

## Global shortcut unavailable

Choose another shortcut in the dashboard. Windows rejects a global shortcut
when another application already registered the same combination.

## Installer or app will not start

- Use 64-bit Windows 10 or Windows 11.
- Install or repair Microsoft Edge WebView2 Runtime.
- Unsigned private-test builds may trigger SmartScreen; verify the artifact's
  repository and workflow origin before allowing it.
