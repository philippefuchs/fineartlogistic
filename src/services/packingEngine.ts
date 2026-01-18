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

    // RÈGLE 1: Calcul des marges de sécurité (Tampon Mousse)
    const foamThickness = artwork.fragility >= 4
        ? config.EPAISSEUR_MOUSSE_FRAGILE
        : config.EPAISSEUR_MOUSSE_STANDARD;

    // Dimensions internes de la caisse (œuvre + mousse)
    let internal_h = artwork.h_cm * 10 + (2 * foamThickness); // Convert cm to mm
    let internal_w = artwork.w_cm * 10 + (2 * foamThickness);
    let internal_d = artwork.d_cm * 10 + (2 * foamThickness);

    // RÈGLE 2: Sélection du Type de Fabrication (Arbre de décision)
    let crateType: CrateType;
    let needsKlebart = false;
    let klebartThickness = 0;

    // Cas 1: Petit objet léger → Soft Pack
    if (artwork.weight_kg < 5 && artwork.typology === 'OBJET') {
        crateType = 'SOFT_PACK';
    }
    // Cas 2: Tableau avec cadre fragile → Klébart + T2
    else if (artwork.typology === 'TABLEAU' && artwork.hasFragileFrame) {
        needsKlebart = true;
        klebartThickness = config.EPAISSEUR_KLEBART;

        // Révision des dimensions internes (ajout du Klébart)
        internal_h += klebartThickness;
        internal_w += klebartThickness;
        internal_d += klebartThickness;

        crateType = 'T2_MUSEE';
    }
    // Cas 3: Fragilité élevée ou haute valeur → Caisse Musée
    else if (artwork.fragility >= 4) {
        crateType = 'T2_MUSEE';
    }
    // Cas 4: Standard → Caisse Galerie
    else {
        crateType = 'T1_GALERIE';
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
