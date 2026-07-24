Ca# Exile Leveling Overlay v0.2.0 — Installation and Showcase Video Script

**Suggested video title:**  
Exile Leveling Overlay: Installation, Setup and Full Showcase

**Target length:** 8–10 minutes

**Format:** Screen recording with voice-over

## Recording preparation

Have the following ready before recording:

- The GitHub repository and `v0.2.0` release pages open in separate browser
  tabs.
- The installer downloaded but not yet installed.
- Path of Exile 1 installed and able to reach the character-selection screen.
- A character near an early campaign transition, such as Lioneye's Watch and
  The Coast.
- A Path of Building code or supported build URL copied to the clipboard.
- Exile Leveling Overlay closed at the start of the recording.
- Desktop notifications and unrelated applications disabled.
- Any account names, character names, file paths, or browser bookmarks that
  should remain private hidden before recording.

For the clearest result, record the installation and dashboard at 1440p or
1080p, then record the in-game showcase as a separate take.

## 0:00–0:20 — Opening hook

### On screen

Start with Path of Exile running. Show the overlay beside the game with the
current checkpoint, previous checkpoint details, icons, and imported gem
rewards visible.

Walk through an area transition and show the overlay progressing
automatically.

### Narration

> This is Exile Leveling Overlay, an open-source Windows leveling companion
> for Path of Exile. It keeps the campaign guide visible over the game,
> preserves detailed quest and vendor instructions, imports your Path of
> Building setup, and can automatically follow your progress without requiring
> a separate helper application.

### Editing note

Add a short title card:

**Exile Leveling Overlay — Installation and Showcase**

## 0:20–0:55 — What the application does

### On screen

Show a quick montage of:

1. The route guide in the dashboard.
2. The Build page.
3. Overlay settings.
4. The overlay positioned beside Path of Exile.

### Narration

> This project is a Windows desktop fork of the Path of Exile Leveling Guide
> originally created by HeartofPhos. It adds a transparent, always-on-top
> overlay, native Windows controls, automatic area progression, global
> shortcuts, and direct local log reading.
>
> The application does not read game memory, inject into the game, inspect
> network traffic, modify game files, or automate player input. It simply
> reads the area-transition messages Path of Exile writes to its local
> `LatestClient.txt` log.

### On-screen text

- Open source
- No game injection
- No memory reading
- No separate helper

## 0:55–1:45 — Downloading the installer

### On screen

1. Open the GitHub repository.
2. Briefly show the README.
3. Open **Releases**.
4. Select release `v0.2.0`.
5. Scroll through the release notes.
6. Download `Exile Leveling Overlay_0.2.0_x64-setup.exe`.

### Narration

> To install the application, open the GitHub repository using the link in the
> video description, then open the Releases page. Select the latest release
> and download the 64-bit Windows setup file.
>
> Version 0.2.0 is currently distributed without a paid code-signing
> certificate. Because of that, Windows may identify it as an unknown
> publisher. The complete source code is public, and the installer can also be
> built locally from that source.

### Editing note

Zoom in on the exact installer filename so viewers do not accidentally
download source archives instead.

## 1:45–2:35 — Windows security warning and installation

### On screen

1. Run the downloaded installer.
2. If SmartScreen appears, show **More info**.
3. Confirm the application name.
4. Select **Run anyway**.
5. Continue through the installer.
6. Launch the application from the Start menu.

### Narration

> Run the installer after the download completes. If Windows SmartScreen
> appears, select More info, confirm that the application is Exile Leveling
> Overlay, and then select Run anyway.
>
> This is a per-user installation, so administrator access should not normally
> be required. Once installation finishes, launch Exile Leveling Overlay from
> the Start menu.

### On-screen warning

**Only download installers from the official GitHub Releases page.**

## 2:35–3:20 — First look at the dashboard

### On screen

Show the dashboard after first launch:

1. Point out the campaign route.
2. Open a checkpoint with sub-tasks.
3. Show quest hand-ins, vendor actions, icons, and hints.
4. Briefly show the navigation menu.

### Narration

> The main dashboard contains the campaign route. Each checkpoint can include
> more than an area name: it can show quest hand-ins, items to buy, vendor
> actions, waypoints, crafting reminders, and other route details.
>
> The guide keeps the original project's colors, icons, typography, and route
> presentation. Progress is stored locally, so you can close the application
> and continue later.

## 3:20–4:05 — Importing a Path of Building build

### On screen

1. Open **Build**.
2. Paste a Path of Building code or supported URL into **Path of Building
   Code**.
3. Select **Import Build**.
4. Wait for **Import Success**.
5. Return to the route and show newly added gem rewards or build-specific
   checkpoint details.

### Narration

> If you are following a Path of Building build, open the Build page and paste
> its code or supported build URL into the import field. Select Import Build,
> and the application will add relevant gem rewards and build instructions to
> the campaign checkpoints.
>
> For example, a reward such as Rolling Magma can appear directly alongside
> the Lioneye's Watch instructions, so the build information is visible where
> you actually need it.

### Recording tip

Use a short test build that imports quickly and visibly adds an early-game gem
reward.

## 4:05–5:20 — Configuring the overlay

### On screen

1. Expand **Overlay settings**.
2. Demonstrate the **Show** and **Hide** button states.
3. Select **Edit layout**.
4. Drag the overlay to a useful position.
5. Select **Edit layout** again, or select **Finish editing** on the overlay.
6. Demonstrate scale and opacity controls.
7. Show **Auto-hide outside PoE**.
8. Point out the global shortcut fields.

### Narration

> Expand Overlay settings to configure the in-game window. Show and Hide
> control its visibility, while Edit layout temporarily makes the overlay
> interactive.
>
> While editing is enabled, drag the overlay anywhere on the screen. Select
> Edit layout again, or use Finish editing directly on the overlay, to lock it
> in place and return it to click-through mode.
>
> You can also adjust its scale and opacity, and optionally hide it whenever
> Path of Exile is not the active application. The overlay remembers its
> placement between launches.
>
> By default, Control, Shift, and O toggles overlay visibility. Holding
> Control, Shift, and D emphasizes the checkpoint details. These shortcuts can
> be changed from the dashboard.

### On-screen text

- `Ctrl+Shift+O` — Show or hide overlay
- Hold `Ctrl+Shift+D` — Emphasize details

## 5:20–6:15 — Enabling automatic progression

### On screen

1. Show that automatic progression is initially disabled.
2. Select **Enable auto-progress**.
3. Allow a few seconds for automatic `LatestClient.txt` detection.
4. If practical, briefly point out the manual `LatestClient.txt` file picker.
5. Show **Pause auto-progress** and **Resume auto-progress** without changing
   the saved route.

### Narration

> The overlay is available immediately, but automatic progression is opt-in.
> Select Enable auto-progress when you are ready to play.
>
> The application will normally locate Path of Exile's
> `LatestClient.txt` automatically. If your installation is in an unusual
> location, you can select that file manually.
>
> Reading stops when auto-progress is disabled. You can also pause and resume
> progression temporarily without losing your route position.

### Editing note

Avoid showing a personal Windows username in the full log-file path. Crop or
blur it if necessary.

## 6:15–7:30 — In-game automatic progression showcase

### On screen

1. Place the dashboard on a second monitor or minimise it.
2. Start Path of Exile 1.
3. Show the overlay with the current and next route information.
4. In Lioneye's Watch, show the current checkpoint details.
5. Enter The Coast.
6. Keep the overlay visible long enough to show it advancing exactly once.
7. Highlight that the previous checkpoint tasks remain available.
8. If convenient, demonstrate entering an unrelated area without incorrectly
   skipping multiple checkpoints.

### Narration

> Now we can see the automatic progression in action. The guide expects The
> Coast next. When Path of Exile reports that area in its log, the application
> advances exactly one checkpoint.
>
> Notice that the previous checkpoint remains visible. Entering a new area
> does not necessarily mean every town task is complete, so this lets you
> review purchases, quest hand-ins, and build rewards from the point you just
> left.
>
> Progression is deliberately conservative. Unknown, repeated, or
> out-of-order area messages do not cause the guide to jump through multiple
> steps.

### Editing note

Add a subtle highlight around the checkpoint title when it changes. Consider
showing a side-by-side before-and-after frame for two seconds.

## 7:30–8:05 — Window tracking and manual fallback

### On screen

1. Alt-tab between Path of Exile and the dashboard.
2. Show optional auto-hide behavior.
3. Move or resize the Path of Exile window if using windowed or borderless
   mode.
4. Briefly show that manual placement still works if game detection is
   unavailable.

### Narration

> The desktop application tracks known Path of Exile 1 windows and can keep
> the overlay aligned while the game moves, resizes, or restarts. If the game
> cannot be detected, the overlay still works using its saved manual
> placement.
>
> Path of Exile 2 windows are intentionally excluded from this detection.

## 8:05–8:35 — Tray controls and closing the app

### On screen

1. Show the application icon in the Windows system tray.
2. Demonstrate any relevant tray visibility controls.
3. Close the application completely.
4. Optionally show Task Manager briefly to confirm the process exits.

### Narration

> The application also provides tray controls for quick access. When you
> choose to exit the application, its overlay, log reader, shortcuts, and
> background process close with it. There is no separately installed helper
> or service left running.

## 8:35–9:10 — Troubleshooting summary

### On screen

Show the repository documentation links:

- Windows setup
- Troubleshooting
- Privacy and game safety

### Narration

> If auto-progress does not react, first confirm that it is enabled and not
> paused, then start Path of Exile and wait a few seconds. If automatic
> detection fails, select `LatestClient.txt` manually from your Path of Exile
> logs folder.
>
> If a shortcut is unavailable, another Windows application may already be
> using it; choose a different shortcut in Overlay settings. More detailed
> setup, troubleshooting, privacy, and architecture documentation is available
> in the repository.

## 9:10–9:40 — Open-source credits and outro

### On screen

1. Show the repository's About or README credits section.
2. Show the MIT License.
3. End on the GitHub repository page.

### Narration

> Exile Leveling Overlay is open source under the MIT License. It builds on the
> original Path of Exile Leveling Guide and the MIT-licensed
> `exile-log-api`, both created by HeartofPhos.
>
> This is an independent community project and is not affiliated with or
> endorsed by Grinding Gear Games.
>
> If the application is useful to you, you can download it, report issues,
> inspect the source, or contribute through the GitHub repository linked
> below. Thanks for watching, and good luck with your next league start.

### End card

**Exile Leveling Overlay**

- Free and open source
- Windows 10 and Windows 11
- Repository and download links in the description

## Suggested video description

Exile Leveling Overlay is an open-source Windows campaign companion for Path
of Exile 1. It provides an always-on-top leveling guide, Path of Building
imports, detailed checkpoint tasks, and optional automatic progression using
the game's local `LatestClient.txt` log.

Download and source code:

https://github.com/NloonF/exile-leveling-overlay

This is an independent community project. It is not affiliated with or
endorsed by Grinding Gear Games.

Version shown: `v0.2.0`

## Suggested chapters

```text
00:00 Showcase
00:20 What the application does
00:55 Downloading
01:45 Installation
02:35 Dashboard overview
03:20 Importing a Path of Building build
04:05 Overlay configuration
05:20 Automatic progression setup
06:15 In-game showcase
07:30 Window tracking
08:05 Tray and application exit
08:35 Troubleshooting
09:10 Credits and open-source project
```
