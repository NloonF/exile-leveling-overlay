# Integrated log reader

The desktop app includes a reader adapted from the MIT-licensed
[`exile-log-api`](https://github.com/HeartofPhos/exile-log-api). It runs inside
the Tauri process; users do not install or start a separate helper.

When auto-progress is enabled, the reader locates
`logs/LatestClient.txt` from an explicitly supported Path of Exile 1
executable, attaches at the current end of the file, and examines only new
complete lines. It converts matching records into typed Tauri events:

```text
Generating level <number> area "<area-id>"
```

No WebSocket, localhost port, raw-log frontend API, or external-helper
fallback is exposed. Disabling auto-progress detaches the tailer. A manual
`LatestClient.txt` path is available under **Advanced log location** for
unusual installations or process-access restrictions.

The native tailer handles game restarts, file replacement/truncation,
multilingual bytes, incomplete final lines, and temporary read failures
without replaying the existing session. Unknown but well-formed area
identifiers remain valid typed events; route state decides whether they
advance the guide.
