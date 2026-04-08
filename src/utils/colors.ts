/**
 * Color utilities for water quality map markers.
 *
 * Colors encode the ratio: measured_value / threshold_value,
 * using an earth/water-tone colorblind-safe ramp.
 */

// ---------------------------------------------------------------------------
// Ratio-based color ramp
// ---------------------------------------------------------------------------

export interface RatioColorStop {
  max: number;
  color: string;
  label: string;
}

export const RATIO_COLORS: RatioColorStop[] = [
  { max: 0.5, color: '#1a6b54', label: 'Well below threshold' },
  { max: 0.75, color: '#5ba88a', label: 'Below threshold' },
  { max: 1.0, color: '#f2cc6b', label: 'Approaching threshold' },
  { max: 2.0, color: '#e88a46', label: 'Exceeds threshold' },
  { max: 5.0, color: '#c24444', label: 'Significantly exceeds' },
  { max: Infinity, color: '#7a1a1a', label: 'Dangerously exceeds' },
];

export const NO_DATA_COLOR = '#555555';

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Return the hex color for a given threshold ratio (null -> NO_DATA_COLOR). */
export function getColorForRatio(ratio: number | null): string {
  if (ratio === null) return NO_DATA_COLOR;
  for (const stop of RATIO_COLORS) {
    if (ratio <= stop.max) return stop.color;
  }
  // Should not be reached, but guard anyway.
  return RATIO_COLORS[RATIO_COLORS.length - 1].color;
}

/** Return the human-readable label for a given threshold ratio. */
export function getLabelForRatio(ratio: number | null): string {
  if (ratio === null) return 'No data';
  for (const stop of RATIO_COLORS) {
    if (ratio <= stop.max) return stop.label;
  }
  return RATIO_COLORS[RATIO_COLORS.length - 1].label;
}

/**
 * Return MapLibre-compatible `step` expression stops:
 * an array of [ratio, color] pairs suitable for use inside a MapLibre
 * `["step", …]` or `["interpolate", …]` paint expression.
 *
 * The stops use the *lower* bound of each range so that MapLibre
 * picks the correct bucket via its >= comparison.
 */
export function getColorStops(): [number, string][] {
  return [
    [0, '#1a6b54'],
    [0.5, '#5ba88a'],
    [0.75, '#f2cc6b'],
    [1.0, '#e88a46'],
    [2.0, '#c24444'],
    [5.0, '#7a1a1a'],
  ];
}

// ---------------------------------------------------------------------------
// Source-type styling
// ---------------------------------------------------------------------------

export const SOURCE_TYPE_SHAPES: Record<string, string> = {
  'DBH solar': 'circle',
  'SBH pump': 'square',
  'OHD well': 'diamond',
  'Spring': 'triangle',
};

export const SOURCE_TYPE_COLORS: Record<string, string> = {
  'DBH solar': '#3e92cc',  // bright blue — deep boreholes
  'SBH pump':  '#ffd166',  // warm yellow — shallow boreholes
  'OHD well':  '#ef476f',  // coral pink — open dug wells
  'Spring':    '#06d6a0',  // mint green — springs
};
