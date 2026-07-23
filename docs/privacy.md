# Privacy and game-safety statement

Exile Leveling Overlay has no accounts, analytics, advertising, telemetry, or
cloud sync.

During normal gameplay, the application:

- connects only to the user-run helper at `ws://127.0.0.1:6754`;
- processes normalised area-transition events locally;
- stores route, build, overlay, and shortcut preferences locally in the
  application's WebView storage;
- uses Windows desktop APIs to identify the Path of Exile executable, read its
  top-level client rectangle, and determine whether that window is foreground;
- does not read or write game memory;
- does not inject DLLs, inspect packets, patch files, or automate input;
- does not bind a network server or transmit gameplay data to the internet;
- does not retain raw helper frames or Path of Exile log contents.

If the user explicitly imports a Path of Building or route URL instead of
pasting its contents, the requested URL is sent to
`https://cors-proxy-weld-sigma.vercel.app` so the browser-based importer can
download it. This action is user-initiated and does not include gameplay data,
helper events, or local files. Pasting the code/content avoids this request.

Source Sans Pro is bundled locally; the installed application does not
download fonts from Google.

The Windows installer may contact Microsoft to obtain WebView2 only when that
runtime is missing. The separately installed helper has its own code and
licensing boundary and should be reviewed independently.
