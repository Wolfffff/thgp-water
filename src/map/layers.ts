import type { Map } from 'maplibre-gl';
import { getColorStops, NO_DATA_COLOR, SOURCE_TYPE_COLORS } from '../utils/colors';

// ---------------------------------------------------------------------------
// Color expression builder
// ---------------------------------------------------------------------------

/**
 * Build a MapLibre `step` expression that maps a ratio property to the
 * diverging RdBu color ramp defined in `utils/colors`.
 */
function ratioColorExpression(
  property: string,
): maplibregl.ExpressionSpecification {
  const stops = getColorStops();
  // `step` expression: default color first, then [stop, color] pairs.
  // We use `case` to handle null / missing values gracefully.
  return [
    'case',
    ['==', ['get', property], null],
    NO_DATA_COLOR,
    [
      'step',
      ['get', property],
      stops[0][1],          // color for values < first stop
      stops[1][0], stops[1][1],
      stops[2][0], stops[2][1],
      stops[3][0], stops[3][1],
      stops[4][0], stops[4][1],
      stops[5][0], stops[5][1],
    ],
  ] as maplibregl.ExpressionSpecification;
}

// ---------------------------------------------------------------------------
// Layer functions
// ---------------------------------------------------------------------------

/**
 * Add a circle layer representing water quality sampling sites.
 * Expects a GeoJSON source named `sites` to already exist on the map.
 */
export function addSitesLayer(map: Map): void {
  map.addLayer({
    id: 'sites-circles',
    type: 'circle',
    source: 'sites',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        7, 5,
        10, 8,
        14, 12,
      ],
      'circle-color': ratioColorExpression('ratio_F'),
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-opacity': 0.9,
    },
  });

}

/**
 * Add a heatmap layer for the same sites source.
 * Starts hidden — toggle via `map.setLayoutProperty`.
 */
export function addHeatmapLayer(map: Map): void {
  map.addLayer({
    id: 'sites-heatmap',
    type: 'heatmap',
    source: 'sites',
    layout: {
      visibility: 'none',
    },
    paint: {
      'heatmap-weight': ['coalesce', ['get', 'ratio_EXCEED'], 0],
      'heatmap-radius': [
        'interpolate', ['linear'], ['zoom'],
        5, 30,
        7, 50,
        10, 80,
        14, 120,
      ],
      'heatmap-opacity': 0.6,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.25, 'rgba(0,0,255,0.6)',
        0.5, 'rgba(255,255,0,0.7)',
        0.75, 'rgba(255,165,0,0.8)',
        1.0, 'rgba(255,0,0,0.9)',
      ],
    },
  });
}

/**
 * Create an inverted mask GeoJSON — a world-covering polygon with a hole
 * cut out for the given boundary. Dims everything outside the boundary.
 */
export function createInvertedMask(boundary: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  // World extent polygon (must be counter-clockwise for outer ring)
  const worldRing: [number, number][] = [
    [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]
  ];

  // Extract the boundary rings as holes
  const holes: [number, number][][] = [];
  for (const feature of boundary.features) {
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      holes.push(geom.coordinates[0] as [number, number][]);
    } else if (geom.type === 'MultiPolygon') {
      for (const polygon of geom.coordinates) {
        holes.push(polygon[0] as [number, number][]);
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [worldRing, ...holes],
      },
    }],
  };
}

/**
 * Add layers to highlight Turkana County and dim the rest.
 */
export function addKenyaMaskLayer(map: Map): void {
  // Kenya outline (subtle at zoomed-in, visible zoomed-out)
  if (map.getSource('kenya')) {
    map.addLayer({
      id: 'kenya-outline',
      type: 'line',
      source: 'kenya',
      paint: {
        'line-color': 'rgba(231, 117, 0, 0.3)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 7, 0.5],
      },
    });
  }
}

/**
 * Add a dark mask over everything outside Turkana County.
 * Call after adding the 'turkana-mask' source.
 */
export function addTurkanaMaskLayer(map: Map): void {
  map.addLayer({
    id: 'turkana-mask',
    type: 'fill',
    source: 'turkana-mask',
    paint: {
      'fill-color': 'rgba(0, 0, 0, 0.35)',
    },
  });
}

/**
 * Add the Turkana County boundary as a dashed line layer.
 * Expects a GeoJSON source named `boundary` to already exist on the map.
 */
export function addBoundaryLayer(map: Map): void {
  map.addLayer({
    id: 'turkana-boundary',
    type: 'line',
    source: 'boundary',
    paint: {
      'line-color': '#E77500',
      'line-width': 2,
      'line-dasharray': [3, 2],
      'line-opacity': 0.6,
    },
  });
}

/**
 * Add ward boundaries as a fill + outline layer.
 * Expects a GeoJSON source named `wards` to already exist on the map.
 * Starts hidden.
 */
export function addWardLayer(map: Map): void {
  // Transparent fill (needed for click/hover hit-testing)
  map.addLayer({
    id: 'turkana-wards',
    type: 'fill',
    source: 'wards',
    layout: {
      visibility: 'none',
    },
    paint: {
      'fill-color': 'rgba(0,0,0,0)',
    },
  });

  // Outline
  map.addLayer({
    id: 'turkana-wards-outline',
    type: 'line',
    source: 'wards',
    layout: {
      visibility: 'none',
    },
    paint: {
      'line-color': '#666666',
      'line-width': 1,
    },
  });
}

/**
 * Update the sites circle layer and heatmap to use a different parameter's ratio.
 */
export function updateSitesParameter(map: Map, paramKey: string): void {
  const property = `ratio_${paramKey}`;
  map.setPaintProperty('sites-circles', 'circle-color', ratioColorExpression(property));

  // Also update heatmap weight to match selected parameter
  if (map.getLayer('sites-heatmap')) {
    map.setPaintProperty('sites-heatmap', 'heatmap-weight', ['coalesce', ['get', property], 0]);
  }
}

/**
 * Color sites by source type instead of threshold ratio.
 */
export function colorBySourceType(map: Map): void {
  const entries = Object.entries(SOURCE_TYPE_COLORS);
  // Build a match expression: ['match', ['get', 'bh_type'], type1, color1, ..., fallback]
  const expr: any[] = ['match', ['get', 'bh_type']];
  for (const [type, color] of entries) {
    expr.push(type, color);
  }
  expr.push('#999999'); // fallback
  map.setPaintProperty('sites-circles', 'circle-color', expr);
}
