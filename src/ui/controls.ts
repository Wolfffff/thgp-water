import type { Map } from 'maplibre-gl';
import { SELECTABLE_PARAMETERS } from '../data/parameters';
import { BASEMAP_TILES, type BasemapKey } from '../map/styles';


// ---------------------------------------------------------------------------
// Parameter dropdown
// ---------------------------------------------------------------------------

export function initParameterSelect(
  _map: Map,
  onChange: (key: string) => void,
): void {
  const select = document.querySelector<HTMLSelectElement>('#param-select');
  if (!select) return;

  // Special "alert count" option first
  const exceedOpt = document.createElement('option');
  exceedOpt.value = 'EXCEED';
  exceedOpt.textContent = 'Alerts — # Thresholds Exceeded';
  select.appendChild(exceedOpt);

  // Separator
  const sep = document.createElement('option');
  sep.disabled = true;
  sep.textContent = '────────────────';
  select.appendChild(sep);

  // Populate parameter options — sorted alphabetically by display name
  const sortedParams = [...SELECTABLE_PARAMETERS].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
  for (const param of sortedParams) {
    const option = document.createElement('option');
    option.value = param.key;
    option.textContent = param.displayName;
    select.appendChild(option);
  }

  // Default to alerts view
  select.value = 'EXCEED';

  select.addEventListener('change', () => {
    onChange(select.value);
  });
}

// ---------------------------------------------------------------------------
// Basemap switcher
// ---------------------------------------------------------------------------

export function initBasemapSelect(map: Map): void {
  const select = document.querySelector<HTMLSelectElement>('#basemap-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const key = select.value as BasemapKey;
    const tile = BASEMAP_TILES[key];
    if (!tile) return;

    // Swap the basemap raster source tiles — no setStyle, no layer destruction
    const source = map.getSource('basemap') as maplibregl.RasterTileSource | undefined;
    if (source) {
      // Remove old basemap layer + source and re-add with new tiles
      if (map.getLayer('basemap-tiles')) map.removeLayer('basemap-tiles');
      map.removeSource('basemap');
      map.addSource('basemap', {
        type: 'raster',
        tiles: [tile.url],
        tileSize: 256,
        attribution: tile.attribution,
        maxzoom: tile.maxzoom,
      });
      // Add basemap layer at the bottom (before all other layers)
      const firstLayerId = map.getStyle().layers[0]?.id;
      map.addLayer({
        id: 'basemap-tiles',
        type: 'raster',
        source: 'basemap',
      }, firstLayerId);
    }
  });
}

// ---------------------------------------------------------------------------
// Layer visibility toggles
// ---------------------------------------------------------------------------

const TOGGLE_MAP: Record<string, string[]> = {
  '#toggle-heatmap': ['sites-heatmap'],
  '#toggle-wards': ['turkana-wards', 'turkana-wards-outline'],
};

export function initLayerToggles(map: Map): void {
  for (const [selector, layerIds] of Object.entries(TOGGLE_MAP)) {
    const checkbox = document.querySelector<HTMLInputElement>(selector);
    if (!checkbox) continue;

    checkbox.addEventListener('change', () => {
      const visibility = checkbox.checked ? 'visible' : 'none';
      for (const layerId of layerIds) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visibility);
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export function initExportButton(map: Map): void {
  const btn = document.querySelector<HTMLButtonElement>('#export-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const source = map.getSource('sites') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    // querySourceFeatures returns rendered features; we need all of them
    const features = map.querySourceFeatures('sites');
    if (!features.length) return;

    // Collect all param keys from the first feature that has them
    const allParamKeys: string[] = [];
    for (const f of features) {
      const params = f.properties?.params;
      if (params) {
        const parsed = typeof params === 'string' ? JSON.parse(params) : params;
        allParamKeys.push(...Object.keys(parsed));
        break;
      }
    }

    // Build CSV header
    const fixedCols = ['WP_No', 'Name', 'BH_Type', 'Lat', 'Lon', 'Elevation'];
    const header = [...fixedCols, ...allParamKeys].join(',');

    // Deduplicate by wp_no to avoid repeated tiles
    const seen = new Set<number>();
    const rows: string[] = [header];

    for (const f of features) {
      const props = f.properties ?? {};
      const wpNo = props.wp_no;
      if (seen.has(wpNo)) continue;
      seen.add(wpNo);

      const params =
        typeof props.params === 'string'
          ? JSON.parse(props.params)
          : props.params ?? {};

      const geom = f.geometry as GeoJSON.Point;
      const [lon, lat] = geom.coordinates;

      const fixedVals = [
        wpNo,
        `"${(props.name ?? '').replace(/"/g, '""')}"`,
        `"${(props.bh_type ?? '').replace(/"/g, '""')}"`,
        lat,
        lon,
        props.elevation ?? '',
      ];

      const paramVals = allParamKeys.map((k) => params[k] ?? '');
      rows.push([...fixedVals, ...paramVals].join(','));
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'turkana-water-data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// ---------------------------------------------------------------------------
// About panel
// ---------------------------------------------------------------------------

export function initAboutPanel(): void {
  const overlay = document.querySelector<HTMLElement>('#about-overlay');
  const closeBtn = document.querySelector<HTMLElement>('#about-close');
  if (!overlay) return;

  // Both the sidebar "About & Authors" button and the floating info button open the panel
  const triggers = ['#about-btn', '#info-btn'];
  for (const sel of triggers) {
    const btn = document.querySelector<HTMLElement>(sel);
    if (btn) {
      btn.addEventListener('click', () => overlay.classList.remove('hidden'));
    }
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}

// ---------------------------------------------------------------------------
// Sidebar toggle
// ---------------------------------------------------------------------------

export function initSidebarToggle(): void {
  const toggle = document.querySelector<HTMLButtonElement>('#sidebar-toggle');
  const sidebar = document.querySelector<HTMLElement>('#sidebar');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    // Just toggle the class; CSS handles the animation via transform
    sidebar.classList.toggle('sidebar--collapsed');
  });

  // Mobile: smooth drag to resize bottom sheet — only from the handle
  const DRAG_THRESHOLD = 8;
  let startY = 0;
  let startX = 0;
  let dragging = false;
  let dragStarted = false;
  let startHeight = 0;

  sidebar.addEventListener('touchstart', (e) => {
    // Only initiate drag from the handle, not from scrollable content
    if (!toggle.contains(e.target as Node)) return;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    dragging = true;
    dragStarted = false;
    // When collapsed, only the 28px handle is visible — start from there so
    // pulling up reveals the sheet gradually instead of snapping to full height.
    if (sidebar.classList.contains('sidebar--collapsed')) {
      startHeight = 28;
    } else {
      startHeight = sidebar.getBoundingClientRect().height;
    }
  }, { passive: true });

  sidebar.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const isMobile = window.innerWidth <= 640;
    const dy = e.touches[0].clientY - startY;
    const dx = e.touches[0].clientX - startX;

    // Only start dragging once the user exceeds threshold — otherwise it's a tap
    if (!dragStarted && Math.abs(dy) < DRAG_THRESHOLD && Math.abs(dx) < DRAG_THRESHOLD) {
      return;
    }
    if (!dragStarted) {
      dragStarted = true;
      sidebar.style.transition = 'none';
    }

    if (isMobile) {
      const newHeight = Math.max(28, Math.min(startHeight - dy, window.innerHeight * 0.8));
      sidebar.classList.remove('sidebar--collapsed');
      sidebar.style.maxHeight = `${newHeight}px`;
      sidebar.style.transform = 'translateY(0)';
    } else {
      if (dx > 0 && !sidebar.classList.contains('sidebar--collapsed')) {
        sidebar.style.transform = `translateX(${dx}px)`;
      }
    }
  }, { passive: true });

  sidebar.addEventListener('touchend', (e) => {
    if (!dragging) return;
    dragging = false;
    // If the user never exceeded the drag threshold, treat it as a tap —
    // let the click handler toggle the drawer. Don't touch any styles.
    if (!dragStarted) return;

    sidebar.style.transition = '';
    const isMobile = window.innerWidth <= 640;

    if (isMobile) {
      const finalHeight = sidebar.getBoundingClientRect().height;
      if (finalHeight < 60) {
        // Very small — fully collapse, clear all inline styles
        sidebar.classList.add('sidebar--collapsed');
        sidebar.style.maxHeight = '';
        sidebar.style.transform = '';
      } else {
        sidebar.style.maxHeight = `${finalHeight}px`;
        sidebar.style.transform = '';
      }
    } else {
      sidebar.style.transform = '';
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (dx > 50 && Math.abs(dy) < 80) {
        sidebar.classList.add('sidebar--collapsed');
      }
    }
  }, { passive: true });
}

// ---------------------------------------------------------------------------
// Legend toggle
// ---------------------------------------------------------------------------

export function initLegendToggle(): void {
  const toggle = document.querySelector<HTMLButtonElement>('#legend-toggle');
  const legend = document.querySelector<HTMLElement>('#legend');
  if (!toggle || !legend) return;

  toggle.addEventListener('click', () => {
    legend.classList.toggle('legend--collapsed');
    toggle.textContent = legend.classList.contains('legend--collapsed') ? '+' : '−';
  });
}

// ---------------------------------------------------------------------------
// Color mode toggle (parameter vs source type)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Source type & ward filters
// ---------------------------------------------------------------------------

const SOURCE_TYPE_CHECKBOX_MAP: Record<string, string> = {
  '#filter-dbh': 'DBH solar',
  '#filter-sbh': 'SBH pump',
  '#filter-ohd': 'OHD well',
  '#filter-spring': 'Spring',
};

let _activeSourceTypes: string[] = Object.values(SOURCE_TYPE_CHECKBOX_MAP);
let _activeWards: string[] = [];
let _allWardNames: string[] = [];
let _alertsMode: 'any' | 'good' | number = 'any';

export function getActiveSourceTypes(): string[] {
  return _activeSourceTypes;
}

export function getActiveWards(): string[] {
  return _activeWards;
}

export function getAlertsMode(): 'any' | 'good' | number {
  return _alertsMode;
}

/**
 * Ray-casting point-in-polygon test for a single ring.
 */
function pointInRing(lon: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Tag every site feature with a `ward` property by point-in-polygon
 * against the wards GeoJSON. Mutates the sites collection in place.
 */
export function tagSitesWithWards(
  sites: GeoJSON.FeatureCollection,
  wards: GeoJSON.FeatureCollection,
): void {
  for (const site of sites.features) {
    const props = site.properties ?? (site.properties = {});
    const geom = site.geometry as GeoJSON.Point | undefined;
    if (!geom || geom.type !== 'Point') continue;
    const [lon, lat] = geom.coordinates;

    let assigned: string | null = null;
    for (const ward of wards.features) {
      const wname = ward.properties?.name as string | undefined;
      if (!wname) continue;
      const wgeom = ward.geometry;
      if (!wgeom) continue;
      let hit = false;
      if (wgeom.type === 'Polygon') {
        // Outer ring; ignore holes for performance — wards are simple
        hit = pointInRing(lon, lat, wgeom.coordinates[0] as [number, number][]);
      } else if (wgeom.type === 'MultiPolygon') {
        for (const poly of wgeom.coordinates) {
          if (pointInRing(lon, lat, poly[0] as [number, number][])) { hit = true; break; }
        }
      }
      if (hit) { assigned = wname; break; }
    }
    props.ward = assigned ?? '';
  }
}

/**
 * Compute a bounding box from a GeoJSON feature's coordinates.
 */
function getBBox(feature: GeoJSON.Feature): [[number, number], [number, number]] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const walk = (coords: any) => {
    if (typeof coords[0] === 'number') {
      minLng = Math.min(minLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLng = Math.max(maxLng, coords[0]);
      maxLat = Math.max(maxLat, coords[1]);
    } else {
      for (const c of coords) walk(c);
    }
  };
  walk((feature.geometry as any).coordinates);
  return [[minLng, minLat], [maxLng, maxLat]];
}

export function initFilters(
  map: Map,
  wardsData: GeoJSON.FeatureCollection,
  sitesData: GeoJSON.FeatureCollection,
  onFilterChange: () => void,
): void {
  // Build a set of ward names that actually contain at least one site
  const wardsWithSites = new Set<string>();
  for (const site of sitesData.features) {
    const w = site.properties?.ward as string | undefined;
    if (w) wardsWithSites.add(w);
  }
  // Populate ward checkboxes from wards data
  const wardChecksContainer = document.querySelector<HTMLElement>('#ward-checks');
  const sourceChecksContainer = document.querySelector<HTMLElement>('#source-type-checks');
  _allWardNames = wardsData.features
    .map(f => f.properties?.name as string)
    .filter(name => Boolean(name) && wardsWithSites.has(name))
    .sort();
  _activeWards = [..._allWardNames];

  if (wardChecksContainer) {
    for (const name of _allWardNames) {
      const id = `filter-ward-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.checked = true;
      input.dataset.wardName = name;
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = name;
      const row = document.createElement('div');
      row.className = 'filter-check toggle-row';
      row.appendChild(input);
      row.appendChild(label);
      wardChecksContainer.appendChild(row);
    }
  }

  // Helper: add an "Only" button to a row that selects only this checkbox
  const addOnlyButton = (row: HTMLElement, container: HTMLElement, applyFn: () => void) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-check-only';
    btn.textContent = 'Only';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const myCb = row.querySelector<HTMLInputElement>('input[type="checkbox"]');
      container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
        cb.checked = (cb === myCb);
      });
      applyFn();
    });
    row.appendChild(btn);
  };

  const applyFilter = () => {
    const activeTypes: string[] = [];
    for (const [selector, typeName] of Object.entries(SOURCE_TYPE_CHECKBOX_MAP)) {
      const cb = document.querySelector<HTMLInputElement>(selector);
      if (cb?.checked) activeTypes.push(typeName);
    }
    _activeSourceTypes = activeTypes;

    const wardCbs = wardChecksContainer?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? [];
    _activeWards = [];
    wardCbs.forEach(cb => {
      if (cb.checked && cb.dataset.wardName) _activeWards.push(cb.dataset.wardName);
    });

    const alertsSelect = document.querySelector<HTMLSelectElement>('#alerts-select');
    const alertsVal = alertsSelect?.value ?? 'any';
    if (alertsVal === 'any') _alertsMode = 'any';
    else if (alertsVal === 'good') _alertsMode = 'good';
    else _alertsMode = parseInt(alertsVal, 10) || 0;

    const filter: any[] = ['all'];

    // Source type filter
    if (activeTypes.length < 4) {
      filter.push(['in', ['get', 'bh_type'], ['literal', activeTypes]]);
    }

    // Ward filter — only apply if not all selected
    if (_activeWards.length < _allWardNames.length) {
      filter.push(['in', ['get', 'ward'], ['literal', _activeWards]]);
    }

    // Alerts filter (uses pre-computed param_EXCEED)
    if (_alertsMode === 'good') {
      filter.push(['==', ['coalesce', ['get', 'param_EXCEED'], 0], 0]);
    } else if (typeof _alertsMode === 'number' && _alertsMode > 0) {
      filter.push(['>=', ['coalesce', ['get', 'param_EXCEED'], 0], _alertsMode]);
    }

    const filterExpr = filter.length > 1 ? (filter as maplibregl.FilterSpecification) : null;
    map.setFilter('sites-circles', filterExpr);
    if (map.getLayer('sites-heatmap')) {
      map.setFilter('sites-heatmap', filterExpr);
    }

    // Update collapsible group summaries
    const sourceSummary = document.querySelector<HTMLElement>('#source-type-summary');
    if (sourceSummary) {
      const total = Object.keys(SOURCE_TYPE_CHECKBOX_MAP).length;
      sourceSummary.textContent =
        activeTypes.length === total ? 'All' :
        activeTypes.length === 0 ? 'None' :
        activeTypes.length === 1 ? activeTypes[0] :
        `${activeTypes.length} of ${total}`;
    }
    const wardSummary = document.querySelector<HTMLElement>('#ward-summary');
    if (wardSummary) {
      wardSummary.textContent =
        _activeWards.length === _allWardNames.length ? 'All' :
        _activeWards.length === 0 ? 'None' :
        _activeWards.length === 1 ? _activeWards[0] :
        `${_activeWards.length} of ${_allWardNames.length}`;
    }

    onFilterChange();
  };

  // Wire up source type checkboxes
  for (const selector of Object.keys(SOURCE_TYPE_CHECKBOX_MAP)) {
    const cb = document.querySelector<HTMLInputElement>(selector);
    if (cb) cb.addEventListener('change', applyFilter);
  }

  // Wire up ward checkboxes
  wardChecksContainer?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', applyFilter);
  });

  // Wire up alerts select
  const alertsSelect = document.querySelector<HTMLSelectElement>('#alerts-select');
  if (alertsSelect) alertsSelect.addEventListener('change', applyFilter);

  // Wire up Select All / None buttons
  document.querySelectorAll<HTMLButtonElement>('[data-filter-all]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.filterAll;
      const container = target === 'ward'
        ? wardChecksContainer
        : document.querySelector<HTMLElement>('#source-type-checks');
      container?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => { cb.checked = true; });
      applyFilter();
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-filter-none]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.filterNone;
      const container = target === 'ward'
        ? wardChecksContainer
        : document.querySelector<HTMLElement>('#source-type-checks');
      container?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
      applyFilter();
    });
  });

  // Inject "Only" hover buttons into every filter row
  if (sourceChecksContainer) {
    sourceChecksContainer.querySelectorAll<HTMLElement>('.filter-check').forEach(row => {
      addOnlyButton(row, sourceChecksContainer, applyFilter);
    });
  }
  if (wardChecksContainer) {
    wardChecksContainer.querySelectorAll<HTMLElement>('.filter-check').forEach(row => {
      addOnlyButton(row, wardChecksContainer, applyFilter);
    });
  }

  // Wire up collapsible filter group toggles
  document.querySelectorAll<HTMLElement>('.filter-group--collapsible .filter-group-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.closest('.filter-group--collapsible')?.classList.toggle('filter-group--collapsed');
    });
  });

  // Initial summary text
  applyFilter();
}

// ---------------------------------------------------------------------------
// Color mode toggle (parameter vs source type)
// ---------------------------------------------------------------------------

export function initColorModeToggle(
  map: Map,
  onParamMode: () => void,
  onTypeMode: () => void,
): void {
  const paramBtn = document.querySelector<HTMLElement>('#color-mode-param');
  const typeBtn = document.querySelector<HTMLElement>('#color-mode-type');
  const paramSection = document.querySelector<HTMLElement>('#param-section');
  if (!paramBtn || !typeBtn) return;

  paramBtn.addEventListener('click', () => {
    paramBtn.classList.add('color-mode-btn--active');
    typeBtn.classList.remove('color-mode-btn--active');
    if (paramSection) paramSection.style.display = '';
    onParamMode();
  });

  typeBtn.addEventListener('click', () => {
    typeBtn.classList.add('color-mode-btn--active');
    paramBtn.classList.remove('color-mode-btn--active');
    if (paramSection) paramSection.style.display = 'none';
    onTypeMode();
  });
}
