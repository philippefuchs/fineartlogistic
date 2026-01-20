import { getPricingConfig } from "@/config/pricing";

export type CrateType = 'SOFT_PACK' | 'T1_GALERIE' | 'T2_MUSEE';
export type Typology = 'TABLEAU' | 'SCULPTURE' | 'OBJET' | 'INSTALLATION';

export interface ArtworkInput {
    h_cm: number;
    w_cm: number;
    d_cm: number;
    weight_kg: number;
    typology: Typology;
    fragility: 1 | 2 | 3 | 4 | 5; // 1=Standard, 5=Très fragile
    hasFragileFrame?: boolean;
}

export interface PackingResult {
    crateType: CrateType;
    needsKlebart: boolean;

    // Dimensions internes (avec mousse)
    internal_h_mm: number;
    internal_w_mm: number;
    internal_d_mm: number;

    // Dimensions externes (facturables)
    external_h_mm: number;
    external_w_mm: number;
    external_d_mm: number;

    // Détails techniques
    foamThickness_mm: number;
    wallThickness_mm: number;
    klebartThickness_mm: number;

    // Volume facturable (m³)
    externalVolume_m3: number;
}

/**
 * ALGORITHME A : Détermination du Colisage
 * Arbre de décision automatique pour le type de caisse et dimensions
 */
export function calculatePacking(artwork: ArtworkInput): PackingResult {
    const config = getPricingConfig();

    // RÈGLE 2: Sélection du Type de Fabrication (V2 decision tree)
    let crateType: CrateType;
    let needsKlebart = false;
    let klebartThickness = 0;

    const maxDim_cm = Math.max(artwork.h_cm, artwork.w_cm, artwork.d_cm);

    // CRITÈRE V2: Poids > 80kg OU Dimension > 200cm -> T2
    const isHeavyOrLarge = artwork.weight_kg > 80 || maxDim_cm > 200;

    if (isHeavyOrLarge) {
        crateType = 'T2_MUSEE';
    } else if (artwork.typology === 'TABLEAU' && artwork.hasFragileFrame) {
        needsKlebart = true;
        klebartThickness = config.EPAISSEUR_KLEBART;
        crateType = 'T2_MUSEE';
    } else if (artwork.fragility >= 4) {
        crateType = 'T2_MUSEE';
    } else {
        crateType = 'T1_GALERIE';
    }

    // RÈGLE 1: Calcul des marges de sécurité (Tampon Mousse)
    // Alignement : T2/Sculpture = Fragile (100mm), T1/Standard = Standard (50mm)
    const foamThickness = (crateType === 'T2_MUSEE' || artwork.typology === 'SCULPTURE' || artwork.typology === 'INSTALLATION')
        ? config.EPAISSEUR_MOUSSE_FRAGILE
        : config.EPAISSEUR_MOUSSE_STANDARD;

    // Dimensions internes de la caisse (œuvre + mousse)
    let internal_h = artwork.h_cm * 10 + (2 * foamThickness);
    let internal_w = artwork.w_cm * 10 + (2 * foamThickness);
    let internal_d = artwork.d_cm * 10 + (2 * foamThickness);

    if (needsKlebart) {
        internal_h += klebartThickness;
        internal_w += klebartThickness;
        internal_d += klebartThickness;
    }


    // RÈGLE 3: Calcul des Dimensions Extérieures
    const wallThickness = crateType === 'T2_MUSEE'
        ? config.EPAISSEUR_PAROI_T2
        : config.EPAISSEUR_PAROI_T1;

    const external_h = internal_h + (2 * wallThickness) + config.HAUTEUR_PALETTE;
    const external_w = internal_w + (2 * wallThickness);
    const external_d = internal_d + (2 * wallThickness);

    // Volume facturable (en m³)
    const externalVolume_m3 = (external_h * external_w * external_d) / 1_000_000_000;

    return {
        crateType,
        needsKlebart,
        internal_h_mm: internal_h,
        internal_w_mm: internal_w,
        internal_d_mm: internal_d,
        external_h_mm: external_h,
        external_w_mm: external_w,
        external_d_mm: external_d,
        foamThickness_mm: foamThickness,
        wallThickness_mm: wallThickness,
        klebartThickness_mm: klebartThickness,
        externalVolume_m3
    };
}

/**
 * Helper: Convertir le type de caisse en label français
 */
export function getCrateTypeLabel(type: CrateType): string {
    const labels: Record<CrateType, string> = {
        'SOFT_PACK': 'Tamponnage / Soft Pack',
        'T1_GALERIE': 'Caisse Galerie (T1)',
        'T2_MUSEE': 'Caisse Musée (T2)'
    };
    return labels[type];
}
