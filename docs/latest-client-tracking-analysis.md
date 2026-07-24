# LatestClient.txt tracking analysis

Last reviewed: 2026-07-24

## Summary

`LatestClient.txt` can support useful local-only timing and reminder features,
but it is not a quest-state API. Area generation is the only signal currently
trusted for automatic route progression. Future features should parse a small
allowlist into typed events and must never expose arbitrary log lines.

## Reliable enough for product features

### Area generation

A generated-area record provides:

- the internal area identifier;
- the area level;
- an instance seed;
- the log timestamp.

The current overlay uses only the identifier and level. A repeated area ID and
seed can identify re-entry into the same instance; a changed seed usually
indicates a new instance. This could support zone timers, campaign splits,
backtracking detection, and run history without changing progression rules.

This language-independent record is also the only pattern forwarded by the
upstream [`exile-log-api`](https://github.com/HeartofPhos/exile-log-api/blob/main/src/main.rs).
Community tooling such as
[MapWatch](https://github.com/ugimser/mapwatch/blob/main/js/parsers.js) has
independently parsed the same event family.

### Session and loading boundaries

Log opening/closing markers can delimit play sessions, although a crash may
omit a clean close. Instance connection, connect-time, and loading-state
records could support:

- time spent loading versus playing;
- local gateway/latency warnings;
- more accurate split timing around zone transitions.

Server addresses and network diagnostics are sensitive. Any such feature
should keep them native and local, emitting only a duration or coarse status.

## Useful, but requires identity or opt-in heuristics

### Character level

Level-up chat records can trigger gem, passive-tree, or pacing reminders.
However, party-member level-ups may appear too. A safe implementation needs a
user-selected active character and an initial level; the log does not provide
a reliable complete character-state snapshot.

### Deaths

Character slain records can provide a local death counter and time-loss
statistics after matching the active character. They should not influence
route progression because logging completeness has varied and the text may be
localised.

### Party and trade activity

Player join/leave-area records and a trade-accepted record can support optional
party or trade analytics. They do not prove portal use, a death, or acquisition
of a specific item. Examples are visible in Grinding Gear Games'
[client-log discussion](https://www.pathofexile.com/forum/view-thread/2645771).

### Human-readable area names

`You have entered ...` is convenient for display, but it is localised and has
historically been absent in some sessions. The route engine should continue
mapping the internal generated-area ID to its own display name. See the
[missing-entry report](https://www.pathofexile.com/forum/view-thread/2948718).

## Experimental only

NPC and boss dialogue can sometimes suggest a story milestone or encounter,
but it can replay, appear before completion, change between patches, and vary
by language. It may power clearly labelled hints, never automatic quest
completion.

League-specific records can also announce rare encounters. The patterns
collected by
[PoE1ToastNotifier](https://github.com/annedobalina/PoE1ToastNotifier/blob/main/PoE1ToastNotifier.ps1)
show the opportunity, but these alerts require maintenance every league and
must remain optional.

## Not reliably available from the log alone

The following should remain manual unless another permitted, authoritative data
source is introduced:

- waypoint activation;
- quest-item pickup;
- quest completion or reward choice;
- passive-point allocation or remaining points;
- inventory, equipped item, or skill-gem state;
- ordinary monster or boss kills;
- exact experience progress between levels;
- challenge, atlas, or map completion.

Consequently, entering a town can reveal the current checkpoint instructions,
but the log cannot prove that the player bought a gem or handed in a quest.

## Privacy boundary

Full client logs can contain whispers and other chat, character and guild
names, trade text, server addresses, local filesystem paths, hardware details,
and settings diagnostics. Grinding Gear Games forum examples show both
[chat-bearing logs](https://www.pathofexile.com/forum/view-thread/3445272) and
[startup diagnostics with local system details](https://www.pathofexile.com/forum/view-thread/3795554).

Required rules for every future parser:

1. Read locally.
2. Match an explicit, reviewed allowlist.
3. Convert immediately to a minimal typed event.
4. Do not send raw excerpts to the WebView, diagnostics, files, or telemetry.
5. Document identity, localisation, and false-positive limitations.
6. Keep network addresses and character names out of persisted analytics by
   default.

## Reader requirements

`LatestClient.txt` is session-oriented and may be truncated or replaced when
the game restarts. The reader must:

- attach at end-of-file initially so old events do not replay;
- reset to byte zero after detecting replacement or truncation;
- retry file-open failures during client restarts and updates;
- preserve incomplete final lines between polls;
- frame bytes before lossy UTF-8 conversion;
- advance by bytes actually read if the file grows concurrently;
- indicate which client is active if multiple installations are ever
  supported.

The integrated reader implements these safeguards. They also address edge
cases in the upstream
[`log_reader.rs`](https://github.com/HeartofPhos/exile-log-api/blob/main/src/log_reader.rs),
whose intentionally small implementation does not cover every rotation or
partial-write scenario.

## Recommended roadmap

1. Add zone timers, act splits, run history, and same-instance/new-instance
   detection from generated-area timestamps and seeds.
2. Add optional character-level pacing and contextual gem/tree reminders after
   introducing explicit character selection.
3. Add an opt-in death counter and time-loss summary.
4. Add optional rare-encounter notifications with per-league pattern tests.
5. Add local load-time and coarse latency diagnostics.
6. Consider NPC-dialogue hints only as an experimental, localised heuristic.
