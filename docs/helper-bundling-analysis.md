# Helper bundling analysis

Last reviewed: 2026-07-23

## Conclusion

Bundling the helper is technically straightforward, but redistributing the
current upstream executable is not ready for implementation. The
`HeartofPhos/exile-log-api` repository does not currently expose a license
file, and its `Cargo.toml` does not declare a license. A public repository is
not, by itself, permission to redistribute its binary.

The repository's latest visible release is `v0.0.3`, while this overlay has
been tested against `v0.0.2`. Compatibility with `v0.0.3` must be verified
before adopting it.

Sources:

- <https://github.com/HeartofPhos/exile-log-api>
- <https://github.com/HeartofPhos/exile-log-api/blob/main/Cargo.toml>
- <https://github.com/HeartofPhos/exile-log-api/blob/main/src/main.rs>
- <https://v2.tauri.app/develop/sidecar/>

This is a release-engineering assessment, not legal advice. Explicit
redistribution permission or an appropriate upstream license should be
obtained before shipping upstream binaries or source.

## Option A: bundle the upstream helper as a Tauri sidecar

Once redistribution is permitted, Tauri can package the helper executable
through `bundle.externalBin`. The desktop backend would:

1. Check whether `127.0.0.1:6754` is already serving a compatible helper.
2. Start the bundled helper only when the port is free.
3. Keep the child-process handle and report startup failures in the dashboard.
4. Restart the owned child after unexpected exits with a bounded delay.
5. Terminate only the child started by this app when the dashboard exits.
6. Continue supporting an externally started helper for development and
   backwards compatibility.

The helper already accepts `--address` and `--log-path`, auto-detects the PoE
process, reads `logs/LatestClient.txt`, and exposes matching area lines through
its local WebSocket. No administrator rights should be required.

Risks:

- An existing helper can already own port `6754`.
- Antivirus and SmartScreen may scrutinise an installer containing multiple
  unsigned executables.
- The overlay becomes responsible for helper updates, crash handling, version
  reporting, and clean shutdown.
- Each supported CPU architecture needs a correctly named sidecar binary in
  the packaging pipeline.

## Option B: implement the small log reader inside the Tauri backend

The helper's required behaviour is narrow: locate `LatestClient.txt`, seek to
the end, follow appended lines, and emit only matching area transitions. An
independent Rust implementation inside this project could send typed Tauri
events directly and remove the local WebSocket and child process.

Advantages:

- One executable, one lifecycle, and no port conflicts.
- Smaller attack surface and simpler diagnostics.
- No helper console window or orphan process.
- Installer, signing, and updates remain a single application concern.

Risks:

- It must be implemented independently rather than copying unlicensed source.
- Log-path discovery, truncation, rotation, access errors, and PoE restarts
  need new tests.
- The existing external-helper mode should remain available as a fallback
  until the integrated reader has been validated through a complete route.

## Recommendation

Prefer Option B for the polished application, while retaining the existing
WebSocket adapter as an advanced fallback. It produces the best user
experience and avoids distributing an additional executable.

If exact upstream-helper reuse is preferred instead, first ask its maintainer
to add an explicit license or grant redistribution permission, then verify
`v0.0.3` protocol compatibility before adding it as a managed sidecar.
