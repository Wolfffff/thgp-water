import maplibregl, { type Map } from 'maplibre-gl';
import { buildIntroOverlay } from './dom';

const STORAGE_KEY = 'thgp-walkthrough-seen';

function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* private browsing */ }
}
function storageRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* private browsing */ }
}

interface TourStep {
  title: string;
  text: string;
  action?: (map: Map, setParam?: (key: string) => void) => void;
  highlight?: string;
  btnText: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Turkana Water Quality',
    text: 'This interactive map shows water chemistry data from 153 sampling sites across Turkana County, Kenya. Click through to learn how to use it.',
    action: (map, setParam) => {
      setParam?.('EXCEED');
      map.flyTo({ center: [35.5, 3.5], zoom: 6.4, duration: 2000 });
    },
    btnText: 'Next',
  },
  {
    title: 'Water Sampling Sites',
    text: 'Each dot is a water source — boreholes, wells, and springs. Colors show how many WHO/Kenya thresholds each site exceeds. Blue is safe. Red has many violations.',
    action: (map, setParam) => {
      setParam?.('EXCEED');
      map.flyTo({ center: [35.5, 2.6], zoom: 9, duration: 1500 });
    },
    btnText: 'Next',
  },
  {
    title: 'Fluoride Contamination',
    text: 'Fluoride is the most pervasive contaminant — up to 40% of boreholes exceed the 1.5 ppm threshold. Here, Nadwat Main BH measures 12.8 ppm, over 8 times the safe limit.',
    action: (map, setParam) => {
      setParam?.('F');
      // Zoom to Nadwat Main BH (12.8 ppm F, 8.5x threshold)
      map.flyTo({ center: [35.15, 3.56], zoom: 12, duration: 1800 });
      // After fly settles, open a popup on the worst site to highlight it
      setTimeout(() => {
        // Only show if still on this step (user hasn't advanced)
        if (!document.querySelector('.tour-card')) return;
        new maplibregl.Popup({ maxWidth: '240px', closeOnClick: true, closeButton: false })
          .setLngLat([35.14829, 3.55873])
          .setHTML(`<div style="padding:8px;font-family:var(--sans);color:var(--text)">
            <strong style="color:#fff">Nadwat Main BH</strong><br>
            <span style="color:var(--orange);font-size:1.1rem;font-weight:600">12.8 ppm F</span><br>
            <span style="color:var(--muted);font-size:0.75rem">8.5× WHO/KS threshold</span>
          </div>`)
          .addTo(map);
      }, 2200);
    },
    btnText: 'Next',
  },
  {
    title: 'Choose a Parameter',
    text: 'Use the sidebar to switch between 48 physical-chemical parameters, or view the Alerts mode showing how many thresholds each site exceeds.',
    highlight: '#param-section',
    action: () => {
      document.querySelector('#sidebar')?.classList.remove('sidebar--collapsed');
      document.querySelector('#param-section')?.classList.remove('section--collapsed');
    },
    btnText: 'Next',
  },
  {
    title: 'Color by Source Type',
    text: 'Toggle between coloring by parameter threshold or by source type. Deep boreholes, shallow boreholes, open wells, and springs each have distinct contamination profiles.',
    highlight: '#sidebar .color-mode-toggle',
    action: () => {
      document.querySelector('#sidebar')?.classList.remove('sidebar--collapsed');
      // The Color By section is collapsed by default — expand it so the toggle is visible
      const colorSection = document.querySelector('#sidebar .color-mode-toggle')?.closest('.sidebar-section');
      colorSection?.classList.remove('section--collapsed');
    },
    btnText: 'Next',
  },
  {
    title: 'Explore the Data',
    text: 'Click any site to see its full chemistry profile. Use Export Data to download as CSV. Switch basemaps for satellite or terrain views.',
    action: (map, setParam) => {
      setParam?.('EXCEED');
      map.flyTo({ center: [35.5, 3.5], zoom: 6.4, duration: 2000, essential: true });
    },
    btnText: 'Start Exploring',
  },
];

function $(sel: string): HTMLElement | null {
  return document.querySelector(sel);
}

let _setParam: ((key: string) => void) | undefined;

function runTour(map: Map): void {
  if (document.querySelector('.tour-backdrop')) return;

  let currentStep = 0;

  // Backdrop — starts hidden, only shows when highlighting UI elements
  const backdrop = document.createElement('div');
  backdrop.className = 'tour-backdrop';
  backdrop.style.opacity = '0';
  document.body.appendChild(backdrop);

  // Highlight
  const highlight = document.createElement('div');
  highlight.className = 'tour-highlight';
  highlight.style.opacity = '0';
  document.body.appendChild(highlight);

  // Card — always bottom-center, never moves position
  const card = document.createElement('div');
  card.className = 'tour-card';
  card.innerHTML = `
    <div class="tour-progress-bar"><div class="tour-progress-fill"></div></div>
    <div class="tour-body">
      <h3 class="tour-title"></h3>
      <p class="tour-text"></p>
    </div>
    <div class="tour-footer">
      <button class="tour-skip">Skip</button>
      <div class="tour-footer-right">
        <span class="tour-counter"></span>
        <button class="tour-next">Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(card);

  const titleEl = card.querySelector<HTMLElement>('.tour-title')!;
  const textEl = card.querySelector<HTMLElement>('.tour-text')!;
  const nextBtn = card.querySelector<HTMLButtonElement>('.tour-next')!;
  const skipBtn = card.querySelector<HTMLButtonElement>('.tour-skip')!;
  const counterEl = card.querySelector<HTMLElement>('.tour-counter')!;
  const progressFill = card.querySelector<HTMLElement>('.tour-progress-fill')!;
  const bodyEl = card.querySelector<HTMLElement>('.tour-body')!;

  function showStep(index: number): void {
    const step = TOUR_STEPS[index];
    if (!step) return;

    // Cancel any in-flight map animation from a previous step
    map.stop();
    // Close any lingering popups from previous steps
    document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());

    // Fade out body, swap content, fade in
    bodyEl.style.opacity = '0';
    setTimeout(() => {
      titleEl.textContent = step.title;
      textEl.textContent = step.text;
      nextBtn.textContent = step.btnText;
      counterEl.textContent = `${index + 1} of ${TOUR_STEPS.length}`;
      progressFill.style.width = `${((index + 1) / TOUR_STEPS.length) * 100}%`;
      bodyEl.style.opacity = '1';
    }, 150);

    const prevHadHighlight = highlight.style.opacity === '1';
    const isMobile = window.innerWidth <= 640;

    // Pre-apply slower easing BEFORE the action runs, since some actions
    // toggle the drawer themselves and would otherwise use the default speed.
    const sidebarEl = document.querySelector<HTMLElement>('#sidebar');
    const wasCollapsed = sidebarEl?.classList.contains('sidebar--collapsed') ?? false;
    if (sidebarEl && (step.highlight || !isMobile)) {
      sidebarEl.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
    }

    // Run action (may open sidebar, change params, etc.)
    if (step.action) step.action(map, _setParam);

    if (step.highlight) {
      // Make sure the sidebar is open and any collapsed ancestor sections are expanded
      const sidebar = sidebarEl;
      sidebar?.classList.remove('sidebar--collapsed');
      const target = $(step.highlight);
      let ancestor = target?.parentElement;
      while (ancestor) {
        if (ancestor.classList.contains('section--collapsed')) {
          ancestor.classList.remove('section--collapsed');
        }
        ancestor = ancestor.parentElement;
      }

      backdrop.style.opacity = '0';

      // Wait for sidebar to finish opening + sections to expand before measuring.
      // Longer wait when sidebar was closed (need ~250ms transform animation).
      const wait = prevHadHighlight ? 60 : (wasCollapsed ? 620 : 200);

      const positionHighlight = () => {
        const t = $(step.highlight!);
        if (!t) return;
        if (isMobile) {
          t.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
        requestAnimationFrame(() => {
          const rect = t.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;

          if (!prevHadHighlight) {
            // First appearance: place instantly, then fade in
            highlight.style.transition = 'none';
            highlight.style.top = `${rect.top - 6}px`;
            highlight.style.left = `${rect.left - 6}px`;
            highlight.style.width = `${rect.width + 12}px`;
            highlight.style.height = `${rect.height + 12}px`;
            // Force reflow, then re-enable transitions and fade in
            void highlight.offsetHeight;
            highlight.style.transition = '';
            highlight.style.opacity = '1';
          } else {
            // Already visible: smoothly slide/resize to the new target
            highlight.style.top = `${rect.top - 6}px`;
            highlight.style.left = `${rect.left - 6}px`;
            highlight.style.width = `${rect.width + 12}px`;
            highlight.style.height = `${rect.height + 12}px`;
          }
        });
      };

      setTimeout(positionHighlight, wait);
    } else {
      // No highlight — map is the focus, close drawer on mobile
      const sidebar = document.querySelector<HTMLElement>('#sidebar');
      if (isMobile && sidebar && !sidebar.classList.contains('sidebar--collapsed')) {
        sidebar.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
        sidebar.classList.add('sidebar--collapsed');
      }
      highlight.style.opacity = '0';
      backdrop.style.opacity = '0';
    }
  }

  nextBtn.addEventListener('click', () => {
    currentStep++;
    if (currentStep >= TOUR_STEPS.length) {
      cleanup();
    } else {
      showStep(currentStep);
    }
  });

  skipBtn.addEventListener('click', cleanup);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cleanup();
  };
  document.addEventListener('keydown', onKey);

  function cleanup(): void {
    map.stop();
    document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
    card.classList.add('tour-card--exit');
    backdrop.style.opacity = '0';
    highlight.style.opacity = '0';
    setTimeout(() => {
      card.remove();
      backdrop.remove();
      highlight.remove();
    }, 300);
    document.removeEventListener('keydown', onKey);
    storageSet(STORAGE_KEY, 'true');

    // Clear any inline styles the tour set on the sidebar
    const sidebar = document.querySelector<HTMLElement>('#sidebar');
    if (sidebar) {
      sidebar.style.maxHeight = '';
      sidebar.style.transform = '';
      sidebar.style.transition = '';
    }
  }

  // Entrance
  requestAnimationFrame(() => showStep(0));
}

function showIntroThenTour(map: Map): void {
  // Remove any existing intro overlay or tour elements
  $('#intro-overlay')?.remove();
  document.querySelector('.tour-card')?.remove();
  document.querySelector('.tour-backdrop')?.remove();
  document.querySelector('.tour-highlight')?.remove();

  // Collapse the mobile drawer behind the intro overlay so the map is
  // already clear when the intro fades out and the tour begins.
  if (window.innerWidth <= 640) {
    const sidebar = document.querySelector<HTMLElement>('#sidebar');
    if (sidebar && !sidebar.classList.contains('sidebar--collapsed')) {
      sidebar.style.transition = 'none';
      sidebar.classList.add('sidebar--collapsed');
      // Force reflow then re-enable transitions
      void sidebar.offsetHeight;
      sidebar.style.transition = '';
    }
  }

  // Re-create and insert the intro overlay
  const overlay = buildIntroOverlay();
  document.body.appendChild(overlay);
  document.body.classList.add('intro-active');

  const enterBtn = overlay.querySelector('#intro-enter');
  if (enterBtn) {
    enterBtn.addEventListener('click', () => dismissIntro(map));
  }
}

function dismissIntro(map: Map): void {
  const overlay = $('#intro-overlay');
  if (!overlay) return;
  overlay.classList.add('intro-exit');
  document.body.classList.remove('intro-active');
  setTimeout(() => {
    overlay.remove();
    runTour(map);
  }, 550);
}

export function initIntroAndWalkthrough(map: Map, setParam?: (key: string) => void): void {
  _setParam = setParam;
  const seen = storageGet(STORAGE_KEY) === 'true';

  if (seen) {
    const overlay = $('#intro-overlay');
    if (overlay) overlay.remove();
  } else {
    document.body.classList.add('intro-active');
    const enterBtn = $('#intro-enter');
    if (enterBtn) {
      enterBtn.addEventListener('click', () => dismissIntro(map));
    }
  }

  const tourBtn = $('#tour-btn');
  if (tourBtn) {
    tourBtn.addEventListener('click', () => showIntroThenTour(map));
  }
}

export function resetWalkthrough(): void {
  storageRemove(STORAGE_KEY);
}
