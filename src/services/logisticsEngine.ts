import { getPricingConfig } from "@/config/pricing";
import { Artwork } from "@/types";

export interface PackingServiceCost {
    // Tamponnage (Emballage sur site)
    packingTime_hours: number;
    packingWorkers: number;
    packingCost_eur: number;

    // Description
    serviceDescription: string;
}

export interface TransportCost {
    // Volumes
    totalVolume_m3: number;

    // Type de véhicule
    vehicleType: 'CAMION_20M3' | 'POIDS_LOURD';

    // Coûts
    baseCost_eur: number;
    distanceCost_eur: number;
    totalTransportCost_eur: number;

    // Détails
    distance_km?: number;
}

/**
 * ALGORITHME C.1 : Calcul du Tamponnage & Emballage sur Site
 * Estime le temps et le coût de l'intervention terrain
 */
export function calculatePackingService(artwork: Artwork): PackingServiceCost {
    const config = getPricingConfig();

    // Calcul de la surface de l'œuvre (pour estimer le temps)
    const surface_m2 = (artwork.dimensions_h_cm * artwork.dimensions_w_cm) / 10000;

    let packingTime = 0;
    let workers = 2; // Par défaut, 2 personnes

    // Règles d'estimation du temps
    if (artwork.typology === 'TABLEAU') {
        if (surface_m2 < 1) {
            packingTime = 0.25; // 15 min
        } else if (surface_m2 < 4) {
            packingTime = 0.5; // 30 min
        } else {
            packingTime = 1; // 1h pour grands formats
        }
    } else if (artwork.typology === 'SCULPTURE') {
        // Sculptures plus complexes
        packingTime = 1.5;
        if (artwork.weight_kg > 50) {
            workers = 3; // 3 personnes pour sculptures lourdes
        }
    } else if (artwork.typology === 'OBJET') {
        packingTime = 0.25;
    } else {
        // Installation
        packingTime = 2;
        workers = 3;
    }

    // Coefficient de fragilité
    if (artwork.fragility && artwork.fragility >= 4) {
        packingTime *= 1.5; // +50% pour œuvres très fragiles
    }

    const packingCost = packingTime * workers * config.TAUX_HORAIRE_EMBALLEUR;

    return {
        packingTime_hours: packingTime,
        packingWorkers: workers,
        packingCost_eur: packingCost,
        serviceDescription: `Tamponnage sur site (${workers} personnes × ${packingTime}h)`
    };
}

/**
 * ALGORITHME C.2 : Calcul du Transport (Logique de Foisonnement)
 * Détermine le type de véhicule et le coût en fonction du volume total
 */
export function calculateTransport(
    artworks: Artwork[],
    distance_km: number = 0
): TransportCost {
    const config = getPricingConfig();

    // Calcul du volume total (foisonnement)
    let totalVolume = 0;

    artworks.forEach(artwork => {
        if (artwork.crate_specs?.external_dimensions) {
            const ext = artwork.crate_specs.external_dimensions;
            // Conversion mm → m³
            const volume_m3 = (ext.h * ext.w * ext.d) / 1_000_000_000;
            totalVolume += volume_m3;
        } else {
            // Estimation si pas de specs (fallback)
            const volume_m3 = (
                artwork.dimensions_h_cm *
                artwork.dimensions_w_cm *
                artwork.dimensions_d_cm
            ) / 1_000_000;
            totalVolume += volume_m3 * 1.5; // Coefficient de sécurité
        }
    });

    // RÈGLE DE CHOIX CAMION
    let vehicleType: 'CAMION_20M3' | 'POIDS_LOURD';
    let baseCost: number;
    let distanceCost = 0;

    if (totalVolume < 12) {
        // Camion 20m³ (Forfait Journée)
        vehicleType = 'CAMION_20M3';
        baseCost = config.FORFAIT_CAMION_20M3;
    } else {
        // Poids Lourd (Forfait + Kilométrage)
        vehicleType = 'POIDS_LOURD';
        baseCost = config.FORFAIT_PL_JOURNEE;
        distanceCost = distance_km * config.PRIX_KM_PL;
    }

    const totalTransportCost = baseCost + distanceCost;

    return {
        totalVolume_m3: totalVolume,
        vehicleType,
        baseCost_eur: baseCost,
        distanceCost_eur: distanceCost,
        totalTransportCost_eur: totalTransportCost,
        distance_km: distance_km > 0 ? distance_km : undefined
    };
}

/**
 * Helper: Formater le résultat du transport
 */
export function formatTransportSummary(transport: TransportCost): string {
    const vehicleLabel = transport.vehicleType === 'CAMION_20M3'
        ? 'Camion 20m³'
        : 'Poids Lourd';

    let summary = `
Volume Total: ${transport.totalVolume_m3.toFixed(2)} m³
Véhicule: ${vehicleLabel}
Forfait de base: ${transport.baseCost_eur.toFixed(2)}€
    `.trim();

    if (transport.distanceCost_eur > 0) {
        summary += `\nKilométrage (${transport.distance_km}km): ${transport.distanceCost_eur.toFixed(2)}€`;
    }

    summary += `\n\nCoût Transport Total: ${transport.totalTransportCost_eur.toFixed(2)}€`;

    return summary;
}

/**
 * Helper: Calcul du coût total d'un flux logistique complet
 * (Emballage + Caisses + Transport)
 */
export function calculateFlowTotalCost(
    artworks: Artwork[],
    distance_km: number = 0
): {
    crateCosts_eur: number;
    packingCosts_eur: number;
    transportCost_eur: number;
    totalCost_eur: number;
    breakdown: string;
} {
    // Coût des caisses
    const crateCosts = artworks.reduce((sum, a) => sum + (a.crate_estimated_cost || 0), 0);

    // Coût de l'emballage (tamponnage)
    let packingCosts = 0;
    artworks.forEach(a => {
        const service = calculatePackingService(a);
        packingCosts += service.packingCost_eur;
    });

    // Coût du transport
    const transport = calculateTransport(artworks, distance_km);

    const totalCost = crateCosts + packingCosts + transport.totalTransportCost_eur;

    const breakdown = `
=== DÉTAIL DU FLUX LOGISTIQUE ===

1. Fabrication Caisses: ${crateCosts.toFixed(2)}€
   (${artworks.length} œuvre(s))

2. Emballage sur Site: ${packingCosts.toFixed(2)}€
   (Tamponnage + Conditionnement)

3. Transport: ${transport.totalTransportCost_eur.toFixed(2)}€
   ${formatTransportSummary(transport)}

================================
TOTAL FLUX: ${totalCost.toFixed(2)}€
    `.trim();

    return {
        crateCosts_eur: crateCosts,
        packingCosts_eur: packingCosts,
        transportCost_eur: transport.totalTransportCost_eur,
        totalCost_eur: totalCost,
        breakdown
    };
}
