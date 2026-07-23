# Windows release checklist

## Automated

- [ ] `npm ci`
- [ ] `npm test`
- [ ] `npm run build -w web`
- [ ] `npm run build:desktop -w web`
- [ ] `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml --locked`
- [ ] `npm run build:windows`
- [ ] Confirm the NSIS artifact is named
      `Exile Leveling Overlay_<version>_x64-setup.exe`.

## Clean-machine install

- [ ] Install for a non-administrator Windows user.
- [ ] Launch from the Start menu.
- [ ] Verify dashboard, tray, global shortcuts, and full-process exit.
- [ ] Uninstall from Installed apps and confirm the application files and
      shortcuts are removed.
- [ ] Test WebView2 already installed and WebView2 missing.

## Runtime scenarios

- [ ] Helper missing, started late, stopped, restarted, and stale.
- [ ] PoE not running, started late, restarted, windowed, and borderless.
- [ ] Alt-tab, minimise, lock/unlock, move, resize, monitor change.
- [ ] 100%, 125%, 150%, and 200% display scaling.
- [ ] One-monitor and two-monitor arrangements including negative screen
      coordinates.
- [ ] Imported build with quest and gem-reward checkpoint details.
- [ ] Full act progression replay using recorded helper events.

## Safety and privacy

- [ ] Confirm network connections are limited to the loopback helper,
      user-triggered URL imports through the documented CORS proxy, and the
      WebView2 installer bootstrapper.
- [ ] Confirm there is no game memory access, injection, packet inspection,
      file patching, input generation, or telemetry.
- [ ] Confirm diagnostics contain only timestamps, state, normalised area
      names, and error summaries.
- [ ] Retest all dashboard, import, and overlay views under the restrictive
      desktop content-security policy.

## Distribution decision

Private test installers are currently unsigned and may trigger SmartScreen.
Before broad public distribution, obtain a Windows code-signing certificate,
configure CI signing secrets, verify signatures on a clean machine, and
document the certificate publisher. Do not present an unsigned build as a
polished public release.
