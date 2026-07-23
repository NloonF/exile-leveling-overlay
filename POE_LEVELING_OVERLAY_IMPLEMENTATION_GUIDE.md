# Path of Exile Leveling Overlay — Implementation Guide

## 0. Current implementation handoff

Last updated: **2026-07-23**

### Windows continuation update

The original WSL changes described below were not present in the Windows
checkout; only this untracked guide had been transferred. The documented
Milestone 0 baseline and Milestone 1 scaffold were reconstructed in the
Windows checkout on 2026-07-23.

Windows validation now completed:

- Installed Rust stable `1.97.1` with the MSVC target and `rustfmt`.
- Tauri detected Visual Studio Build Tools and WebView2.
- `npm test` passed all four protocol tests.
- Web and desktop frontend builds passed sequentially.
- Prettier and `git diff --check` passed.
- `cargo fmt --check` passed.
- `cargo check` passed with Tauri `2.11.5` and generated
  `src-tauri/Cargo.lock`.
- `npm run tauri -- dev` built and launched the native process; the process
  remained responsive and the Vite asset server returned HTTP 200.

The original close-to-tray design was later replaced at the user's request:
closing the dashboard now exits the complete application process.

Milestone 2 implementation was subsequently started at the user's direction:

- Added `logApiClient.ts` as the sole WebSocket lifecycle owner.
- Added bounded reconnect delays of 1, 2, 4, 8, 16, and at most 30 seconds.
- Routed all traffic through `logApiProtocol.ts` and passed only typed area
  identifiers into the route progression atom.
- Made auto-progress opt-in with a persisted enable preference and a
  session-scoped pause control.
- Added visible connection, retry, endpoint, last-event, and received-time
  diagnostics without retaining raw helper frames.
- Added client lifecycle/backoff and pure route progression tests.
- Added a real loopback WebSocket integration test and an interactive
  `npm run fake-helper` fixture server.
- Removed the obsolete `react-use-websocket-lite` dependency.

Automated Milestone 2 verification passes. Live helper traffic, helper restart,
pause/resume, and route advancement still require the manual Windows replay
listed below.

Milestone 3 is now implemented:

- Added a deterministic, versioned `OverlaySnapshot` derived from route,
  active-edge, auto-progress, and helper connection state.
- Added snapshot tests for active, paused, disconnected, inactive, and
  completed guide states.
- Added a Jotai-derived snapshot atom and dashboard publisher that updates
  whenever relevant source state changes.
- Added Tauri commands to publish and retrieve the last snapshot plus a
  process-local Rust cache and unit test.
- Added an expandable dashboard snapshot preview for manual comparison before
  the actual overlay window exists.

Milestone 4 core overlay implementation is now ready for manual validation:

- Added a separate snapshot-only `overlay` Tauri window and React entry path.
- Configured it as transparent, frameless, always on top, non-taskbar,
  non-resizable, initially hidden, and click-through by default.
- Enabled the tray `Toggle overlay` action and added dashboard show/hide.
- Added a deliberate 30-second edit mode that returns to click-through in
  Rust even if the dashboard is hidden.
- Added native header dragging as the only positioning interaction and
  persisted the final absolute screen position.
- Added persisted scale, opacity, dragged position, and the future
  game-auto-hide preference.
- Added configurable global shortcuts with persisted choices and visible
  registration-conflict reporting. `Ctrl+Shift+O` toggles visibility by
  default; holding `Ctrl+Shift+D` temporarily highlights the detail list.
- Changed dashboard close to terminate the application, overlay, tray, and
  development child process instead of hiding to tray.
- Published snapshot changes directly to the overlay while retaining the
  Rust cache for initial rendering.
- Grouped edge-less route tasks and nested hints into their preceding
  checkpoint details, including quest NPC labels such as
  `Hand in Enemy at the Gate - Tarkleigh`.
- Included every imported-build gem reward as a checkpoint detail, removed the
  fixed detail-count limit, and made the overlay window grow with its content.

Milestone 5 game-window discovery, following, and foreground auto-hide are now
implemented and ready for manual validation with Path of Exile. Validate
borderless/windowed modes, alt-tab, movement, resizing, monitor changes, and
display scaling before starting release packaging.

Milestone 6 packaging foundations are now implemented:

- Added generated Windows application and installer icons.
- Configured a current-user NSIS installer with WebView2 bootstrapper fallback.
- Added a reproducible Windows GitHub Actions build that runs Node and Rust
  tests and uploads the unsigned installer.
- Added Windows setup, troubleshooting, privacy/game-safety, and release
  checklist documentation.
- Built the unsigned local installer successfully at
  `src-tauri/target/release/bundle/nsis/Exile Leveling Overlay_0.1.0_x64-setup.exe`.
- Retained the just-entered checkpoint's tasks in a permanent current-checkpoint
  block while the primary guide advances to the next area.
- Corrected overlay content sizing so native width and height both follow CSS
  scales above 100%.
- Upgraded overlay snapshots to carry typed, read-only route instructions and
  reused the original route renderer for enemy, area, town, quest, waypoint,
  portal, trial, crafting, direction, gem-colour, and currency visuals.
- Self-hosted Source Sans Pro, removed the Google Fonts runtime request, and
  enabled a restrictive desktop content-security policy limited to bundled
  assets, Tauri IPC, the loopback helper, and explicit URL imports through the
  existing CORS proxy.
- Recorded the helper integration options in
  `docs/helper-bundling-analysis.md`. Redistributing the upstream helper remains
  blocked until its licensing is clarified; an independent integrated Rust log
  reader is the recommended direction.

### Resume point

Development has completed the automated packaging portion of **Milestone 6 —
Release readiness**. Next, install the generated unsigned NSIS package and run
the clean-machine/runtime checklist in `docs/release-checklist.md`. Before
broad public distribution, configure Windows code signing. The installed NSIS
build, native PoE-window behaviour, official helper connection, and live area
progression have now been manually confirmed on the development Windows
machine. Broader display, restart, clean-machine, and CSP runtime scenarios
remain on the release checklist.

### Work completed so far

Repository and workflow:

- Added `.nvmrc`, pinned to Node `22.14.0`, and declared Node `>=22.12.0` in
  the root package.
- Added root `test` and `tauri` npm scripts.
- Added the original guide repository as the `upstream` Git remote:
  `https://github.com/HeartofPhos/exile-leveling.git`.
- Updated GitHub Actions to install the pinned Node version, run `npm ci`, and
  run protocol tests before the existing seed/build/deploy steps.
- Updated `README.md` with the Node, install, test, and web-build commands.
- Ignored `src-tauri/target`; do not transfer generated `node_modules`,
  `web/dist`, or `src-tauri/target` directories between WSL and Windows.

Helper compatibility baseline:

- Documented the source-derived `exile-log-api` `v0.0.2` behaviour in
  `docs/helper-compatibility.md`.
- Added typed parsing in `web/src/integrations/logApiProtocol.ts`. It converts
  a matching helper text frame into an `AreaEnteredEvent` and rejects
  unsupported text.
- Added sanitised fixtures for startup, client connection, area transition,
  unknown area, helper restart, client restart, and malformed messages under
  `tests/fixtures/log-api/`.
- Added four Node protocol tests in `tests/log-api-protocol.test.mts`.
- Recorded the current frontend architecture, Jotai state ownership,
  auto-progress path, and v1 route/profile decision in
  `docs/architecture.md`.

Desktop/frontend scaffold:

- Installed Tauri CLI `2.x` as a root development dependency.
- Added a desktop Vite mode:
  - web builds retain `/exile-leveling/` and PWA behaviour;
  - desktop builds use relative assets and do not register the PWA plugin;
  - `npm run dev:desktop -w web` and
    `npm run build:desktop -w web` are available.
- Added `src-tauri/` with the Tauri configuration, Cargo package, capability,
  dashboard window, application entry point, and generated Cargo lockfile.
- Added a tray containing:
  - `Show dashboard`, which restores and focuses the dashboard;
  - `Toggle overlay`, which shows or hides the overlay;
  - `Quit`, which exits the process.
- Added dashboard close handling; this was later changed to exit the entire
  application at the user's request.
- Changed the helper endpoint from `localhost` to
  `ws://127.0.0.1:6754`.
- Added a visible dashboard helper connection badge with waiting, connected,
  and disconnected states.
- Corrected the existing toast/status handling so a closed socket is not
  displayed as connected.

### Verification already performed in WSL

| Check                                  | Result                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `npm ci`                               | Passed                                                                          |
| `npm test`                             | Passed: 4 protocol tests                                                        |
| `npm run build -w web`                 | Passed                                                                          |
| `npm run build:desktop -w web`         | Passed                                                                          |
| Prettier checks and `git diff --check` | Passed                                                                          |
| Native Linux `cargo check`             | Environment-blocked by missing DBus/GTK/WebKit development packages             |
| Windows-target `cargo check` from WSL  | Environment-blocked by the missing Windows resource compiler/linker (`llvm-rc`) |

The two Cargo failures do not establish that the Rust application has a code
error, but they also do not prove that it compiles. The correct next check is a
native Windows MSVC build.

Run web and desktop builds **sequentially** because both currently write to
`web/dist`; running them concurrently can mix their generated output.

### Source-control warning before moving to Windows

No commit has been made for this work. The WSL working tree contains both
modified tracked files and new untracked files, including this guide,
`src-tauri/`, `docs/`, `tests/`, and the new frontend modules. Do not clone
`main` on Windows and assume these changes will be present, and do not discard
the WSL checkout until the handoff is confirmed.

The simplest reproducible transfer is to checkpoint the work on a branch from
WSL and then clone that branch on Windows:

```bash
git switch -c desktop-milestone-1
git add .github .gitignore .nvmrc README.md package.json package-lock.json \
  web src-tauri tests docs POE_LEVELING_OVERLAY_IMPLEMENTATION_GUIDE.md
git commit -m "Scaffold Windows desktop application"
git push -u origin desktop-milestone-1
```

Review `git status` before committing so unrelated personal files are not
added. `package-lock.json` contains the expected Tauri installation update and
some npm-generated lockfile normalisation. Retain `src-tauri/Cargo.lock` for
this desktop application.

Then, from Windows PowerShell:

```powershell
Set-Location C:\dev
git clone --branch desktop-milestone-1 `
  https://github.com/NloonF/exile-leveling-overlay.git
Set-Location .\exile-leveling-overlay
codex
```

Using a native `C:\...` checkout is preferred to developing through
`\\wsl$\...` or `/mnt/c/...`.

### Native Windows prerequisites

Install these before the first Windows validation:

1. Node.js `22.14.0` (matching `.nvmrc`) and npm.
2. Rust stable with the default `x86_64-pc-windows-msvc` toolchain.
3. Visual Studio 2022 Build Tools with **Desktop development with C++** and a
   current Windows 10/11 SDK.
4. Microsoft Edge WebView2 Runtime, if it is not already present.
5. Git and Codex available from PowerShell.

Confirm PowerShell is resolving Windows executables:

```powershell
node --version
npm --version
rustup show active-toolchain
rustc --version
cargo --version
```

### First task in the Windows Codex session

Run these in order from the repository root:

```powershell
npm ci
npm test
npm run build -w web
npm run build:desktop -w web
cargo fmt --manifest-path src-tauri\Cargo.toml -- --check
cargo check --manifest-path src-tauri\Cargo.toml
npm run tauri -- dev
```

Expected manual test after `tauri dev`:

1. The existing guide opens in a native dashboard window and its normal
   navigation still works.
2. With `exile-log-api` stopped, the dashboard shows waiting/disconnected.
3. With the helper running, the badge changes to connected.
4. Closing the dashboard terminates the complete application.
5. Left-clicking the tray icon or selecting `Show dashboard` focuses it while
   it remains open.
6. `Toggle overlay` shows or hides the overlay.
7. Selecting `Quit` removes the tray icon and terminates the application.
8. Stop and restart the helper once and note the current reconnect behaviour;
   exponential backoff and richer diagnostics belong to Milestone 2.

If native compilation fails, first inspect:

- whether Tauri accepts the icon paths in `src-tauri/tauri.conf.json`;
- whether the tray APIs used in `src-tauri/src/tray.rs` match the resolved
  Tauri version;
- whether the installed MSVC build tools and Windows SDK are visible to Cargo.

Do not proceed to Milestone 2 until `cargo check`, `tauri dev`, and the tray
tests above pass.

### Planned work and what to test after each step

| Next step                              | Implementation outcome                                                                                                                                                                        | What the user tests                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Finish Milestone 1 validation       | Fix Windows-only compile/configuration issues; confirm local dashboard assets, tray, process exit, quit, and visible helper status                                                            | Run the eight dashboard/tray checks above, including helper stopped/running                                                                                            |
| 2. Build the Milestone 2 helper client | Put all WebSocket traffic through a reconnecting `logApiClient.ts`; parse only through `logApiProtocol.ts`; add bounded exponential backoff, opt-in/pause control, and last-event diagnostics | Start app before helper, start helper later, enter/replay known and unknown areas, pause auto-progress, restart helper, and verify recovery without restarting the app |
| 3. Build the snapshot pipeline         | Derive one typed `OverlaySnapshot` from guide state and connection state; cache/publish it for the future overlay                                                                             | Replay active, paused, disconnected, completed, and reconnect cases; verify snapshot tests and that displayed dashboard state agrees                                   |
| 4. Build the overlay window            | Add a separate transparent, frameless, always-on-top snapshot view with safe click-through, temporary layout-edit mode, and configurable global shortcuts                                     | Verify mouse/keyboard pass through in PoE borderless mode, layout edit and hotkeys are deliberate, updates do not flicker, and settings survive restart                |
| 5. Add Windows game-window following   | Detect PoE by process/window handle, follow its client rectangle, and optionally show only while PoE is foreground                                                                            | Test alt-tab, move/resize, 1–2 monitors, borderless/windowed modes, and 100–200% DPI                                                                                   |
| 6. Prepare the Windows release         | Add installer/CI, troubleshooting and privacy documentation, clean-machine verification, and decide code-signing policy                                                                       | Install on a clean Windows machine; test missing helper, PoE/helper/app restarts, uninstall, and the game-safety checklist                                             |

### Known intentionally unfinished work

- The unsigned installer still requires a code-signing decision before broad
  public distribution.
- Clean-machine installation, uninstall, restart, multi-monitor, and broad DPI
  checks remain manual release gates.
- Bundling or replacing the helper is deferred until its licensing and desired
  integration direction are confirmed.
- Global hotkeys require manual validation against other applications and the
  user's preferred PoE bindings.

## 1. Goal

Build a **Windows-first desktop companion** for the open-source `exile-leveling` guide. While Path of Exile is running, the companion displays the guide's next relevant instruction in a compact overlay on top of the game.

The overlay is informed by the separately installed `exile-log-api` helper, which watches Path of Exile's client log and sends area-transition events over a localhost WebSocket.

The intended end-to-end behaviour is:

1. The player starts Path of Exile.
2. The player starts the existing `exile-log-api` helper.
3. The player starts this desktop guide application.
4. The application connects to the helper on `ws://127.0.0.1:6754`.
5. When the helper reports an area transition, the existing guide logic updates progress.
6. The overlay immediately shows the new next instruction while remaining transparent to game input.

This project must remain an **external desktop application**. It must not inject into the game client, read game memory, patch game files, send game input, automate actions, or expose a network server beyond loopback.

## 2. Scope and non-goals

### In scope

- A desktop build of the leveling guide.
- A full dashboard window based on the existing guide UI.
- A second, compact overlay window.
- Connection to a user-run `exile-log-api` helper.
- Existing guide auto-progress behaviour, triggered from the helper's area events.
- System-tray operation, global show/hide hotkeys, and persisted overlay preferences.
- Windows support as the first supported platform.
- Tests that do not require Path of Exile to be installed or running.

### Explicitly out of scope for v1

- Reading Path of Exile memory, packets, or UI pixels.
- Any input simulation or macro functionality.
- Direct log-file reading in this project.
- Bundling `exile-log-api` in the installer.
- Linux, macOS, Steam Deck, or Wayland support.
- Cloud sync, accounts, telemetry, or online services.
- Rewriting the route/progression engine in Rust.

The existing guide frontend should remain the owner of route state and progression decisions. The native layer should only handle desktop-window behaviour, persistence where appropriate, and communication between windows.

## 3. Upstream dependencies and legal boundaries

This project is built around two third-party repositories:

| Dependency                                                                    | Role in this project                                                 | Integration strategy                                                                                                                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`HeartofPhos/exile-leveling`](https://github.com/HeartofPhos/exile-leveling) | Guide UI, routes, settings, and progression logic                    | Fork it and add the desktop target. The repository is MIT-licensed.                                                                                                      |
| [`HeartofPhos/exile-log-api`](https://github.com/HeartofPhos/exile-log-api)   | User-run local helper that reads the client log and publishes events | Treat it as an external executable and connect through its documented/current local WebSocket behaviour. Do not copy or bundle it without explicit licensing permission. |

Create your own fork, for example `YOUR_ACCOUNT/exile-leveling-desktop`, and configure the original as an `upstream` remote. Keep desktop-specific work in focused commits so updating from upstream remains manageable.

The helper currently listens on `127.0.0.1:6754` by default and publishes messages related to matching area generation lines. Do not rely on undocumented implementation details more than necessary. Put all interpretation of its messages behind one adapter module, and version/test that adapter with captured fixtures.

## 4. Recommended technology choices

### Desktop framework: Tauri 2

Use [Tauri 2](https://v2.tauri.app/) to package the existing web frontend as a desktop application.

Why:

- The guide is already TypeScript/CSS based, so its UI and logic can be reused.
- The app needs Rust only for native desktop capabilities, which fits Tauri well.
- Tauri supports custom, transparent, always-on-top windows and native application events.
- The installed app can embed local assets rather than loading GitHub Pages in an embedded browser.

Avoid Electron for the first implementation: it is viable, but adds a much larger runtime without solving an important problem for this project. Avoid a fully custom Win32/DirectX renderer: it would require recreating UI and text layout that the web guide already has.

### IDE: IntelliJ IDEA Ultimate + Rust plugin

Use **IntelliJ IDEA Ultimate** as the primary IDE.

- Install/enable the **Rust** plugin.
- Open the repository root, not `web/` or `src-tauri/` separately.
- Configure a Rust toolchain through `rustup`.
- Configure the project Node.js runtime and package manager.
- Mark `src-tauri/` as a Cargo project when IntelliJ prompts.

This gives one workspace for TypeScript/React/CSS, Rust, Cargo, npm scripts, Git, tests, and Tauri run configurations. RustRover is a workable alternative if the native layer becomes dominant, but IntelliJ IDEA is more convenient for this mixed codebase.

### Platform scope

Support **Windows 10/11** first. Game overlays are window-manager sensitive, and Windows is the right place to stabilise the product before attempting other desktop platforms.

For the initial release, document that Path of Exile should run in **borderless/windowed fullscreen**, not exclusive fullscreen. Ordinary desktop overlays may not appear above an exclusive fullscreen game.

## 5. Architecture

```text
                     User-installed external helper
                    ┌─────────────────────────────┐
                    │ exile-log-api                │
PoE LatestClient.txt│ reads area-transition lines  │
       ────────────►│ WebSocket 127.0.0.1:6754     │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│ Tauri desktop application                                          │
│                                                                    │
│  WebSocket adapter → guide auto-progress/store → OverlaySnapshot  │
│           │                              │                         │
│           │                              ├─ Dashboard webview      │
│           │                              └─ Overlay webview        │
│           │                                                        │
│  Rust layer: tray, global hotkeys, window tracking, native IPC     │
└───────────────────────────────────────────────────────────────────┘
```

### Source-of-truth rules

1. **Guide frontend state is the source of truth** for the selected route, skipped steps, edits, and current progress.
2. **The log helper is an event source only.** It does not decide what a guide step means.
3. **The overlay is a projection only.** It renders a compact snapshot and must not calculate progression itself.
4. **The native Rust layer is a desktop services layer.** It must not own guide logic unless a later deliberate architecture change moves that logic.

This avoids the common failure mode where the dashboard and overlay calculate “next step” differently.

## 6. Proposed repository layout

The exact existing frontend layout should be respected. Add the desktop work with minimal disruption:

```text
exile-leveling-desktop/
├── common/                         # Existing shared code, if present
├── web/
│   ├── src/
│   │   ├── app/
│   │   ├── guide/                  # Existing progression/store code
│   │   ├── integrations/
│   │   │   └── logApiClient.ts     # All helper WebSocket parsing
│   │   ├── overlay/
│   │   │   ├── OverlayView.tsx
│   │   │   ├── overlaySnapshot.ts
│   │   │   └── overlayPreferences.ts
│   │   └── desktop/
│   │       └── tauriBridge.ts      # No direct Tauri calls outside here
│   └── ...
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands.rs
│   │   ├── overlay_window.rs
│   │   ├── poe_window.rs
│   │   ├── tray.rs
│   │   ├── hotkeys.rs
│   │   └── settings.rs
│   ├── capabilities/
│   ├── icons/
│   ├── tauri.conf.json
│   └── Cargo.toml
├── tests/
│   └── fixtures/
│       └── log-api/                # Captured, sanitised WebSocket messages
├── docs/
│   ├── architecture.md
│   ├── helper-compatibility.md
│   └── release-checklist.md
└── README.md
```

Important boundaries:

- `logApiClient.ts` is the only module that knows the external helper's message format.
- `tauriBridge.ts` is the only frontend module that calls Tauri APIs.
- `overlaySnapshot.ts` is the only contract the overlay needs from the dashboard.
- Windows API work stays in Rust under `poe_window.rs`; no platform calls in frontend components.

## 7. Data contracts

Define explicit, typed contracts before building UI.

### 7.1 Normalised helper event

The external helper may currently send raw WebSocket text and pings. Convert that into a stable internal event immediately:

```ts
export type AreaEnteredEvent = {
  type: "area-entered";
  areaName: string;
  receivedAt: string; // ISO timestamp generated locally
  source: "exile-log-api";
};
```

The adapter is responsible for rejecting unknown/malformed messages. It should log a useful diagnostic but never crash the guide.

### 7.2 Overlay snapshot

The dashboard produces a bounded display model:

```ts
export type OverlaySnapshot = {
  version: 1;
  updatedAt: string;
  connection: "connected" | "disconnected" | "waiting";
  actLabel?: string;
  areaLabel?: string;
  headline: string;
  details: string[]; // Limit to three short entries.
  step?: { current: number; total: number };
  status?: "active" | "complete" | "paused" | "error";
};
```

Do not send the full route, user settings, long HTML, or raw log lines to the overlay. This keeps the second window simple and prevents visual overload.

### 7.3 Overlay preferences

Persist a separate, versioned preference object:

```ts
export type OverlayPreferences = {
  version: 1;
  enabled: boolean;
  positionX: number;
  positionY: number;
  scale: number;
  opacity: number;
  autoHideSeconds: number | null;
  showOnlyWhenPoeFocused: boolean;
};
```

Use migrations whenever this object changes. Never silently discard a user’s positioning choices.

## 8. Implementation milestones

Work through these milestones in order. Do not begin native game-window tracking until the snapshot flow is reliable.

### Milestone 0 — Repository and compatibility discovery

Tasks:

- Fork the guide repository and verify its normal development build still works.
- Add the original repository as `upstream`.
- Install and run `exile-log-api` separately, without changing it.
- Record sanitised WebSocket traffic for: startup, client connected, area transition, unknown area, helper restart, and client restart.
- Identify the existing frontend module/action that handles auto-progression.
- Decide how a desktop user chooses or imports their guide/profile.

Acceptance criteria:

- The fork builds unchanged.
- A written message-format note exists under `docs/helper-compatibility.md`.
- Automated adapter tests can replay captured helper messages.

### Milestone 1 — Tauri shell and dashboard

Tasks:

- Add Tauri to the project without changing guide behaviour.
- Build the web frontend as local Tauri assets.
- Create a dashboard window with the existing guide interface.
- Add a tray icon with `Show dashboard`, `Toggle overlay`, and `Quit` actions.
- Ensure dashboard close and tray `Quit` both exit the complete process cleanly.
- Add a visible connection status indicator for the external helper.

Acceptance criteria:

- `npm run tauri dev` (or the project equivalent) opens the guide locally.
- The app works without an internet connection.
- Hiding the dashboard does not terminate the app.

### Milestone 2 — Event adapter and existing auto-progress

Tasks:

- Implement reconnecting WebSocket connection to `ws://127.0.0.1:6754`.
- Implement exponential reconnect backoff with a user-visible status; never retry in a tight loop.
- Parse helper traffic in `logApiClient.ts` and emit `AreaEnteredEvent`.
- Feed normalised area events into the existing guide’s auto-progress action.
- Make automatic progression opt-in and visibly pausable.
- Add a safe “last event received” diagnostic panel in the dashboard.

Acceptance criteria:

- Recorded event fixtures update guide progress exactly like the browser integration.
- A missing helper produces a clear disconnected state, not console-only errors.
- Restarting the helper reconnects without restarting the desktop app.

### Milestone 3 — Snapshot pipeline

Tasks:

- Implement a pure function that derives `OverlaySnapshot` from the current guide state.
- Write unit tests for active, paused, complete, and disconnected states.
- Publish a snapshot whenever guide state, helper connection status, or overlay preferences affect the display.
- Cache the last snapshot in the Rust process so a re-created overlay window receives it immediately.

Acceptance criteria:

- No overlay component queries the guide store directly.
- The snapshot builder is deterministic and unit-tested.
- Dashboard and overlay state remain consistent after a helper reconnect.

### Milestone 4 — Overlay UI

Tasks:

- Add an overlay route/window that renders only `OverlaySnapshot`.
- Create a frameless, transparent, always-on-top window.
- Make it non-focusable and click-through by default.
- Implement a deliberate temporary “edit layout” mode that disables click-through, then automatically returns to safe pass-through mode.
- Add scale, opacity, drag-only positioning, hide/show, and auto-hide settings.
- Add a global hotkey for show/hide and a second hotkey for temporary detail mode.

Acceptance criteria:

- The overlay does not steal clicks or keyboard focus from Path of Exile.
- New snapshots render without visual flicker.
- Preferences survive a restart.
- The overlay is legible at 100%, 125%, 150%, and 200% Windows DPI.

### Milestone 5 — Attach behaviour to the game window

Tasks:

- Identify the PoE window from the process ID/window handle, not its title alone.
- Detect whether that window is foreground.
- Hide overlay when PoE is not foreground if the preference is enabled.
- Compute the overlay position relative to the PoE client rectangle.
- Update on window movement, resize, monitor change, and DPI change.
- Provide free-placement fallback when PoE window detection fails.

Implementation notes:

- This is Windows-only native work. Keep it behind a small Rust interface.
- Polling at a modest rate is acceptable for the first version; replace with platform window events only if necessary.
- Never attach to, inject into, or alter the PoE process. Window discovery is an OS-level desktop feature only.

Acceptance criteria:

- Alt-tabbing hides and restores the overlay predictably.
- Moving PoE between monitors keeps the overlay correctly positioned.
- Resizing PoE does not leave an orphaned overlay elsewhere on the desktop.

### Milestone 6 — Release readiness

Tasks:

- Add Windows packaging and a reproducible CI build.
- Create a setup guide explaining that `exile-log-api` is installed and run separately.
- Document the supported helper version(s) and troubleshooting steps.
- Test no-helper, stale-helper, PoE-not-running, PoE-restart, and multi-monitor cases.
- Add a privacy statement: no telemetry, no game memory access, log events remain local.
- Decide whether to add code signing. It is recommended before broad distribution but not required for private testing.

Acceptance criteria:

- A clean Windows machine can install, launch, connect to the helper, and use the overlay from the documentation alone.
- Every known failure has an actionable user-facing message.

## 9. Window and input design requirements

The overlay must be helpful without becoming an obstacle.

### Default behaviour

- Transparent surrounding window; only the information card is visible.
- Always on top of the game window while PoE is foreground.
- Click-through (`ignore cursor events`) and non-focusable.
- No automatic game interaction.
- Modest default size; do not obscure the centre of the screen, flasks, life/mana, or minimap.
- High-contrast text and a translucent dark background.

### Suggested default layout

```text
┌────────────────────────────────┐
│ ACT 3 · THE MARKETPLACE         │
│                                │
│ Go to The Battlefront           │
│ • Find the waypoint             │
│ • Take the sewer exit           │
│                                │
│ Step 22 / 61                    │
└────────────────────────────────┘
```

### Controls

- `Toggle overlay`: show/hide the window.
- `Detail mode`: briefly enlarge the card or reveal a few more details.
- `Edit layout`: only available from dashboard/tray, or with a clearly documented hotkey; temporarily permits mouse interaction.
- `Pause auto-progress`: dashboard/tray action, not a game macro.

Do not assign default hotkeys that conflict with common PoE bindings. Make all hotkeys configurable and provide a conflict warning where possible.

## 10. Error handling and diagnostics

Build diagnostics into the product rather than relying on developer tools.

| Situation                              | User-facing state                              | Expected recovery                                     |
| -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Helper not running                     | `Waiting for log helper`                       | Start helper; desktop app reconnects automatically.   |
| Port occupied / bad WebSocket endpoint | `Cannot connect to log helper`                 | Display configured endpoint and troubleshooting link. |
| Unknown helper message                 | `Helper message not recognised` in diagnostics | Continue running; save redacted debug detail.         |
| PoE not found                          | Overlay remains in manual placement mode       | Start game or configure overlay manually.             |
| PoE loses focus                        | Overlay hidden or dimmed                       | Restore automatically when PoE regains focus.         |
| Route complete                         | `Guide complete`                               | Do not advance further automatically.                 |

Do not log entire `LatestClient.txt` contents. If a user asks for support data, collect only timestamps, connection state, app versions, normalised event names, and error summaries.

## 11. Test strategy

### Unit tests

- Parse helper message fixtures into `AreaEnteredEvent`.
- Reject malformed or unexpected messages safely.
- Test all auto-progress decisions that can be triggered by an area event.
- Test `OverlaySnapshot` generation from representative guide states.
- Test overlay-preference migration.

### Integration tests

- Use a local fake WebSocket server with recorded fixtures.
- Verify disconnect/reconnect behaviour.
- Verify dashboard state updates produce exactly one meaningful snapshot update.
- Verify overlay receives the cached snapshot after it is recreated.

### Manual desktop tests

Run the following on every release candidate:

- 1920×1080, 2560×1440, and 3840×2160.
- 100%, 125%, 150%, and 200% display scaling.
- One monitor and two-monitor setups.
- PoE borderless fullscreen and windowed modes.
- Alt-tab, minimise, lock/unlock, PoE restart, helper restart, and desktop-app restart.
- Overlay hidden, visible, auto-hidden, and layout-edit modes.
- A full act progression replay using recorded area events.

### Game-safety regression check

Before release, inspect dependencies and code paths to confirm there is no:

- process memory read/write,
- DLL injection,
- game process manipulation,
- input generation,
- non-loopback server binding,
- hidden network telemetry.

## 12. IntelliJ IDEA project setup checklist

1. Clone your fork and open the repository root in IntelliJ IDEA Ultimate.
2. Enable the Rust plugin.
3. Install Rust using `rustup`; choose a stable toolchain.
4. Configure Node.js and the package manager used by the upstream repository.
5. Let IntelliJ import the root npm project/workspaces.
6. Let IntelliJ import `src-tauri/Cargo.toml` as a Cargo project.
7. Add run configurations for:
   - existing web development server;
   - Tauri development application;
   - frontend tests;
   - Rust tests;
   - optional fake-helper integration test.
8. Enable Prettier/ESLint according to upstream project configuration.
9. Configure Rustfmt and Clippy in the Cargo tool window.
10. Keep generated Tauri build output and dependency directories excluded from project indexing where appropriate.

Recommended daily development loop:

1. Run the fake helper fixture server.
2. Run the Tauri development app.
3. Change guide/overlay code in the web project.
4. Use recorded events to exercise progress transitions.
5. Use the dashboard diagnostics panel before testing against a real game client.

## 13. Effort estimate

These estimates are developer hours for one person and include implementation, debugging, and basic testing. They assume familiarity with TypeScript but limited prior Tauri/Rust/native-window experience.

| Stage                   | Scope                                                                    |                Estimate |
| ----------------------- | ------------------------------------------------------------------------ | ----------------------: |
| Proof of concept        | Transparent fixed-position overlay rendering fake text                   |             12–24 hours |
| Functional core         | Tauri shell, helper adapter, guide auto-progress, real snapshot overlay  |             50–90 hours |
| Good Windows v1         | Tray, hotkeys, preferences, PoE-window following, tests, installer       |      90–150 hours total |
| Polished public release | Diagnostics, broad compatibility pass, release automation, documentation |     140–220 hours total |
| Linux/X11 support       | Separate platform work and packaging                                     |         Add 30–70 hours |
| Wayland support         | Needs feasibility investigation; do not promise scope up front           | Potentially significant |

The highest-risk work is not rendering text. It is preserving upstream guide behaviour while cleanly bridging state between a dashboard, a second webview, the helper process, Windows DPI rules, and multi-monitor/fullscreen behaviour.

## 14. Definition of a successful v1

The first release is successful when the following user story works reliably:

> I start the existing log helper, start the desktop guide, select my route, start Path of Exile in borderless fullscreen, and see a compact click-through overlay update to the correct next guide instruction after I enter a new area.

It is not necessary for v1 to support every platform, replace the external helper, add any game automation, or match every option from the website in the overlay.

## 15. Future work after v1

Only consider these after the Windows v1 is stable:

- Optional managed-launch integration for a separately user-installed helper.
- Better multi-profile import/export and route selection.
- Optional larger “details” overlay panel.
- Accessibility options: font family, outline, colour themes, screen-reader-friendly dashboard controls.
- Linux/X11 support, then separate Wayland feasibility work.
- Upstream contribution proposal if the maintainers are interested.
- Optional helper protocol version negotiation, if the helper author agrees to define a stable protocol.

Do not make a second route engine, an in-game automation feature, or a remote service part of the roadmap unless there is a separate compelling reason and an explicit safety review.
