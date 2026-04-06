import type { StyleSpecification } from 'maplibre-gl';

/**
 * Basemap tile configurations.
 * Instead of full StyleSpecification objects, these are just tile URL + attribution.
 * The map uses a single style with a swappable raster source.
 */
export const BASEMAP_TILES: Record<string, { url: string; attribution: string; maxzoom: number }> = {
  light: {
    url: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxzoom: 20,
  },
  dark: {
    url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxzoom: 20,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community',
    maxzoom: 22,
  },
  terrain: {
    url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>) &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxzoom: 17,
  },
};

export type BasemapKey = keyof typeof BASEMAP_TILES;
export const DEFAULT_BASEMAP: BasemapKey = 'light';

/**
 * The initial MapLibre style — a single raster source that we swap tiles on.
 * Data sources (sites, boundary, etc.) are added on top at runtime.
 */
export function getInitialStyle(): StyleSpecification {
  const basemap = BASEMAP_TILES[DEFAULT_BASEMAP];
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [basemap.url],
        tileSize: 256,
        attribution: basemap.attribution,
        maxzoom: basemap.maxzoom,
      },
    },
    layers: [
      {
        id: 'basemap-tiles',
        type: 'raster',
        source: 'basemap',
      },
    ],
  };
}
