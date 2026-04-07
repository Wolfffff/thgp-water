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

  // Populate parameter options
  for (const param of SELECTABLE_PARAMETERS) {
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

export function getActiveSourceTypes(): string[] {
  return _activeSourceTypes;
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
  onFilterChange: () => void,
): void {
  const applyFilter = () => {
    const activeTypes: string[] = [];
    for (const [selector, typeName] of Object.entries(SOURCE_TYPE_CHECKBOX_MAP)) {
      const cb = document.querySelector<HTMLInputElement>(selector);
      if (cb?.checked) activeTypes.push(typeName);
    }
    _activeSourceTypes = activeTypes;

    let filter: any[] = ['all'];

    // Source type filter
    if (activeTypes.length < 4) {
      filter.push(['in', ['get', 'bh_type'], ['literal', activeTypes]]);
    }

    const filterExpr = filter.length > 1 ? (filter as maplibregl.FilterSpecification) : null;
    map.setFilter('sites-circles', filterExpr);
    if (map.getLayer('sites-heatmap')) {
      map.setFilter('sites-heatmap', filterExpr);
    }

    onFilterChange();
  };

  // Wire up source type checkboxes
  for (const selector of Object.keys(SOURCE_TYPE_CHECKBOX_MAP)) {
    const cb = document.querySelector<HTMLInputElement>(selector);
    if (cb) cb.addEventListener('change', applyFilter);
  }

  // Populate ward select
  const wardSelect = document.querySelector<HTMLSelectElement>('#ward-select');
  if (wardSelect) {
    const wardNames = wardsData.features
      .map(f => f.properties?.name as string)
      .filter(Boolean)
      .sort();
    for (const name of wardNames) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      wardSelect.appendChild(opt);
    }

    // Ward select: fly to ward bounds
    wardSelect.addEventListener('change', () => {
      const name = wardSelect.value;
      if (name === 'all') {
        map.flyTo({ center: [35.5, 3.5], zoom: 7, duration: 1000 });
        return;
      }
      const ward = wardsData.features.find(f => f.properties?.name === name);
      if (ward) {
        const bbox = getBBox(ward);
        map.fitBounds(bbox, { padding: 40, duration: 1000 });
      }
    });
  }
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
