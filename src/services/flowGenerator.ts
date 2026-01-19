import { Artwork, LogisticsFlow } from "../types";
import { generateId } from "../lib/generateId";

/**
 * Smart Geo-Clustering Service
 * Transforms a list of artworks into coherent logistics flows
 * Based on country grouping and transport mode determination
 */

interface GeoData {
    countryCode: string;
    countryName: string;
    isEU: boolean;
}

/**
 * Step A: Normalization & Geocoding
 * Maps city names to country codes
 */
function getGeoEnrichedData(city: string, country: string): GeoData {
    // Normalize country input
    const normalizedCountry = country.toLowerCase().trim();

    // Direct country code mapping
    const countryMap: Record<string, { code: string; name: string; isEU: boolean }> = {
        'france': { code: 'FR', name: 'France', isEU: true },
        'usa': { code: 'US', name: 'USA', isEU: false },
        'united states': { code: 'US', name: 'USA', isEU: false },
        'uk': { code: 'GB', name: 'Royaume-Uni', isEU: false },
        'united kingdom': { code: 'GB', name: 'Royaume-Uni', isEU: false },
        'royaume-uni': { code: 'GB', name: 'Royaume-Uni', isEU: false },
        'germany': { code: 'DE', name: 'Allemagne', isEU: true },
        'allemagne': { code: 'DE', name: 'Allemagne', isEU: true },
        'italy': { code: 'IT', name: 'Italie', isEU: true },
        'italie': { code: 'IT', name: 'Italie', isEU: true },
        'spain': { code: 'ES', name: 'Espagne', isEU: true },
        'espagne': { code: 'ES', name: 'Espagne', isEU: true },
        'netherlands': { code: 'NL', name: 'Pays-Bas', isEU: true },
        'pays-bas': { code: 'NL', name: 'Pays-Bas', isEU: true },
        'belgium': { code: 'BE', name: 'Belgique', isEU: true },
        'belgique': { code: 'BE', name: 'Belgique', isEU: true },
        'switzerland': { code: 'CH', name: 'Suisse', isEU: false },
        'suisse': { code: 'CH', name: 'Suisse', isEU: false },
        'japan': { code: 'JP', name: 'Japon', isEU: false },
        'japon': { code: 'JP', name: 'Japon', isEU: false },
        'china': { code: 'CN', name: 'Chine', isEU: false },
        'chine': { code: 'CN', name: 'Chine', isEU: false },
    };

    // City-based fallback for common cases
    const cityMap: Record<string, string> = {
        'paris': 'FR',
        'lyon': 'FR',
        'marseille': 'FR',
        'new york': 'US',
        'los angeles': 'US',
        'chicago': 'US',
        'london': 'GB',
        'londres': 'GB',
        'berlin': 'DE',
        'munich': 'DE',
        'rome': 'IT',
        'milan': 'IT',
        'madrid': 'ES',
        'barcelona': 'ES',
        'amsterdam': 'NL',
        'brussels': 'BE',
        'bruxelles': 'BE',
        'geneva': 'CH',
        'genève': 'CH',
        'tokyo': 'JP',
        'beijing': 'CN',
        'shanghai': 'CN',
    };

    // Try country first
    const countryData = countryMap[normalizedCountry];
    if (countryData) {
        console.log(`🌍 Geocoding: "${country}" → ${countryData.code} (${countryData.name})`);
        return {
            countryCode: countryData.code,
            countryName: countryData.name,
            isEU: countryData.isEU
        };
    }

    // Fallback to city
    const normalizedCity = city.toLowerCase().trim();
    const cityCode = cityMap[normalizedCity];
    if (cityCode) {
        const foundCountry = Object.values(countryMap).find(c => c.code === cityCode);
        if (foundCountry) {
            console.log(`🌍 Geocoding: "${city}" → ${foundCountry.code} (${foundCountry.name})`);
            return {
                countryCode: foundCountry.code,
                countryName: foundCountry.name,
                isEU: foundCountry.isEU
            };
        }
    }

    // Check if country contains a known country name
    for (const [key, data] of Object.entries(countryMap)) {
        if (normalizedCountry.includes(key) || key.includes(normalizedCountry)) {
            console.log(`🌍 Geocoding (partial match): "${country}" → ${data.code} (${data.name})`);
            return {
                countryCode: data.code,
                countryName: data.name,
                isEU: data.isEU
            };
        }
    }

    // Default fallback
    console.warn(`⚠️ Geocoding failed for city="${city}", country="${country}" → defaulting to FR`);
    return {
        countryCode: 'FR',
        countryName: 'France',
        isEU: true
    };
}

/**
 * Step C: Determine flow type based on origin and destination
 */
function determineFlowType(originCountryCode: string, destinationCountryCode: string, isEU: boolean): string {
    // Same country = domestic road
    if (originCountryCode === destinationCountryCode) {
        return 'FRANCE_ROAD';
    }

    // EU country (excluding GB due to Brexit) = EU road
    if (isEU && originCountryCode !== 'GB') {
        return 'EU_ROAD';
    }

    // Everything else = international air
    return 'INTL_AIR';
}

/**
 * Main function: Generate flows from artworks
 * Implements Steps A, B, C, and D
 */
export function generateFlowsFromArtworks(
    projectId: string,
    artworks: Artwork[],
    organizingMuseum: string = "Paris"
): { flows: LogisticsFlow[]; artworksWithFlowIds: Artwork[] } {

    // Determine organizer country
    const organizerGeo = getGeoEnrichedData("", organizingMuseum);
    const organizerCountryCode = organizerGeo.countryCode;

    // Step B: Group artworks by country code
    const countryGroups = new Map<string, Artwork[]>();

    artworks.forEach(artwork => {
        const geo = getGeoEnrichedData(artwork.lender_city, artwork.lender_country);
        const countryCode = geo.countryCode;

        if (!countryGroups.has(countryCode)) {
            countryGroups.set(countryCode, []);
        }
        countryGroups.get(countryCode)!.push(artwork);
    });

    const flows: LogisticsFlow[] = [];
    const artworksWithFlowIds: Artwork[] = [];

    // Step C & D: Create flows and assign artworks
    countryGroups.forEach((groupArtworks, countryCode) => {
        const flowId = generateId();
        const firstArtwork = groupArtworks[0];
        const geo = getGeoEnrichedData(firstArtwork.lender_city, firstArtwork.lender_country);

        // Determine flow type
        const flowType = determineFlowType(countryCode, organizerCountryCode, geo.isEU);

        // Determine origin city
        const originCity = groupArtworks.length > 1
            ? "Plusieurs villes"
            : firstArtwork.lender_city;

        // Determine destination city (default based on organizer country)
        const destinationCity = organizerCountryCode === 'US' ? 'New York' :
            organizerCountryCode === 'GB' ? 'London' :
                'Paris';

        // Create flow with proper naming
        const flow: LogisticsFlow = {
            id: flowId,
            project_id: projectId,
            origin_country: geo.countryName,
            destination_country: organizerGeo.countryName,
            origin_city: originCity,
            destination_city: destinationCity,
            flow_type: flowType as any,
            status: "PENDING_QUOTE",
            created_at: new Date().toISOString()
        };

        flows.push(flow);
        console.log(`📦 Created flow ${flowId} for ${geo.countryName} with ${groupArtworks.length} artworks`);

        // Assign flow_id to all artworks in this group
        groupArtworks.forEach(artwork => {
            artworksWithFlowIds.push({
                ...artwork,
                flow_id: flowId
            });
        });
        console.log(`✅ Assigned flow_id ${flowId} to ${groupArtworks.length} artworks`);
    });

    console.log(`🎯 Total: ${flows.length} flows, ${artworksWithFlowIds.length} artworks with flow_id`);
    return { flows, artworksWithFlowIds };
}
