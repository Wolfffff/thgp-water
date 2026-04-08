import { SELECTABLE_PARAMETERS } from '../data/parameters';
import { RATIO_COLORS, NO_DATA_COLOR, SOURCE_TYPE_COLORS } from '../utils/colors';

/**
 * Update the legend with a continuous gradient color scale bar
 * and threshold info for the selected parameter.
 */
export function updateLegend(paramKey: string): void {
  const container = document.querySelector<HTMLElement>('#legend-items');
  const heading = document.querySelector<HTMLElement>('#legend .legend-header h4');
  if (!container) return;

  const isExceed = paramKey === 'EXCEED';
  const param = isExceed ? null : SELECTABLE_PARAMETERS.find((p) => p.key === paramKey);
  if (!isExceed && !param) return;
  const isRelative = !isExceed && param!.threshold === null;

  if (heading) heading.textContent = isExceed ? 'Thresholds Exceeded' : param!.displayName;

  let gradient: string;
  let ticks: { label: string; pos: string }[];

  // Use colors from RATIO_COLORS to stay in sync
  const c = RATIO_COLORS.map(s => s.color);

  if (isExceed) {
    gradient = `linear-gradient(to right, ${c[0]} 0%, ${c[0]} 5%, ${c[1]} 15%, ${c[2]} 30%, ${c[3]} 55%, ${c[4]} 78%, ${c[5]} 100%)`;
    ticks = [
      { label: '0', pos: '0%' },
      { label: '1', pos: '25%' },
      { label: '2', pos: '50%' },
      { label: '3', pos: '75%' },
      { label: '5+', pos: '100%' },
    ];
  } else if (isRelative) {
    // No threshold — relative magnitude. Use the same gradient as the
    // threshold version so it looks visually consistent, but ticks read
    // as Low / Mid / High instead of multiplier values.
    gradient = `linear-gradient(to right, ${c[0]} 0%, ${c[0]} 5%, ${c[1]} 12%, ${c[2]} 22%, ${c[3]} 38%, ${c[4]} 65%, ${c[5]} 100%)`;
    ticks = [
      { label: 'Low', pos: '0%' },
      { label: 'Mid', pos: '50%' },
      { label: 'High', pos: '100%' },
    ];
  } else {
    gradient = `linear-gradient(to right, ${c[0]} 0%, ${c[0]} 5%, ${c[1]} 12%, ${c[2]} 22%, ${c[3]} 38%, ${c[4]} 65%, ${c[5]} 100%)`;
    ticks = [
      { label: '0', pos: '0%' },
      { label: '0.5', pos: '12%' },
      { label: '1×', pos: '22%' },
      { label: '2×', pos: '45%' },
      { label: '5×', pos: '100%' },
    ];
  }

  container.innerHTML = '';

  // Scale bar
  const bar = document.createElement('div');
  bar.className = 'legend-scale-bar';
  bar.style.background = gradient;
  container.appendChild(bar);

  // Tick marks — positioned
  const tickRow = document.createElement('div');
  tickRow.className = 'legend-ticks';
  for (const t of ticks) {
    const tick = document.createElement('span');
    tick.className = 'legend-tick';
    tick.textContent = t.label;
    tick.style.left = t.pos;
    tickRow.appendChild(tick);
  }
  container.appendChild(tickRow);

  // Safe / Exceeds labels + No data — single row
  const labelRow = document.createElement('div');
  labelRow.className = 'legend-labels';
  const noDataSwatch = `<span class="legend-no-data"><span class="legend-swatch" style="background:${NO_DATA_COLOR};width:10px;height:10px;display:inline-block;border-radius:2px;vertical-align:middle;margin-right:4px"></span>No data</span>`;
  if (isExceed) {
    labelRow.innerHTML = `<span style="color:${RATIO_COLORS[0].color}">None</span>${noDataSwatch}<span style="color:${RATIO_COLORS[3].color}">Many</span>`;
  } else if (isRelative) {
    labelRow.innerHTML = `<span style="color:${RATIO_COLORS[0].color}">Lowest</span>${noDataSwatch}<span style="color:${RATIO_COLORS[2].color}">Highest</span>`;
  } else {
    labelRow.innerHTML = `<span style="color:${RATIO_COLORS[0].color}">Safe</span>${noDataSwatch}<span style="color:${RATIO_COLORS[3].color}">Exceeds</span>`;
  }
  container.appendChild(labelRow);

  // Threshold / scale info
  if (isExceed) {
    const info = document.createElement('div');
    info.className = 'legend-threshold';
    info.textContent = 'Count of WHO/KS thresholds exceeded per site';
    container.appendChild(info);
  } else if (isRelative) {
    const info = document.createElement('div');
    info.className = 'legend-threshold';
    info.textContent = 'No drinking-water threshold — colored by relative magnitude';
    container.appendChild(info);
  } else if (param && param.threshold !== null) {
    const info = document.createElement('div');
    info.className = 'legend-threshold';
    const unitStr = param.thresholdUnit ? ` ${param.thresholdUnit}` : '';
    const bodyStr = param.thresholdBody ? ` (${param.thresholdBody})` : '';
    info.textContent = `Threshold: ${param.threshold}${unitStr}${bodyStr}`;
    container.appendChild(info);
  }
}

/**
 * Show the source type legend — used when "Color by Source Type" is active.
 */
export function showSourceTypeLegend(): void {
  const container = document.querySelector<HTMLElement>('#legend-items');
  const heading = document.querySelector<HTMLElement>('#legend .legend-header h4');
  if (!container) return;

  if (heading) heading.textContent = 'Source Type';
  container.innerHTML = '';

  for (const [type, color] of Object.entries(SOURCE_TYPE_COLORS)) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const dot = document.createElement('span');
    dot.className = 'legend-swatch';
    dot.style.background = color;
    dot.style.borderRadius = '50%';
    item.appendChild(dot);
    item.appendChild(document.createTextNode(type));
    container.appendChild(item);
  }
}

/** No-op kept for backward compat — legend is managed by updateLegend / showSourceTypeLegend */
export function initSourceTypeLegend(): void {}
