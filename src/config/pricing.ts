// Configuration Pricing Table
// Modifiable par Super Admin (future DB integration)

export interface PricingConfig {
    // Matériaux
    PRIX_BOIS_M2: number;           // €/m² (Twin 15mm)
    PRIX_MOUSSE_M3: number;         // €/m³ (Calculé à partir du m² en 50mm)
    PRIX_STYRO_M2_50MM: number;     // €/m²
    PRIX_ETHAFOAM_M2_50MM: number;  // €/m²
    PRIX_KLEBART_ML: number;        // €/mètre linéaire (Travel Frame)
    FORFAIT_QUINCAILLERIE: number;  // € (Vis, charnières, poignées)

    // Main d'œuvre
    TAUX_HORAIRE_ATELIER: number;   // €/h (Fabrication)
    TAUX_HORAIRE_EMBALLEUR: number; // €/h (Terrain)

    // Coefficients SECO
    FRAIS_GENERAUX_COEFF: number;   // Multiplicateur (ex: 1.14 = +14%)
    MARGE_STANDARD: number;         // Coefficient multiplicateur de vente
    MARGE_MUSEE: number;            // Coefficient pour caisses T2

    // Épaisseurs (mm)
    EPAISSEUR_MOUSSE_STANDARD: number;
    EPAISSEUR_MOUSSE_FRAGILE: number;
    EPAISSEUR_PAROI_T1: number;     // Caisse Galerie
    EPAISSEUR_PAROI_T2: number;     // Caisse Musée
    EPAISSEUR_KLEBART: number;      // Travel Frame
    HAUTEUR_PALETTE: number;        // Chevrons au sol

    // Temps de fabrication (heures) - Valeurs par défaut si non spécifié
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
    // Matériaux (Basé sur MATRICE SECO bois divers 01-06-22)
    PRIX_BOIS_M2: 17.72,            // Twin 15mm
    PRIX_MOUSSE_M3: 238,            // Moyenne (Ethafoam 11.9/m2 en 50mm -> 238/m3)
    PRIX_STYRO_M2_50MM: 11.98,
    PRIX_ETHAFOAM_M2_50MM: 11.90,

    PRIX_KLEBART_ML: 15,
    FORFAIT_QUINCAILLERIE: 50,

    // Main d'œuvre (Taux SECO déduit approx)
    TAUX_HORAIRE_ATELIER: 35,       // Ajusté pour plus de réalisme vs PR
    TAUX_HORAIRE_EMBALLEUR: 50,

    // Coefficients SECO
    FRAIS_GENERAUX_COEFF: 1.14,     // Déduit de la matrice T1 (13.6%)
    MARGE_STANDARD: 1.235,          // +23.5%
    MARGE_MUSEE: 1.30,              // +30%

    // Épaisseurs (mm)
    EPAISSEUR_MOUSSE_STANDARD: 50,
    EPAISSEUR_MOUSSE_FRAGILE: 100,
    EPAISSEUR_PAROI_T1: 20,
    EPAISSEUR_PAROI_T2: 50,
    EPAISSEUR_KLEBART: 100,
    HAUTEUR_PALETTE: 100,

    // Temps de fabrication (Utilisé comme fallback si type non reconnu)
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
