import { getPricingConfig } from "@/config/pricing";
import { PackingResult, CrateType } from "./packingEngine";

export interface CostBreakdown {
    // Matériaux
    woodSurface_m2: number;
    woodCost_eur: number;
    foamSurface_m2: number;
    foamCost_eur: number;
    hardwareCost_eur: number;
    mrtCost_eur: number; // Coût cadre intérieur si applicable

    // Main d'œuvre
    fabricationTime_hours: number;
    laborCost_eur: number;

    // Totaux
    totalDirectCost_eur: number; // Matière + MO
    overheadsCost_eur: number;   // Frais généraux
    factoryCost_eur: number;     // Prix de Revient (PR)

    // Prix de vente
    margin: number;
    sellingPrice_eur: number;
}

/**
 * ALGORITHME B : Moteur de Coût Fabrication SECO
 * Calcul du Prix de Revient Industriel (PR) et Prix de Vente final
 */
export function calculateCost(packing: PackingResult): CostBreakdown {
    const config = getPricingConfig();

    // ÉTAPE 1: Calcul des Surfaces (Matériaux)
    const h_m = packing.external_h_mm / 1000;
    const w_m = packing.external_w_mm / 1000;
    const d_m = packing.external_d_mm / 1000;

    // Surface de bois (6 faces)
    const woodSurface_m2 = 2 * (h_m * w_m + h_m * d_m + w_m * d_m);
    const woodCost = woodSurface_m2 * config.PRIX_BOIS_M2;

    // Surface de mousse (approximation par couches internes)
    const h_int_m = packing.internal_h_mm / 1000;
    const w_int_m = packing.internal_w_mm / 1000;
    const foamSurface_m2 = 2 * (h_int_m * w_int_m) + 2 * (h_int_m * (packing.internal_d_mm / 1000)) + 2 * (w_int_m * (packing.internal_d_mm / 1000));
    const foamCost = foamSurface_m2 * config.PRIX_ETHAFOAM_M2_50MM;

    const hardwareCost = config.FORFAIT_QUINCAILLERIE;

    let mrtCost = 0;
    if (packing.crateType === 'MRT') {
        const perimeter_m = 2 * (h_int_m + w_int_m);
        mrtCost = perimeter_m * config.PRIX_KLEBART_ML;
    }

    const totalMaterialCost = woodCost + foamCost + hardwareCost + mrtCost;

    // ÉTAPE 2: Temps de fabrication (Heures SECO déduites)
    const volume_m3 = packing.externalVolume_m3;
    let fabricationTime: number;

    // Barème SECO simplifié basé sur le type et le volume
    const laborRates: Record<CrateType, number> = {
        'T1_GALERIE': volume_m3 < 1 ? 3 : 5,
        'T2_MUSEE': volume_m3 < 1 ? 5 : 8,
        'MRT': volume_m3 < 1 ? 6 : 10,
        'CLAIRE_VOIE': volume_m3 < 1 ? 1.5 : 2.5,
        'TAPISSERIE': volume_m3 < 1 ? 2 : 4,
        'PALETTE': 1,
        'GLISSIERE': 4,
        'CONTRE_CAISSE': 5,
        'CADRE_VOYAGE': 2,
        'SOFT_PACK': 0.5
    };

    fabricationTime = laborRates[packing.crateType] || config.TEMPS_BASE_MOYEN;
    const laborCost = fabricationTime * config.TAUX_HORAIRE_ATELIER;

    // ÉTAPE 3: Application des Frais Généraux et Marges SECO
    const totalDirectCost = totalMaterialCost + laborCost;
    const factoryCost = totalDirectCost * config.FRAIS_GENERAUX_COEFF;

    const margin = packing.crateType === 'T2_MUSEE' || packing.crateType === 'MRT'
        ? config.MARGE_MUSEE
        : config.MARGE_STANDARD;

    const sellingPrice = factoryCost * margin;

    return {
        woodSurface_m2,
        woodCost_eur: woodCost,
        foamSurface_m2,
        foamCost_eur: foamCost,
        hardwareCost_eur: hardwareCost,
        mrtCost_eur: mrtCost,
        fabricationTime_hours: fabricationTime,
        laborCost_eur: laborCost,
        totalDirectCost_eur: totalDirectCost,
        overheadsCost_eur: factoryCost - totalDirectCost,
        factoryCost_eur: factoryCost,
        margin,
        sellingPrice_eur: sellingPrice
    };
}

/**
 * Helper: Formater le nouveau breakdown de coût SECO
 */
export function formatCostBreakdown(cost: CostBreakdown): string {
    const config = getPricingConfig();
    return `
💰 DÉTAIL DU CALCUL (MATRICE SECO)
----------------------------------
MATÉRIAUX:
- Bois: ${cost.woodSurface_m2.toFixed(2)} m² × ${config.PRIX_BOIS_M2}€ = ${cost.woodCost_eur.toFixed(2)}€
- Mousse: ${cost.foamSurface_m2.toFixed(2)} m² × ${config.PRIX_ETHAFOAM_M2_50MM}€ = ${cost.foamCost_eur.toFixed(2)}€
- Quincaillerie: ${cost.hardwareCost_eur.toFixed(2)}€
${cost.mrtCost_eur > 0 ? `- Cadre MRT: ${cost.mrtCost_eur.toFixed(2)}€` : ''}

MAIN D'ŒUVRE:
- Temps Atelier: ${cost.fabricationTime_hours.toFixed(1)}h
- Coût Direct MO: ${cost.laborCost_eur.toFixed(2)}€ (${config.TAUX_HORAIRE_ATELIER}€/h)

STRUCTURE DE PRIX:
- Coût Direct (Matière + MO): ${cost.totalDirectCost_eur.toFixed(2)}€
- Frais Généraux (×${config.FRAIS_GENERAUX_COEFF}): ${cost.overheadsCost_eur.toFixed(2)}€
- Prix de Revient (PR): ${cost.factoryCost_eur.toFixed(2)}€
- Marge de Vente (×${cost.margin}): ${(cost.sellingPrice_eur - cost.factoryCost_eur).toFixed(2)}€

PRIX DE VENTE FINAL: ${Math.ceil(cost.sellingPrice_eur)} €
    `.trim();
}
