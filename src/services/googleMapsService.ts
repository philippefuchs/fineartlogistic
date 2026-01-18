
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export interface DistanceResult {
    distanceKm: number;
    durationHours: number;
    originAddress: string;
    destinationAddress: string;
}

/**
 * Calculate distance and duration using Google Maps Distance Matrix API
 */
export async function calculateRoute(origin: string, destination: string): Promise<DistanceResult> {
    if (!GOOGLE_MAPS_API_KEY) {
        console.warn("Google Maps API key is missing. Using fallback estimation.");
        return fallbackEstimate(origin, destination);
    }

    try {
        // Note: This is client-side implementation. In production, consider server-side proxy
        // to hide API key if not restricting by referrer.
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}&language=fr`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== "OK" || !data.rows[0]?.elements[0]?.distance) {
            throw new Error(`Google Maps API Error: ${data.status}`);
        }

        const element = data.rows[0].elements[0];

        return {
            distanceKm: Math.round(element.distance.value / 1000), // Convert meters to km
            durationHours: Math.round(element.duration.value / 3600 * 10) / 10, // Convert seconds to hours
            originAddress: data.origin_addresses[0],
            destinationAddress: data.destination_addresses[0]
        };
    } catch (error) {
        console.error("Failed to calculate route:", error);
        return fallbackEstimate(origin, destination);
    }
}

/**
 * Fallback route estimation when API is unavailable
 */
function fallbackEstimate(origin: string, destination: string): DistanceResult {
    // Simple crude fallback (same as before)
    let distance = 500;

    if (origin.includes('Paris') && destination.includes('Lyon')) distance = 470;
    else if (origin.includes('Paris') && destination.includes('Marseille')) distance = 780;
    else if (origin.includes('Paris') && destination.includes('New York')) distance = 5850;
    else if (origin.includes('Paris') && destination.includes('Londres')) distance = 450;

    return {
        distanceKm: distance,
        durationHours: distance / 80, // Avg 80km/h
        originAddress: origin,
        destinationAddress: destination
    };
}
