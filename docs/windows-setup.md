# Windows setup

## Supported environment

- 64-bit Windows 10 or Windows 11.
- Path of Exile in borderless or windowed mode.
- The separately installed `exile-log-api` helper, currently tested against
  version `0.0.2`.

The overlay does not bundle or start the helper. It expects the helper's
loopback WebSocket at `ws://127.0.0.1:6754`.

## Install

1. Download `Exile Leveling Overlay_*_x64-setup.exe` from the Windows CI
   artifact or a project release.
2. Run the installer. It installs for the current Windows user and does not
   require administrator rights.
3. Until the project is code-signed, Windows SmartScreen may show an
   unrecognised-app warning. Verify that the installer came from this
   repository before choosing to run it.
4. If WebView2 is missing, the installer downloads Microsoft's WebView2
   bootstrapper. Current Windows 10 and Windows 11 systems normally already
   include the runtime.

## Start a session

1. Start Path of Exile.
2. Start `exile-log-api` separately.
3. Start Exile Leveling Overlay from the Start menu.
4. Import or select a build and route in the dashboard.
5. Enable auto-progress when ready.
6. Show the overlay and use **Edit layout for 30s** to drag it.

The dashboard reports helper connectivity and PoE-window detection
independently. If PoE is not detected, the overlay remains usable in manual
placement mode.

## Uninstall

Close the dashboard so the entire process exits, then uninstall **Exile
Leveling Overlay** from Windows **Installed apps**. The helper is a separate
program and is not removed.
