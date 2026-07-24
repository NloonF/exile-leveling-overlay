# Log-reader integration record

Last reviewed: 2026-07-24

## Decision

`exile-log-api` now publishes an MIT license, and its owner granted permission
for this integration. The overlay therefore adapts its narrow log-reading
behavior directly into the Tauri backend instead of packaging a second
executable.

The authoritative upstream sources are:

- <https://github.com/HeartofPhos/exile-log-api>
- <https://github.com/HeartofPhos/exile-log-api/blob/main/LICENSE>
- <https://github.com/HeartofPhos/exile-log-api/blob/main/src/main.rs>
- <https://github.com/HeartofPhos/exile-log-api/blob/main/src/log_reader.rs>

The upstream copyright and MIT terms are retained in
`src-tauri/licenses/exile-log-api-MIT.txt`, which the Windows installer bundles.

## Implemented design

The native application:

1. Locates an allowlisted Path of Exile 1 executable with Windows process APIs
   and rejects paths that identify a Path of Exile 2 installation.
2. Resolves `<game directory>/logs/LatestClient.txt`.
3. Attaches at the end of the existing file so old session events are not
   replayed.
4. Polls for newly completed lines and allowlists only
   `Generating level <number> area ...` records.
5. Parses those records into typed events and emits them directly to the
   dashboard through Tauri.
6. Retries across access failures and game restarts, and resets safely when
   the log is replaced or truncated.

The reader buffers incomplete final lines, frames bytes before lossy UTF-8
conversion, and advances by bytes actually read. This avoids partial-line loss,
invalid-UTF-8 failures, and duplicate reads if the file grows during a poll.

## Lifecycle and fallback

The reader is an asynchronous task inside the one Tauri process. Closing the
dashboard exits that process, so there is no helper console, child process, or
orphan to terminate. It does not open a localhost port or accept events from
external processes.

## Security and privacy boundary

The native reader does not send full log content to the frontend: chat,
character names, server addresses, and unrelated diagnostics are discarded
before publication. No gameplay event is sent over the internet or retained.

Future log-derived features must continue using typed allowlisted events rather
than exposing arbitrary raw lines. See
[LatestClient tracking analysis](latest-client-tracking-analysis.md).
