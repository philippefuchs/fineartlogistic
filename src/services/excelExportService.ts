import * as XLSX from 'xlsx';
import { Project, Artwork } from '../types';

interface FlowExportData {
    flow: {
        origin_country: string;
        destination_country: string;
    };
    lines: any[];
    totalCost: number;
    margin: number;
    sellingPrice: number;
    profit: number;
}

interface FinancialTotals {
    totalCost: number;
    totalSelling: number;
    totalProfit: number;
    avgMargin: number;
    packingCost?: number;
}

export const exportFinancialOffertoXLSX = (
    project: Project,
    flowData: FlowExportData[],
    totals: FinancialTotals,
    artworks: any[]
) => {
    try {
        // 1. Prepare Summary Data
        const summaryRows = [
            ['GROSPIRON FINE ART - OFFRE LOGISTIQUE'],
            [],
            ['INFORMATIONS PROJET'],
            ['Nom du Projet', project.name],
            ['Référence', project.reference_code],
            ['Musée Organisateur', project.organizing_museum],
            ['Date de Génération', new Date().toLocaleDateString('fr-FR')],
            ['Devise', project.currency || 'EUR'],
            [],
            ['RÉSUMÉ CONSOLIDÉ'],
            ['Coût Emballage & Colisage', TotalsValue(totals.packingCost || 0), '€'],
            ['Coût Logistique Flux', TotalsValue(totals.totalCost - (totals.packingCost || 0)), '€'],
            ['Coût de Revient Total', TotalsValue(totals.totalCost), '€'],
            ['Profit Total Prévisionnel', TotalsValue(totals.totalProfit), '€'],
            ['Marge Moyenne Pondérée', totals.avgMargin.toFixed(2) + '%'],
            ['PRIX DE VENTE TOTAL (HT)', TotalsValue(totals.totalSelling), '€'],
            [],
            ['BREAKDOWN PAR FLUX'],
            ['FLUX', 'COÛT DE REVIENT', 'MARGE APPLIQUÉE (%)', 'PROFIT', 'PRIX DE VENTE']
        ];

        const flowsRows = flowData.map(f => [
            `${f.flow.origin_country} → ${f.flow.destination_country}`,
            f.totalCost,
            f.margin + '%',
            f.profit,
            f.sellingPrice
        ]);

        // 2. Create Workbook and Sheets
        const wb = XLSX.utils.book_new();

        // 3. Main Summary Sheet
        const wsSummary = XLSX.utils.aoa_to_sheet([...summaryRows, ...flowsRows]);

        // Add some basic styling via worksheet properties if needed (though XLSX basic doesn't support easy styling)
        // Set column widths
        const wscols = [
            { wch: 40 }, // A
            { wch: 20 }, // B
            { wch: 20 }, // C
            { wch: 20 }, // D
            { wch: 20 }  // E
        ];
        wsSummary['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé Financier');

        // 4. Detailed Packing Sheet
        const packingHeader = ['TITRE', 'ARTISTE', 'DIMENSIONS', 'TYPE CAISSE', 'COÛT DE REVIENT'];
        const packingRows = artworks
            .filter(a => a.crate_estimated_cost > 0)
            .map(a => [
                a.title,
                a.artist,
                `${a.dimensions_h_cm}x${a.dimensions_w_cm}x${a.dimensions_d_cm}`,
                a.recommended_crate || 'Standard',
                a.crate_estimated_cost
            ]);

        if (packingRows.length > 0) {
            const wsPacking = XLSX.utils.aoa_to_sheet([packingHeader, ...packingRows]);
            wsPacking['!cols'] = [
                { wch: 30 }, // Titre
                { wch: 20 }, // Artiste
                { wch: 20 }, // Dimensions
                { wch: 25 }, // Type Caisse
                { wch: 15 }  // Coût
            ];
            XLSX.utils.book_append_sheet(wb, wsPacking, 'Détail Colisage');
        }

        // 5. Detailed Breakdown Sheet
        const detailHeader = ['FLUX / CATÉGORIE', 'DESCRIPTION', 'QUANTITÉ', 'PRIX UNITAIRE', 'TOTAL COST'];
        const detailRows: any[][] = [];

        // Add Packing Costs to Details first
        if (packingRows.length > 0) {
            detailRows.push(['EMBALLAGE & COLISAGE', 'Fabrication Caisses et Conditionnement', artworks.filter(a => a.crate_estimated_cost > 0).length, '', totals.packingCost]);
            artworks.filter(a => a.crate_estimated_cost > 0).forEach(a => {
                detailRows.push([
                    '  ↳ ' + a.title,
                    `${a.recommended_crate || 'Caisse'} - ${a.dimensions_h_cm}x${a.dimensions_w_cm}x${a.dimensions_d_cm}`,
                    1,
                    a.crate_estimated_cost,
                    a.crate_estimated_cost
                ]);
            });
            detailRows.push([]); // Space
        }

        flowData.forEach(f => {
            const flowLabel = `LOGISTIQUE: ${f.flow.origin_country} → ${f.flow.destination_country}`;
            f.lines.forEach(l => {
                detailRows.push([
                    flowLabel,
                    `${l.category}: ${l.description}`,
                    l.quantity,
                    l.unit_price,
                    l.total_price
                ]);
            });
            // Add a subtotal line for the flow
            detailRows.push([
                `TOTAL ${flowLabel}`,
                '',
                '',
                '',
                f.totalCost
            ]);
            detailRows.push([]); // Empty row for spacing
        });

        const wsDetails = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
        wsDetails['!cols'] = [
            { wch: 40 }, // Flow / Cat
            { wch: 60 }, // Description
            { wch: 10 }, // Quantity
            { wch: 15 }, // Unit Price
            { wch: 15 }  // Total
        ];
        XLSX.utils.book_append_sheet(wb, wsDetails, 'Détails par Ligne');

        // 5. Trigger Download
        XLSX.writeFile(wb, `${project.reference_code}_Offre_Finale_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error("Excel Export Error:", error);
        alert("Erreur lors de la génération du fichier Excel.");
    }
};


export const exportCompleteQuoteToXLSX = (
    project: Project,
    artworks: Artwork[],
    distance_km: number,
    quote: any,
    transport: any
) => {
    try {
        const wb = XLSX.utils.book_new();

        // 1. Summary Sheet
        const summaryRows = [
            ['GROSPIRON FINE ART - DEVIS ESTIMATIF COMPLET'],
            [],
            ['INFORMATIONS PROJET'],
            ['Nom du Projet', project.name],
            ['Référence', project.reference_code],
            ['Musée Organisateur', project.organizing_museum],
            ['Date de Génération', new Date().toLocaleDateString('fr-FR')],
            ['Distance Estimée', `${distance_km} km`],
            [],
            ['RÉSUMÉ DES COÛTS'],
            ['Fabrication Caisses (T1/T2)', quote.crateCosts_eur, '€'],
            ['Emballage & Tamponnage', quote.packingCosts_eur, '€'],
            ['Transport Logistique', quote.transportCost_eur, '€'],
            ['TOTAL ESTIMÉ (HT)', quote.totalCost_eur, '€'],
            [],
            ['DÉTAILS TRANSPORT'],
            ['Volume Total', transport.totalVolume_m3, 'm³'],
            ['Type de Véhicule', transport.vehicleType === 'CAMION_20M3' ? 'Camion 20m³' : 'Poids Lourd'],
            ['Forfait de base', transport.baseCost_eur, '€'],
            ['Supplément Km', transport.distanceCost_eur, '€']
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
        wsSummary['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé Devis');

        // 2. Per-Artwork Detail Sheet
        const artworkHeader = ['TITRE', 'ARTISTE', 'TYPE', 'COÛT CAISSE', 'COÛT EMBALLAGE', 'TOTAL ŒUVRE'];
        const artworkRows = artworks.map(a => {
            const packingCost = calculatePackingService(a).packingCost_eur;
            const crateCost = a.crate_estimated_cost || 0;
            return [
                a.title,
                a.artist,
                a.typology,
                crateCost,
                packingCost,
                crateCost + packingCost
            ];
        });

        const wsArtworks = XLSX.utils.aoa_to_sheet([artworkHeader, ...artworkRows]);
        wsArtworks['!cols'] = [
            { wch: 30 }, // Titre
            { wch: 20 }, // Artiste
            { wch: 15 }, // Type
            { wch: 15 }, // Caisse
            { wch: 15 }, // Emballage
            { wch: 15 }  // Total
        ];
        XLSX.utils.book_append_sheet(wb, wsArtworks, 'Détail par Œuvre');

        // 3. Technical Breakdown Sheet
        const breakdownLines = quote.breakdown.split('\n').map((line: string) => [line]);
        const wsBreakdown = XLSX.utils.aoa_to_sheet(breakdownLines);
        wsBreakdown['!cols'] = [{ wch: 80 }];
        XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Breakdown Technique');

        // Trigger Download
        XLSX.writeFile(wb, `${project.reference_code}_Devis_Complet_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error("Excel Export Error:", error);
        alert("Erreur lors de la génération du fichier Excel.");
    }
};

function calculatePackingService(artwork: Artwork) {
    const TAUX_HORAIRE_EMBALLEUR = 65; // Matches pricing.ts approx
    const surface_m2 = (artwork.dimensions_h_cm * artwork.dimensions_w_cm) / 10000;
    let packingTime = 0.5;
    let workers = 2;

    if (artwork.typology === 'TABLEAU') {
        if (surface_m2 < 1) packingTime = 0.25;
        else if (surface_m2 < 4) packingTime = 0.5;
        else packingTime = 1;
    } else if (artwork.typology === 'SCULPTURE') {
        packingTime = 1.5;
        if (artwork.weight_kg > 50) workers = 3;
    }

    if (artwork.fragility && artwork.fragility >= 4) packingTime *= 1.5;

    return { packingCost_eur: packingTime * workers * TAUX_HORAIRE_EMBALLEUR };
}

function TotalsValue(val: number) {
    return Math.round(val * 100) / 100;
}
