import { getPricingConfig } from "@/config/pricing";

export type CrateType =
    | 'SOFT_PACK'
    | 'T1_GALERIE'
    | 'T2_MUSEE'
    | 'MRT'
    | 'GLISSIERE'
    | 'CLAIRE_VOIE'
    | 'TAPISSERIE'
    | 'CONTRE_CAISSE'
    | 'PALETTE'
    | 'CADRE_VOYAGE';

export type Typology = 'TABLEAU' | 'SCULPTURE' | 'OBJET' | 'INSTALLATION' | 'MOBILIER' | 'TAPISSERIE';

export interface ArtworkInput {
    h_cm: number;
    w_cm: number;
    d_cm: number;
    weight_kg: number;
    typology: Typology;
    fragility: 1 | 2 | 3 | 4 | 5; // 1=Standard, 5=Très fragile
    hasFragileFrame?: boolean;
    insurance_value?: number;
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
 * Arbre de décision automatique optimisé selon les matrices SECO
 */
export function calculatePacking(artwork: ArtworkInput): PackingResult {
    const config = getPricingConfig();
    const maxDim_cm = Math.max(artwork.h_cm, artwork.w_cm, artwork.d_cm);
    const value = artwork.insurance_value || 0;

    // RÈGLE : Sélection Automatique du Type (Logique SECO)
    let crateType: CrateType = 'T1_GALERIE';
    let needsKlebart = false;
    let klebartThickness = 0;

    const requirements = (artwork as any).packing_requirements?.toLowerCase() || '';

    if (artwork.typology === 'TAPISSERIE') {
        crateType = 'TAPISSERIE';
    } else if (requirements.includes('contre-caisse') || requirements.includes('contre caisse')) {
        crateType = 'CONTRE_CAISSE';
    } else if (requirements.includes('glissière') || requirements.includes('glissiere')) {
        crateType = 'GLISSIERE';
    } else if (artwork.fragility >= 5 || (artwork.typology === 'TABLEAU' && artwork.hasFragileFrame)) {
        crateType = 'MRT';
    } else if (artwork.fragility >= 4 || artwork.weight_kg > 100 || maxDim_cm > 200) {
        crateType = 'T2_MUSEE';
    } else if (artwork.fragility <= 2 && value < 2000 && artwork.typology !== 'TABLEAU') {
        crateType = 'CLAIRE_VOIE';
    } else if (artwork.weight_kg > 150 && artwork.typology === 'SCULPTURE') {
        crateType = 'PALETTE';
    } else {
        crateType = 'T1_GALERIE';
    }

    // RÈGLE 1: Calcul des marges de sécurité (Tampon Mousse)
    let foamThickness = config.EPAISSEUR_MOUSSE_STANDARD;
    if (crateType === 'T2_MUSEE' || crateType === 'MRT' || crateType === 'CONTRE_CAISSE') {
        foamThickness = config.EPAISSEUR_MOUSSE_FRAGILE;
    } else if (crateType === 'CLAIRE_VOIE' || crateType === 'PALETTE') {
        foamThickness = 30; // Mousse plus fine (SECO palette/claire-voie)
    }

    // Cas particulier MRT: Cadre voyage intérieur
    if (crateType === 'MRT') {
        needsKlebart = true;
        klebartThickness = config.EPAISSEUR_KLEBART;
    }

    // Dimensions internes de la caisse (œuvre + mousse)
    let internal_h = (artwork.h_cm * 10) + (2 * foamThickness);
    let internal_w = (artwork.w_cm * 10) + (2 * foamThickness);
    let internal_d = (artwork.d_cm * 10) + (2 * foamThickness);

    if (needsKlebart) {
        internal_h += klebartThickness;
        internal_w += klebartThickness;
        internal_d += klebartThickness;
    }

    // RÈGLE 3: Calcul des Dimensions Extérieures
    let wallThickness = config.EPAISSEUR_PAROI_T1;
    if (crateType === 'T2_MUSEE' || crateType === 'MRT' || crateType === 'CONTRE_CAISSE') {
        wallThickness = config.EPAISSEUR_PAROI_T2;
    } else if (crateType === 'TAPISSERIE') {
        wallThickness = 15;
    }

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
        'T2_MUSEE': 'Caisse Musée (T2)',
        'MRT': 'Caisse MRT (Cadre Intérieur)',
        'GLISSIERE': 'Caisse à Glissière',
        'CLAIRE_VOIE': 'Caisse Claire-voie',
        'TAPISSERIE': 'Caisse Tapisserie',
        'CONTRE_CAISSE': 'Contre-caisse',
        'PALETTE': 'Palette / Socle',
        'CADRE_VOYAGE': 'Cadre de Voyage'
    };
    return labels[type];
}
