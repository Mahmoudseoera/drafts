# Visual search setup

The homepage includes the explorer above the footer. Layout is in `index.html`, scoped styles in `styles.css`, and configuration / logic in `app.js`. The original destination catalog, map layers, weather, and click-to-drop pins are retained from the supplied reference. No real API key is included.

## Run locally

Serve this directory with your usual local server (or `python -m http.server 8765`), then open `http://localhost:8765/index.html#egyptMapSection`.

Name search works immediately for the 12 catalog destinations and listed aliases, without Gemini. Other names and all photos require Gemini configuration. Known local nearby spots are available for Giza, Luxor and Siwa. Other local results omit routes when coordinates for nearby spots are unavailable. Sample tour ideas link to the existing tailor-made page, with price per person on request; they are not live tour inventory.

## Gemini configuration

Gemini 2.5 access is currently limited to projects that actively used it previously. The configuration now uses Gemini 3.8 Flash, recommended by Google for new projects as of September 30, 2026. A model appearing in a listing does not establish that generation is permitted for a particular project.

At the top of `app.js`, `AI.model` defaults to `gemini-3.8-flash`. For a private local experiment, a Gemini Developer API key can be supplied as `AI.apiKey`. Every browser key is public: use `AI.proxyUrl` with a backend-held key for deployment. The credential present in the pasted reference should be revoked/rotated if it is real; it was not copied into the site.

503 means a temporary upstream service failure, not necessarily an invalid key. The client retries 429 and transient 5xx twice with exponential backoff and jitter, honors short Retry-After values, and limits the total search to 45 seconds. A long Retry-After asks the visitor to try later. Permanent 400/401/403/404 failures do not retry. Client changes cannot guarantee upstream availability.

## Laravel proxy contract

This checkout contains static HTML, not a Laravel application. The proxy must be installed in your actual backend before setting `AI.proxyUrl` (for example `/api/place-search`).

- Accept POST JSON containing `systemInstruction`, `contents`, and `generationConfig`, matching Gemini generateContent. Photos are resized JPEG `inlineData` under 1024px; no original file is sent.
- Validate payload size (allow roughly 3 MB), exactly one user message, at most two parts, text length and JPEG Base64. Reject arbitrary external image URLs and extra content types.
- Keep `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.8-flash` in Laravel `.env`, exposed through `config/services.php`. Never accept an upstream URL or API key from the client. The model is configured on the server when using a proxy; changing `AI.model` only affects direct calls.
- Call `https://generativelanguage.googleapis.com/v1beta/models/{configured-model}:generateContent` with the server-side `x-goog-api-key` header. Apply connect/response timeouts, rate limiting, quota monitoring and your site's authentication/abuse controls. Avoid another retry loop on top of client retries.
- Return the Gemini JSON envelope unchanged, or the exact normalized location object specified in the request. Preserve upstream error status and Retry-After; do not turn provider errors into HTTP 200 or an HTML error page. Do not return credentials or log photo payloads.
- For a Laravel web route, render `<meta name="csrf-token" content="{{ csrf_token() }}">`; the client sends it as `X-CSRF-TOKEN`. For a same-origin API route, use your normal API middleware. Cross-origin proxies require explicit CORS configuration; same-origin is preferred.

Only confident, validated Egypt results navigate the map. The country flag is checked along with a coarse coordinate sanity check (not a national boundary polygon). AI coordinates remain estimates. Routes connect up to three nearby spots with straight lines, not road routing. Weather comes from Open-Meteo and fails independently of search; speech uses the browser's Web Speech API when available.

## Verification

Run `node --check app.js` and `node --test tests/visual-search.test.cjs`. Tests use mocked DOM/Leaflet/network objects, not a browser or a live Gemini account. Check desktop/mobile rendering, file selection/drop, actual photo recognition, speech, live weather and map flight in a connected browser before deployment.

Provider references: https://ai.google.dev/gemini-api/docs/troubleshooting and https://ai.google.dev/gemini-api/docs/structured-output.
