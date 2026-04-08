import * as d3 from 'd3';
import { SELECTABLE_PARAMETERS } from '../data/parameters';
import { RATIO_COLORS, getColorForRatio, SOURCE_TYPE_COLORS } from '../utils/colors';

interface SiteValue {
  value: number;
  ratio: number;
  name: string;
  type: string;
  wpNo: number | null;
  lon: number;
  lat: number;
}

export type SiteClickHandler = (site: { name: string; lon: number; lat: number; wpNo: number | null }) => void;

function fmt(v: number, integer = false): string {
  // Lab convention: values below the detection limit come through as
  // small negatives. Display as "<LOD" rather than a misleading negative.
  if (!integer && v < 0) return '<LOD';
  if (integer || Number.isInteger(v)) return Math.round(v).toString();
  return v < 1 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0);
}

function collectValues(
  geojson: GeoJSON.FeatureCollection,
  paramKey: string,
  activeSourceTypes: string[],
): SiteValue[] {
  const isExceed = paramKey === 'EXCEED';
  const values: SiteValue[] = [];

  for (const f of geojson.features) {
    const props = f.properties as Record<string, any>;
    if (!props || !activeSourceTypes.includes(props.bh_type)) continue;

    const geom = f.geometry as GeoJSON.Point | undefined;
    const coords = geom?.coordinates as [number, number] | undefined;
    if (!coords) continue;
    const [lon, lat] = coords;
    const wpNo = typeof props.wp_no === 'number' ? props.wp_no : (props.wp_no != null ? Number(props.wp_no) : null);

    if (isExceed) {
      // Use the canonical pre-counted exceedance total instead of looping
      // over ratios (which would inadvertently include synthetic relmag).
      const count = (props['param_EXCEED'] as number) ?? 0;
      values.push({ value: count, ratio: Math.min(count, 5), name: props.name, type: props.bh_type, wpNo, lon, lat });
    } else {
      const params = props.params as Record<string, number | null> | undefined;
      const ratios = props.ratios as Record<string, number | null> | undefined;
      if (!params) continue;
      const val = params[paramKey];
      if (val == null) continue;
      const ratio = ratios?.[paramKey] ?? 0;
      values.push({ value: val, ratio: typeof ratio === 'number' ? ratio : 0, name: props.name, type: props.bh_type, wpNo, lon, lat });
    }
  }

  return values.sort((a, b) => b.value - a.value);
}

/** D3 histogram with animated bars colored by threshold ratio */
function renderHistogram(
  container: HTMLElement,
  values: SiteValue[],
  unit: string,
  threshold: number | null,
  integer = false,
): void {
  const margin = { top: 8, right: 12, bottom: 28, left: 36 };
  const width = 480 - margin.left - margin.right;
  const height = 140 - margin.top - margin.bottom;

  const vals = values.map(v => v.value);
  const extent = d3.extent(vals) as [number, number];
  if (extent[0] === undefined) return;

  let x: d3.ScaleLinear<number, number>;
  let bins: d3.Bin<number, number>[];

  if (integer) {
    // Integer mode: one bin per integer value, centered
    const lo = Math.floor(extent[0]);
    const hi = Math.ceil(extent[1]);
    const thresholds = d3.range(lo, hi + 2); // bin edges at each integer
    x = d3.scaleLinear().domain([lo - 0.5, hi + 0.5]).range([0, width]);
    bins = d3.bin().domain([lo - 0.5, hi + 0.5] as [number, number]).thresholds(thresholds)(vals);
  } else {
    x = d3.scaleLinear().domain(extent).nice().range([0, width]);
    bins = d3.bin().domain(x.domain() as [number, number]).thresholds(15)(vals);
  }
  const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length) ?? 1]).range([height, 0]);

  const svg = d3.select(container).append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('class', 'd3-chart')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Bars — colored by midpoint ratio
  svg.selectAll('rect')
    .data(bins)
    .join('rect')
    .attr('x', d => x(d.x0 ?? 0))
    .attr('width', d => Math.max(1, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1))
    .attr('y', height)
    .attr('height', 0)
    .attr('rx', 2)
    .attr('fill', d => {
      if (!threshold || threshold === 0) return RATIO_COLORS[0].color;
      const mid = ((d.x0 ?? 0) + (d.x1 ?? 0)) / 2;
      return getColorForRatio(mid / threshold);
    })
    .attr('opacity', 0.85)
    .transition()
    .duration(600)
    .delay((_, i) => i * 30)
    .attr('y', d => y(d.length))
    .attr('height', d => height - y(d.length));

  // Threshold line
  if (threshold && threshold >= extent[0] && threshold <= extent[1]) {
    svg.append('line')
      .attr('x1', x(threshold)).attr('x2', x(threshold))
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', '#fff').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.6);

    svg.append('text')
      .attr('x', x(threshold) + 4).attr('y', 10)
      .attr('fill', '#fff').attr('font-size', '9px').attr('opacity', 0.7)
      .text(`threshold`);
  }

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(integer ? Math.min(extent[1] - extent[0] + 1, 10) : 5).tickFormat(d => fmt(d as number, integer)))
    .attr('color', 'var(--dim)')
    .selectAll('text').attr('fill', 'var(--muted)').attr('font-size', '9px');

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')))
    .attr('color', 'var(--dim)')
    .selectAll('text').attr('fill', 'var(--muted)').attr('font-size', '9px');

  // X label
  svg.append('text')
    .attr('x', width / 2).attr('y', height + 24)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--dim)').attr('font-size', '9px')
    .text(unit);
}

/** D3 horizontal bar chart — by source type */
function renderTypeBreakdown(
  container: HTMLElement,
  values: SiteValue[],
  unit: string,
  hasThreshold: boolean = true,
): void {
  const byType: Record<string, { total: number; exceed: number; sum: number }> = {};
  for (const v of values) {
    if (!byType[v.type]) byType[v.type] = { total: 0, exceed: 0, sum: 0 };
    byType[v.type].total++;
    byType[v.type].sum += v.value;
    if (hasThreshold && v.ratio > 1.0) byType[v.type].exceed++;
  }

  const data = Object.entries(byType)
    .map(([type, d]) => ({ type, ...d, pct: d.total > 0 ? d.exceed / d.total : 0 }))
    .sort((a, b) => b.total - a.total);

  const margin = { top: 4, right: 60, bottom: 4, left: 80 };
  const barH = 22;
  const height = data.length * barH + margin.top + margin.bottom;
  const width = 480 - margin.left - margin.right;

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.total) ?? 1]).range([0, width]);
  const y = d3.scaleBand().domain(data.map(d => d.type)).range([margin.top, height - margin.bottom]).padding(0.3);

  const svg = d3.select(container).append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height}`)
    .attr('class', 'd3-chart')
    .append('g')
    .attr('transform', `translate(${margin.left},0)`);

  // Background bars (total)
  svg.selectAll('.bar-bg')
    .data(data)
    .join('rect')
    .attr('x', 0).attr('y', d => y(d.type) ?? 0)
    .attr('width', d => x(d.total))
    .attr('height', y.bandwidth())
    .attr('rx', 3)
    .attr('fill', 'rgba(255,255,255,0.06)');

  // Exceedance bars (foreground)
  svg.selectAll('.bar-exceed')
    .data(data)
    .join('rect')
    .attr('x', 0).attr('y', d => y(d.type) ?? 0)
    .attr('width', 0)
    .attr('height', y.bandwidth())
    .attr('rx', 3)
    .attr('fill', d => SOURCE_TYPE_COLORS[d.type] ?? 'var(--orange)')
    .attr('opacity', 0.85)
    .transition()
    .duration(600)
    .delay((_, i) => i * 100)
    .attr('width', d => x(d.exceed));

  // Labels — type name
  svg.selectAll('.label')
    .data(data)
    .join('text')
    .attr('x', -6).attr('y', d => (y(d.type) ?? 0) + y.bandwidth() / 2)
    .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
    .attr('fill', 'var(--muted)').attr('font-size', '10px')
    .text(d => d.type);

  // Labels — count
  svg.selectAll('.count')
    .data(data)
    .join('text')
    .attr('x', d => x(d.total) + 4).attr('y', d => (y(d.type) ?? 0) + y.bandwidth() / 2)
    .attr('dominant-baseline', 'middle')
    .attr('fill', 'var(--dim)').attr('font-size', '9px')
    .text(d => `${d.exceed}/${d.total}`);
}

/** D3 dot strip — top 15 worst sites, clickable */
function renderWorstSites(
  container: HTMLElement,
  values: SiteValue[],
  unit: string,
  integer = false,
  onSiteClick?: SiteClickHandler,
): void {
  const worst = values.slice(0, 15);
  if (!worst.length) return;

  const div = d3.select(container);

  worst.forEach((site, i) => {
    const color = getColorForRatio(site.ratio);
    const row = div.append('div')
      .attr('class', 'details-site-row details-site-row--clickable')
      .attr('role', 'button')
      .attr('tabindex', '0')
      .attr('data-wp-no', site.wpNo != null ? String(site.wpNo) : '')
      .attr('title', `Zoom to ${site.name}`)
      .style('opacity', '0')
      .style('transform', 'translateX(-8px)');

    row.append('span').attr('class', 'details-site-rank').text(`${i + 1}`);
    row.append('span').attr('class', 'details-site-dot').style('background', color);
    const nameEl = row.append('span').attr('class', 'details-site-name');
    nameEl.append('span').attr('class', 'details-site-name-text').text(site.name);
    if (site.wpNo != null) {
      nameEl.append('span').attr('class', 'details-site-id').text(`#${site.wpNo}`);
    }
    row.append('span').attr('class', 'details-site-val').text(`${fmt(site.value, integer)} ${unit}`);

    if (onSiteClick) {
      const handler = () => onSiteClick({
        name: site.name,
        lon: site.lon,
        lat: site.lat,
        wpNo: site.wpNo,
      });
      row.on('click', handler);
      row.on('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handler();
        }
      });
    }

    row.transition()
      .duration(300)
      .delay(i * 40)
      .style('opacity', '1')
      .style('transform', 'translateX(0)');
  });
}

export function updateDetails(
  geojson: GeoJSON.FeatureCollection,
  paramKey: string,
  activeSourceTypes: string[],
  onSiteClick?: SiteClickHandler,
): void {
  const container = document.querySelector<HTMLElement>('#details-content');
  const title = document.querySelector<HTMLElement>('#details-title');
  if (!container) return;

  const isExceed = paramKey === 'EXCEED';
  const param = isExceed ? null : SELECTABLE_PARAMETERS.find(p => p.key === paramKey);
  const hasThreshold = isExceed || (param?.threshold != null);

  if (title) {
    title.textContent = isExceed ? 'Threshold Alert Details' : (param?.displayName ?? paramKey);
  }

  const values = collectValues(geojson, paramKey, activeSourceTypes);
  const total = values.length;
  // Only count "exceeding" when there's a real threshold; otherwise the
  // synthetic relative-magnitude ratio would falsely flag values > 0.2*max.
  const exceeding = hasThreshold ? values.filter(v => v.ratio > 1.0).length : 0;
  const exceedPct = total > 0 ? Math.round((exceeding / total) * 100) : 0;
  const sorted = [...values.map(v => v.value)].sort((a, b) => a - b);
  const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
  const maxVal = sorted.length > 0 ? sorted[sorted.length - 1] : 0;

  const unit = isExceed ? 'alerts' : (param?.unit ?? '');
  const threshold = isExceed ? null : (param?.threshold ?? null);

  // Clear and rebuild
  container.innerHTML = '';

  // Stats grid — swap Exceed/Rate columns for Max when no threshold
  const statsGrid = document.createElement('div');
  statsGrid.className = 'details-stats-grid';
  if (hasThreshold) {
    statsGrid.innerHTML = `
      <div class="details-stat"><span class="details-stat-val">${total}</span><span class="details-stat-label">Sites</span></div>
      <div class="details-stat"><span class="details-stat-val">${exceeding}</span><span class="details-stat-label">Exceed</span></div>
      <div class="details-stat"><span class="details-stat-val">${exceedPct}%</span><span class="details-stat-label">Rate</span></div>
      <div class="details-stat"><span class="details-stat-val">${fmt(median, isExceed)}</span><span class="details-stat-label">Median</span></div>
    `;
  } else {
    statsGrid.innerHTML = `
      <div class="details-stat"><span class="details-stat-val">${total}</span><span class="details-stat-label">Sites</span></div>
      <div class="details-stat"><span class="details-stat-val">${fmt(median)}</span><span class="details-stat-label">Median</span></div>
      <div class="details-stat"><span class="details-stat-val">${fmt(maxVal)}</span><span class="details-stat-label">Max</span></div>
      <div class="details-stat" style="grid-column:span 1"><span class="details-stat-val" style="font-size:0.7rem;color:var(--muted)">no threshold</span><span class="details-stat-label">${unit || '—'}</span></div>
    `;
  }
  container.appendChild(statsGrid);

  // D3 Histogram
  const histSection = document.createElement('div');
  histSection.innerHTML = '<h3>Distribution</h3>';
  const histContainer = document.createElement('div');
  histContainer.className = 'details-chart';
  histSection.appendChild(histContainer);
  container.appendChild(histSection);
  renderHistogram(histContainer, values, unit, hasThreshold ? threshold : null, isExceed);

  // D3 Source type breakdown
  const typeSection = document.createElement('div');
  typeSection.innerHTML = '<h3>By Source Type</h3>';
  const typeContainer = document.createElement('div');
  typeContainer.className = 'details-chart';
  typeSection.appendChild(typeContainer);
  container.appendChild(typeSection);
  renderTypeBreakdown(typeContainer, values, unit, hasThreshold);

  // Worst sites with animated entrance
  const worstSection = document.createElement('div');
  worstSection.innerHTML = '<h3>Highest Values</h3>';
  const worstContainer = document.createElement('div');
  worstContainer.className = 'details-worst';
  worstSection.appendChild(worstContainer);
  container.appendChild(worstSection);
  renderWorstSites(worstContainer, values, unit, isExceed, onSiteClick);
}
