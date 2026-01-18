import { GoogleGenerativeAI } from "@google/generative-ai";
import { QUOTE_EXTRACTOR_PROMPT, CRATE_CALCULATOR_PROMPT, LOGISTICS_FLOW_PLANNER_PROMPT } from "./aiPrompts";
import { QuoteLine, Artwork } from "../types";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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

        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = text.match(/\[\s*{[\s\S]*}\s*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error("Could not parse JSON from AI response");
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

        const jsonMatch = text.match(/{[\s\S]*}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error("Could not parse JSON from AI response");
    } catch (error) {
        console.error("Crate calculation error:", error);
        throw error;
    }
}

export interface LogisticsPlanResult {
    recommended_method: 'ART_SHUTTLE' | 'DEDICATED_TRUCK' | 'AIR_FREIGHT';
    rationale: string;
    estimated_lead_time: string;
    required_crate_level: 'MUSÉE' | 'VOYAGE';
    risk_assessment: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function planLogisticsFlow(
    artworks: Artwork[],
    origin: string,
    destination: string
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
            Items: ${artworks.map(a => `${a.title} (${a.typology}, ${a.insurance_value} EUR)`).join(', ')}
            Origin: ${origin}
            Destination: ${destination}
        `;

        const result = await model.generateContent([
            LOGISTICS_FLOW_PLANNER_PROMPT,
            "Plan the logistics for this flow:",
            flowData
        ]);

        const response = result.response;
        const text = response.text();

        const jsonMatch = text.match(/{[\s\S]*}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error("Could not parse JSON from AI response");
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
