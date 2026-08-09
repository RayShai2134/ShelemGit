# Shelem

A Persian 4-player partnership trick-taking card game, playable offline vs. bots today, with online multiplayer (private rooms + public matchmaking) in progress.

## Project layout

- `shared/shelem-engine.js` — the game rules engine (bidding, discard, trick-play, scoring) plus bot AI. Pure JS, no DOM dependency. Used both by the browser client (offline vs-bots mode) and, starting in Phase 1, by the server as the authoritative source of truth for online games. This is the single place game rules live — never duplicate rule logic elsewhere.
- `client/` — the browser app. `index.html` + `css/styles.css` + `js/*.js`, no build step, no bundler. Open `client/index.html` directly (or serve it over HTTP) to run it.
- `server/` — the Node.js multiplayer server (Express + Socket.io). Serves the `client/` and `shared/` folders itself, so one deployed service is all that's needed.
- `render.yaml` — Render.com Blueprint: deploys `server/` (free tier) with `npm install` / `npm start`.

## Running the client locally

Open `client/index.html` directly in a browser, or serve the project root over HTTP (needed once the server exists, since the client loads `../shared/shelem-engine.js` relative to `client/`):

```bash
python3 -m http.server 8080
```

then visit `http://localhost:8080/client/index.html`.

## Running the server locally

```bash
cd server
npm install
npm start
```

Then visit `http://localhost:3000` (serves the client too — no separate step needed).

## Status

- ✅ Offline "Play vs bots" — fully working, unchanged from the original prototype.
- ✅ "Play vs friends" (private rooms, room codes, bot-fill) — working.
- 🚧 "Play online" (public matchmaking) and reconnect handling — in progress.
- Known limitation: game state is kept in memory only (no database) — a server restart clears any in-progress rooms. Fine for a low-traffic hobby project; revisit if that changes.
