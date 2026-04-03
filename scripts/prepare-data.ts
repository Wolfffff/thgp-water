import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");

// ---------------------------------------------------------------------------
// 1. Read and parse CSVs (simple split — no quoted commas in the data)
// ---------------------------------------------------------------------------

function parseCSV(filePath: string): Record<string, string>[] {
  const raw = readFileSync(filePath, "utf-8").trim();
  const [headerLine, ...dataLines] = raw.split("\n");
  const headers = headerLine.split(",");
  return dataLines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h.trim()] = (values[i] ?? "").trim();
      });
      return row;
    });
}

const sites = parseCSV(join(ROOT, "ref", "Turkana_Rdata_April.csv"));
const thresholdRows = parseCSV(
  join(ROOT, "ref", "WHO_KS_Element thresholds.csv")
);

// ---------------------------------------------------------------------------
// 2. Build threshold lookup: element key -> { value, units }
// ---------------------------------------------------------------------------

interface Threshold {
  value: number;
  units: string; // "ppb" or "ppm"
  body: string;
}

const thresholds = new Map<string, Threshold>();

for (const row of thresholdRows) {
  const element = row["Element"];
  const rawThreshold = row["Threshold"];
  if (!element || !rawThreshold) continue;

  const value = parseFloat(rawThreshold);
  if (isNaN(value)) continue;

  // pH row is special: Threshold=8.5, Units="KS", Body="" (columns shifted)
  // All other rows: Units is "ppb" or "ppm", Body is "WHO"/"KS"/etc.
  let units: string;
  if (element === "pH") {
    units = ""; // dimensionless
  } else {
    units = (row["Units"] ?? "").toLowerCase();
  }

  const body = element === "pH" ? row["Units"] ?? "" : row["Body"] ?? "";

  thresholds.set(element, { value, units, body });
}

// ---------------------------------------------------------------------------
// 3. Identify chemical parameter columns in the site CSV
// ---------------------------------------------------------------------------

const siteHeaders = Object.keys(sites[0]);
const metaColumns = new Set([
  "WP_No",
  "Date_Time",
  "y_Proj",
  "x_Proj",
  "Elevation",
  "Name",
  "BH_Type",
]);

interface ParamInfo {
  csvColumn: string;
  key: string;
  units: string; // "ppb" | "ppm" | ""
}

const paramColumns: ParamInfo[] = [];

for (const col of siteHeaders) {
  if (metaColumns.has(col)) continue;

  let key: string;
  let units: string;

  const ppbMatch = col.match(/^(.+)_ppb$/i);
  const ppmMatch = col.match(/^(.+)_ppm$/i);
  const otherUnits = col.match(/^(.+)_(MScm|mmHg|0C)$/);

  if (ppbMatch) {
    key = ppbMatch[1];
    units = "ppb";
  } else if (ppmMatch) {
    key = ppmMatch[1];
    units = "ppm";
  } else if (otherUnits) {
    key = otherUnits[1];
    units = otherUnits[2].toLowerCase();
  } else {
    // Bare column like "pH"
    key = col;
    units = "";
  }

  paramColumns.push({ csvColumn: col, key, units });
}

// ---------------------------------------------------------------------------
// 4. Helper: compute ratio (value / threshold) with unit conversion
// ---------------------------------------------------------------------------

function computeRatio(
  value: number,
  paramUnits: string,
  threshold: Threshold
): number {
  const tVal = threshold.value;
  const tUnits = threshold.units;

  // Dimensionless (pH is handled separately)
  if (!tUnits && !paramUnits) return value / tVal;

  let normalizedValue = value;

  // Convert value to threshold units if they differ
  if (paramUnits === "ppm" && tUnits === "ppb") {
    normalizedValue = value * 1000;
  } else if (paramUnits === "ppb" && tUnits === "ppm") {
    normalizedValue = value / 1000;
  }

  return normalizedValue / tVal;
}

// ---------------------------------------------------------------------------
// 5. Build GeoJSON features
// ---------------------------------------------------------------------------

interface GeoJSONFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number, number] };
  properties: Record<string, unknown>;
}

const features: GeoJSONFeature[] = [];
const bhTypeCounts: Record<string, number> = {};

for (const row of sites) {
  const lon = parseFloat(row["x_Proj"]);
  const lat = parseFloat(row["y_Proj"]);
  const elevation = parseFloat(row["Elevation"]);

  if (isNaN(lon) || isNaN(lat)) continue;

  const bhType = row["BH_Type"] || null;
  if (bhType) {
    bhTypeCounts[bhType] = (bhTypeCounts[bhType] || 0) + 1;
  }

  const properties: Record<string, unknown> = {
    wp_no: row["WP_No"] ? parseInt(row["WP_No"], 10) : null,
    date: row["Date_Time"] || null,
    name: row["Name"] || null,
    bh_type: bhType,
    elevation: isNaN(elevation) ? null : elevation,
  };

  const params: Record<string, number | null> = {};
  const ratios: Record<string, number | null> = {};

  for (const p of paramColumns) {
    const raw = row[p.csvColumn];
    if (raw === undefined || raw === "") {
      params[p.key] = null;
    } else {
      const num = parseFloat(raw);
      params[p.key] = isNaN(num) ? null : num;
    }

    const value = params[p.key];
    const threshold = thresholds.get(p.key);

    if (!threshold) continue; // no threshold for this param

    if (value === null || value === undefined) {
      ratios[p.key] = null;
      continue;
    }

    // Special handling for pH
    if (p.key === "pH") {
      if (value > 8.5) {
        ratios["pH"] = value / 8.5;
      } else if (value < 6.5) {
        ratios["pH"] = 6.5 / value;
      } else {
        ratios["pH"] = 0;
      }
      continue;
    }

    ratios[p.key] = computeRatio(value, p.units, threshold);
  }

  properties.params = params;
  properties.ratios = ratios;

  features.push({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [lon, lat, isNaN(elevation) ? 0 : elevation],
    },
    properties,
  });
}

const geojson = {
  type: "FeatureCollection" as const,
  features,
};

// ---------------------------------------------------------------------------
// 6. Write output
// ---------------------------------------------------------------------------

const outDir = join(ROOT, "public", "data");
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const outPath = join(outDir, "sites.geojson");
writeFileSync(outPath, JSON.stringify(geojson, null, 2), "utf-8");

// ---------------------------------------------------------------------------
// 7. Summary stats
// ---------------------------------------------------------------------------

const paramsWithThresholds = paramColumns.filter((p) =>
  thresholds.has(p.key)
);

console.log(`\n=== prepare-data summary ===`);
console.log(`Total features written: ${features.length}`);
console.log(`Output: ${outPath}`);
console.log(`\nCount by BH_Type:`);
for (const [type, count] of Object.entries(bhTypeCounts).sort()) {
  console.log(`  ${type}: ${count}`);
}
console.log(
  `\nParameters with thresholds (${paramsWithThresholds.length}):`
);
for (const p of paramsWithThresholds) {
  const t = thresholds.get(p.key)!;
  console.log(
    `  ${p.key} (CSV: ${p.csvColumn}) -> threshold ${t.value} ${t.units || "(dimensionless)"} [${t.body}]`
  );
}
console.log();
