# exile-log-api compatibility

The desktop app targets the source-observed behaviour of `exile-log-api`
`v0.0.2` at `ws://127.0.0.1:6754`.

The helper sends text frames copied from Path of Exile's client log. An area
transition contains:

```text
Generating level <number> area "<area-id>"
```

`logApiProtocol.ts` is the only module that interprets this wire format. It
returns a typed `AreaEnteredEvent` for matching frames and `null` for startup,
connection, diagnostic, binary, or malformed traffic. Unknown but
well-formed area identifiers remain valid events; route state decides whether
they advance the guide.

`logApiClient.ts` reconnects after 1, 2, 4, 8, 16, then at most 30 seconds.
Successful connections reset that sequence. Diagnostics expose only the
connection state, receive time, normalised area identifier/level, or an
unrecognised-message marker; raw helper frames are not retained.

The fixtures under `tests/fixtures/log-api` are sanitised and source-derived.
The installed Windows application has successfully connected to the official
`v0.0.2` helper and advanced from a live area transition. Do not record full
client logs or user-identifying paths.

For local testing, run `npm run fake-helper`. Its `area <id> [level]`,
`unknown`, `malformed`, and `disconnect` commands exercise normal events,
diagnostics, and reconnect behaviour without reading a Path of Exile log.
