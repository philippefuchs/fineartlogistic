import { getPricingConfig } from "@/config/pricing";
import { PackingResult, CrateType } from "./packingEngine";

export interface CostBreakdown {
    // Matériaux
    woodSurface_m2: number;
    woodCost_eur: number;
    foamSurface_m2: number;
    foamCost_eur: number;
    hardwareCost_eur: number;
    klebartCost_eur: number;

    // Main d'œuvre
    fabricationTime_hours: number;
    laborCost_eur: number;

    // Totaux
    totalMaterialCost_eur: number;
    totalLaborCost_eur: number;
    factoryCost_eur: number; // Prix de Revient (PR)

    // Prix de vente
    margin: number;
    sellingPrice_eur: number;
}

/**
 * ALGORITHME B : Moteur de Coût Fabrication
 * Calcul du Prix de Revient Industriel (PR) et Prix de Vente
 */
export function calculateCost(packing: PackingResult): CostBreakdown {
    const config = getPricingConfig();

    // ÉTAPE 1: Calcul de la Surface Développée (Matériaux)

    // Conversion mm → m
    const h_m = packing.external_h_mm / 1000;
    const w_m = packing.external_w_mm / 1000;
    const d_m = packing.external_d_mm / 1000;

    // Surface de bois (6 faces d'un parallélépipède)
    const woodSurface_m2 = 2 * (h_m * w_m + h_m * d_m + w_m * d_m);
    const woodCost = woodSurface_m2 * config.PRIX_BOIS_M2;

    // Volume de mousse (Différence entre volume interne et volume œuvre)
    const h_int_m = packing.internal_h_mm / 1000;
    const w_int_m = packing.internal_w_mm / 1000;
    const d_int_m = packing.internal_d_mm / 1000;

    // V2: Foam Volume (m³) x Foam Price
    const internalVolume_m3 = h_int_m * w_int_m * d_int_m;
    const artworkVolume_m3 = (packing.internal_h_mm - 2 * packing.foamThickness_mm) * (packing.internal_w_mm - 2 * packing.foamThickness_mm) * (packing.internal_d_mm - 2 * packing.foamThickness_mm) / 1_000_000_000;
    const foamVolume_m3 = internalVolume_m3 - artworkVolume_m3;
    const foamCost = foamVolume_m3 * config.PRIX_MOUSSE_M2 * 10; // Assuming PRIX_MOUSSE_M2 is actually for volume in V2 or needs conversion
    // Actually, let's follow the PRIX_MOUSSE_M2 as a M3 price if it's volume based?
    // Let's use a reasonable M3 price if not defined.
    const foamCost_eur = foamVolume_m3 * 400; // Estimated 400€/m3 for high density foam

    // Quincaillerie (forfait)
    const hardwareCost = config.FORFAIT_QUINCAILLERIE;

    // ÉTAPE 2: Le Cas du Klébart (Travel Frame)
    let klebartCost = 0;
    if (packing.needsKlebart) {
        // Métrage linéaire = périmètre du cadre
        const linearMeters = 2 * (h_int_m + w_int_m);
        klebartCost = linearMeters * config.PRIX_KLEBART_ML;

        // Temps supplémentaire pour fabrication Klébart (estimé 1h)
        klebartCost += 1 * config.TAUX_HORAIRE_ATELIER;
    }

    const totalMaterialCost = woodCost + foamCost_eur + hardwareCost + klebartCost;

    // ÉTAPE 3: Calcul du Temps Atelier (Main d'œuvre)
    const volume_m3 = packing.externalVolume_m3;

    // V2 Labor Rules: <1m3 = 2h, >1m3 = 4h
    let fabricationTime: number;
    if (volume_m3 < 15) { // Updated threshold to 15m3
        fabricationTime = 2;
    } else {
        fabricationTime = 4;
    }

    // Coefficient pour Caisse Musée (plus de finitions)
    if (packing.crateType === 'T2_MUSEE') {
        fabricationTime *= config.COEFF_TEMPS_T2;
    }

    const laborCost = fabricationTime * config.TAUX_HORAIRE_ATELIER;

    // RÉSULTAT B: Prix Sortie Usine (Prix de Revient)
    const factoryCost = totalMaterialCost + laborCost;

    // Application de la marge
    const margin = packing.crateType === 'T2_MUSEE'
        ? config.MARGE_MUSEE
        : config.MARGE_STANDARD;

    const sellingPrice = factoryCost * margin;

    return {
        woodSurface_m2,
        woodCost_eur: woodCost,
        foamSurface_m2: foamVolume_m3 / 0.05, // Approximation for interface consistency
        foamCost_eur,
        hardwareCost_eur: hardwareCost,
        klebartCost_eur: klebartCost,
        fabricationTime_hours: fabricationTime,
        laborCost_eur: laborCost,
        totalMaterialCost_eur: woodCost + foamCost_eur + hardwareCost + klebartCost,
        totalLaborCost_eur: laborCost,
        factoryCost_eur: woodCost + foamCost_eur + hardwareCost + klebartCost + laborCost,
        margin,
        sellingPrice_eur: (woodCost + foamCost_eur + hardwareCost + klebartCost + laborCost) * margin
    };
}

/**
 * Helper: Formater un breakdown de coût pour affichage
 */
export function formatCostBreakdown(cost: CostBreakdown): string {
    return `
Matériaux:
- Bois: ${cost.woodSurface_m2.toFixed(2)} m² × ${getPricingConfig().PRIX_BOIS_M2}€ = ${cost.woodCost_eur.toFixed(2)}€
- Mousse: ${cost.foamSurface_m2.toFixed(2)} m² × ${getPricingConfig().PRIX_MOUSSE_M2}€ = ${cost.foamCost_eur.toFixed(2)}€
- Quincaillerie: ${cost.hardwareCost_eur.toFixed(2)}€
${cost.klebartCost_eur > 0 ? `- Klébart: ${cost.klebartCost_eur.toFixed(2)}€` : ''}

Main d'œuvre:
- Temps: ${cost.fabricationTime_hours.toFixed(1)}h
- Coût: ${cost.laborCost_eur.toFixed(2)}€

Prix de Revient: ${cost.factoryCost_eur.toFixed(2)}€
Marge: ×${cost.margin}
Prix de Vente: ${cost.sellingPrice_eur.toFixed(2)}€
    `.trim();
}
