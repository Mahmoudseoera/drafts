# Pharaoh’s Gambit — Your Egypt Story

A dependency-free, four-game evolution of the supplied prototype. Existing project pages and `ai-itinerary/` are unchanged.

## Open locally

From the repository root, run `python -m http.server 8080`, then open `http://localhost:8080/egypt-story/`. Use HTTP rather than double-clicking the HTML because the application uses JavaScript modules.

## Architecture

- `catalog.mjs`: experience content and original sample prices; new experiences have unknown prices.
- `engine.mjs`: immutable effect reducer, central state, deterministic recommendations, route derivation, personality, estimates and legacy migration.
- `games.mjs`: independent game registry; each game returns local progress and Trip Effects. Add games here without changing the trip reducer.
- `services.mjs`: persistence, analytics event adapter, snapshot sharing and downloads.
- `app.js`: UI orchestration, story editing and request export.
- `styles.css`: responsive gold/teal/sand identity, mobile story summary, reduced motion and keyboard focus treatments.

Signals, suggestions, selected experiences and exclusions are distinct. Only explicit add buttons select an experience. Anubis only unlocks content. Restarting a game retains learned preferences and the trip. Previously imported user-owned experiences are retained; opponent-owned legacy choices are not imported. Unsupported old category choices require review rather than being guessed.

The itinerary is an ordered draft route, not a day-by-day schedule or a verified transport plan. Chosen route stops come first; cities required by selected experiences follow. Removing a route stop does not silently remove selected experiences in that city.

## Prototype boundaries

Prices are the supplied prototype’s sample experience prices, multiplied by traveler count. They exclude flights, accommodation and transfers; unpriced experiences remain unpriced. Production must validate catalog IDs and recalculate all prices on the server.

Share links contain a validated, readable snapshot in the URL fragment, with a random UUID. Names and game history are omitted. Links work across devices only on a reachable host. Production must replace this with `/trip/{secure-token}` mapped to server-side storage; the UUID in this demo is not access control.

The request form downloads a context-rich JSON file and does not claim to send it. Connect a real lead endpoint before deployment; add server validation, an idempotency key, durable storage and delivery confirmation. Contact details and notes are only included in the downloaded request and are not persisted locally. Analytics are dispatched as `egypt:analytics` browser events, without a remote tracker; request export emits `trip_request_exported`, not a false `trip_request_submitted` event.

## Checks

Run `node --test egypt-story/engine.test.mjs` from the repository root. Tests cover selections/exclusions, recommendations, routes, estimate manipulation, storage, legacy migration, game completion, exhaustive reachable Anubis rounds, game restore and share validation.

Browser visual/touch/keyboard QA could not be completed in the coding session because no browser was connected. Before release, check 360px portrait, landscape, desktop, dialog focus, keyboard-only navigation, refresh mid-game and after completion, blocked storage, download behavior, and share links on the deployed host. External Google Fonts are optional; system fallbacks keep the app usable offline.
