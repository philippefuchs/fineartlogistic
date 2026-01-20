import { Artwork } from '@/types';
import { generateId } from '@/lib/generateId';
import { calculatePacking, Typology, getCrateTypeLabel } from "@/services/packingEngine";
import { calculateCost } from "@/services/costCalculator";
import { isCityName, getGeoEnrichedData } from "@/services/geoService";

/**
 * Service to centralize Excel import logic across the application.
 */

export const TARGET_FIELDS = [
    { key: "ignore", label: "Ignorer cette colonne" },
    { key: "title", label: "Titre de l'Œuvre" },
    { key: "artist", label: "Artiste" },
    { key: "typology", label: "Typologie (Tableau, Sculpture...)" },
    { key: "dimensions_h_cm", label: "Hauteur (cm)" },
    { key: "dimensions_w_cm", label: "Largeur (cm)" },
    { key: "dimensions_d_cm", label: "Profondeur (cm)" },
    { key: "dimensions_all", label: "Dimensions (H x L x P)" },
    { key: "weight_kg", label: "Poids (kg)" },
    { key: "insurance_value", label: "Valeur d'Assurance" },
    { key: "lender_city", label: "Ville d'Enlèvement" },
    { key: "lender_country", label: "Pays d'Enlèvement" },
    { key: "destination_city", label: "Ville de Livraison (Etape 1)" },
    { key: "destination_city_2", label: "Ville de Livraison 2 (Etape 2 - Tournée)" },
    { key: "courier_requirements", label: "Convoiement (CCTP)" },
    { key: "imposed_agent", label: "Transporteur Imposé (CCTP)" },
    { key: "customs_requirements", label: "Formalités Douanières (CCTP)" },
    { key: "packing_requirements", label: "Emballage Spécifique (CCTP)" }
];

/**
 * Detects the best header row in a 2D array from an Excel sheet.
 */
export const detectHeaderRow = (data: any[][]): number => {
    let bestRowIndex = 0;
    let maxMatches = 0;
    const keywords = ["titr", "artist", "haut", "larg", "prof", "poids", "valeur", "ville", "pays", "oeuvr", "mesur", "embal", "caisse", "coordon", "enlev", "dest", "livra", "locali", "adre", "propri"];

    for (let i = 0; i < Math.min(data.length, 20); i++) {
        const row = data[i];
        let matches = 0;
        if (Array.isArray(row)) {
            row.forEach(cell => {
                const str = String(cell).toLowerCase();
                if (keywords.some(k => str.includes(k))) matches++;
            });
        }
        if (matches > maxMatches) {
            maxMatches = matches;
            bestRowIndex = i;
        }
    }
    return bestRowIndex;
};

/**
 * Automatically maps Excel headers to internal fields.
 */
export const autoMapFields = (headers: string[]): Record<string, string> => {
    const newMap: Record<string, string> = {};
    headers.forEach(col => {
        const lower = String(col).toLowerCase().trim();

        // Security rule: ignore calculated columns or percentages
        if (lower.includes("%") || lower.includes("coeff") || lower.includes("précision") || /^[0-9.,]+$/.test(lower)) {
            newMap[col] = "ignore";
            return;
        }

        const clean = lower.replace(/[().]/g, ' ');

        // 1. Destinations & Address & CCTP (Highest Priority)
        // Note: Check Destination FIRST to avoid "Ville" matching Origin by default
        if ((lower.includes("dest") || lower.includes("livraison") || lower.includes("delivery") || lower.includes("final")) && (lower.includes("2") || lower.includes("bis") || lower.includes("sec") || lower.includes("tour"))) newMap[col] = "destination_city_2";
        else if (lower.includes("dest") || lower.includes("livra") || lower.includes("delivery") || lower.includes("arriv")) newMap[col] = "destination_city";
        else if (lower.includes("city") || lower.includes("ville") || lower.includes("départ") || lower.includes("origin") || lower.includes("lieu") || lower.includes("coordon") || lower.includes("enlev") || lower.includes("localis") || lower.includes("emplac") || lower.includes("adresse") || lower.includes("propri") || lower.includes("osier")) newMap[col] = "lender_city";
        else if (lower.includes("country") || lower.includes("pays")) newMap[col] = "lender_country";

        // CCTP
        else if (lower.includes("convoi")) newMap[col] = "courier_requirements";
        else if (lower.includes("comment") || lower.includes("remarqu") || lower.includes("not")) newMap[col] = "imposed_agent";
        else if (lower.includes("douan") || lower.includes("custom")) newMap[col] = "customs_requirements";
        else if (lower.includes("embal") || lower.includes("pack") || lower.includes("tech") || lower.includes("caisse")) newMap[col] = "packing_requirements";

        // 2. Dimensions (Before Metadata to protect "Hauteur" from "Auteur")
        else if (/\b(h|ht|haut|height|hauteur)\b/.test(clean) && !clean.includes("unit")) newMap[col] = "dimensions_h_cm";
        else if (/\b(l|lg|larg|width|largeur)\b/.test(clean) && !clean.includes("unit")) newMap[col] = "dimensions_w_cm";
        else if (/\b(p|pf|pr|prof|depth|profondeur|long|length)\b/.test(clean) && !clean.includes("unit")) newMap[col] = "dimensions_d_cm";
        else if ((lower.includes("dim") || lower.includes("mesure") || lower.includes("taille")) && !lower.includes("poid")) newMap[col] = "dimensions_all";

        // 3. Metadata (Lowest Priority)
        else if (lower.includes("titr") || lower.includes("title") || lower.includes("oeuvr") || lower.includes("nom")) newMap[col] = "title";
        else if (/\b(artist|artiste|auteur|peintre|createur)\b/.test(clean)) newMap[col] = "artist"; // Stricter regex for Artist
        else if (lower.includes("type") || lower.includes("cat") || lower.includes("typologie")) newMap[col] = "typology";
        else if (lower.includes("poid") || lower.includes("weight")) newMap[col] = "weight_kg";
        else if ((lower.includes("val") || lower.includes("insur") || lower.includes("montant")) && !lower.includes("percent") && !lower.includes("%")) {
            newMap[col] = "insurance_value";
        }

        // 4. Smart Destination Detection (City Names in Header)
        else {
            const { isCityName } = require("./geoService");
            // Clean header to check if it's a known city (e.g., "Bourg-en-Bresse")
            const potentialCity = clean.replace(/-/g, ' ').trim();
            if (isCityName(potentialCity)) {
                // If we already have destination 1, this is destination 2
                if (Object.values(newMap).includes("destination_city")) {
                    newMap[col] = "destination_city_2";
                } else {
                    newMap[col] = "destination_city";
                }
            } else {
                newMap[col] = "ignore";
            }
        }
    });
    return newMap;
};

/**
 * Parses a dimension string into H, W, D components.
 */
export const parseDimensions = (str: string): { h: number, w: number, d: number } => {
    if (!str) return { h: 0, w: 0, d: 0 };
    const cleanStr = str.toLowerCase().replace(/cm/g, '').replace(/mm/g, '').replace(/,/g, '.').trim();

    // Strategy 1: Explicit labels
    if (cleanStr.includes('h') && cleanStr.includes('l')) {
        const hMatch = cleanStr.match(/h[:\s]*([0-9.,]+)/);
        const wMatch = cleanStr.match(/[l|w][:\s]*([0-9.,]+)/);
        const dMatch = cleanStr.match(/[p|d][:\s]*([0-9.,]+)/);

        const parseVal = (m: RegExpMatchArray | null) => m ? parseFloat(m[1].replace(',', '.')) : 0;
        return { h: parseVal(hMatch), w: parseVal(wMatch), d: parseVal(dMatch) };
    }

    // Strategy 2: Separators
    if (cleanStr.match(/[xX\*×]/)) {
        const parts = cleanStr.split(/[xX\*×]/).map(p => {
            const numStr = p.replace(/[^0-9.]/g, '');
            return parseFloat(numStr) || 0;
        });
        return { h: parts[0] || 0, w: parts[1] || 0, d: parts[2] || 0 };
    }

    // Strategy 3: Just numbers
    const numbers = cleanStr.match(/[0-9.]+/g);
    if (numbers && numbers.length >= 2) {
        const vals = numbers.map(n => parseFloat(n));
        return { h: vals[0] || 0, w: vals[1] || 0, d: vals[2] || 0 };
    }

    return { h: 0, w: 0, d: 0 };
};

/**
 * Processes rows from Excel and converts them to Artwork objects.
 */
export const processArtworkRows = (
    allRows: any[][],
    headerRowIndex: number,
    mapping: Record<string, string>,
    projectId: string,
    useInches: boolean = false
): Artwork[] => {
    const headerRow = allRows[headerRowIndex];
    const colIdxMap: Record<string, number> = {};
    headerRow.forEach((colName, idx) => {
        const targetKey = mapping[colName];
        if (targetKey && targetKey !== "ignore") {
            colIdxMap[targetKey] = idx;
        }
    });

    // Runtime Fallback: If lender_city not mapped, look for it now
    if (colIdxMap["lender_city"] === undefined) {
        headerRow.forEach((col, idx) => {
            const lower = String(col).toLowerCase();
            if (lower.includes("coordon") || lower.includes("osier") || lower.includes("adre") || lower.includes("enlev")) {
                colIdxMap["lender_city"] = idx;
            }
        });
    }

    const conversionFactor = useInches ? 2.54 : 1;
    const artworks: Artwork[] = [];

    // Context for Fill-Down (Merged Cells)
    const context = {
        lender_city: "Paris",
        lender_country: "France",
        owner: "",
        raw_address: ""
    };

    // DEBUG: Capture values from the address column for the first few rows
    const _debug_addr_trace: any[] = [];

    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const row = allRows[i];
        if (!row || row.length === 0) continue;

        // Trace address column value
        if (colIdxMap["lender_city"] !== undefined && _debug_addr_trace.length < 5) {
            _debug_addr_trace.push({
                row: i,
                val: row[colIdxMap["lender_city"]],
                idx: colIdxMap["lender_city"]
            });
        }

        // 1. Capture Context from this row (Address/Owner columns)
        // If these cells are non-empty, they update the current context.
        if (colIdxMap["lender_city"] !== undefined && row[colIdxMap["lender_city"]]) {
            const raw = String(row[colIdxMap["lender_city"]]).trim();
            if (raw) {
                context.raw_address = raw;
                // Try regex extraction first
                // ... (Logic from before)
                const { isCityName, getGeoEnrichedData } = require("./geoService");
                let foundCity = "";

                // (Reuse existing regex logic here for synchronous partial success)
                if (raw.length > 30 || raw.includes("\n")) {
                    const chunks = raw.split(/[\n,;]/).map(s => s.trim());
                    for (const chunk of chunks) {
                        const clean = chunk.replace(/[0-9]/g, '').trim();
                        if (isCityName(clean)) { foundCity = clean; break; }
                        // Also check for "B - 1000 Bruxelles" pattern (handling various dash types)
                        if (chunk.match(/[A-Z]{1,2}\s*[-–—]\s*\d+/)) {
                            // The NEXT part might be the city
                            const parts = chunk.split(/[-–—]/); // split by dash
                            const postalPart = parts[1] || "";
                            // " 1000 Bruxelles I Brussel"
                            // Split by space or I or |
                            const subParts = postalPart.trim().split(/[\s|I]+/);
                            // Find the subpart that looks like a zip code
                            const zipIndex = subParts.findIndex(p => /^\d{4,5}$/.test(p));

                            if (zipIndex >= 0) {
                                // Check words AFTER the zip code
                                // candidates: subParts[zipIndex+1], subParts[zipIndex+2]...
                                for (let k = zipIndex + 1; k < subParts.length; k++) {
                                    if (isCityName(subParts[k])) {
                                        foundCity = subParts[k].replace(/[,.]/g, '');

                                        // Auto-update country based on city
                                        const geo = getGeoEnrichedData(foundCity, "");
                                        if (geo.countryName && geo.countryName !== "France") {
                                            context.lender_country = geo.countryName; // Update context country!
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } else if (isCityName(raw)) {
                    foundCity = raw;
                }

                if (foundCity) {
                    context.lender_city = foundCity;
                    const geo = getGeoEnrichedData(foundCity, "");
                    if (geo.countryName && geo.countryName !== "France") context.lender_country = geo.countryName;
                } else {
                    // Fallback check
                    if (raw.toLowerCase().includes("bruxelles")) { context.lender_city = "Bruxelles"; context.lender_country = "Belgique"; }
                    else if (raw.toLowerCase().includes("londres")) { context.lender_city = "Londres"; context.lender_country = "Royaume-Uni"; }
                }
            }
        }



        const artwork: any = {
            id: generateId(),
            project_id: projectId,
            created_at: new Date().toISOString(),
            title: "Sans titre",
            artist: "Inconnu",
            typology: "TABLEAU",
            dimensions_h_cm: 0,
            dimensions_w_cm: 0,
            dimensions_d_cm: 0,
            weight_kg: 2,
            insurance_value: 0,
            lender_city: "Paris",
            lender_country: "France",
            destination_country: "France"
        };

        const handledFields = new Set<string>();

        Object.keys(colIdxMap).forEach(targetKey => {
            if (handledFields.has(targetKey)) return;

            const idx = colIdxMap[targetKey];
            const value = row[idx];
            const colName = String(headerRow[idx]);

            if (String(value).trim() === "") return; // Skip empty strings

            // Capture debug trace for dimensions
            if (targetKey.includes("dimensions")) {
                (artwork as any)._debug_dim_trace = (artwork as any)._debug_dim_trace || [];
                (artwork as any)._debug_dim_trace.push({ key: targetKey, val: value, col: colName });
            }

            if (targetKey === "dimensions_all") {
                const dims = parseDimensions(String(value));
                // Only update if we have meaningful values (don't overwrite with 0s)
                if (dims.h > 0) artwork.dimensions_h_cm = dims.h * conversionFactor;
                if (dims.w > 0) artwork.dimensions_w_cm = dims.w * conversionFactor;
                if (dims.d > 0) artwork.dimensions_d_cm = dims.d * conversionFactor;
            } else if (targetKey.includes("dimensions") || targetKey === "insurance_value" || targetKey === "weight_kg") {
                const cleanValue = String(value).replace(/\s/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
                const num = parseFloat(cleanValue);
                const finalValue = isNaN(num) ? 0 : num;

                if (targetKey.includes("dimensions")) {
                    // Preserve decimals (no Math.round)
                    if (finalValue > 0) artwork[targetKey] = finalValue * conversionFactor;
                } else {
                    artwork[targetKey] = finalValue;
                }
            } else if (targetKey === "destination_city" || targetKey === "destination_city_2") {
                const valStr = String(value).toLowerCase().trim();
                if (valStr === "oui" || valStr === "yes" || valStr === "true" || valStr === "x") {
                    // Use header name as city if value is boolean
                    artwork[targetKey] = colName;
                } else if (valStr === "non" || valStr === "no" || valStr === "false" || valStr === "") {
                    // Skip if value is explicit "no"
                    if (!artwork[targetKey]) artwork[targetKey] = "";
                } else {
                    artwork[targetKey] = String(value);
                }
            } else if (targetKey === "lender_city") {
                const valStr = String(value).trim();
                // Try to extract city from address block if it looks like an address
                if (valStr.length > 30 || valStr.includes("\n") || /\d{4,5}/.test(valStr)) {
                    const { isCityName, getCountryCode } = require("./geoService");

                    // 1. Try to find a known city (starting with largest matches)
                    let foundCity = "";
                    // Simple extraction: split by common delimiters and check chunks
                    const chunks = valStr.split(/[\n,;-]/).map(s => s.trim());
                    for (const chunk of chunks) {
                        // Check if chunk is a city
                        const cleanChunk = chunk.replace(/[0-9]/g, '').trim(); // Remove zip codes
                        if (isCityName(cleanChunk)) {
                            foundCity = cleanChunk;
                            break;
                        }
                        // Also check for "B - 1000 Bruxelles" pattern (handling various dash types)
                        if (chunk.match(/[A-Z]{1,2}\s*[-–—]\s*\d+/)) {
                            // The NEXT part might be the city
                            const parts = chunk.split(/[-–—]/); // split by dash
                            const postalPart = parts[1] || "";
                            // " 1000 Bruxelles I Brussel"
                            // Split by space or I or |
                            const subParts = postalPart.trim().split(/[\s|I]+/);
                            // Find the subpart that looks like a zip code
                            const zipIndex = subParts.findIndex(p => /^\d{4,5}$/.test(p));

                            if (zipIndex >= 0) {
                                // Check words AFTER the zip code
                                // candidates: subParts[zipIndex+1], subParts[zipIndex+2]...
                                for (let k = zipIndex + 1; k < subParts.length; k++) {
                                    if (isCityName(subParts[k])) {
                                        foundCity = subParts[k].replace(/[,.]/g, '');
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // Fallback: look for "Bruxelles" or "Paris" anywhere
                    if (!foundCity) {
                        if (valStr.toLowerCase().includes("bruxelles") || valStr.toLowerCase().includes("brussels")) foundCity = "Bruxelles";
                        else if (valStr.toLowerCase().includes("paris")) foundCity = "Paris";
                        else if (valStr.toLowerCase().includes("london") || valStr.toLowerCase().includes("londres")) foundCity = "London";
                    }

                    artwork[targetKey] = foundCity || valStr; // Keep original if no extraction

                    // Force update country if we found a city
                    if (foundCity) {
                        const geo = getGeoEnrichedData(foundCity, "");
                        if (geo.countryName && geo.countryName !== "France") {
                            artwork.lender_country = geo.countryName;
                        }
                    }
                } else {
                    artwork[targetKey] = valStr;
                }
            } else if (targetKey === "imposed_agent") {
                const valStr = String(value);
                artwork.imposed_agent = valStr;
                if (valStr.toLowerCase().includes("douan") || valStr.toLowerCase().includes("admin")) {
                    artwork.customs_requirements = true;
                }
            } else if (targetKey === "customs_requirements") {
                artwork.customs_requirements = String(value).toLowerCase().includes("oui");
            } else {
                artwork[targetKey] = String(value);
            }
        });

        // Automation of Packing & Cost
        const packing = calculatePacking({
            h_cm: artwork.dimensions_h_cm || 0,
            w_cm: artwork.dimensions_w_cm || 0,
            d_cm: artwork.dimensions_d_cm || 0,
            weight_kg: artwork.weight_kg || 0,
            typology: (artwork.typology as Typology) || 'TABLEAU',
            fragility: 2,
            hasFragileFrame: false
        });

        // Apply CCTP overrides from packing_requirements if present
        if (artwork.packing_requirements) {
            const reqs = artwork.packing_requirements.toLowerCase();
            if (reqs.includes("isotherme") || reqs.includes("climatique") || reqs.includes("musée") || reqs.includes("museum") || reqs.includes("t2")) {
                packing.crateType = 'T2_MUSEE';
            } else if (reqs.includes("voyage") || reqs.includes("galerie") || reqs.includes("t1")) {
                packing.crateType = 'T1_GALERIE';
            } else if (reqs.includes("tampon") || reqs.includes("bulle") || reqs.includes("soft") || reqs.includes("carton")) {
                packing.crateType = 'SOFT_PACK';
            }

            // Adjust external dims based on crate type
            const paddingMap = { 'T2_MUSEE': 100, 'T1_GALERIE': 60, 'SOFT_PACK': 20 };
            const padding = paddingMap[packing.crateType as keyof typeof paddingMap] || 60;
            packing.external_h_mm = packing.internal_h_mm + padding;
            packing.external_w_mm = packing.internal_w_mm + padding;
            packing.external_d_mm = packing.internal_d_mm + padding;
            packing.externalVolume_m3 = (packing.external_h_mm * packing.external_w_mm * packing.external_d_mm) / 1_000_000_000;
        }

        const costBreakdown = calculateCost(packing);

        artwork.crate_specs = {
            crate_type: packing.crateType === 'T2_MUSEE' ? 'MUSÉE' : (packing.crateType === 'SOFT_PACK' ? 'TAMPO' : 'VOYAGE'),
            internal_dimensions: {
                h: packing.internal_h_mm,
                w: packing.internal_w_mm,
                d: packing.internal_d_mm
            },
            external_dimensions: {
                h: packing.external_h_mm,
                w: packing.external_w_mm,
                d: packing.external_d_mm
            }
        };

        artwork.recommended_crate = getCrateTypeLabel(packing.crateType);
        artwork.crate_estimated_cost = Math.ceil(costBreakdown.sellingPrice_eur);
        artwork.crate_factory_cost = costBreakdown.factoryCost_eur;
        artwork.crate_calculation_details = `${getCrateTypeLabel(packing.crateType)} | Volume ext: ${packing.externalVolume_m3.toFixed(3)}m3 | MO: ${costBreakdown.fabricationTime_hours}h`;

        if (artwork.title !== "Sans titre" || (artwork.insurance_value && artwork.insurance_value > 0)) {
            // Always ensure debug info is attached if possible
            if (colIdxMap["lender_city"] !== undefined) {
                (artwork as any)._debug_address_raw = String(row[colIdxMap["lender_city"]] || "").trim();
            }

            // Attach extra debug info to the first artwork
            if (artworks.length === 0) {
                (artwork as any)._debug_lender_col_idx = colIdxMap["lender_city"];
                (artwork as any)._debug_mapping_keys = Object.keys(colIdxMap);
                (artwork as any)._debug_addr_trace = _debug_addr_trace;
                (artwork as any)._debug_context_raw = context.raw_address;
            }
            artworks.push(artwork as Artwork);
        }
    }

    return artworks;
};

/**
 * Enriches a list of artworks with AI-parsed address data.
 * Batches unique addresses to minimize API calls.
 */
export async function enrichArtworksWithAI(artworks: Artwork[], onProgress?: (p: number) => void): Promise<Artwork[]> {
    const { batchParseAddressesWithAI } = await import("./geminiService");

    // 1. Group artworks by their raw address
    const addressGroups: Record<string, Artwork[]> = {};
    artworks.forEach(a => {
        const raw = (a as any)._debug_address_raw;
        if (raw && raw.length > 5) { // Only process if it looks like more than just a city name
            addressGroups[raw] = addressGroups[raw] || [];
            addressGroups[raw].push(a);
        }
    });

    const uniqueAddresses = Object.keys(addressGroups);
    if (uniqueAddresses.length === 0) return artworks;

    // 2. Process unique addresses in chunks (e.g., 20 at a time) to avoid prompt size limits and rate limits
    const CHUNK_SIZE = 20;
    for (let i = 0; i < uniqueAddresses.length; i += CHUNK_SIZE) {
        const chunk = uniqueAddresses.slice(i, i + CHUNK_SIZE);
        try {
            const results = await batchParseAddressesWithAI(chunk);

            chunk.forEach((raw, idx) => {
                const aiRes = results[idx];
                if (aiRes && aiRes.city) {
                    addressGroups[raw].forEach(a => {
                        a.lender_city = aiRes.city;
                        if (aiRes.country) a.lender_country = aiRes.country;
                        (a as any)._ai_processed = true;
                    });
                } else {
                    addressGroups[raw].forEach(a => {
                        (a as any)._ai_processed = "Failed";
                    });
                }
            });
        } catch (e) {
            console.error(`AI Batch Enrichment failed for chunk starting at ${i}`, e);
            chunk.forEach(raw => {
                addressGroups[raw].forEach(a => {
                    (a as any)._ai_processed = "Error";
                });
            });
        }
        if (onProgress) onProgress(Math.round((Math.min(i + CHUNK_SIZE, uniqueAddresses.length) / uniqueAddresses.length) * 100));

        // Brief delay between chunks if many
        if (uniqueAddresses.length > CHUNK_SIZE) {
            await new Promise(resolve => setTimeout(resolve, 6000));
        }
    }

    return [...artworks];
}
