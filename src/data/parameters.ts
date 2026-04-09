import type { ParameterMeta } from '../types';

/**
 * All measured parameters mapped from CSV columns to clean keys.
 * Ordered by importance: F, TDS, pH, As, Na first, then alphabetical.
 */
export const PARAMETERS: ParameterMeta[] = [
  // --- Priority parameters ---
  { key: 'F',     displayName: 'Fluoride (F)',                    unit: 'ppm', csvColumn: 'F (ppm)',         threshold: 1.5,    thresholdUnit: 'ppm', thresholdBody: 'KS',    category: 'anion'         },
  { key: 'TDS',   displayName: 'Total Dissolved Solids (TDS)',    unit: 'ppm', csvColumn: 'TDS (ppm)',       threshold: 1500,   thresholdUnit: 'ppm', thresholdBody: 'KS',    category: 'physical'      },
  { key: 'pH',    displayName: 'pH',                               unit: '',    csvColumn: 'pH',              threshold: 8.5,    thresholdUnit: null,  thresholdBody: 'KS',    category: 'physical'      },
  { key: 'As',    displayName: 'Arsenic (As)',                     unit: 'ppb', csvColumn: 'As (ppb)',        threshold: 10,     thresholdUnit: 'ppb', thresholdBody: 'WHO',   category: 'trace'         },
  { key: 'Na',    displayName: 'Sodium (Na)',                      unit: 'ppb', csvColumn: 'Na (ppb)',        threshold: 200000, thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'major'         },

  // --- Alphabetical: with thresholds ---
  { key: 'Al',    displayName: 'Aluminum (Al)',                    unit: 'ppb', csvColumn: 'Al (ppb)',        threshold: 100,    thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'trace'         },
  { key: 'B',     displayName: 'Boron (B)',                        unit: 'ppb', csvColumn: 'B (ppb)',         threshold: 2400,   thresholdUnit: 'ppb', thresholdBody: 'WHO',   category: 'trace'         },
  { key: 'Ba',    displayName: 'Barium (Ba)',                      unit: 'ppb', csvColumn: 'Ba (ppb)',        threshold: 1000,   thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'trace'         },
  { key: 'Ca',    displayName: 'Calcium (Ca)',                     unit: 'ppb', csvColumn: 'Ca (ppb)',        threshold: 250000, thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'major'         },
  { key: 'CaCO3', displayName: 'Total Hardness (CaCO\u2083)',     unit: 'ppm', csvColumn: 'CaCO3 (ppm)',     threshold: 500,    thresholdUnit: 'ppm', thresholdBody: 'KS',    category: 'physical'      },
  { key: 'Cd',    displayName: 'Cadmium (Cd)',                     unit: 'ppb', csvColumn: 'Cd (ppb)',        threshold: 3,      thresholdUnit: 'ppb', thresholdBody: 'WHO',   category: 'trace'         },
  { key: 'Cl',    displayName: 'Chloride (Cl)',                    unit: 'ppm', csvColumn: 'Cl (ppm)',        threshold: 250,    thresholdUnit: 'ppm', thresholdBody: 'KS',    category: 'anion'         },
  { key: 'Cr',    displayName: 'Chromium (Cr)',                    unit: 'ppb', csvColumn: 'Cr (ppb)',        threshold: 50,     thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'trace'         },
  { key: 'Cu',    displayName: 'Copper (Cu)',                      unit: 'ppb', csvColumn: 'Cu (ppb)',        threshold: 100,    thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'trace'         },
  { key: 'Fe',    displayName: 'Iron (Fe)',                        unit: 'ppb', csvColumn: 'Fe (ppb)',        threshold: 300,    thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'trace'         },
  { key: 'Mg',    displayName: 'Magnesium (Mg)',                   unit: 'ppb', csvColumn: 'Mg (ppb)',        threshold: 100000, thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'major'         },
  { key: 'Mn',    displayName: 'Manganese (Mn)',                   unit: 'ppb', csvColumn: 'Mn (ppb)',        threshold: 80,     thresholdUnit: 'ppb', thresholdBody: 'WHO',   category: 'trace'         },
  { key: 'NH4',   displayName: 'Ammonium (NH\u2084)',              unit: 'ppm', csvColumn: 'NH4 (ppm)',       threshold: 0.5,    thresholdUnit: 'ppm', thresholdBody: 'KS',    category: 'anion'         },
  { key: 'Ni',    displayName: 'Nickel (Ni)',                      unit: 'ppb', csvColumn: 'Ni (ppb)',        threshold: 70,     thresholdUnit: 'ppb', thresholdBody: 'WHO',   category: 'trace'         },
  { key: 'NO2',   displayName: 'Nitrite (NO\u2082)',               unit: 'ppm', csvColumn: 'NO2 (ppm)',       threshold: 3,      thresholdUnit: 'ppm', thresholdBody: 'WHO',   category: 'anion'         },
  { key: 'NO3',   displayName: 'Nitrate (NO\u2083)',               unit: 'ppm', csvColumn: 'NO3 (ppm)',       threshold: 10,     thresholdUnit: 'ppm', thresholdBody: 'KS',    category: 'anion'         },
  { key: 'NO3N',  displayName: 'Nitrate-Nitrogen (NO\u2083-N)',   unit: 'ppm', csvColumn: 'NO3N (ppm)',      threshold: 11,     thresholdUnit: 'ppm', thresholdBody: 'WHO',   category: 'anion'         },
  { key: 'P',     displayName: 'Phosphorus (P)',                   unit: 'ppb', csvColumn: 'P (ppb)',         threshold: 1000,   thresholdUnit: 'ppb', thresholdBody: 'Other', category: 'non-essential' },
  { key: 'Pb',    displayName: 'Lead (Pb)',                        unit: 'ppb', csvColumn: 'Pb (ppb)',        threshold: 10,     thresholdUnit: 'ppb', thresholdBody: 'WHO',   category: 'trace'         },
  { key: 'PO4',   displayName: 'Phosphate (PO\u2084)',             unit: 'ppm', csvColumn: 'PO4 (ppm)',       threshold: 1,      thresholdUnit: 'ppm', thresholdBody: 'Other', category: 'anion'         },
  { key: 'Se',    displayName: 'Selenium (Se)',                    unit: 'ppb', csvColumn: 'Se (ppb)',        threshold: 10,     thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'trace'         },
  { key: 'SO4',   displayName: 'Sulfate (SO\u2084)',               unit: 'ppm', csvColumn: 'SO4 (ppm)',       threshold: 400,    thresholdUnit: 'ppm', thresholdBody: 'KS',    category: 'anion'         },
  { key: 'U',     displayName: 'Uranium (U)',                      unit: 'ppb', csvColumn: 'U (ppb)',         threshold: 30,     thresholdUnit: 'ppb', thresholdBody: 'WHO',   category: 'trace'         },
  { key: 'Zn',    displayName: 'Zinc (Zn)',                        unit: 'ppb', csvColumn: 'Zn (ppb)',        threshold: 5000,   thresholdUnit: 'ppb', thresholdBody: 'KS',    category: 'trace'         },

  // --- No threshold (informational only — still selectable in the UI) ---
  { key: 'Atm Pressure', displayName: 'Atmospheric Pressure',     unit: 'mmHg',  csvColumn: 'Atm Pressure',   threshold: null, thresholdUnit: null, thresholdBody: null, category: 'physical' },
  { key: 'Be',    displayName: 'Beryllium (Be)',                   unit: 'ppb',   csvColumn: 'Be (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Bi',    displayName: 'Bismuth (Bi)',                     unit: 'ppb',   csvColumn: 'Bi (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Co',    displayName: 'Cobalt (Co)',                      unit: 'ppb',   csvColumn: 'Co (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Cond',  displayName: 'Conductivity',                     unit: 'µS/cm', csvColumn: 'Cond (uS/cm)',   threshold: null, thresholdUnit: null, thresholdBody: null, category: 'physical' },
  { key: 'Cs',    displayName: 'Cesium (Cs)',                      unit: 'ppb',   csvColumn: 'Cs (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'HCO3',  displayName: 'Bicarbonate (HCO\u2083)',          unit: 'ppm',   csvColumn: 'HCO3 (ppm)',     threshold: null, thresholdUnit: null, thresholdBody: null, category: 'anion'    },
  { key: 'K',     displayName: 'Potassium (K)',                    unit: 'ppb',   csvColumn: 'K (ppb)',        threshold: null, thresholdUnit: null, thresholdBody: null, category: 'major'    },
  { key: 'Li',    displayName: 'Lithium (Li)',                     unit: 'ppb',   csvColumn: 'Li (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Mo',    displayName: 'Molybdenum (Mo)',                  unit: 'ppb',   csvColumn: 'Mo (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Rb',    displayName: 'Rubidium (Rb)',                    unit: 'ppb',   csvColumn: 'Rb (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Re',    displayName: 'Rhenium (Re)',                     unit: 'ppb',   csvColumn: 'Re (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'S',     displayName: 'Sulfur (S)',                       unit: 'ppm',   csvColumn: 'S (ppm)',        threshold: null, thresholdUnit: null, thresholdBody: null, category: 'major'    },
  { key: 'Sc',    displayName: 'Scandium (Sc)',                    unit: 'ppb',   csvColumn: 'Sc (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Si',    displayName: 'Silicon (Si)',                     unit: 'ppm',   csvColumn: 'Si (ppm)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'SiO2',  displayName: 'Silica (SiO\u2082)',               unit: 'ppm',   csvColumn: 'SiO2 (ppm)',     threshold: null, thresholdUnit: null, thresholdBody: null, category: 'physical' },
  { key: 'SPC',   displayName: 'Specific Conductance',             unit: 'µS/cm', csvColumn: 'SPC (uS/cm)',    threshold: null, thresholdUnit: null, thresholdBody: null, category: 'physical' },
  { key: 'Sr',    displayName: 'Strontium (Sr)',                   unit: 'ppb',   csvColumn: 'Sr (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Temp',  displayName: 'Temperature',                      unit: '°C',    csvColumn: 'Temp',           threshold: null, thresholdUnit: null, thresholdBody: null, category: 'physical' },
  { key: 'Th',    displayName: 'Thorium (Th)',                     unit: 'ppb',   csvColumn: 'Th (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Tl',    displayName: 'Thallium (Tl)',                    unit: 'ppb',   csvColumn: 'Tl (ppb)',       threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'V',     displayName: 'Vanadium (V)',                     unit: 'ppb',   csvColumn: 'V (ppb)',        threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
  { key: 'Y',     displayName: 'Yttrium (Y)',                      unit: 'ppb',   csvColumn: 'Y (ppb)',        threshold: null, thresholdUnit: null, thresholdBody: null, category: 'trace'    },
];

/**
 * Parameters shown in the UI dropdown for visualization on the map.
 * Includes all measured parameters; those without a threshold are colored
 * by relative magnitude (data-driven percentiles) instead of by ratio.
 */
export const SELECTABLE_PARAMETERS: ParameterMeta[] = PARAMETERS;
