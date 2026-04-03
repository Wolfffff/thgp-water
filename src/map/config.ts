/** Map configuration constants for the Turkana County water quality GIS map. */

/** Approximate center of Turkana County, Kenya [longitude, latitude]. */
export const MAP_CENTER: [number, number] = [35.5, 3.5];

/** Default zoom level — shows the full county. */
export const DEFAULT_ZOOM = 7;

/** Minimum allowed zoom level — allows zooming out to see Kenya in context. */
export const MIN_ZOOM = 3;

/** Maximum allowed zoom level. */
export const MAX_ZOOM = 18;

/**
 * Bounding box that constrains map panning to the East Africa region.
 * Format: [[sw_lng, sw_lat], [ne_lng, ne_lat]]
 */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [20, -12],
  [52, 16],
];
