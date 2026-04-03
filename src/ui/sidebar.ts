import { SELECTABLE_PARAMETERS } from '../data/parameters';

/**
 * Update the stats panel with summary for the selected parameter.
 * The max-value site is clickable — zooms the map to it.
 */
export function updateStats(
  geojson: GeoJSON.FeatureCollection,
  paramKey: string,
  onSiteClick?: (lon: number, lat: number, name: string) => void,
): void {
  const container = document.querySelector<HTMLElement>('#stats-content');
  if (!container) return;

  const isExceed = paramKey === 'EXCEED';
  const param = isExceed ? null : SELECTABLE_PARAMETERS.find((p) => p.key === paramKey);
  if (!isExceed && !param) {
    container.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">Select a parameter.</p>';
    return;
  }

  const features = geojson.features;

  let measured = 0;
  let exceeding = 0;
  let maxValue: number | null = null;
  let maxSiteName = '';
  let maxLon = 0;
  let maxLat = 0;

  const byType: Record<string, { total: number; exceed: number }> = {};

  for (const f of features) {
    const props = f.properties as Record<string, unknown> | null;
    if (!props) continue;

    if (isExceed) {
      // Count mode: every site is "measured", exceedance = has at least 1 exceeded threshold
      const ratios = props.ratios as Record<string, number | null> | undefined;
      if (!ratios) continue;
      measured++;
      let siteExceedCount = 0;
      for (const val of Object.values(ratios)) {
        if (typeof val === 'number' && val > 1.0) siteExceedCount++;
      }
      const bhType = (props.bh_type as string) || 'Unknown';
      if (!byType[bhType]) byType[bhType] = { total: 0, exceed: 0 };
      byType[bhType].total++;
      if (siteExceedCount > 0) {
        exceeding++;
        byType[bhType].exceed++;
      }
      if (maxValue === null || siteExceedCount > maxValue) {
        maxValue = siteExceedCount;
        maxSiteName = (props.name as string) || `WP ${props.wp_no}`;
        const geom = f.geometry as GeoJSON.Point;
        if (geom.coordinates) { maxLon = geom.coordinates[0]; maxLat = geom.coordinates[1]; }
      }
    } else {
      const params = props.params as Record<string, number | null> | undefined;
      const ratios = props.ratios as Record<string, number | null> | undefined;
      if (!params) continue;

      const rawValue = params[paramKey];
      if (rawValue == null) continue;

      measured++;

      const bhType = (props.bh_type as string) || 'Unknown';
      if (!byType[bhType]) byType[bhType] = { total: 0, exceed: 0 };
      byType[bhType].total++;

      const ratio = ratios?.[paramKey];
      if (ratio != null && ratio > 1.0) {
        exceeding++;
        byType[bhType].exceed++;
      }

      if (maxValue === null || rawValue > maxValue) {
        maxValue = rawValue;
        maxSiteName = (props.name as string) || `WP ${props.wp_no}`;
        const geom = f.geometry as GeoJSON.Point;
        if (geom.coordinates) { maxLon = geom.coordinates[0]; maxLat = geom.coordinates[1]; }
      }
    }
  }

  const totalSites = features.length;
  const measuredPct = totalSites > 0 ? Math.round((measured / totalSites) * 100) : 0;
  const exceedPct = measured > 0 ? Math.round((exceeding / measured) * 100) : 0;

  // Build HTML
  container.innerHTML = '';

  // Parameter name + threshold
  const header = document.createElement('div');
  header.className = 'stat-header';
  if (isExceed) {
    header.innerHTML = `<strong>Threshold Alerts</strong><br><span class="stat-threshold">Sites exceeding any WHO/KS guideline</span>`;
  } else {
    header.innerHTML = `<strong>${param!.displayName}</strong>`;
    if (param!.threshold !== null) {
      const unitStr = param!.thresholdUnit ? ` ${param!.thresholdUnit}` : '';
      const bodyStr = param!.thresholdBody ? ` (${param!.thresholdBody})` : '';
      header.innerHTML += `<br><span class="stat-threshold">Threshold: ${param!.threshold}${unitStr}${bodyStr}</span>`;
    }
  }
  container.appendChild(header);

  // Measured count
  const measuredRow = document.createElement('div');
  measuredRow.className = 'stat-row';
  measuredRow.textContent = `${measured} of ${totalSites} sites measured (${measuredPct}%)`;
  container.appendChild(measuredRow);

  // Exceedance — highlighted if >0
  const exceedRow = document.createElement('div');
  exceedRow.className = 'stat-row';
  if (exceeding > 0) {
    exceedRow.innerHTML = `<span class="stat-exceed">${exceeding} exceed threshold (${exceedPct}%)</span>`;
  } else {
    exceedRow.textContent = 'None exceed threshold';
  }
  container.appendChild(exceedRow);

  // By source type
  const sortedTypes = Object.entries(byType).sort(([, a], [, b]) => b.total - a.total);
  if (sortedTypes.length > 0) {
    const typeHeader = document.createElement('div');
    typeHeader.className = 'stat-section-label';
    typeHeader.textContent = 'By Source';
    container.appendChild(typeHeader);

    for (const [type, counts] of sortedTypes) {
      const pct = counts.total > 0 ? Math.round((counts.exceed / counts.total) * 100) : 0;
      const row = document.createElement('div');
      row.className = 'stat-row stat-row-type';
      row.innerHTML = `<span class="stat-type-name">${type}</span> <span class="stat-type-val">${counts.exceed}/${counts.total} (${pct}%)</span>`;
      container.appendChild(row);
    }
  }

  // Max value — clickable to zoom
  if (maxValue !== null) {
    const maxRow = document.createElement('div');
    maxRow.className = 'stat-max';
    let valDisplay: string;
    if (isExceed) {
      valDisplay = `${Math.round(maxValue)} alerts at`;
    } else {
      const valStr = maxValue < 1 ? maxValue.toFixed(2) : maxValue < 100 ? maxValue.toFixed(1) : maxValue.toFixed(0);
      valDisplay = `${valStr} ${param!.unit} at`;
    }
    maxRow.innerHTML = `<span class="stat-section-label">Maximum</span>
      <button class="stat-max-btn" title="Zoom to ${maxSiteName}">
        ${valDisplay} <strong>${maxSiteName}</strong> ↗
      </button>`;

    const btn = maxRow.querySelector('.stat-max-btn');
    if (btn && onSiteClick) {
      btn.addEventListener('click', () => onSiteClick(maxLon, maxLat, maxSiteName));
    }
    container.appendChild(maxRow);
  }
}
