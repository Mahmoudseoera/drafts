# Verification

Browser: installed desktop Chrome, automated through Playwright against a local HTTP server.

Checked viewport sizes: **1440 × 900**, **390 × 844**, **320 × 740**, and **768 × 1024**.

- Each Dock item displays exactly one workspace view; no scrim/dialog navigation remains.
- Overview has one cover image; the Gallery has ten images and working thumbnail, previous/next and keyboard controls.
- Desktop/mobile screenshots inspected for Overview, Map/Itinerary, Gallery, Booking and Thank You. A collapsed mobile cover was found and corrected.
- Workspace stays above fixed navigation, with no document-level horizontal overflow at the tested sizes.
- Original inventory preserved: eight itinerary days, six reviews, five extras and six interests.
- Customization totals checked for adults, children and per-traveler extras, including the original rounded child-price calculation.
- Numeric phone filtering, required fields, selected travel date, inquiry redirect and saved trip summary verified. Test values used a reserved `.test` email address; no messages were sent.
- Real Leaflet loaded, the OpenFreeMap basemap rendered through MapLibre, attribution was visible, and eight source-coordinate markers appeared.
- Map Play/Pause, previous/next, slider selection, end, replay and pause-on-view-exit passed. Marker clicks selected/scrolled the timeline, manual timeline scrolling updated the selected stop, and scrolling to the end selected the final day.
- Repeated switching retained exactly two Leaflet instances (one per map view). Reduced-motion interaction was exercised.
- The configurable geocoding adapter was tested separately with isolated fixture responses: eight unique requests, at least one second between starts, successful and failed cache reuse across switching/reload, and one failed-location retry. These tests do not represent live provider geocoding.
- Static checks passed for unique IDs, one H1, image alt/title, no inline onclick, no empty hash links, and removal of obsolete modal/fake-map/content-array implementations.
- JavaScript syntax check passed. No uncaught browser runtime errors in the desktop/mobile interaction checks.

## Follow-up: expansion animation and map access

- Measured animation geometry at 1440 × 900 and 390 × 844: the first frame matches the clicked icon's rectangle (within 2 px), and the final view fills the workspace's inner rectangle.
- Inspected intermediate expansion screenshots and final desktop/mobile map screenshots.
- Rapid switches cancel the previous animation and leave exactly one visible view, without lingering fixed positioning. Reduced motion skips the expansion.
- OpenFreeMap loaded in Map and Itinerary over localhost, and also when opening the standalone HTML as a `file://` document. The browser checks recorded **zero 403 responses, zero HTTP errors and zero uncaught page errors**.
- No requests to the old direct OSM tile endpoint were made. Eight markers, attribution, playback advancement and pause-on-view-exit were rechecked with the new provider.

The standalone page intentionally has no booking backend, outgoing email, real tours-index route or social-profile destinations. Live production geocoding cannot be verified without a configured provider endpoint. The map uses the supplied approximate coordinate snapshot; route lines are overview connections only. Performance/Core Web Vitals and production provider capacity were not measured.
