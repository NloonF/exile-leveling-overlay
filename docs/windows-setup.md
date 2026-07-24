# Windows setup

## Supported environment

- 64-bit Windows 10 or Windows 11.
- Path of Exile in borderless or windowed mode.

The installer includes the log-reading integration. Do not install or start a
separate helper for normal use.

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
2. Start Exile Leveling Overlay from the Start menu.
3. Import or select a build and route in the dashboard.
4. Enable auto-progress when ready.
5. Open **Overlay settings**, choose **Edit layout**, and drag it. Choose
   **Edit layout** again, or **Finish editing** on either overlay, when
   finished. When a passive tree is imported, the same editing mode exposes
   both overlay windows.
6. After importing a Path of Building tree, use the **Passive tree** control
   or `Ctrl+Shift+T` to toggle its separate overlay. Tree width, height, and
   opacity have separate controls. Hold `Ctrl+Shift+D` to interact with the
   tree: hover nodes, wheel-zoom, and drag to pan. Use the arrow buttons below
   the tree to move between imported tree stages.

The dashboard reports log-reader connectivity and PoE-window detection
independently. If PoE is not detected, the overlay remains usable in manual
placement mode.

## Uninstall

Close the dashboard so the entire process, including its built-in log reader,
exits. Then uninstall **Exile Leveling Overlay** from Windows **Installed
apps**.
