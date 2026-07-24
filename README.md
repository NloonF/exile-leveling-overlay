# Exile Leveling Overlay

Exile Leveling Overlay is a Windows desktop fork of
[HeartofPhos/exile-leveling](https://github.com/HeartofPhos/exile-leveling).
It turns the original browser-based Path of Exile leveling guide into a
transparent, always-on-top overlay that can automatically follow campaign
progress while preserving the guide's routes, build imports, styling, icons,
and detailed checkpoint instructions.

This project is an independent community tool. It is not affiliated with or
endorsed by Grinding Gear Games.

## What this fork adds

- A Tauri 2 Windows application with a dashboard and transparent,
  click-through overlay.
- Automatic checkpoint progression from a built-in reader adapted from the
  MIT-licensed [`exile-log-api`](https://github.com/HeartofPhos/exile-log-api)
  project; no separate helper installation is required.
- Current and previous checkpoint details, including quest hand-ins, vendor
  actions, route subtasks, and imported Path of Building gem rewards.
- Restored Path of Building passive-tree stages in the dashboard, with an
  optional overlay tree view and configurable global shortcut.
- The original guide's fonts, colors, icons, and reward presentation.
- Drag-only positioning, scaling, opacity, configurable global shortcuts, tray
  controls, and optional hiding while Path of Exile is in the background.
- Native tracking of known Path of Exile 1 clients, without matching Path of
  Exile 2.
- Failure-only log-reader diagnostics, direct native events, signed-release
  automation, checksums, provenance, an SBOM, and an NSIS installer.

## How it works

The fork extends the original application instead of replacing its route
engine:

1. The existing React and Jotai frontend remains responsible for routes,
   builds, imported Path of Building data, and campaign progress.
2. When auto-progress is enabled, the Rust backend locates Path of Exile's
   `logs/LatestClient.txt`, follows new complete lines, and emits only typed
   generated-area events directly to the Tauri dashboard.
3. Entering the expected next area advances exactly one route checkpoint.
4. The frontend converts the active route state into a versioned, read-only
   overlay snapshot.
5. The Rust/Tauri layer owns native windows, global shortcuts, the tray,
   click-through behavior, persisted placement, and Path of Exile window
   tracking.

The application does not read game memory, inject code, inspect packets,
modify game files, or automate input. See
[Privacy and game safety](docs/privacy.md) and
[Architecture](docs/architecture.md) for the full boundaries.

## Installation and use

The desktop application currently targets 64-bit Windows 10 and Windows 11.
The installer is per-user and does not require administrator privileges.

1. Download `Exile Leveling Overlay_*_x64-setup.exe` from the project
   [Releases](https://github.com/NloonF/exile-leveling-overlay/releases) page.
2. Start Path of Exile and Exile Leveling Overlay. The log reader remains idle
   until auto-progress is enabled and stops again when it is disabled.
3. Select or import a build and route in the dashboard.
4. Enable automatic progression and show the overlay.
5. Open **Overlay settings**, choose **Edit layout**, and drag the overlay.
   Choose **Edit layout** again, or **Finish editing** on the overlay, when
   finished.

Default shortcuts:

- `Ctrl+Shift+O` toggles the overlay.
- Hold `Ctrl+Shift+D` to emphasize checkpoint details.
- `Ctrl+Shift+T` toggles the imported passive tree in its own overlay window.
  Its size and opacity have separate dashboard controls.
- Hold `Ctrl+Shift+D` while the tree is visible to hover nodes, wheel-zoom,
  and drag the tree view to pan.

The shortcuts, scale, opacity, visibility behavior, and positions can be
changed from the dashboard. **Edit layout** exposes both overlay windows so
their positions can be adjusted together. If Path of Exile is not detected,
both overlays continue working in manual-placement mode.

No game helper or background service needs to be installed separately. See
the [integration record](docs/helper-bundling-analysis.md) for the design and
the [tracking analysis](docs/latest-client-tracking-analysis.md) for possible
future features.

## Development

### Prerequisites

- Node.js `22.14.0`, matching `.nvmrc`
- Rust stable
- Visual Studio 2022 with **Desktop development with C++**
- A Windows SDK and Microsoft WebView2

### Commands

```powershell
npm ci
npm test
npm run tauri -- dev
```

Useful alternatives:

- `npm run dev -w web` starts the original browser application.
- `npm run dev:desktop -w web` starts the desktop-flavored Vite server.
- `npm run build -w web` builds the browser application.
- `npm run build:windows` builds the Windows NSIS installer.

The installer is written to:

```text
src-tauri/target/release/bundle/nsis
```

Run browser and desktop production builds sequentially because both write to
`web/dist`.

Additional documentation:

- [Windows setup](docs/windows-setup.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Integrated log reader](docs/helper-compatibility.md)
- [LatestClient tracking analysis](docs/latest-client-tracking-analysis.md)
- [Release checklist](docs/release-checklist.md)
- [Changelog](CHANGELOG.md)

## Upstream data development

The original data-seeding workflow remains available:

- `npm run seed tree -w seeding` seeds the passive tree.
- Required `.dat` files are listed in `seeding/data/index.ts`.
- [`HeartofPhos/exile-export`](https://github.com/HeartofPhos/exile-export)
  exports the required `.dat.json` files.
- `npm run seed data -w seeding` seeds general game data.

Route changes should remain compatible with the upstream guide. Users can
customize routes through the
[Edit Route](https://heartofphos.github.io/exile-leveling/#/edit-route) view.

## Credits

This fork exists because of the original
[Path of Exile Leveling Guide](https://github.com/HeartofPhos/exile-leveling)
created and maintained by
[HeartofPhos](https://github.com/HeartofPhos). The route engine, campaign
data, build import system, guide components, visual language, and much of the
frontend foundation originate from that project.

The Windows overlay, desktop integration, automatic progression pipeline, and
release tooling are maintained in this fork by
[NloonF](https://github.com/NloonF) and its contributors.

The integrated log-reader behavior is adapted from the MIT-licensed
[`exile-log-api`](https://github.com/HeartofPhos/exile-log-api), also created
by HeartofPhos. Its original license notice is bundled with the application.

Path of Exile and all associated names and assets are property of Grinding
Gear Games. Source Sans Pro is distributed under the SIL Open Font License;
its license is bundled under `src-tauri/licenses`.

## License

This project remains available under the [MIT License](LICENSE). The original
HeartofPhos copyright notice is retained, with an additional notice covering
the modifications made by this fork.

The adapted `exile-log-api` portions retain their upstream MIT notice in
`src-tauri/licenses/exile-log-api-MIT.txt`.
