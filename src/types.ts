// WaterSite feature properties (matches GeoJSON output)
export interface SiteProperties {
  wp_no: number;
  date: string;
  name: string;
  bh_type: 'DBH solar' | 'SBH pump' | 'OHD well' | 'Spring';
  elevation: number;
  // raw parameter values keyed by element symbol (e.g., F, As, TDS, pH)
  params: Record<string, number | null>;
  // threshold ratios: measured/threshold for each parameter with a threshold
  ratios: Record<string, number | null>;
}

export type SourceType = SiteProperties['bh_type'];

export interface ThresholdInfo {
  element: string;
  displayName: string;
  threshold: number | null;
  unit: string;
  body: string | null; // 'WHO' | 'KS' | 'Other'
}

export interface ParameterMeta {
  key: string;           // element symbol: F, As, TDS, pH
  displayName: string;   // human readable: "Fluoride (F)"
  unit: string;          // ppm or ppb
  csvColumn: string;     // original CSV column name
  threshold: number | null;
  thresholdUnit: string | null;
  thresholdBody: string | null;
  category: 'physical' | 'major' | 'trace' | 'anion' | 'non-essential';
}
