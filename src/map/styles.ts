import type { StyleSpecification } from 'maplibre-gl';

/**
 * Basemap tile configurations.
 * Instead of full StyleSpecification objects, these are just tile URL + attribution.
 * The map uses a single style with a swappable raster source.
 */
export const BASEMAP_TILES: Record<string, { url: string; attribution: string; maxzoom: number }> = {
  osm: {
    url: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxzoom: 20,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxzoom: 22,
  },
  topo: {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}@2x.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://stamen.com/">Stamen</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxzoom: 20,
  },
};

export type BasemapKey = keyof typeof BASEMAP_TILES;
export const DEFAULT_BASEMAP: BasemapKey = 'osm';

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
        tileSize: 512,
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
