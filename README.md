# Rebuild

Personal 12-week strength + trail training tracker. A single-file PWA: no build step, no backend, works offline.
All data lives in the phone's localStorage (key `rebuild_v4`), tied to the site's web address — back up via **Settings → Data**.

```
public/          what ships: index.html (the whole app), sw.js, manifest.json, icons
deploy/          ready-to-drop zips for Netlify
dev-server.mjs   zero-dependency local server (not deployed)
```

## Run locally

```bash
node dev-server.mjs
```

Then open http://localhost:4173.

## Deploy (Netlify)

Drag the **`public` folder** (or `deploy/rebuild-netlify.zip`) onto https://app.netlify.com/drop — or, for an existing site, onto its **Deploys** page.
It must be the whole folder, not just `index.html`: the install prompt and offline mode need `manifest.json`, `sw.js` and the icons beside it.

- Settle the site name (Site configuration → Change site name) **before** logging on the phone. The log belongs to the web address; rename later and the data stays behind at the old one (Export → Import carries it over).
- On the phone: open the URL in Chrome → menu → **Add to Home screen / Install app**.
- Updating: drop the new folder on the same site. Phones pick it up the next time they open the app online. Bump `CACHE` in `public/sw.js` when `index.html` changes.

## Design (v6)

App shell modelled on the better training apps: top bar with context line, bottom tab bar with icons, a sticky session bar (elapsed time + **Finish n/m**), one card per exercise with a demo thumbnail, a `SET · PREV · KG · REPS · ✓` table, two swap chips on the card and the full swap list in a bottom sheet, and a docked rest bar with a progress line and −15 / +30 / Skip. Views fade in; the sheet slides up. Light and dark share one token set (`:root` block at the top of the stylesheet).

### Exercise demos

Each exercise shows a two-frame "motion" thumbnail (start/end photo flipped by CSS every 0.8 s) from the open-source **Free Exercise DB** (`yuhonas/free-exercise-db`, Unlicense / public domain), served from jsDelivr and cached by the service worker after first view so a session seen once shows its demos offline. The mapping is `MEDIA_MAP` in `index.html` (exercise name → dataset folder); the exercises with no match (TRX hamstring curl, single-leg hinge, SL RDL, pike push-up, suitcase carry, hollow hold, prone Y-raise) show a dumbbell icon and still have the YouTube link in their sheet. To change a demo, pick a folder from the dataset's `dist/exercises.json` and edit the map; to add true animated GIFs instead, see the notes at the end of this file.

## Sessions (v5.2)

Patterns in priority order — the first ones survive a short session:

- **A (lower):** squat, hinge, single-leg squat, horizontal pull, single-leg hinge, carry, calves
- **B (upper, pull first):** horizontal pull, horizontal push, vertical pull, vertical push, rear delts, side delts, core
- **C (full body):** lunge, step-up, horizontal push, hinge, power, core, anti-lateral core (phase 3: squat, lunge, step, hinge, push, core at 4 sets)

Accessories (`rear`, `delt`, `core`, `calf`, `lateral`) are capped at 3 sets and 60 s rest; the rest timer uses each exercise's own rest. The time budget tolerates a 90-second overrun so a session's last accessory isn't dropped for a minute.

## Settings

- **Appearance** — theme: Match my phone (default) / Light / Dark. Dark mode follows the OS unless forced.
- **Equipment set-ups** — named presets (Full gym / Home / Hotel seeded). Tap one to load its kit; "Save current" stores the ticked kit under a name.
- **Add this week to calendar** — downloads a `.ics` with the week's sessions at 06:00 and a 1-hour reminder (floating local time). Re-import after a coach update if the plan changed.
- **In-app coach (optional)** — paste your own Anthropic API key to get the coach's reply inside the app (see below). The key is stored only on this phone, is sent only to `api.anthropic.com`, and is **excluded from backups**.

## Progress

A **This block** card totals the 12-week block: sessions/target, personal bests, km run, bodyweight change. After week 12 the app enters a maintenance state (sessions still log) and Today offers **Start a new 12-week block**, which resets the plan to week 1 and keeps all history.

## The coach loop

Sunday (or up to Wednesday for the week before): **Report → Share report** into the coaching chat. With "Include the coach brief" ticked, the report carries the reply format and the exact exercise names, so any chat can coach from it. The coach replies with a block; copy it and tap **Paste & apply**:

```
REBUILD_UPDATE
SET: Goblet squat, 3 s down = 3 × 10 @ 24 kg     (override an exercise's target text)
CUE: Goblet squat, 3 s down = Elbows inside knees  (form cue shown under the exercise while lifting)
CLEAR: Goblet squat, 3 s down                    (removes that exercise's SET and CUE)
SWAP: A/hinge = Staggered-stance dumbbell RDL    (session A|B|C / pattern = exercise)
TRAVEL: on                                       (on|off — three-session week)
REST: 75                                         (default rest, seconds)
NOTE: Free text for the Today screen. Everything after NOTE: is the note, up to END_REBUILD_UPDATE.
END_REBUILD_UPDATE
```

Exercise names are matched against the `LIB` table in `index.html`: case doesn't matter and a unique partial name is accepted; anything else is listed as skipped instead of silently doing nothing. Bullets, bold and code fences around the block are ignored.
Pattern keys: `squat hinge unilateral lunge step uhinge hpush hpull vpush vpull calf carry lateral power core`.
Rank-9 exercises in `LIB` (e.g. Paused goblet squat) never auto-select; only a coach `SWAP` brings them in. A swap to an exercise the ticked equipment can't support is ignored.

## Upgrading the demos to real animation

What ships is keyless and works offline. If you want more than two frames:

1. **Self-hosted clips (most robust).** Drop short MP4/WebM loops into `public/media/<slug>.mp4` and point `MEDIA_MAP` at them; change `thumb()` to render a muted, looping, `playsinline` `<video>` instead of two `<img>`s. Netlify serves them, the service worker can cache them, no third party.
2. **ExerciseDB GIFs (RapidAPI).** ~1,300 true animated GIFs. Needs a RapidAPI key sent with each request and the GIF URLs are served through their API (no permanent hotlink), so you'd fetch the GIF per exercise and cache it in the image cache — same pattern as the in-app coach key: store the key in Settings, never in the backup.
3. **YouTube embeds.** Curate one video ID per exercise and swap the "Watch a full demo" search link for an `<iframe>` in the sheet. Free, but each embed is heavy, needs a signal in the gym, and the IDs must be checked by hand.

Option 1 is the one I'd do if you record or source a few clips; the two-frame flip covers the "which movement is this" job today.

### In-app coach (optional)

With an Anthropic API key saved in Settings, the Report tab's **Ask the coach now** button posts the report straight to the Messages API (`fetch` with `anthropic-dangerous-direct-browser-access: true`), using a system prompt built from `coachSystem()` — the same brief plus the current line-up and legal exercise names. The reply's prose shows on the card and any `REBUILD_UPDATE` block drops into the update box for you to review and Apply. Model is selectable (Opus 5 / Sonnet 5 / Haiku 4.5). This is a convenience layer; the paste-from-chat loop is unchanged and works without a key.
