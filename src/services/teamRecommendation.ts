import { Artwork, TeamRole } from "@/types";

export interface TeamMemberRecommendation {
    role_id: string;
    role_name: string;
    count: number;
    daily_rate: number;
    hotel_category: 'STANDARD' | 'COMFORT' | 'PREMIUM';
    rationale: string; // Why this role was recommended
}

export interface TeamRecommendation {
    team_members: TeamMemberRecommendation[];
    mission_duration_days: number;
    rationale: string;
    total_value: number;
    artwork_count: number;
    distance_km: number;
}

/**
 * Recommend optimal team composition based on artworks and logistics
 */
export function recommendTeam(
    artworks: Artwork[],
    distanceKm: number,
    availableRoles: TeamRole[]
): TeamRecommendation {
    const team: TeamMemberRecommendation[] = [];

    // Calculate metrics
    const artworkCount = artworks.length;
    const totalValue = artworks.reduce((sum, a) => sum + (a.insurance_value || 0), 0);
    const avgFragility = artworks.reduce((sum, a) => sum + (a.fragility || 3), 0) / artworkCount;

    // Helper to find role
    const getRole = (roleId: string) => availableRoles.find(r => r.id === roleId);

    // 1. RÉGISSEUR (always 1)
    const regisseur = getRole('regisseur');
    if (regisseur) {
        team.push({
            role_id: regisseur.id,
            role_name: regisseur.name,
            count: 1,
            daily_rate: regisseur.daily_rate,
            hotel_category: regisseur.default_hotel_category,
            rationale: "Supervision générale obligatoire"
        });
    }

    // 2. TECHNICIENS (1 per 5 artworks, min 1, max 4)
    const technicianCount = Math.min(4, Math.max(1, Math.ceil(artworkCount / 5)));
    const technicien = getRole('technicien');
    if (technicien) {
        team.push({
            role_id: technicien.id,
            role_name: technicien.name,
            count: technicianCount,
            daily_rate: technicien.daily_rate,
            hotel_category: technicien.default_hotel_category,
            rationale: `${technicianCount} technicien(s) pour ${artworkCount} œuvre(s) (1 par 5)`
        });
    }

    // 3. CONVOYEUR (if value > 500k€ OR distance > 1000km OR high fragility)
    const needsConvoyeur = totalValue > 500000 || distanceKm > 1000 || avgFragility >= 4;
    if (needsConvoyeur) {
        const convoyeur = getRole('convoyeur');
        if (convoyeur) {
            let rationale = "Recommandé car ";
            const reasons = [];
            if (totalValue > 500000) reasons.push(`valeur élevée (${Math.round(totalValue / 1000)}k€)`);
            if (distanceKm > 1000) reasons.push(`longue distance (${distanceKm}km)`);
            if (avgFragility >= 4) reasons.push(`fragilité élevée (${avgFragility.toFixed(1)}/5)`);
            rationale += reasons.join(", ");

            team.push({
                role_id: convoyeur.id,
                role_name: convoyeur.name,
                count: 1,
                daily_rate: convoyeur.daily_rate,
                hotel_category: convoyeur.default_hotel_category,
                rationale
            });
        }
    }

    // Estimate mission duration
    const missionDuration = estimateMissionDuration(distanceKm, 'ROAD');

    // Overall rationale
    const rationale = `Équipe optimale pour ${artworkCount} œuvre(s) d'une valeur de ${Math.round(totalValue / 1000)}k€ sur ${distanceKm}km`;

    return {
        team_members: team,
        mission_duration_days: missionDuration,
        rationale,
        total_value: totalValue,
        artwork_count: artworkCount,
        distance_km: distanceKm
    };
}

/**
 * Estimate mission duration based on distance and transport type
 */
// Note: estimateDistance is deprecated. Use calculateRoute from googleMapsService instead.
// This file focuses purely on team logic once distance is known.

/**
 * Estimate mission duration based on duration (hours) and transport type
 */
export function estimateMissionDuration(durationHours: number, transportType: string): number {
    if (transportType === 'AIR_FREIGHT') {
        return 3; // 3 days for air freight
    }

    // Road transport
    // Driving limit: ~8-9 hours per day
    // + 1 day pickup
    // + 1 day delivery
    const travelDays = Math.ceil(durationHours / 8);
    return travelDays + 2;
}
