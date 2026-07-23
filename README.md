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
- Automatic checkpoint progression from the separately installed
  [`exile-log-api`](https://github.com/HeartofPhos/exile-log-api) helper.
- Current and previous checkpoint details, including quest hand-ins, vendor
  actions, route subtasks, and imported Path of Building gem rewards.
- The original guide's fonts, colors, icons, and reward presentation.
- Drag-only positioning, scaling, opacity, configurable global shortcuts, tray
  controls, and optional hiding while Path of Exile is in the background.
- Native tracking of windowed and borderless `PathOfExile*.exe` game windows.
- Reconnect diagnostics, a fake helper for development, automated protocol
  tests, Windows CI, and an NSIS installer.

## How it works

The fork extends the original application instead of replacing its route
engine:

1. The existing React and Jotai frontend remains responsible for routes,
   builds, imported Path of Building data, and campaign progress.
2. A small WebSocket integration receives area-transition messages from
   `exile-log-api` at `ws://127.0.0.1:6754`.
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
2. Install and start `exile-log-api` separately. Version `0.0.2` is the
   currently verified compatibility target.
3. Start Path of Exile and Exile Leveling Overlay.
4. Select or import a build and route in the dashboard.
5. Enable automatic progression and show the overlay.
6. Use **Edit layout for 30s** when you want to drag the overlay.

Default shortcuts:

- `Ctrl+Shift+O` toggles the overlay.
- Hold `Ctrl+Shift+D` to emphasize checkpoint details.

The shortcuts, scale, opacity, visibility behavior, and position can be
changed from the dashboard. If Path of Exile is not detected, the overlay
continues working in manual-placement mode.

The helper is not bundled because its upstream repository does not currently
publish redistribution terms. See the
[helper bundling analysis](docs/helper-bundling-analysis.md).

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
- `npm run fake-helper` starts a local interactive helper fixture.
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
- [Helper compatibility](docs/helper-compatibility.md)
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

Path of Exile and all associated names and assets are property of Grinding
Gear Games. Source Sans Pro is distributed under the SIL Open Font License;
its license is bundled under `src-tauri/licenses`.

## License

This project remains available under the [MIT License](LICENSE). The original
HeartofPhos copyright notice is retained, with an additional notice covering
the modifications made by this fork.

`exile-log-api` is a separate project and is not distributed as part of this
repository or installer.
