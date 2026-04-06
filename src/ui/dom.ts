/**
 * Programmatic UI construction.
 * Call `createUI()` once before the map is initialised — it appends every
 * overlay, sidebar, legend, modal, and walkthrough element to `document.body`.
 */

/* ── tiny helper ─────────────────────────────────────────────────────── */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (string | HTMLElement)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className') element.className = val;
      else if (key === 'textContent') element.textContent = val;
      else element.setAttribute(key, val);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  return element;
}

/* ── section builders ────────────────────────────────────────────────── */

export function buildIntroOverlay(): HTMLElement {
  const statData: [string, string][] = [
    ['152', 'Sites'],
    ['48', 'Parameters'],
    ['23', 'Wards'],
  ];

  const stats = el('div', { className: 'intro-stats' },
    ...statData.map(([num, label]) =>
      el('div', { className: 'intro-stat' },
        el('span', { className: 'intro-stat-number' }, num),
        el('span', { className: 'intro-stat-label' }, label),
      ),
    ),
  );

  const content = el('div', { className: 'intro-content' },
    el('div', { className: 'intro-divider' }),
    el('h1', {}, 'Turkana Water Quality'),
    el('p', { className: 'intro-subtitle' }, 'Mapping Drinking-Water Risk to Guide Intervention'),
    stats,
    el('button', { id: 'intro-enter', className: 'btn-enter' }, 'Explore the Map \u2192'),
  );

  return el('div', { id: 'intro-overlay' }, content);
}

function buildTitleBar(): HTMLElement {
  return el('div', { id: 'title-bar' },
    el('h1', {}, 'Turkana Water Quality'),
  );
}

function buildSidebar(): HTMLElement {
  /* Color mode toggle */
  const colorMode = el('div', { className: 'sidebar-section' },
    el('h4', {}, 'Color By'),
    el('div', { className: 'color-mode-toggle' },
      el('button', { id: 'color-mode-param', className: 'color-mode-btn color-mode-btn--active' }, 'Parameter'),
      el('button', { id: 'color-mode-type', className: 'color-mode-btn' }, 'Source Type'),
    ),
  );

  /* Parameter */
  const paramSection = el('div', { id: 'param-section', className: 'sidebar-section' },
    el('h4', {}, 'Parameter'),
    el('select', { id: 'param-select' }),
  );

  /* Basemap removed from sidebar — it's a floating picker now */

  /* Layers — county boundary is always visible, not toggleable */
  const toggles: [string, string, boolean, string][] = [
    ['toggle-heatmap', 'Heatmap', false, 'Spatial density of threshold exceedances'],
    ['toggle-wards', 'Ward Boundaries', false, 'Turkana County administrative wards'],
  ];

  const layerSection = el('div', { className: 'sidebar-section' },
    el('h4', {}, 'Layers'),
    ...toggles.map(([id, text, checked, desc]) => {
      const input = el('input', { type: 'checkbox', id });
      if (checked) input.checked = true;
      const row = el('div', { className: 'toggle-row-wrap' },
        el('div', { className: 'toggle-row' },
          input,
          el('label', { for: id }, text),
        ),
        el('span', { className: 'toggle-desc' }, desc),
      );
      return row;
    }),
  );

  /* Filters */
  const filterChecks: [string, string, boolean][] = [
    ['filter-dbh', 'DBH solar', true],
    ['filter-sbh', 'SBH pump', true],
    ['filter-ohd', 'OHD well', true],
    ['filter-spring', 'Spring', true],
  ];

  const filterSection = el('div', { className: 'sidebar-section' },
    el('h4', {}, 'Filters'),
    el('div', { className: 'filter-group' },
      el('label', { className: 'filter-label' }, 'Source Type'),
      el('div', { className: 'filter-checks' },
        ...filterChecks.map(([id, text, checked]) => {
          const input = el('input', { type: 'checkbox', id });
          if (checked) input.checked = true;
          return el('div', { className: 'filter-check toggle-row' },
            input,
            el('label', { for: id }, text),
          );
        }),
      ),
    ),
    el('div', { className: 'filter-group' },
      el('label', { className: 'filter-label' }, 'Ward'),
      el('select', { id: 'ward-select' },
        el('option', { value: 'all' }, 'All Wards'),
      ),
    ),
  );

  /* Summary */
  const summarySection = el('div', { id: 'summary-section', className: 'sidebar-section' },
    el('h4', {}, 'Summary'),
    el('div', { id: 'stats-content' }),
    el('button', { id: 'details-btn', className: 'btn-details' }, 'View Details'),
  );

  /* Actions */
  const actions = el('div', { className: 'sidebar-actions' },
    el('button', { id: 'export-btn', className: 'btn-export' }, 'Export Data'),
    el('button', { id: 'about-btn', className: 'btn-about' }, 'About & Authors'),
    el('button', { id: 'tour-btn', className: 'btn-about' }, 'Show Tour'),
  );

  /* Toggle button — thin tab with chevron */
  const toggleIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  toggleIcon.setAttribute('viewBox', '0 0 6 12');
  toggleIcon.setAttribute('width', '6');
  toggleIcon.setAttribute('height', '12');
  toggleIcon.classList.add('sidebar-toggle-icon');
  toggleIcon.innerHTML = '<path d="M5 1 L1 6 L5 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';

  const toggle = el('button', { id: 'sidebar-toggle', className: 'sidebar-toggle', 'aria-label': 'Toggle sidebar' });
  toggle.appendChild(toggleIcon);

  /* Legend — inside sidebar */
  const legendHeader = el('div', { className: 'legend-header' },
    el('h4', {}, 'Legend'),
    el('button', { id: 'legend-toggle', className: 'legend-toggle', 'aria-label': 'Toggle legend' }, '\u2212'),
  );
  const legendBody = el('div', { id: 'legend-body', className: 'legend-body' },
    el('div', { id: 'legend-items' }),
    el('div', { id: 'legend-source-types' }),
  );
  const legendSection = el('div', { id: 'legend', className: 'sidebar-section legend-section' },
    legendHeader,
    legendBody,
  );

  const content = el('div', { className: 'sidebar-content' },
    colorMode,
    paramSection,
    legendSection,
    layerSection,
    filterSection,
    summarySection,
    actions,
  );

  return el('div', { id: 'sidebar', className: 'sidebar' }, toggle, content);
}

function buildInfoButton(): HTMLElement {
  return el('button', { id: 'info-btn', className: 'info-btn', title: 'About this map', 'aria-label': 'About this map' }, 'i');
}

function buildAboutModal(): HTMLElement {
  /* Authors */
  const authorsData: [string, string, string][] = [
    ['Fred Omengo', 'Lead Researcher', 'Princeton University \u00B7 Turkana Basin Institute \u00B7 Wildlife Research and Training Institute'],
    ['Sospecter Njeru', 'Co-Investigator', 'Kenya Medical Research Institute'],
    ['Julien Ayroles', 'Principal Investigator', 'UC Berkeley \u00B7 Turkana Basin Institute'],
    ['Elizabeth Niespolo', 'Corresponding Author', 'Princeton University \u00B7 fo5058@princeton.edu'],
  ];

  const authorsList = el('div', { className: 'authors-list' },
    ...authorsData.map(([name, role, affil]) =>
      el('div', { className: 'author-card' },
        el('strong', {}, name),
        el('span', { className: 'author-role' }, role),
        el('span', { className: 'author-affil' }, affil),
      ),
    ),
  );

  /* Source types */
  const sourceTypes: [string, string][] = [
    ['#1b9e77', 'Deep Borehole, Solar (DBH solar) \u2014 n=90'],
    ['#d95f02', 'Shallow Borehole, Hand Pump (SBH pump) \u2014 n=38'],
    ['#7570b3', 'Open Hand-Dug Well (OHD well) \u2014 n=21'],
    ['#e7298a', 'Natural Spring \u2014 n=3'],
  ];

  const sourceList = el('ul', { className: 'source-types-list' },
    ...sourceTypes.map(([color, text]) =>
      el('li', {},
        el('span', { className: 'dot', style: `background:${color}` }),
        text,
      ),
    ),
  );

  const panel = el('div', { id: 'about-panel' },
    el('button', { id: 'about-close', className: 'close-btn', 'aria-label': 'Close' }, '\u00D7'),
    el('h2', {}, 'About This Map'),
    el('p', { className: 'about-description' },
      'Interactive map analyzing 152 water sources across Turkana County, Kenya for 48 physical-chemical parameters.',
    ),
    el('h3', {}, 'Authors'),
    authorsList,
    el('h3', {}, 'Data'),
    el('p', {},
      '152 water sources sampled across 23 of 30 wards in Turkana County. Parameters compared against WHO Guidelines for Drinking-water Quality and Kenya Bureau of Standards KS 459-1:2007.',
    ),
    el('h3', {}, 'Source Types'),
    sourceList,
  );

  return el('div', { id: 'about-overlay', className: 'overlay hidden', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'About this map' }, panel);
}

function buildWalkthrough(): HTMLElement {
  const steps: {
    step: string;
    target: string;
    position: string;
    title: string;
    text: string;
    btnLabel: string;
    progress: string;
  }[] = [
    {
      step: '1', target: '#param-select', position: 'left',
      title: 'Select a Parameter',
      text: 'Choose from 29 water quality parameters. Colors show how each site compares to WHO/KS drinking water thresholds.',
      btnLabel: 'Next', progress: '1 / 4',
    },
    {
      step: '2', target: '#basemap-select', position: 'left',
      title: 'Switch Basemaps',
      text: 'Toggle between street map, satellite imagery, and topographic views of the Turkana landscape.',
      btnLabel: 'Next', progress: '2 / 4',
    },
    {
      step: '3', target: '#legend', position: 'right',
      title: 'Read the Legend',
      text: 'Colors indicate the ratio of measured values to safe thresholds. Red = exceeds guideline. Blue = within safe limits.',
      btnLabel: 'Next', progress: '3 / 4',
    },
    {
      step: '4', target: '#map', position: 'center',
      title: 'Explore the Data',
      text: 'Click any site marker for detailed water chemistry. Use the export button to download data as CSV.',
      btnLabel: 'Done', progress: '4 / 4',
    },
  ];

  const container = el('div', { id: 'walkthrough', className: 'hidden' },
    ...steps.map((s, i) => {
      const stepDiv = el('div', {
        className: i === 0 ? 'walkthrough-step' : 'walkthrough-step hidden',
        'data-step': s.step,
        'data-target': s.target,
        'data-position': s.position,
      },
        el('div', { className: 'walkthrough-content' },
          el('h4', {}, s.title),
          el('p', {}, s.text),
        ),
        el('div', { className: 'walkthrough-nav' },
          el('span', { className: 'walkthrough-progress' }, s.progress),
          el('button', { className: 'walkthrough-next' }, s.btnLabel),
        ),
      );
      return stepDiv;
    }),
  );

  return container;
}

function buildDetailsModal(): HTMLElement {
  const panel = el('div', { id: 'details-panel' },
    el('button', { id: 'details-close', className: 'close-btn', 'aria-label': 'Close' }, '\u00D7'),
    el('h2', { id: 'details-title' }, 'Parameter Details'),
    el('div', { id: 'details-content' }),
  );
  return el('div', { id: 'details-overlay', className: 'overlay hidden', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Parameter details' }, panel);
}

function buildBasemapPicker(): HTMLElement {
  const basemaps: [string, string, string][] = [
    ['osm', 'Dark', 'https://a.basemaps.cartocdn.com/dark_all/5/18/16@2x.png'],
    ['satellite', 'Satellite', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/16/18'],
    ['topo', 'Light', 'https://a.basemaps.cartocdn.com/rastertiles/voyager/5/18/16@2x.png'],
  ];

  const picker = el('div', { id: 'basemap-picker', className: 'basemap-picker basemap--stacked' });

  // Tile options
  for (const [key, label, thumb] of basemaps) {
    const btn = el('button', {
      className: key === 'osm' ? 'basemap-option basemap-option--active' : 'basemap-option',
      'data-basemap': key,
    },
      el('img', { src: thumb, alt: label, className: 'basemap-thumb' }),
      el('span', { className: 'basemap-label' }, label),
    );
    picker.appendChild(btn);
  }

  // "Layers" label — visible when stacked
  const layersLabel = el('span', { className: 'basemap-stack-label' }, 'Layers');
  picker.appendChild(layersLabel);

  // Hidden select for controls.ts compatibility
  const hiddenSelect = el('select', { id: 'basemap-select', style: 'display:none' },
    el('option', { value: 'osm' }, 'Map'),
    el('option', { value: 'satellite' }, 'Satellite'),
    el('option', { value: 'topo' }, 'Terrain'),
  );
  picker.appendChild(hiddenSelect);

  picker.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.basemap-option') as HTMLElement | null;
    const isStacked = picker.classList.contains('basemap--stacked');

    if (isStacked) {
      // Explode — show all tiles
      picker.classList.remove('basemap--stacked');
      return;
    }

    if (!btn) return;
    const key = btn.dataset.basemap;
    if (!key) return;

    // Select and collapse back to stack
    picker.querySelectorAll('.basemap-option').forEach(b => b.classList.remove('basemap-option--active'));
    btn.classList.add('basemap-option--active');

    const select = picker.querySelector<HTMLSelectElement>('#basemap-select')!;
    select.value = key;
    select.dispatchEvent(new Event('change'));

    picker.classList.add('basemap--stacked');
  });

  // Click outside = collapse
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target as Node)) {
      picker.classList.add('basemap--stacked');
    }
  });

  return picker;
}

/* ── public entry point ──────────────────────────────────────────────── */

export function createUI(): void {
  document.body.appendChild(buildIntroOverlay());
  document.body.appendChild(buildTitleBar());
  document.body.appendChild(buildSidebar());
  document.body.appendChild(buildInfoButton());
  document.body.appendChild(buildBasemapPicker());
  document.body.appendChild(buildAboutModal());
  document.body.appendChild(buildDetailsModal());

  // Wire up collapsible sidebar sections
  const defaultOpen = new Set(['param-section', 'legend', 'summary-section']);
  document.querySelectorAll<HTMLElement>('.sidebar-section > h4').forEach(h4 => {
    h4.style.cursor = 'pointer';
    h4.addEventListener('click', () => {
      h4.parentElement?.classList.toggle('section--collapsed');
    });
    // Default most sections to collapsed
    const parent = h4.parentElement;
    if (parent && !defaultOpen.has(parent.id)) {
      parent.classList.add('section--collapsed');
    }
  });
}
