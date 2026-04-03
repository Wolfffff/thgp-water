import maplibregl, { type Map } from 'maplibre-gl';

const STORAGE_KEY = 'thgp-walkthrough-seen';

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
    text: 'This interactive map shows water chemistry data from 152 sampling sites across Turkana County, Kenya. Click through to learn how to use it.',
    action: (map, setParam) => {
      setParam?.('EXCEED');
      map.flyTo({ center: [35.5, 3.5], zoom: 7, duration: 2000 });
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
    text: 'Fluoride is the most pervasive contaminant — nearly half of all boreholes exceed the 1.5 ppm threshold. Here, Nadwat Main BH measures 12.8 ppm, over 8 times the safe limit.',
    action: (map, setParam) => {
      setParam?.('F');
      // Zoom to Nadwat Main BH (12.8 ppm F, 8.5x threshold)
      map.flyTo({ center: [35.15, 3.56], zoom: 12, duration: 1800 });
      // After fly settles, open a popup on the worst site to highlight it
      setTimeout(() => {
        const popup = new maplibregl.Popup({ maxWidth: '240px', closeOnClick: true })
          .setLngLat([35.14829, 3.55873])
          .setHTML(`<div style="padding:8px;font-family:var(--sans);color:var(--text)">
            <strong style="color:#fff">Nadwat Main BH</strong><br>
            <span style="color:var(--orange);font-size:1.1rem;font-weight:600">12.8 ppm F</span><br>
            <span style="color:var(--muted);font-size:0.75rem">8.5× WHO/KS threshold</span>
          </div>`)
          .addTo(map);
        // Auto-close after 5s
        setTimeout(() => popup.remove(), 5000);
      }, 2000);
    },
    btnText: 'Next',
  },
  {
    title: 'Choose a Parameter',
    text: 'Use the sidebar to switch between 29 water quality parameters, or view the Alerts mode showing how many thresholds each site exceeds.',
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
    },
    btnText: 'Next',
  },
  {
    title: 'Explore the Data',
    text: 'Click any site to see its full chemistry profile. Use Export Data to download as CSV. Switch basemaps for satellite or terrain views.',
    action: (map, setParam) => {
      setParam?.('EXCEED');
      map.flyTo({ center: [35.5, 3.5], zoom: 7, duration: 2000, essential: true });
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

    // Run action first (may open sidebar, change params, etc.)
    if (step.action) step.action(map, _setParam);

    const prevHadHighlight = highlight.style.opacity === '1';
    const isMobile = window.innerWidth <= 640;

    if (step.highlight) {
      // On mobile: open the drawer for sidebar-targeted steps
      if (isMobile) {
        const sidebar = document.querySelector('#sidebar');
        sidebar?.classList.remove('sidebar--collapsed');
        // Scroll the target into view inside the drawer
        setTimeout(() => {
          const target = $(step.highlight!);
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);
      }

      backdrop.style.opacity = '0';
      if (!prevHadHighlight) highlight.style.opacity = '0';

      // Wait for drawer/sidebar animation then position highlight
      setTimeout(() => {
        const target = $(step.highlight!);
        if (target) {
          const rect = target.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            highlight.style.top = `${rect.top - 6}px`;
            highlight.style.left = `${rect.left - 6}px`;
            highlight.style.width = `${rect.width + 12}px`;
            highlight.style.height = `${rect.height + 12}px`;
            highlight.style.opacity = '1';
          }
        }
      }, prevHadHighlight ? 100 : 500);
    } else {
      // No highlight — map is the focus, close drawer on mobile
      if (isMobile) {
        document.querySelector('#sidebar')?.classList.add('sidebar--collapsed');
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
    card.classList.add('tour-card--exit');
    backdrop.style.opacity = '0';
    highlight.style.opacity = '0';
    setTimeout(() => {
      card.remove();
      backdrop.remove();
      highlight.remove();
    }, 300);
    document.removeEventListener('keydown', onKey);
    localStorage.setItem(STORAGE_KEY, 'true');
  }

  // Entrance
  requestAnimationFrame(() => showStep(0));
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
  const seen = localStorage.getItem(STORAGE_KEY) === 'true';

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
    tourBtn.addEventListener('click', () => runTour(map));
  }
}

export function resetWalkthrough(): void {
  localStorage.removeItem(STORAGE_KEY);
}
