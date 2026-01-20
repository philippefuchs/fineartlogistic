import { Artwork, LogisticsFlow, LogisticsConfig, QuoteLine, TeamRole } from "../types";
import { generateId } from "../lib/generateId";
import { getGeoEnrichedData } from "./geoService";
import { calculateTransport } from "@/services/logisticsEngine";
import { recommendTeam, estimateMissionDuration } from "@/services/teamRecommendation";
import { calculateRoute } from "@/services/googleMapsService";
import { calculateTeamCosts } from "@/services/teamCostCalculator";

/**
 * Smart Geo-Clustering Service
 * Transforms a list of artworks into coherent logistics flows
 * Based on country grouping and transport mode determination
 */

/**
 * Step C: Determine flow type based on origin and destination
 */
function determineFlowType(originCountryCode: string, destinationCountryCode: string, isEU: boolean): string {
    // Same country = domestic road
    if (originCountryCode === destinationCountryCode) {
        return 'FRANCE_INTERNAL';
    }

    // EU country (excluding GB due to Brexit) = EU road
    if (isEU && originCountryCode !== 'GB') {
        return 'EU_ROAD';
    }

    // Everything else = international air
    return 'AIR_FREIGHT';
}

/**
 * Main function: Generate flows from artworks
 * Implements Steps A, B, C, and D
 * Handles Case 1 (Single Destination) and Case 2 (Double Destination / Tournée)
 */
export async function generateFlowsFromArtworks(
    projectId: string,
    artworks: Artwork[],
    organizingMuseum: string = "Paris",
    currency: string = "EUR",
    logisticsConfig: LogisticsConfig
): Promise<{ flows: LogisticsFlow[]; artworksWithFlowIds: Artwork[]; quoteLines: QuoteLine[] }> {

    // Determine organizer country
    const organizerGeo = getGeoEnrichedData("", organizingMuseum);
    const organizerCountryCode = organizerGeo.countryCode;

    // Helper to get default destination based on organizer
    const getDefaultDestination = (countryCode: string) => {
        return countryCode === 'US' ? 'New York' :
            countryCode === 'GB' ? 'London' :
                'Paris';
    };

    const defaultDestinationCity = getDefaultDestination(organizerCountryCode);

    // Maps to store created flows by unique identifiers
    const flowsMap = new Map<string, LogisticsFlow>();
    const artworksWithFlowIds = [...artworks];
    const quoteLines: QuoteLine[] = [];
    const now = new Date().toISOString();

    // Track artworks per flow for volume calculation
    const flowArtworksMap = new Map<string, Artwork[]>();

    // 1. FIRST PASS: Create Flow Skeletons and assign Artworks
    artworksWithFlowIds.forEach(artwork => {
        const geo = getGeoEnrichedData(artwork.lender_city, artwork.lender_country);
        const originCity = artwork.lender_city || "Inconnu";
        const v1 = artwork.destination_city || defaultDestinationCity;
        const v2 = artwork.destination_city_2;

        // SEGMENT 1: Pickup -> V1
        const segment1Key = `${originCity}|${v1}`;
        if (!flowsMap.has(segment1Key)) {
            const flowId = generateId();
            const flowType = determineFlowType(geo.countryCode, organizerCountryCode, geo.isEU);

            const status = artwork.imposed_agent ? 'AWAITING_QUOTE' : 'PENDING_QUOTE'; // Will be updated if we auto-calculate
            const validatedAgent = artwork.imposed_agent || undefined;

            flowsMap.set(segment1Key, {
                id: flowId,
                project_id: projectId,
                origin_country: geo.countryName,
                destination_country: organizerGeo.countryName,
                origin_city: originCity,
                destination_city: v1,
                flow_type: flowType as any,
                status: status as any,
                validated_agent_name: validatedAgent,
                created_at: now
            });
            flowArtworksMap.set(segment1Key, []);
        }

        const flowId = flowsMap.get(segment1Key)!.id;
        artwork.flow_id = flowId;
        flowArtworksMap.get(segment1Key)?.push(artwork);

        // SEGMENT 2 (Transfer): V1 -> V2
        if (v1 && v2) {
            const transferKey = `${v1}|${v2}`;
            if (!flowsMap.has(transferKey)) {
                const flowId = generateId();
                flowsMap.set(transferKey, {
                    id: flowId,
                    project_id: projectId,
                    origin_country: organizerGeo.countryName, // Assuming V1 is close to organizer or we should use V1 geo
                    destination_country: organizerGeo.countryName, // Assuming V2 is close to organizer
                    origin_city: v1,
                    destination_city: v2,
                    flow_type: 'FRANCE_INTERNAL', // Default for transfers
                    status: "PENDING_QUOTE",
                    created_at: now
                });
                flowArtworksMap.set(transferKey, []);
            }
            // FIX: Add artwork to this flow so volume is calculated
            // We clone artwork to assign new flow_id if we want unique reference, 
            // but here we just need volume calculation, so reference is fine for volume calc.
            // However, for "artworksWithFlowIds" return, we can only assign ONE flow_id per artwork object instance.
            // This method returns "artworksWithFlowIds", which implies an artwork belongs to ONE flow.
            // For the purpose of "flowArtworksMap" (calculation), we can push the same artwork.
            flowArtworksMap.get(transferKey)?.push(artwork);
        }

        // SEGMENT 3 (Direct): Origin -> V2
        if (v2) {
            const directKey = `${originCity}|${v2}`;
            if (!flowsMap.has(directKey)) {
                const flowId = generateId();
                const flowType = determineFlowType(geo.countryCode, organizerCountryCode, geo.isEU);

                flowsMap.set(directKey, {
                    id: flowId,
                    project_id: projectId,
                    origin_country: geo.countryName,
                    destination_country: organizerGeo.countryName,
                    origin_city: originCity,
                    destination_city: v2,
                    flow_type: flowType as any,
                    status: "PENDING_QUOTE",
                    created_at: now
                });
                flowArtworksMap.set(directKey, []);
            }
            flowArtworksMap.get(directKey)?.push(artwork);
        }

        // SEGMENT 4 (Return): V2 -> Origin OR V1 -> Origin
        const returnOrigin = v2 || v1;
        const returnKey = `${returnOrigin}|RETURN|${originCity}`;
        if (!flowsMap.has(returnKey)) {
            const flowId = generateId();
            const flowType = determineFlowType(organizerCountryCode, geo.countryCode, geo.isEU);
            flowsMap.set(returnKey, {
                id: flowId,
                project_id: projectId,
                origin_country: organizerGeo.countryName,
                destination_country: geo.countryName,
                origin_city: returnOrigin,
                destination_city: originCity,
                flow_type: flowType as any,
                status: "PENDING_QUOTE",
                created_at: now
            });
            // We don't attach artworks to return flow usually, it's just a line item
        }
    });

    // 2. SECOND PASS: Enrich Flows with AI Strategy (Cost, Team, Vehicle)
    for (const [key, flow] of flowsMap.entries()) {
        const flowArtworks = flowArtworksMap.get(key) || [];

        if (flowArtworks.length > 0) {
            // A. Calculate Route & Distance
            const route = await calculateRoute(flow.origin_city || "", flow.destination_city || "");

            // B. Calculate Transport Cost (Volume based)
            const transportCalc = calculateTransport(flowArtworks, route.distanceKm);

            // C. Recommend Team
            const teamRec = recommendTeam(flowArtworks, route.distanceKm, logisticsConfig.team_roles);

            // D. Calculate Team Costs
            const teamCosts = calculateTeamCosts(
                teamRec.team_members.map(m => ({ ...m, role_name: m.role_name })),
                teamRec.mission_duration_days,
                flow.destination_country,
                logisticsConfig
            );

            // E. Update Flow Object
            flow.team_members = teamRec.team_members;
            flow.mission_duration_days = teamRec.mission_duration_days;
            flow.transport_cost_total = transportCalc.totalTransportCost_eur;
            flow.team_cost_total = teamCosts.team_total;
            flow.per_diem_total = teamCosts.per_diem_total;
            flow.hotel_total = teamCosts.hotel_total;
            flow.status = 'PENDING_QUOTE';

            // Override flow_type if vehicle size dictates (e.g. Upgrade to PL)
            if (transportCalc.vehicleType === 'POIDS_LOURD' && (flow.flow_type === 'FRANCE_ROAD' || flow.flow_type === 'EU_ROAD')) {
                // Keep as ROAD but cost reflects PL
            }

            // Create Default Step for Timeline
            flow.steps = [{
                id: generateId(),
                flow_id: flow.id,
                label: `Transport ${flow.origin_city} -> ${flow.destination_city}`,
                duration_days: teamRec.mission_duration_days,
                start_day: 0,
                team_composition: teamRec.team_members.map(m => ({ role_id: m.role_id, count: m.count }))
            }];

            // F. Generate Quote Lines for this Flow

            // 1. Transport Line
            quoteLines.push({
                id: generateId(),
                project_id: projectId,
                flow_id: flow.id,
                category: 'TRANSPORT',
                description: `Transport (${transportCalc.vehicleType === 'POIDS_LOURD' ? 'Poids Lourd' : '20m³'}) : ${flow.origin_city} → ${flow.destination_city} (${Math.round(transportCalc.totalVolume_m3)}m³)`,
                quantity: 1,
                unit_price: transportCalc.totalTransportCost_eur,
                total_price: transportCalc.totalTransportCost_eur,
                currency,
                source: 'CALCULATION',
                created_at: now
            });

            // 2. Handling / Team Line
            if (teamCosts.team_total > 0) {
                quoteLines.push({
                    id: generateId(),
                    project_id: projectId,
                    flow_id: flow.id,
                    category: 'HANDLING',
                    description: `Intervention Équipe Technique (${teamRec.team_members.reduce((acc, m) => acc + m.count, 0)} pers. / ${teamRec.mission_duration_days} jours)`,
                    quantity: 1,
                    unit_price: teamCosts.team_total,
                    total_price: teamCosts.team_total,
                    currency,
                    source: 'CALCULATION',
                    created_at: now
                });
            }

            // 3. CCTP Lines (Customs/Courier) - if International
            if (flow.flow_type === 'INTL_AIR') {
                if (flowArtworks.some(a => a.customs_requirements)) {
                    quoteLines.push({
                        id: generateId(),
                        project_id: projectId,
                        flow_id: flow.id,
                        category: 'CUSTOMS',
                        description: `Douanes Import/Export (CCTP) - ${flow.origin_country}`,
                        quantity: 1,
                        unit_price: 450,
                        total_price: 450,
                        currency,
                        source: 'ESTIMATION',
                        created_at: now
                    });
                }
            }

        } else if (key.includes('RETURN')) {
            // Simple estimation for return
            quoteLines.push({
                id: generateId(),
                project_id: projectId,
                flow_id: flow.id,
                category: 'TRANSPORT',
                description: `Estimation retour: ${flow.origin_city} → ${flow.destination_city}`,
                quantity: 1,
                unit_price: flow.flow_type === 'AIR_FREIGHT' ? 4500 : 850,
                total_price: flow.flow_type === 'AIR_FREIGHT' ? 4500 : 850,
                currency,
                source: 'ESTIMATION',
                created_at: now
            });
        }
    }

    // 3. Generate Packing Lines (Per Artwork)
    artworksWithFlowIds.forEach(artwork => {
        if (artwork.crate_estimated_cost && artwork.flow_id) {
            quoteLines.push({
                id: generateId(),
                project_id: projectId,
                flow_id: artwork.flow_id,
                category: 'PACKING',
                description: `Emballage caisse pour "${artwork.title}"`,
                quantity: 1,
                unit_price: artwork.crate_estimated_cost,
                total_price: artwork.crate_estimated_cost,
                currency,
                source: 'CALCULATION',
                created_at: now
            });
        }
    });

    const flows = Array.from(flowsMap.values());
    console.log(`🎯 Smart Generated ${flows.length} flow segments and ${quoteLines.length} quote lines`);

    return { flows, artworksWithFlowIds, quoteLines };
}

