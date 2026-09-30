/**
 * Tour Route Map
 * ----------------
 * Reads a comma-separated list of place names out of a page element's
 * text content, geocodes each one, drops a numbered pin on a Leaflet map,
 * draws the driving route between consecutive stops, and lists the
 * distance (km) + approximate drive time for each leg.
 *
 * Requires Leaflet (CSS + JS) loaded on the page before this script:
 *   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
 *   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
 *
 * Usage:
 *   <p id="tourLocations" hidden>Cairo, Giza</p>
 *   <div id="tourRouteMap" class="trm-map"></div>
 *   <ul id="tourRouteList" class="trm-list"></ul>
 *   <script>
 *     initTourRouteMap('tourRouteMap', 'tourRouteList', 'tourLocations');
 *   </script>
 *
 * The locations element can be any tag (span, p, div...) — only its
 * textContent is read, split on commas. One name ("Cairo") just places a
 * single pin. Two or more ("Cairo, Giza") places a pin for each and draws
 * the route + distance/time between every consecutive pair.
 *
 * Clicking any pin opens a popup listing well-known attractions near that
 * city (pulled live from OpenStreetMap via the Overpass API — no key
 * needed), each with its category and distance from the pin.
 */
(function () {
  'use strict';

  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  // In-memory cache so re-rendering the same map (or repeating a location
  // across legs) doesn't re-hit the geocoder.
  const geocodeCache = new Map();
  // Separate cache for the "popular places near this pin" lookups, keyed
  // by rounded coordinates so reopening a popup doesn't refetch.
  const famousPlacesCache = new Map();

  async function geocode(name) {
    const key = name.trim().toLowerCase();
    if (geocodeCache.has(key)) return geocodeCache.get(key);

    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error(`Couldn't look up "${name}"`);
    const data = await res.json();
    if (!data.length) throw new Error(`No match found for "${name}"`);

    const point = { name: name.trim(), lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache.set(key, point);
    return point;
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function categoryLabel(tags) {
    const labels = {
      attraction: 'Attraction',
      museum: 'Museum',
      viewpoint: 'Viewpoint',
      artwork: 'Artwork',
      gallery: 'Gallery',
      theme_park: 'Theme park',
      zoo: 'Zoo',
      aquarium: 'Aquarium',
    };
    if (tags.tourism && labels[tags.tourism]) return labels[tags.tourism];
    if (tags.tourism) return tags.tourism.replace(/_/g, ' ');
    if (tags.historic) {
      return tags.historic === 'yes' ? 'Historic site' : tags.historic.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    }
    if (tags.leisure === 'park') return 'Park';
    if (tags.leisure === 'garden') return 'Garden';
    return 'Landmark';
  }

  async function fetchPlacesJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) throw new Error('Places service unavailable');
      const data = await response.json();
      // Overpass can return HTTP 200 with a runtime/timeout error.
      if (data.error || data.remark) throw new Error('Places search could not finish');
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function queryOverpass(lat, lng, radius) {
    // nwr includes landmarks mapped as relations as well as nodes and ways.
    const query = `[out:json][timeout:10];(
      nwr(around:${radius},${lat},${lng})["tourism"~"^(attraction|museum|viewpoint|artwork|gallery|theme_park|zoo|aquarium)$"];
      nwr(around:${radius},${lat},${lng})["historic"];
      nwr(around:${radius},${lat},${lng})["leisure"~"^(park|garden)$"];
      nwr(around:${radius},${lat},${lng})["natural"~"^(beach|waterfall|cave_entrance)$"];
    );out center tags;`;
    const data = await fetchPlacesJson(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    const seen = new Set();
    const places = [];
    (data.elements || []).forEach((el) => {
      const name = el.tags && (el.tags['name:en'] || el.tags.name || el.tags.int_name);
      if (!name || seen.has(name)) return;
      const elLat = el.lat !== undefined ? el.lat : el.center && el.center.lat;
      const elLon = el.lon !== undefined ? el.lon : el.center && el.center.lon;
      if (elLat === undefined || elLon === undefined) return;
      seen.add(name);
      places.push({
        name,
        lat: elLat,
        lng: elLon,
        category: categoryLabel(el.tags),
        distanceKm: distanceKm(lat, lng, elLat, elLon),
        notable: Boolean(el.tags.wikipedia || el.tags.wikidata),
      });
    });

    // Places with a Wikipedia/Wikidata link surface first (a reasonable
    // proxy for "well known"), then everything else by distance.
    places.sort((a, b) => Number(b.notable) - Number(a.notable) || a.distanceKm - b.distanceKm);
    return places;
  }

  async function queryWikipedia(lat, lng) {
    // Independent fallback: documented places within 10 km of this city pin.
    // https://www.mediawiki.org/wiki/API:Geosearch
    const params = new URLSearchParams({
      action: 'query', format: 'json', origin: '*', list: 'geosearch',
      gscoord: `${lat}|${lng}`, gsradius: '10000', gslimit: '50', gsnamespace: '0',
    });
    const data = await fetchPlacesJson(`https://en.wikipedia.org/w/api.php?${params}`);
    return (data.query?.geosearch || []).map((place) => ({
      name: place.title, category: 'Nearby place',
      lat: place.lat, lng: place.lon, distanceKm: place.dist / 1000,
      notable: true,
    }));
  }

  async function fetchFamousPlaces(lat, lng, limit = 8) {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)},${limit}`;
    if (famousPlacesCache.has(key)) return famousPlacesCache.get(key);

    const request = (async () => {
      let places;
      let successfulSearch = false;
      try {
        places = await queryOverpass(lat, lng, 15000);
        successfulSearch = true;
        if (places.length) return places.slice(0, limit);
      } catch (err) { /* Try an independent service below. */ }
      try {
        places = await queryWikipedia(lat, lng);
        successfulSearch = true;
        if (places.length) return places.slice(0, limit);
      } catch (err) { /* Retry the landmark search over a wider area. */ }
      try {
        places = await queryOverpass(lat, lng, 25000);
        successfulSearch = true;
        if (places.length) return places.slice(0, limit);
      } catch (err) { /* Preserve the distinction between empty and unavailable. */ }
      if (!successfulSearch) throw new Error('Places services unavailable');
      return [];
    })();
    // Share requests while loading, but never cache empty or failed results.
    famousPlacesCache.set(key, request);
    try {
      const places = await request;
      if (!places.length) famousPlacesCache.delete(key);
      return places;
    } catch (err) {
      famousPlacesCache.delete(key);
      throw err;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
  }

  function popupSkeleton(name) {
    return `<div class="trm-popup"><strong>${escapeHtml(name)}</strong><p class="trm-popup-loading">Loading popular places…</p></div>`;
  }

  function popupContent(name, places) {
    if (!places.length) {
      return `<div class="trm-popup"><strong>${escapeHtml(name)}</strong><p class="trm-popup-empty">No mapped places found nearby yet.</p></div>`;
    }
    const items = places
      .map(
        (p) =>
          `<li><a class="trm-popup-item__name" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.lat + ',' + p.lng)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.name)}</a><span class="trm-popup-item__meta">${escapeHtml(p.category)} · ${p.distanceKm.toFixed(1)} km</span></li>`
      )
      .join('');
    return `<div class="trm-popup"><strong>${escapeHtml(name)}</strong><ul class="trm-popup-list">${items}</ul></div>`;
  }

  function popupError(name) {
    return `<div class="trm-popup"><strong>${escapeHtml(name)}</strong><p class="trm-popup-empty">Places are temporarily unavailable. Close and reopen this pin to retry.</p></div>`;
  }

  async function fetchRoute(a, b) {
    const coords = `${a.lng},${a.lat};${b.lng},${b.lat}`;
    const url = `${OSRM_URL}/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Routing request failed');
    const data = await res.json();
    if (!data.routes || !data.routes.length) throw new Error('No driving route found');
    const route = data.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationHrs: route.duration / 3600,
      geometry: route.geometry,
    };
  }

  function formatDuration(hrs) {
    const totalMinutes = Math.round(hrs * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  /**
   * @param {string} mapElId          id of the element to turn into the map
   * @param {string|null} listElId    id of a <ul>/<ol> to fill with leg-by-leg
   *                                  distances (optional)
   * @param {string} locationsElId    id of the element whose textContent holds
   *                                  the comma-separated location names
   * @param {object} [options]
   * @param {string} [options.lineColor] route line color (defaults to teal)
   */
  async function initTourRouteMap(mapElId, listElId, locationsElId, options = {}) {
    const mapEl = document.getElementById(mapElId);
    const listEl = listElId ? document.getElementById(listElId) : null;
    const locationsEl = document.getElementById(locationsElId);

    if (!mapEl || !locationsEl) return;

    if (typeof L === 'undefined') {
      mapEl.innerHTML = '<p class="trm-error">Map library not loaded.</p>';
      return;
    }

    const names = (locationsEl.textContent || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (names.length < 1) return;

    mapEl.innerHTML = '';
    mapEl.classList.add('trm-loading');

    let points;
    try {
      points = await Promise.all(names.map((n) => geocode(n)));
    } catch (err) {
      mapEl.classList.remove('trm-loading');
      mapEl.innerHTML = `<p class="trm-error">${err.message}</p>`;
      return;
    }

    const map = L.map(mapEl, { scrollWheelZoom: false });
    // Tile provider notes:
    // - tile.openstreetmap.org blocks unregistered/automated traffic (the
    //   earlier "osm.wiki/Blocked" 403).
    // - CARTO's basemap tiles now require a registered API key for any
    //   real usage (the "API KEY REQUIRED" watermark).
    // Esri's World Street Map tiles below work today with no signup and no
    // key, but for a production site you'll want a provider with an
    // actual documented free quota rather than one that could tighten its
    // policy the same way OSM and CARTO did. MapTiler's free tier (100k
    // tile loads/month, no card required) is a solid choice — sign up at
    // maptiler.com, then swap the two lines below for:
    //   L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY', {
    //     attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    //     maxZoom: 20,
    //   }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));

    points.forEach((p, i) => {
      const icon = L.divIcon({
        className: 'trm-marker',
        html: `<span>${i + 1}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
      marker.bindPopup(popupSkeleton(p.name), { maxWidth: 260 });
      // Only fetch nearby attractions when the visitor actually opens this
      // pin's popup, not for every pin up front.
      marker.on('popupopen', async () => {
        marker.setPopupContent(popupSkeleton(p.name));
        try {
          const places = await fetchFamousPlaces(p.lat, p.lng);
          marker.setPopupContent(popupContent(p.name, places));
        } catch (err) {
          marker.setPopupContent(popupError(p.name));
        }
      });
    });

    // Only one location: place the pin, center on it, skip routing.
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11);
      mapEl.classList.remove('trm-loading');
      if (listEl) listEl.innerHTML = '';
      return { points, segments: [], map };
    }

    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      try {
        const seg = await fetchRoute(from, to);
        segments.push({ from: from.name, to: to.name, ...seg });
        if (seg.geometry) {
          const line = L.geoJSON(seg.geometry, {
            style: { color: options.lineColor || '#176F78', weight: 4, opacity: 0.85 },
          }).addTo(map);
          bounds.extend(line.getBounds());
        }
      } catch (err) {
        segments.push({ from: from.name, to: to.name, error: err.message });
        // Fall back to a straight dashed line so the trip is still visible.
        L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
          color: options.lineColor || '#176F78',
          weight: 2,
          dashArray: '6 6',
          opacity: 0.6,
        }).addTo(map);
      }
    }

    map.fitBounds(bounds, { padding: [40, 40] });
    mapEl.classList.remove('trm-loading');

    if (listEl) {
      listEl.innerHTML = segments
        .map((s) => {
          if (s.error) {
            return `<li class="trm-segment trm-segment--error">
              <span class="trm-segment__route">${s.from} → ${s.to}</span>
              <span class="trm-segment__meta">Route unavailable</span>
            </li>`;
          }
          return `<li class="trm-segment">
            <span class="trm-segment__route">${s.from} → ${s.to}</span>
            <span class="trm-segment__meta">~${s.distanceKm.toFixed(0)} km · ~${formatDuration(s.durationHrs)}</span>
          </li>`;
        })
        .join('');
    }

    return { points, segments, map };
  }

  window.initTourRouteMap = initTourRouteMap;
})();
