// Canonical English -> Persian city name mapping for Iranian cities.
// Database stores the canonical English key; UI displays Persian via getPersianCityName().

// Metro area aliases: map suburban/nearby cities to their main metro city.
// IP geolocation often returns different nearby cities for the same area
// (e.g. Langley vs Vancouver), so we normalize them to one canonical name.
const METRO_ALIASES: Record<string, string> = {
  // Greater Tehran
  'karaj': 'karaj', // keep as separate — large enough
  'varamin': 'tehran',
  'pakdasht': 'tehran',
  'islamshahr': 'tehran',
  'shahriar': 'tehran',
  'pardis': 'tehran',
  'robat karim': 'tehran',
  'eslamshahr': 'tehran',
  'shahr-e qods': 'tehran',
  // Greater Isfahan
  'najafabad': 'isfahan',
  'khomeyni shahr': 'isfahan',
  'shahin shahr': 'isfahan',
  // Greater Mashhad
  'torghabeh': 'mashhad',
  'shandiz': 'mashhad',
  // Greater Vancouver (for diaspora / testing)
  'langley': 'vancouver',
  'surrey': 'vancouver',
  'burnaby': 'vancouver',
  'richmond': 'vancouver',
  'coquitlam': 'vancouver',
  'port coquitlam': 'vancouver',
  'port moody': 'vancouver',
  'new westminster': 'vancouver',
  'north vancouver': 'vancouver',
  'west vancouver': 'vancouver',
  'delta': 'vancouver',
  'white rock': 'vancouver',
  'maple ridge': 'vancouver',
  'pitt meadows': 'vancouver',
  // Greater Toronto
  'mississauga': 'toronto',
  'brampton': 'toronto',
  'markham': 'toronto',
  'vaughan': 'toronto',
  'richmond hill': 'toronto',
  'scarborough': 'toronto',
  'north york': 'toronto',
  'etobicoke': 'toronto',
  'oakville': 'toronto',
  'pickering': 'toronto',
  'ajax': 'toronto',
  // Greater Los Angeles
  'glendale': 'los angeles',
  'burbank': 'los angeles',
  'santa monica': 'los angeles',
  'pasadena': 'los angeles',
  'inglewood': 'los angeles',
  'torrance': 'los angeles',
  'irvine': 'los angeles',
  'anaheim': 'los angeles',
  // Greater London
  'croydon': 'london',
  'barnet': 'london',
  'ealing': 'london',
  'hounslow': 'london',
  'enfield': 'london',
  'bromley': 'london',
  // Greater Berlin
  'potsdam': 'berlin',
  'spandau': 'berlin',
  // Greater Stockholm
  'solna': 'stockholm',
  'sundbyberg': 'stockholm',
  'huddinge': 'stockholm',
};

const CITY_MAP: Record<string, string> = {
  'tehran': 'تهران',
  'isfahan': 'اصفهان',
  'esfahan': 'اصفهان',
  'shiraz': 'شیراز',
  'tabriz': 'تبریز',
  'mashhad': 'مشهد',
  'mashad': 'مشهد',
  'karaj': 'کرج',
  'ahvaz': 'اهواز',
  'ahwaz': 'اهواز',
  'qom': 'قم',
  'kermanshah': 'کرمانشاه',
  'rasht': 'رشت',
  'zahedan': 'زاهدان',
  'hamadan': 'همدان',
  'hamedan': 'همدان',
  'arak': 'اراک',
  'yazd': 'یزد',
  'ardabil': 'اردبیل',
  'bandar abbas': 'بندرعباس',
  'bandar-e abbas': 'بندرعباس',
  'zanjan': 'زنجان',
  'sanandaj': 'سنندج',
  'gorgan': 'گرگان',
  'sari': 'ساری',
  'kerman': 'کرمان',
  'birjand': 'بیرجند',
  'ilam': 'ایلام',
  'bojnurd': 'بجنورد',
  'bushehr': 'بوشهر',
  'khorramabad': 'خرم‌آباد',
  'semnan': 'سمنان',
  'yasuj': 'یاسوج',
  'shahrekord': 'شهرکرد',
  'urmia': 'ارومیه',
  'orumiyeh': 'ارومیه',
  'qazvin': 'قزوین',
  'dezful': 'دزفول',
  'babol': 'بابل',
  'amol': 'آمل',
  'sabzevar': 'سبزوار',
  'neyshabur': 'نیشابور',
  'nishapur': 'نیشابور',
  'kashan': 'کاشان',
  'khoy': 'خوی',
  'malayer': 'ملایر',
  'varamin': 'ورامین',
  'pakdasht': 'پاکدشت',
  'islamshahr': 'اسلامشهر',
  'shahriar': 'شهریار',
};

// Reverse map: Persian name -> canonical English key
const PERSIAN_TO_KEY: Record<string, string> = {};
for (const [key, persian] of Object.entries(CITY_MAP)) {
  if (!PERSIAN_TO_KEY[persian]) {
    PERSIAN_TO_KEY[persian] = key;
  }
}

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/['-]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Normalize a city name from the geocoder into a canonical database key.
 * Handles both English and Persian input.
 */
export function normalizeCityFromGeocode(rawCity: string): string {
  const trimmed = rawCity.trim();
  // If it's a known Persian name, return the English key
  const asKey = PERSIAN_TO_KEY[trimmed];
  if (asKey) {
    // Check if this key maps to a metro area
    return METRO_ALIASES[asKey] || asKey;
  }
  // Normalize as English, then check metro aliases
  const normalized = normalize(trimmed);
  return METRO_ALIASES[normalized] || normalized;
}

/**
 * Get the Persian display name for a canonical city key.
 * Falls back to the raw key if not in the mapping.
 */
export function getPersianCityName(cityKey: string): string {
  return CITY_MAP[normalize(cityKey)] || cityKey;
}

/**
 * Get the display name for a city based on current language.
 * Returns Persian name for fa, capitalized English key for en.
 */
export function getCityDisplayName(cityKey: string): string {
  try {
    const i18n = require('./i18n').default;
    if (i18n.language === 'en') {
      const normalized = normalize(cityKey);
      // Capitalize first letter of each word
      return normalized
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  } catch {}
  return getPersianCityName(cityKey);
}
