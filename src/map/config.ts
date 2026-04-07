/** Map configuration constants for the Turkana County water quality GIS map. */

/** Approximate center of Turkana County, Kenya [longitude, latitude]. */
export const MAP_CENTER: [number, number] = [35.5, 3.5];

/** Default zoom level — zoomed out enough to show all sites in Turkana. */
export const DEFAULT_ZOOM = 6.4;

/** Minimum allowed zoom level. */
export const MIN_ZOOM = 6;

/** Maximum allowed zoom level. */
export const MAX_ZOOM = 18;

/**
 * Bounding box that constrains map panning to Turkana County + ~500 km
 * buffer in all directions (1° ≈ 111 km at the equator, so ~4.5° padding).
 * Turkana County extent: ~34.5°-36.7° lon, ~1.4°-5.5° lat.
 * Format: [[sw_lng, sw_lat], [ne_lng, ne_lat]]
 */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [30, -3],
  [41, 10],
];
