## Getting Started

- Install Node.js `22.14.0` (the version in `.nvmrc`).
- `npm ci`
- `npm test`
- `npm run dev -w web`
- `npm run build -w web`

## Windows desktop development

The desktop app uses Tauri 2 and requires Rust stable, the Visual Studio 2022
Desktop development with C++ workload, a Windows SDK, and WebView2.

- `npm run dev:desktop -w web` starts the desktop-flavoured Vite server.
- `npm run build:desktop -w web` creates local assets for Tauri.
- `npm run tauri -- dev` starts the native dashboard.
- `npm run fake-helper` starts an interactive local fixture server for testing
  area events and reconnects without Path of Exile.

The desktop dashboard includes overlay show/hide, scale, opacity, temporary
drag-mode controls, and configurable global shortcuts. By default,
`Ctrl+Shift+O` toggles the overlay and holding `Ctrl+Shift+D` highlights its
details. Checkpoint details include all route tasks and imported-build gem
rewards, and the overlay grows to fit them. The overlay is click-through by
default. Closing the dashboard exits the desktop application.

On Windows, the app identifies visible `PathOfExile*.exe` game windows,
follows the game client rectangle using the dragged offset, and can hide the
overlay while PoE is in the background. If PoE is not found, the overlay
remains available in manual-placement mode.

Release documentation:

- [Changelog](CHANGELOG.md)
- [Windows setup](docs/windows-setup.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Privacy and game safety](docs/privacy.md)
- [Release checklist](docs/release-checklist.md)
- [Helper bundling analysis](docs/helper-bundling-analysis.md)

The desktop build self-hosts Source Sans Pro and restricts webview resource
loading with a Content Security Policy. See the privacy statement for the
single user-triggered URL-import proxy exception.

`npm run build:windows` creates the unsigned per-user NSIS installer under
`src-tauri/target/release/bundle/nsis`.

Run the web and desktop builds sequentially because both write to `web/dist`.
The separately installed `exile-log-api` helper is expected at
`ws://127.0.0.1:6754`.

## Seeding

### Passive Tree

- `npm run seed tree -w seeding`

### General

- Find the list of required `dat` files in `seeding/data/index.ts`
- Use https://github.com/HeartofPhos/exile-export to get required `.dat.json` files
- `npm run seed data -w seeding`

## Route

I'm not currently taking PRs related to route changes, my intention is to keep the base route in line with current speed running strategies.

Users are encourged to use the [Edit Route Tab](https://heartofphos.github.io/exile-leveling/#/edit-route) in the deployed app to update the route to their preferred playstyle.
