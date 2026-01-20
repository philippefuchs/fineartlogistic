// Configuration Pricing Table
// Modifiable par Super Admin (future DB integration)

export interface PricingConfig {
    // Matériaux
    PRIX_BOIS_M2: number;           // €/m² (Contreplaqué peuplier)
    PRIX_MOUSSE_M3: number;         // €/m³ (Plastazote, Ethafoam)
    PRIX_KLEBART_ML: number;        // €/mètre linéaire (Travel Frame)
    FORFAIT_QUINCAILLERIE: number;  // € (Vis, charnières, poignées)


    // Main d'œuvre
    TAUX_HORAIRE_ATELIER: number;   // €/h (Fabrication)
    TAUX_HORAIRE_EMBALLEUR: number; // €/h (Terrain)

    // Marges
    MARGE_STANDARD: number;         // Coefficient multiplicateur (ex: 2.2 = +120%)
    MARGE_MUSEE: number;            // Coefficient pour caisses T2

    // Épaisseurs (mm)
    EPAISSEUR_MOUSSE_STANDARD: number;
    EPAISSEUR_MOUSSE_FRAGILE: number;
    EPAISSEUR_PAROI_T1: number;     // Caisse Galerie
    EPAISSEUR_PAROI_T2: number;     // Caisse Musée
    EPAISSEUR_KLEBART: number;      // Travel Frame
    HAUTEUR_PALETTE: number;        // Chevrons au sol

    // Temps de fabrication (heures)
    TEMPS_BASE_PETIT: number;       // < 1m³
    TEMPS_BASE_MOYEN: number;       // 1-3m³
    TEMPS_BASE_GRAND: number;       // > 3m³
    COEFF_TEMPS_T2: number;         // Multiplicateur pour Musée

    // Transport
    FORFAIT_CAMION_20M3: number;    // € (Journée)
    FORFAIT_PL_JOURNEE: number;     // € (Poids Lourd)
    PRIX_KM_PL: number;             // €/km
}

export const DEFAULT_PRICING: PricingConfig = {
    // Matériaux (Prix France 2026)
    PRIX_BOIS_M2: 35,
    PRIX_MOUSSE_M3: 400, // Prix par m3 pour mousse haute densité (ex: 25€/m2 en 50mm -> 500€/m3)

    PRIX_KLEBART_ML: 15,
    FORFAIT_QUINCAILLERIE: 50,

    // Main d'œuvre
    TAUX_HORAIRE_ATELIER: 45,
    TAUX_HORAIRE_EMBALLEUR: 50,

    // Marges
    MARGE_STANDARD: 2.2,
    MARGE_MUSEE: 2.5,

    // Épaisseurs (mm)
    EPAISSEUR_MOUSSE_STANDARD: 50,
    EPAISSEUR_MOUSSE_FRAGILE: 100,
    EPAISSEUR_PAROI_T1: 20,
    EPAISSEUR_PAROI_T2: 50,
    EPAISSEUR_KLEBART: 100,
    HAUTEUR_PALETTE: 100,

    // Temps de fabrication
    TEMPS_BASE_PETIT: 2,
    TEMPS_BASE_MOYEN: 4,
    TEMPS_BASE_GRAND: 6,
    COEFF_TEMPS_T2: 1.5,

    // Transport
    FORFAIT_CAMION_20M3: 800,
    FORFAIT_PL_JOURNEE: 1200,
    PRIX_KM_PL: 1.5
};

// Fonction pour récupérer la config (future: depuis DB)
export function getPricingConfig(): PricingConfig {
    // TODO: Fetch from database when backend is ready
    return DEFAULT_PRICING;
}
