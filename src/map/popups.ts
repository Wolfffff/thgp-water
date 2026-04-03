import { getColorForRatio, NO_DATA_COLOR } from '../utils/colors';
import { PARAMETERS } from '../data/parameters';

// ---------------------------------------------------------------------------
// Key parameters to always show in popups (in display order)
// ---------------------------------------------------------------------------

const POPUP_PARAM_KEYS = [
  'F', 'TDS', 'pH', 'As', 'Na', 'Mn', 'Pb', 'Fe', 'U', 'NO3', 'Cl', 'SO4',
];

// Quick lookup from key to ParameterMeta
const PARAM_BY_KEY = new Map(PARAMETERS.map((p) => [p.key, p]));

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a numeric value with appropriate precision and unit.
 * - Values < 1: 2 decimal places
 * - Values < 100: 1 decimal place
 * - Values >= 100: 0 decimal places
 * - Null returns "\u2014" (em dash)
 */
export function formatValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return '\u2014';
  let formatted: string;
  if (value < 1) {
    formatted = value.toFixed(2);
  } else if (value < 100) {
    formatted = value.toFixed(1);
  } else {
    formatted = value.toFixed(0);
  }
  return unit ? `${formatted} ${unit}` : formatted;
}

// ---------------------------------------------------------------------------
// Popup HTML
// ---------------------------------------------------------------------------

/**
 * Generate rich HTML for a MapLibre popup showing site details and water
 * quality parameter bars.
 *
 * @param properties  Flat GeoJSON feature properties (e.g. `name`, `bh_type`,
 *                    `wp_no`, `elevation`, `date`, `val_F`, `ratio_F`, etc.)
 * @param parameterKey  Currently selected parameter key (shown first &
 *                      highlighted).
 */
export function generatePopupHTML(
  properties: Record<string, any>,
  parameterKey: string,
): string {
  const name = properties.name ?? 'Unknown site';
  const bhType = properties.bh_type ?? '';
  const wpNo = properties.wp_no != null ? `WP #${properties.wp_no}` : '';
  const elev = properties.elevation != null ? `Elev: ${properties.elevation}m` : '';
  const date = properties.date ?? '';

  const metaParts = [wpNo, elev, date].filter(Boolean).join(' \u00b7 ');

  // Build ordered parameter list: selected parameter first, then the rest
  const orderedKeys = [
    parameterKey,
    ...POPUP_PARAM_KEYS.filter((k) => k !== parameterKey),
  ];

  const paramRows = orderedKeys
    .map((key) => {
      const meta = PARAM_BY_KEY.get(key);
      if (!meta) return '';

      const params = properties.params as Record<string, number | null> | undefined;
      const ratios = properties.ratios as Record<string, number | null> | undefined;
      const value: number | null = params?.[key] ?? null;
      const ratio: number | null = ratios?.[key] ?? null;
      const isSelected = key === parameterKey;

      // Bar width: ratio mapped to 0-100%, where 5x = 100%
      const barPct = ratio !== null ? Math.min((ratio / 5) * 100, 100) : 0;
      const barColor = ratio !== null ? getColorForRatio(ratio) : NO_DATA_COLOR;

      // Threshold line position (1.0x ratio sits at 20% = 1/5)
      const thresholdPct = 20;

      // Value label
      const valueStr = formatValue(value, meta.unit);
      const ratioStr = ratio !== null ? ` (${ratio < 10 ? ratio.toFixed(1) : ratio.toFixed(0)}x)` : '';
      const displayValue = ratio !== null ? `${valueStr}${ratioStr}` : '\u2014';

      return `
      <div class="popup-param${isSelected ? ' popup-param--selected' : ''}">
        <span class="param-name">${meta.displayName}</span>
        <div class="param-bar-container">
          <div class="param-bar" style="width:${barPct.toFixed(1)}%;background:${barColor}"></div>
          <div class="param-threshold-line" style="left:${thresholdPct}%"></div>
        </div>
        <span class="param-value">${displayValue}</span>
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return `
<div class="popup">
  <div class="popup-header">
    <h3>${escapeHtml(name)}</h3>
    ${bhType ? `<span class="popup-type">${escapeHtml(bhType)}</span>` : ''}
  </div>
  ${metaParts ? `<div class="popup-meta">${escapeHtml(metaParts)}</div>` : ''}
  <div class="popup-params">${paramRows}
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
