import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Modular styles — each CSS file is small and focused
import './styles/base.css';
import './styles/intro.css';
import './styles/sidebar.css';
import './styles/legend.css';
import './styles/title.css';
import './styles/popup.css';
import './styles/about.css';
import './styles/walkthrough.css';
import './styles/maplibre.css';
import './styles/basemap-picker.css';
import './styles/responsive.css';

import { MAP_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, MAX_BOUNDS } from './map/config';
import { getInitialStyle } from './map/styles';
import {
  addSitesLayer,
  addHeatmapLayer,
  addBoundaryLayer,
  addWardLayer,
  addKenyaMaskLayer,
  addTurkanaMaskLayer,
  createInvertedMask,
  updateSitesParameter,
} from './map/layers';
import { generatePopupHTML } from './map/popups';
import { PARAMETERS } from './data/parameters';
import {
  initParameterSelect,
  initBasemapSelect,
  initLayerToggles,
  initExportButton,
  initAboutPanel,
  initSidebarToggle,
  initLegendToggle,
  initColorModeToggle,
  initFilters,
  getActiveSourceTypes,
  tagSitesWithWards,
} from './ui/controls';
import { updateLegend, initSourceTypeLegend, showSourceTypeLegend } from './ui/legend';
import { colorBySourceType } from './map/layers';
import { updateStats } from './ui/sidebar';
import { updateDetails } from './ui/details';
import { initIntroAndWalkthrough } from './ui/walkthrough';
import { createUI } from './ui/dom';

/* ── build UI before map init ─────────────────────────────────────── */

createUI();

/* ── state ─────────────────────────────────────────────────────────── */

let currentParam = 'EXCEED';
let sitesData: GeoJSON.FeatureCollection | null = null;

/* ── map ───────────────────────────────────────────────────────────── */

const map = new maplibregl.Map({
  container: 'map',
  style: getInitialStyle(),
  center: MAP_CENTER,
  zoom: DEFAULT_ZOOM,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  maxBounds: MAX_BOUNDS,
  attributionControl: false,
});

map.addControl(
  new maplibregl.ScaleControl({
    unit: 'metric',
    maxWidth: window.innerWidth <= 640 ? 70 : 100,
  }),
  'bottom-right',
);
map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right');

/* ── helpers ───────────────────────────────────────────────────────── */

/**
 * Flatten nested `ratios` and `params` objects onto each feature's
 * top-level properties so MapLibre paint expressions can access them
 * via simple `['get', 'ratio_F']` / `['get', 'param_F']`.
 */
function flattenFeatureProperties(geojson: GeoJSON.FeatureCollection): void {
  // Threshold lookup for parameters that have one.
  const thresholds: Record<string, number> = {};
  // Keys of selectable parameters that have NO threshold (relative coloring).
  const noThresholdKeys: string[] = [];
  for (const p of PARAMETERS) {
    if (p.threshold !== null) thresholds[p.key] = p.threshold;
    else noThresholdKeys.push(p.key);
  }

  // First pass: per-key max across all sites, so we can normalize
  // relative-magnitude ratios for null-threshold params.
  const maxByKey: Record<string, number> = {};
  for (const feature of geojson.features) {
    const params = feature.properties?.params as Record<string, number | null> | undefined;
    if (!params) continue;
    for (const key of noThresholdKeys) {
      const v = params[key];
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (maxByKey[key] === undefined || v > maxByKey[key]) maxByKey[key] = v;
      }
    }
  }

  for (const feature of geojson.features) {
    const props = feature.properties;
    if (!props) continue;

    const ratios = (props.ratios && typeof props.ratios === 'object')
      ? props.ratios as Record<string, number | null>
      : (props.ratios = {} as Record<string, number | null>);
    const params = (props.params && typeof props.params === 'object')
      ? props.params as Record<string, number | null>
      : null;

    if (params) {
      // Backfill threshold-based ratios for params declared in code but
      // missing from the precomputed ratios object.
      for (const [key, threshold] of Object.entries(thresholds)) {
        if (ratios[key] == null && typeof params[key] === 'number' && threshold > 0) {
          ratios[key] = (params[key] as number) / threshold;
        }
      }
      // Synthesize a relative-magnitude ratio for null-threshold params.
      // Map (value / data-max) into the full 0–5 ratio range so the same
      // color ramp + legend gradient is reused: lowest sample → green,
      // highest sample → deep red.
      for (const key of noThresholdKeys) {
        const v = params[key];
        const maxV = maxByKey[key];
        if (typeof v === 'number' && Number.isFinite(v) && maxV && maxV > 0) {
          ratios[key] = (v / maxV) * 5;
        }
      }
    }

    // Count how many *real-threshold* exceedances this site has.
    let exceedCount = 0;
    for (const [key, val] of Object.entries(ratios)) {
      props['ratio_' + key] = val;
      if (key in thresholds && typeof val === 'number' && val > 1.0) exceedCount++;
    }
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        props['param_' + key] = val;
      }
    }

    props['param_EXCEED'] = exceedCount;
    props['ratio_EXCEED'] = Math.min(exceedCount, 5);
  }
}

/**
 * MapLibre serialises nested objects in feature.properties to JSON
 * strings when they come back through query/click events.  Reconstruct
 * them so downstream code (e.g. generatePopupHTML) can work with real
 * objects.
 */
function parseClickProperties(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };

  for (const key of ['ratios', 'params'] as const) {
    if (typeof out[key] === 'string') {
      try {
        out[key] = JSON.parse(out[key] as string);
      } catch {
        /* leave as-is */
      }
    }
  }

  return out;
}

/**
 * (Re-)add all three sources and four layers.
 * Called both on initial load and after a basemap style swap.
 */
function addSourcesAndLayers(
  boundary: GeoJSON.FeatureCollection,
  wards: GeoJSON.FeatureCollection,
  kenya: GeoJSON.FeatureCollection,
): void {
  // Guard: skip if layers already exist
  if (map.getLayer('sites-circles')) return;

  try {
    // Sources — only add if missing
    if (!map.getSource('kenya'))
      map.addSource('kenya', { type: 'geojson', data: kenya });
    if (!map.getSource('turkana-mask'))
      map.addSource('turkana-mask', { type: 'geojson', data: createInvertedMask(boundary) });
    if (!map.getSource('sites') && sitesData)
      map.addSource('sites', { type: 'geojson', data: sitesData });
    if (!map.getSource('boundary'))
      map.addSource('boundary', { type: 'geojson', data: boundary });
    if (!map.getSource('wards'))
      map.addSource('wards', { type: 'geojson', data: wards });

    // Layers (order: mask first, then data on top)
    addTurkanaMaskLayer(map);
    addKenyaMaskLayer(map);
    addBoundaryLayer(map);
    addWardLayer(map);
    addHeatmapLayer(map);
    addSitesLayer(map);
    updateSitesParameter(map, currentParam);
  } catch (err) {
    // Style wasn't ready — retry after a short delay
    console.warn('Layer add failed, retrying:', err);
    setTimeout(() => {
      if (!map.getLayer('sites-circles') && map.isStyleLoaded()) {
        addSourcesAndLayers(boundary, wards, kenya);
      }
    }, 300);
  }
}

/* ── boot ──────────────────────────────────────────────────────────── */

map.on('load', async () => {
  /* Fetch all GeoJSON data in parallel */
  let sites: GeoJSON.FeatureCollection;
  let boundary: GeoJSON.FeatureCollection;
  let wards: GeoJSON.FeatureCollection;
  let kenya: GeoJSON.FeatureCollection;

  try {
    const [sitesRes, boundaryRes, wardsRes, kenyaRes] = await Promise.all([
      fetch('data/sites.geojson'),
      fetch('data/turkana-boundary.geojson'),
      fetch('data/turkana-wards.geojson'),
      fetch('data/kenya-boundary.geojson'),
    ]);

    for (const res of [sitesRes, boundaryRes, wardsRes, kenyaRes]) {
      if (!res.ok) throw new Error(`Failed to load ${res.url}: ${res.status}`);
    }

    [sites, boundary, wards, kenya] = (await Promise.all([
      sitesRes.json(),
      boundaryRes.json(),
      wardsRes.json(),
      kenyaRes.json(),
    ])) as [GeoJSON.FeatureCollection, GeoJSON.FeatureCollection, GeoJSON.FeatureCollection, GeoJSON.FeatureCollection];
  } catch (err) {
    console.error('Data load failed:', err);
    const msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:24px 32px;background:var(--panel-solid);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:var(--sans);text-align:center;z-index:9999';
    msg.innerHTML = '<h3 style="margin-bottom:8px">Unable to load map data</h3><p style="color:var(--muted);font-size:0.85rem">Please check your connection and reload the page.</p>';
    document.body.appendChild(msg);
    return;
  }

  /* Tag each site with its containing ward (point-in-polygon), then
     flatten nested properties for MapLibre paint/filter expressions. */
  tagSitesWithWards(sites, wards);
  flattenFeatureProperties(sites);
  sitesData = sites;

  /* Sources + layers */
  addSourcesAndLayers(boundary, wards, kenya);

  /* ── click popup ────────────────────────────────────────────────── */
  map.on('click', 'sites-circles', (e) => {
    if (!e.features?.length) return;

    const feature = e.features[0];
    const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [
      number,
      number,
    ];

    const props = parseClickProperties(
      feature.properties as Record<string, unknown>,
    );

    const html = generatePopupHTML(props as Record<string, any>, currentParam);

    new maplibregl.Popup({ maxWidth: '360px', anchor: 'bottom', closeOnMove: false, closeOnClick: true })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map);
  });

  /* Cursor feedback */
  map.on('mouseenter', 'sites-circles', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'sites-circles', () => {
    map.getCanvas().style.cursor = '';
  });

  /* ── zoom-to-site callback for stats panel ───────────────────────── */
  const zoomToSite = (lon: number, lat: number, name: string) => {
    map.flyTo({ center: [lon, lat], zoom: 12, duration: 1500 });
    // Open a popup at the site
    const features = map.querySourceFeatures('sites');
    const match = features.find((f) => {
      const p = f.properties;
      return p && (p.name === name || String(p.name) === name);
    });
    if (match) {
      const props = parseClickProperties(match.properties as Record<string, unknown>);
      const html = generatePopupHTML(props as Record<string, any>, currentParam);
      setTimeout(() => {
        new maplibregl.Popup({ maxWidth: '360px', anchor: 'bottom', closeOnMove: false, closeOnClick: true })
          .setLngLat([lon, lat])
          .setHTML(html)
          .addTo(map);
      }, 1600);
    }
  };

  /* ── UI controls ────────────────────────────────────────────────── */
  initParameterSelect(map, (key: string) => {
    currentParam = key;
    updateSitesParameter(map, key);
    updateLegend(key);
    if (sitesData) updateStats(sitesData, key, zoomToSite);
  });

  initBasemapSelect(map);
  initLayerToggles(map);
  initExportButton(map);

  /* ── filters ─────────────────────────────────────────────────────── */
  initFilters(map, wards, sites, () => {
    if (sitesData) {
      const activeTypes = getActiveSourceTypes();
      const filtered: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: sitesData.features.filter(f => {
          const t = f.properties?.bh_type;
          return activeTypes.includes(t);
        }),
      };
      updateStats(filtered, currentParam, zoomToSite);
    }
  });
  initAboutPanel();

  // Details modal
  const detailsOverlay = document.querySelector<HTMLElement>('#details-overlay');
  const detailsClose = document.querySelector<HTMLElement>('#details-close');
  const detailsBtn = document.querySelector<HTMLElement>('#details-btn');

  if (detailsOverlay && detailsClose && detailsBtn) {
    const onDetailsSiteClick = (site: { name: string; lon: number; lat: number; wpNo: number | null }) => {
      detailsOverlay.classList.add('hidden');
      zoomToSite(site.lon, site.lat, site.name);
    };
    detailsBtn.addEventListener('click', () => {
      if (sitesData) {
        updateDetails(sitesData, currentParam, getActiveSourceTypes(), onDetailsSiteClick);
      }
      detailsOverlay.classList.remove('hidden');
    });
    detailsClose.addEventListener('click', () => detailsOverlay.classList.add('hidden'));
    detailsOverlay.addEventListener('click', (e) => {
      if (e.target === detailsOverlay) detailsOverlay.classList.add('hidden');
    });
  }

  initSidebarToggle();
  initLegendToggle();
  initColorModeToggle(
    map,
    () => {
      // Switch back to parameter mode
      updateSitesParameter(map, currentParam);
      updateLegend(currentParam);
      if (sitesData) updateStats(sitesData, currentParam, zoomToSite);
    },
    () => {
      // Switch to source type mode
      colorBySourceType(map);
      showSourceTypeLegend();
    },
  );

  /* Basemap switching now swaps tiles in-place — no style reset needed */

  /* ── initial legend + stats ─────────────────────────────────────── */
  updateLegend(currentParam);
  initSourceTypeLegend();
  updateStats(sites, currentParam, zoomToSite);

  /* ── intro splash + walkthrough ────────────────────────────────── */
  initIntroAndWalkthrough(map, (key: string) => {
    currentParam = key;
    updateSitesParameter(map, key);
    updateLegend(key);
    if (sitesData) updateStats(sitesData, key, zoomToSite);
    // Also update the dropdown
    const sel = document.querySelector<HTMLSelectElement>('#param-select');
    if (sel) sel.value = key;
  });
});
