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

- [ ] Built-in reader starts and stops with the desktop process.
- [ ] Auto-progress disabled/enabled repeatedly and reader confirmed idle while
      disabled.
- [ ] Automatic and manual `LatestClient.txt` selection, including an invalid
      or inaccessible path.
- [ ] PoE not running, started late, restarted, windowed, and borderless.
- [ ] `LatestClient.txt` append, partial line, truncation, replacement, and
      temporary access failure.
- [ ] Alt-tab, minimise, lock/unlock, move, resize, monitor change.
- [ ] 100%, 125%, 150%, and 200% display scaling.
- [ ] One-monitor and two-monitor arrangements including negative screen
      coordinates.
- [ ] Imported build with quest and gem-reward checkpoint details.
- [ ] Full act progression replay using sanitised generated-area events.

## Safety and privacy

- [ ] Confirm network connections are limited to user-triggered, allowlisted
      HTTPS imports and the WebView2 installer bootstrapper.
- [ ] Confirm non-area log lines never reach the frontend or diagnostics.
- [ ] Confirm there is no game memory access, injection, packet inspection,
      file patching, input generation, or telemetry.
- [ ] Confirm diagnostics contain only timestamps, state, normalised area
      names, and error summaries.
- [ ] Retest all dashboard, import, and overlay views under the restrictive
      desktop content-security policy.

## Distribution decision

Public tags use `.github/workflows/release-windows.yml` and require
`WINDOWS_CERTIFICATE_BASE64` and `WINDOWS_CERTIFICATE_PASSWORD` repository
secrets. The workflow refuses unsigned releases, verifies Authenticode,
publishes SHA-256 checksums and an SPDX SBOM, and creates build-provenance
attestations. Enable GitHub's immutable releases setting before publishing the
first stable tag.
