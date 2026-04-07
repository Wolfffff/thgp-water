/** Map configuration constants for the Turkana County water quality GIS map. */

/** Approximate center of Turkana County, Kenya [longitude, latitude]. */
export const MAP_CENTER: [number, number] = [35.5, 3.5];

/** Default zoom level — shows the full county. */
export const DEFAULT_ZOOM = 7;

/** Minimum allowed zoom level — Kenya + a small buffer, no further. */
export const MIN_ZOOM = 5;

/** Maximum allowed zoom level. */
export const MAX_ZOOM = 18;

/**
 * Bounding box that constrains map panning to roughly Kenya plus a small buffer.
 * Format: [[sw_lng, sw_lat], [ne_lng, ne_lat]]
 */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [32, -6],
  [44, 7],
];
