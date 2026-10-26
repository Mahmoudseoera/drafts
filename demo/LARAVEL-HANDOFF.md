# Tour details revision

Open `classic-egypt-tour.html`. Keep `thank-you.html` beside it. The tour page contains its CSS, JavaScript, SVG icons and photographs, so no build tool or framework is needed. Leaflet, MapLibre, map data and Poppins require an internet connection. The map has been checked both through a local HTTP server and when opening the HTML directly from disk.

## What changed

- One persistent workspace with Overview, Itinerary, Gallery, Map, Included, Reviews, Customize, Travel Desk and Booking. Dock navigation hides the previous view rather than opening a modal. The incoming view expands from the clicked icon's exact rectangle to fill `#viewRoot` in 620 ms; temporary positioning is cleaned up on finish, interruption or resize. Reduced motion skips the animation. Browser history, Escape and the brand return flow work.
- One cover image and one dedicated gallery with thumbnails, captions, photo credits, keyboard and swipe controls.
- All eight original itinerary days, ten gallery destinations, six reviews, five extra activities, six interests, inclusions, exclusions and Travel Desk policies are preserved in HTML. No tour inventory, pricing table, reviews, photo list, itinerary list or interest descriptions are stored in JavaScript arrays/objects.
- JavaScript reads server-editable markup and handles selection, pricing, synchronization and playback. Its objects and arrays are runtime state, DOM collections, API responses and derived schema, not a second content source.
- Leaflet basemaps, numbered markers, popups, route overview connections, active/completed styling, camera movement, fit, resize and Retry controls replace the hand-drawn map.
- First itinerary day starts open, with individual details and open/close-all controls. Scrolling and marker selection synchronize the active day. Playback has pause/resume, previous/next, progress slider, end and replay.
- Responsive booking access, numeric phone/country-code inputs, native date/traveler controls, live price totals and inquiry-preview redirect.
- Three-line review/description limits with overflow-aware Show more/less, limited FAQs, one H1, semantic section headings, image alt/title, small SVG icons, focus styles and reduced motion.

## Blade migration boundaries

Use this HTML as the source view; do not recreate tour content in a frontend JSON dataset.

| Markup | Laravel value / loop |
| --- | --- |
| `#app[data-price][data-child-factor][data-currency]` | Tour base price, child factor and base currency |
| Overview H1, `.lead`, `.chips`, `.perks` | Tour title, description, duration, cities and benefits |
| `.day` inside `.tl` | `@foreach ($tour->itineraries as $day)` |
| `.day[data-place][data-region][data-country]` | Author-entered location name/context; coordinates are optional |
| `.gal-th button` and its image | Gallery loop; `data-caption`, image `src`, `alt`, `title`, optional `data-full` and `data-fallback` |
| `.ex[data-price]` | Extra activity loop; title and description remain child markup |
| `.chip[data-description]` | Interest loop and tailored recommendation |
| `.rev` and review summary | Approved testimonials and real aggregate ratings |
| Currency `<option data-rate>` | Supported currency and server-sourced conversion rate |
| `#resolvedLocations` template | Separate server-cached geographic results, keyed by place query |
| `#mapConfig` attributes | Configured MapLibre style URL (`data-style-url`) and geocoding endpoint |
| `#bkForm` | Actual booking request route, CSRF and server-side validation |
| `#tourSchema` and head metadata | Server-rendered schema and SEO metadata derived from the same tour |

Example itinerary wrapper:

```blade
@foreach ($tour->itineraries as $day)
    <li class="day"
        data-place="{{ $day->city }}"
        data-region="{{ $day->region }}"
        data-country="{{ $day->country }}">
        {{-- Render the existing .day-card structure here. --}}
    </li>
@endforeach
```

Keep the classes/data hooks used by JavaScript, unique element IDs, and the gallery button order. When rendering another tour, update the Overview cover's `data-photo-index` to its corresponding gallery index. Escape text/attributes with Blade `{{ }}`. For rich CMS HTML, sanitize on the server before any unescaped rendering. Render related-tour and blog cards only when their actual images, content, price/duration/city or author/date and destination routes are available.

The standalone document embeds photographs for portability and is approximately 12 MB. In Laravel, replace embedded image URLs with optimized local/storage image URLs and `srcset`; split the inline CSS/JS into the app's normal assets. Do not retain this embedded-image approach for production performance.

## Map and geocoding setup

The preview pins **Leaflet 1.9.4**, **MapLibre GL JS 5.6.2**, and **MapLibre GL Leaflet 0.1.3** from `unpkg.com`. OpenFreeMap's `https://tiles.openfreemap.org/styles/liberty` supplies the basemap through a MapLibre layer inside each existing Leaflet map. It replaces direct requests to `tile.openstreetmap.org`, which produced the reported access-blocked/403 error. Leaflet still owns the markers, route, controls, synchronization and playback.

OpenFreeMap permits commercial use without registration or an API key, but offers no SLA. Configure another compatible style or your own deployment through `#mapConfig[data-style-url]`; update `#mapAttribution` to match. MapLibre requires browser WebGL support. Attribution stays visible in Leaflet's control, outside playback controls. Loading failures produce a nonblocking message; Retry reloads the active basemap style and retries unresolved locations.

References: [OpenFreeMap overview and usage](https://openfreemap.org/), [OpenFreeMap's Leaflet integration](https://openfreemap.org/quick_start/), [Leaflet 1.9.4 API](https://leafletjs.com/reference-1.9.4.html), [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

The sample works immediately using the supplied prototype's eight **approximate stop coordinates**, now in a separate HTML geographic snapshot. These are retained source coordinates, not fresh geocoding results. They are not embedded in editable itinerary entries or in a JavaScript tour array. Replace the snapshot with your own reviewed server cache when migrating.

For a new unresolved place, set `data-geocode-endpoint` on `#mapConfig`, for example `/api/tour-geocode`. The browser requests:

```http
GET /api/tour-geocode?q=Kom%20Ombo%2C%20Egypt
Accept: application/json
```

Required response contract:

```json
{"lat": 24.452, "lng": 32.929}
```

Return `{"lat": null, "lng": null}` for no match. Return an appropriate non-2xx status for service failure. The adapter validates coordinates, deduplicates in-flight queries, serializes requests at least 1.1 seconds apart, and caches success for 30 days and failure for 5 minutes under a versioned, endpoint-specific key. Retry bypasses a failed cache; successful resolved locations stay cached. There is no `[0,0]` fallback. Storage being disabled does not break the page; in-memory deduplication still applies.

Configure provider credentials **on the server**, never in this HTML. The server should validate/limit query length, apply rate limits across all users, cache normalized place queries, identify the application as the provider requires, and adapt its provider response to the contract above. If using public Nominatim, follow its identification, caching and global rate requirements; the browser's per-tab throttle is not a global production quota. This prototype deliberately does not make direct requests to public Nominatim.

The dashed lines connect adjacent resolved stops only. They are **not exact road, flight, walking or Nile navigation geometry**. Missing stops are not bridged with invented coordinates. Integrate a reviewed GeoJSON route or suitable routing provider before making exact-route claims.

## Booking and company data

The form validates locally, saves a non-sensitive trip summary in session storage, and redirects to `thank-you.html`. It does not send an email, reserve a tour or charge money. Contact details are not put in the URL or browser storage by JavaScript. For Laravel, replace the preview submit handler with a real POST, add `@csrf`, validate all fields and prices on the server, and redirect to the real thank-you route only after the server accepts the request. No outgoing email service or email template was supplied or tested.

The original phone/email and policies are retained. Replace/verify them before publication; no new company contact details were invented. Back to Tours is disabled until a real index route is supplied. Social profile destinations were absent from the source, so inert social icons were removed; render anchors with actual profile URLs and `target="_blank" rel="noopener noreferrer"` when available. Explore More remains plain text where no real destination exists.

In production, render meta tags and JSON-LD on the server from actual values. The preview derives its schema from markup at runtime. Do not publish the sample testimonials, exchange rates or policies as verified live business data without reviewing them.
