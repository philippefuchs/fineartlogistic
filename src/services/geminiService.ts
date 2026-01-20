import { GoogleGenerativeAI } from "@google/generative-ai";
import { QUOTE_EXTRACTOR_PROMPT, CRATE_CALCULATOR_PROMPT, LOGISTICS_FLOW_PLANNER_PROMPT, CCTP_EXTRACTOR_PROMPT, ADDRESS_EXTRACTOR_PROMPT, BATCH_ADDRESS_EXTRACTOR_PROMPT } from "./aiPrompts";
import { QuoteLine, Artwork, LogisticsPlanResult } from "../types";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
        responseMimeType: "application/json",
    }
});

/**
 * Robustly parses JSON from AI responses, handling markdown blocks and common formatting issues.
 */
function parseAIJson(text: string) {
    try {
        // 1. Remove markdown code blocks
        let cleaned = text.trim();
        // Extract content between ```json and ``` or just ``` and ```
        const markdownRegex = /```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```/;
        const match = cleaned.match(markdownRegex);
        if (match) {
            cleaned = match[1] || match[2];
        }

        // 2. Find the bounds of the actual JSON object or array
        const firstCurly = cleaned.indexOf('{');
        const lastCurly = cleaned.lastIndexOf('}');
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');

        let start = -1;
        let end = -1;

        // Determine if we are looking for an object or an array based on what comes first
        if (firstCurly !== -1 && (firstBracket === -1 || (firstCurly < firstBracket && firstCurly !== -1))) {
            start = firstCurly;
            end = lastCurly;
        } else if (firstBracket !== -1) {
            start = firstBracket;
            end = lastBracket;
        }

        if (start === -1 || end === -1) {
            // If No explicit JSON structure found, try parsing the whole cleaned string
            return JSON.parse(cleaned);
        }

        const jsonString = cleaned.substring(start, end + 1);

        try {
            return JSON.parse(jsonString);
        } catch (e: any) {
            console.warn("Retrying JSON parse with sanitization after error:", e.message);

            // Safer sanitization
            let sanitized = jsonString
                .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
                // Handle unescaped newlines within values (simple heuristic)
                .replace(/:[\s\n]*"([\s\S]*?)"[\s\n]*([,}])/g, (m, p1, separator) => {
                    const escapedValue = p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                    return `: "${escapedValue}"${separator}`;
                });

            // Only replace single quotes if the model actually used them as delimiters
            if (sanitized.startsWith("'") && sanitized.endsWith("'")) {
                sanitized = '"' + sanitized.substring(1, sanitized.length - 1).replace(/"/g, '\\"').replace(/'/g, '"') + '"';
            }

            return JSON.parse(sanitized);
        }
    } catch (error: any) {
        console.error("AI JSON Parse Failure:", error.message);
        console.error("Raw text was:", text);
        try {
            // Attempt to show where it might have failed if we have the substring
            if (text.length > 200) {
                console.error("Text head:", text.substring(0, 100));
                console.error("Text tail:", text.substring(text.length - 100));
            }
        } catch (e) { }
        throw new Error(`Failed to process AI response: ${error.message}`);
    }
}

export async function extractQuoteData(content: string, pdfBase64?: string): Promise<Partial<QuoteLine>[]> {
    try {
        const promptParts: any[] = [
            QUOTE_EXTRACTOR_PROMPT,
            "Extract the following quote content into the requested JSON format:"
        ];

        if (pdfBase64) {
            promptParts.push({
                inlineData: {
                    data: pdfBase64,
                    mimeType: "application/pdf"
                }
            });
        }

        if (content) {
            promptParts.push(content);
        }

        const result = await model.generateContent(promptParts);

        const response = result.response;
        const text = response.text();

        return parseAIJson(text);
    } catch (error) {
        console.error("Extraction error:", error);
        throw error;
    }
}

export interface CrateCalculationResult {
    crate_type: 'MUSÉE' | 'VOYAGE';
    margin_cm: number;
    internal_dimensions: { h: number; w: number; d: number };
    external_dimensions: { h: number; w: number; d: number };
    recommended_materials: string[];
    estimated_cost_range: string;
}

export async function calculateCrateData(artwork: Artwork): Promise<CrateCalculationResult> {
    try {
        const artworkData = `
            Title: ${artwork.title}
            Dimensions: ${artwork.dimensions_h_cm}x${artwork.dimensions_w_cm}x${artwork.dimensions_d_cm}cm
            Insurance Value: ${artwork.insurance_value} EUR
            Typology: ${artwork.typology}
        `;

        const result = await model.generateContent([
            CRATE_CALCULATOR_PROMPT,
            "Calculate the crate requirements for this artwork:",
            artworkData
        ]);

        const response = result.response;
        const text = response.text();

        return parseAIJson(text);
    } catch (error) {
        console.error("Crate calculation error:", error);
        throw error;
    }
}



export async function planLogisticsFlow(
    artworks: Artwork[],
    origin: string,
    destination: string,
    cctpConstraints?: any
): Promise<LogisticsPlanResult> {
    // Check if API key is configured
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || apiKey === "") {
        // Return mock data for testing
        console.warn("⚠️ Gemini API key not configured. Using mock data.");
        return generateMockLogisticsPlan(artworks, origin, destination);
    }

    try {
        const flowData = `
            Items: ${artworks.map(a => `
                - Title: ${a.title}
                - Typology: ${a.typology}
                - Value: ${a.insurance_value} EUR
                - Dims: ${a.dimensions_h_cm}x${a.dimensions_w_cm}x${a.dimensions_d_cm}cm
                - Weight: ${a.weight_kg}kg
                - Notes/Materials: ${a.notes || "None"}
            `).join('\n')}
            Origin: ${origin}
            Destination: ${destination}
            ${cctpConstraints ? `CCTP Constraints: ${JSON.stringify(cctpConstraints)}` : 'No specific CCTP constraints provided.'}
        `;

        const result = await model.generateContent([
            LOGISTICS_FLOW_PLANNER_PROMPT,
            "Analyze and plan the logistics for this flow:",
            flowData
        ]);

        const response = result.response;
        const text = response.text();

        const parsed = parseAIJson(text);

        // Map NEW prompt structure to OLD UI structure to avoid breaking changes
        // "transport_mode": "ROAD_DOMESTIC" | "AIR_FREIGHT" | "ROAD_INTL"
        // "security_level": "SHUTTLE" | "DEDICATED" | "ARMORED"

        let method: 'ART_SHUTTLE' | 'DEDICATED_TRUCK' | 'AIR_FREIGHT' = 'DEDICATED_TRUCK';

        if (parsed.transport_mode === 'AIR_FREIGHT') {
            method = 'AIR_FREIGHT';
        } else if (parsed.security_level === 'SHUTTLE') {
            method = 'ART_SHUTTLE';
        } else {
            // Default covering DEDICATED, ARMORED, and road modes
            method = 'DEDICATED_TRUCK';
        }

        const finalResult: LogisticsPlanResult = {
            recommended_method: method,
            rationale: parsed.strategy_summary || parsed.risk_analysis?.reasoning || "Analyse complète effectuée.",
            estimated_lead_time: parsed.estimated_lead_time || "A confirmer",
            required_crate_level: parsed.required_crate_level || "VOYAGE",
            risk_assessment: parsed.risk_analysis?.is_high_risk ? 'HIGH' : (parsed.risk_analysis?.total_value > 500000 ? 'MEDIUM' : 'LOW'),
            alerts: parsed.alerts || [],
            split_recommendation: parsed.split_recommendation
        };

        return finalResult;
    } catch (error) {
        console.error("Logistics planning error:", error);
        throw error;
    }
}

// Mock data generator for testing without API key
function generateMockLogisticsPlan(artworks: Artwork[], origin: string, destination: string): LogisticsPlanResult {
    const totalValue = artworks.reduce((sum, a) => sum + a.insurance_value, 0);
    const isInternational = !origin.toLowerCase().includes('france') || !destination.toLowerCase().includes('france');

    // Determine method based on simple rules
    let method: 'ART_SHUTTLE' | 'DEDICATED_TRUCK' | 'AIR_FREIGHT';
    let leadTime: string;
    let rationale: string;
    let crateLevel: 'MUSÉE' | 'VOYAGE';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

    if (totalValue > 500000 || artworks.length > 20) {
        method = 'DEDICATED_TRUCK';
        leadTime = '5-7 jours';
        rationale = `Compte tenu de la valeur totale élevée (${totalValue.toLocaleString()} €) et du nombre d'œuvres (${artworks.length}), un camion dédié est recommandé pour garantir la sécurité et la traçabilité complète du transport.`;
        crateLevel = 'MUSÉE';
        riskLevel = totalValue > 1000000 ? 'HIGH' : 'MEDIUM';
    } else if (isInternational) {
        method = 'AIR_FREIGHT';
        leadTime = '3-5 jours';
        rationale = `Pour un transport international de ${origin} vers ${destination}, le fret aérien est optimal pour minimiser les délais tout en maintenant des conditions de sécurité maximales pour ${artworks.length} œuvre(s).`;
        crateLevel = 'MUSÉE';
        riskLevel = 'MEDIUM';
    } else {
        method = 'ART_SHUTTLE';
        leadTime = '2-4 jours';
        rationale = `Une navette d'art mutualisée est idéale pour ce transport de ${artworks.length} œuvre(s) entre ${origin} et ${destination}, offrant un excellent rapport qualité-prix tout en respectant les standards muséaux.`;
        crateLevel = 'VOYAGE';
        riskLevel = 'LOW';
    }

    return {
        recommended_method: method,
        estimated_lead_time: leadTime,
        rationale: rationale,
        required_crate_level: crateLevel,
        risk_assessment: riskLevel
    };
}

export interface CCTPAnalysisResult {
    constraints_detected: {
        access: {
            max_height_meters: number | null;
            max_length_meters: number | null;
            tail_lift_required: boolean;
            elevator_dimensions: { h: number; w: number; d: number } | null;
            rationale: string;
        };
        security: {
            armored_truck_required: boolean;
            police_escort_required: boolean;
            courier_supervision: boolean;
            tarmac_access: boolean;
            rationale: string;
        };
        packing: {
            nimp15_mandatory: boolean;
            acclimatization_hours: number | null;
            forbidden_materials: string[];
            rationale: string;
        };
        schedule: {
            night_work: boolean;
            sunday_work: boolean;
            hard_deadline: string | null;
            rationale: string;
        };
    };
    summary: string;
}

export async function analyzeCCTP(pdfBase64: string): Promise<CCTPAnalysisResult> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || apiKey === "") {
        console.warn("⚠️ Gemini API key not configured. Using mock CCTP data.");
        return {
            constraints_detected: {
                access: {
                    max_height_meters: 3.8,
                    max_length_meters: null,
                    tail_lift_required: true,
                    elevator_dimensions: { h: 2.5, w: 2.0, d: 3.5 },
                    rationale: "Hauteur limitée à 3.80m au porche d'entrée. Hayon requis car pas de quai de déchargement."
                },
                security: {
                    armored_truck_required: false,
                    police_escort_required: false,
                    courier_supervision: true,
                    tarmac_access: false,
                    rationale: "Présence d'un convoyeur musée requise pour l'ensemble du transport."
                },
                packing: {
                    nimp15_mandatory: true,
                    acclimatization_hours: 24,
                    forbidden_materials: ["Polyuréthane"],
                    rationale: "Toutes les caisses doivent être en bois traité NIMP15. Acclimatation de 24h avant déballage."
                },
                schedule: {
                    night_work: false,
                    sunday_work: false,
                    hard_deadline: "2026-06-15",
                    rationale: "Date d'ouverture de l'exposition impérative au 15 juin 2026."
                }
            },
            summary: "Le document technique impose des contraintes d'accès par porche (3.80m) et des exigences de conservation strictes (acclimatation 24h, NIMP15)."
        };
    }

    try {
        const result = await model.generateContent([
            CCTP_EXTRACTOR_PROMPT,
            {
                inlineData: {
                    data: pdfBase64,
                    mimeType: "application/pdf"
                }
            }
        ]);

        const text = result.response.text();
        return parseAIJson(text);
    } catch (error) {
        console.error("CCTP analysis error:", error);
        throw error;
    }
}

export async function parseAddressWithAI(rawText: string): Promise<{ city: string; country: string }> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey || apiKey === "") return { city: "", country: "" };

    try {
        const result = await model.generateContent([
            ADDRESS_EXTRACTOR_PROMPT,
            "Extract the following address:",
            rawText
        ]);
        const text = result.response.text();
        return parseAIJson(text);
    } catch (e) {
        console.error("AI Address Parse Error", e);
        return { city: "", country: "" };
    }
}

export async function batchParseAddressesWithAI(rawTexts: string[]): Promise<{ city: string; country: string }[]> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey || apiKey === "" || rawTexts.length === 0) {
        return rawTexts.map(() => ({ city: "", country: "" }));
    }

    try {
        const result = await model.generateContent([
            BATCH_ADDRESS_EXTRACTOR_PROMPT,
            "Extract the following list of addresses (one per line):",
            rawTexts.join('\n---\n')
        ]);
        const text = result.response.text();
        return parseAIJson(text);
    } catch (e) {
        console.error("AI Batch Address Parse Error", e);
        return rawTexts.map(() => ({ city: "", country: "" }));
    }
}
