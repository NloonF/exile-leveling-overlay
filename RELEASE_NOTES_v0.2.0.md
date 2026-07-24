# Exile Leveling Overlay v0.2.0

This release turns the project into a more complete standalone Windows
application. Automatic area tracking is now integrated directly into the app,
so a separately installed `exile-log-api` helper is no longer required.

## Highlights

- Integrated `LatestClient.txt` reader for automatic area progression
- Automatic detection of the Path of Exile installation and log file
- Manual log-file selection available as a fallback
- Path of Building imports now add relevant gem rewards and tasks to route
  checkpoints
- Checkpoints retain their original formatting, colors, fonts, and icons
- The previous checkpoint remains visible so its remaining tasks can be
  reviewed after entering the next area
- Overlay follows the Path of Exile window and handles game restarts
- Overlay position can be changed by dragging while Edit layout is enabled
- Improved overlay resizing and display-scaling behavior
- Overlay is enabled by default
- Automatic progression is disabled by default and remains opt-in
- Simplified, collapsible overlay settings
- Configurable global shortcuts for visibility and layout editing
- Added native Path of Building URL imports
- Added About, privacy, troubleshooting, setup, and architecture documentation
- Closing the application now terminates its background activity completely

## Installation

1. Download `Exile Leveling Overlay_0.2.0_x64-setup.exe`.
2. Run the installer.
3. Launch **Exile Leveling Overlay** from the Start menu.
4. Enable automatic progression when you want the app to monitor
   `LatestClient.txt`.
5. Start Path of Exile normally.

You no longer need to download or run a separate API helper.

## Windows security notice

This version is not digitally signed yet. Windows SmartScreen may display an
**Unknown publisher** warning.

To continue:

1. Select **More info**.
2. Confirm that the application name is **Exile Leveling Overlay**.
3. Select **Run anyway**.

Code signing is planned for a later pre-release version.

## Privacy and safety

The integrated reader only watches Path of Exile's `LatestClient.txt` for
generated area-transition messages.

The application does not:

- Read game memory
- Inject code into Path of Exile
- Inspect network packets
- Modify game files
- Generate player input
- Collect telemetry

Network access is limited to user-triggered build imports and WebView2
installation when Windows requires it.

## Credits

The leveling route application was originally created by
[HeartofPhos](https://github.com/HeartofPhos).

The integrated log-reading behavior is based on
[`exile-log-api`](https://github.com/HeartofPhos/exile-log-api), used with the
creator's permission under the MIT License.

Thank you to everyone who tested the Windows overlay and reported issues during
development.
