
export const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
    'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
    'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
];

// Normalized mapping for cities and country names to ISO codes
const GEO_MAPPING: Record<string, string> = {
    // Cities
    'paris': 'FR',
    'lyon': 'FR',
    'marseille': 'FR',
    'bordeaux': 'FR',
    'new york': 'US',
    'ny': 'US',
    'los angeles': 'US',
    'la': 'US',
    'chicago': 'US',
    'london': 'GB',
    'londres': 'GB',
    'manchester': 'GB',
    'berlin': 'DE',
    'munich': 'DE',
    'madrid': 'ES',
    'barcelona': 'ES',
    'rome': 'IT',
    'roma': 'IT',
    'milan': 'IT',
    'tokyo': 'JP',
    'kyoto': 'JP',
    'beijing': 'CN',
    'shanghai': 'CN',
    'hong kong': 'CN',
    'geneva': 'CH',
    'geneve': 'CH',
    'zurich': 'CH',
    'brussels': 'BE',
    'bruxelles': 'BE',
    'amsterdam': 'NL',
    'bourg-en-bresse': 'FR',
    'bourg en bresse': 'FR',
    'moulins': 'FR',
    'anvers': 'BE',
    'antwerp': 'BE',
    'kallo': 'BE',
    'autun': 'FR',
    'autry-issards': 'FR',
    'autry issards': 'FR',

    // Country names
    'france': 'FR',
    'usa': 'US',
    'united states': 'US',
    'etats-unis': 'US',
    'états-unis': 'US',
    'united kingdom': 'GB',
    'uk': 'GB',
    'royaume-uni': 'GB',
    'germany': 'DE',
    'allemagne': 'DE',
    'spain': 'ES',
    'espagne': 'ES',
    'italy': 'IT',
    'italie': 'IT',
    'japan': 'JP',
    'japon': 'JP',
    'china': 'CN',
    'chine': 'CN',
    'switzerland': 'CH',
    'suisse': 'CH',
    'belgium': 'BE',
    'belgique': 'BE',
    'netherlands': 'NL',
    'pays-bas': 'NL'
};

export const COUNTRY_NAMES: Record<string, string> = {
    'FR': 'France',
    'US': 'USA',
    'GB': 'UK',
    'DE': 'Allemagne',
    'ES': 'Espagne',
    'IT': 'Italie',
    'JP': 'Japon',
    'CN': 'Chine',
    'CH': 'Suisse',
    'BE': 'Belgique',
    'NL': 'Pays-Bas'
};

/**
 * Returns the normalized ISO Country Code for a given city and/or country string
 */
export function getCountryCode(city: string, country: string): string {
    const cityClean = (city || "").toLowerCase().trim();
    const countryClean = (country || "").toLowerCase().trim();

    if (GEO_MAPPING[cityClean]) return GEO_MAPPING[cityClean];
    if (GEO_MAPPING[countryClean]) return GEO_MAPPING[countryClean];

    // Generic regex for 2-letter codes
    if (countryClean.length === 2 && /^[a-z]{2}$/.test(countryClean)) {
        return countryClean.toUpperCase();
    }

    if (countryClean.includes('korea') || countryClean.includes('corée') || countryClean.includes('kr')) return 'KR';
    if (countryClean.includes('emirates') || countryClean.includes('uae') || countryClean.includes('émirats')) return 'AE';
    if (countryClean.includes('qatar')) return 'QA';
    if (countryClean.includes('saudi') || countryClean.includes('arabie')) return 'SA';

    return 'FR'; // Default to France
}

/**
 * Returns geographical enrichment for grouping
 */
export function getGeoEnrichedData(city: string, country: string) {
    const code = getCountryCode(city, country);
    const name = COUNTRY_NAMES[code] || country || 'France';
    const isEU = EU_COUNTRIES.includes(code);

    // Sub-region for large countries
    let subRegion = null;
    if (code === 'US') {
        const cityLower = city.toLowerCase();
        if (cityLower.includes('new york') || cityLower.includes('boston') || cityLower.includes('philadelphia') || cityLower.includes('ny')) {
            subRegion = 'East Coast';
        } else if (cityLower.includes('los angeles') || cityLower.includes('san francisco') || cityLower.includes('seattle') || cityLower.includes('la') || cityLower.includes('sf')) {
            subRegion = 'West Coast';
        }
    }

    return {
        countryCode: code,
        countryName: name,
        isEU,
        subRegion
    };
}

export function isCityName(name: string): boolean {
    const clean = name.toLowerCase().trim();
    return !!GEO_MAPPING[clean] || Object.keys(GEO_MAPPING).includes(clean);
}
