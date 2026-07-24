# Privacy and game-safety statement

Exile Leveling Overlay has no accounts, analytics, advertising, telemetry, or
cloud sync.

During normal gameplay, the application:

- locates the running Path of Exile executable and reads newly appended,
  complete lines from its `logs/LatestClient.txt` file;
- allowlists only `Generating level ... area ...` transitions and processes
  them locally;
- converts those allowlisted lines to typed area identifiers and emits them
  directly to the bundled dashboard through Tauri;
- stores route, build, overlay, and shortcut preferences locally in the
  application's WebView storage;
- uses Windows desktop APIs to identify the Path of Exile executable, read its
  top-level client rectangle, and determine whether that window is foreground;
- does not read or write game memory;
- does not inject DLLs, inspect packets, patch files, or automate input;
- does not transmit gameplay data to the internet;
- does not retain raw log lines or Path of Exile log contents.

`LatestClient.txt` can contain chat, character names, server addresses,
hardware details, and local paths. The application does not forward, display,
or store those records. The reader is byte-oriented and discards every line
that is not an allowlisted area-generation event.

If the user explicitly imports a Path of Building or route URL instead of
pasting its contents, the native application downloads it directly over HTTPS.
Only the documented Pastebin, poe.ninja, pobb.in, and Maxroll hosts are
allowed; redirects use the same allowlist, responses are limited to 2 MB, and
requests time out. This action is user-initiated and does not include gameplay
data, log events, or local files. Pasting the code/content avoids the request.

Source Sans Pro is bundled locally; the installed application does not
download fonts from Google.

The Windows installer may contact Microsoft to obtain WebView2 only when that
runtime is missing. The integrated reader is adapted from MIT-licensed
`exile-log-api`; its license notice is bundled under `src-tauri/licenses`.
