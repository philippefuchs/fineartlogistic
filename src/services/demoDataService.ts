import { Project, Artwork, LogisticsFlow, QuoteLine, TeamRole, FlowType } from '../types';
import { calculatePacking, getCrateTypeLabel } from './packingEngine';
import { calculateCost, formatCostBreakdown } from './costCalculator';

const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

export const generateAppelOffre = () => {
    const projectId = generateSimpleId();
    const now = new Date().toISOString();

    const project: Project = {
        id: projectId,
        reference_code: `AO-${Math.floor(Math.random() * 10000)}`,
        name: "Appel d'Offre - Exposition 'L'Héritage Mondial'",
        organizing_museum: "Musée du Louvre, Paris",
        status: 'DRAFT',
        currency: 'EUR',
        target_budget: 150000,
        created_at: now
    };

    const countries = [
        { name: 'France', city: 'Paris', museum: 'Centre Pompidou' },
        { name: 'États-Unis', city: 'New York', museum: 'The Metropolitan Museum of Art' },
        { name: 'Japon', city: 'Tokyo', museum: 'Tokyo National Museum' }
    ];

    const artworks: Artwork[] = [];
    const flows: LogisticsFlow[] = [];
    const quoteLines: QuoteLine[] = [];

    // Create 5 artworks per country
    countries.forEach((country, countryIdx) => {
        const flowId = generateSimpleId();

        // Define flow type based on country
        let flowType: FlowType = 'FRANCE_ROAD';
        if (country.name === 'États-Unis' || country.name === 'Japon') {
            flowType = 'INTL_AIR';
        }

        const flow: LogisticsFlow = {
            id: flowId,
            project_id: projectId,
            origin_country: country.name,
            destination_country: 'France',
            origin_city: country.city,
            destination_city: 'Paris',
            flow_type: flowType,
            status: 'PENDING_QUOTE',
            created_at: now,
            team_members: [],
            ancillary_costs: []
        };
        flows.push(flow);

        for (let i = 1; i <= 5; i++) {
            const artworkId = generateSimpleId();
            const h = 50 + Math.random() * 150;
            const w = 50 + Math.random() * 100;
            const d = 5 + Math.random() * 20;
            const weight = 10 + Math.random() * 50;
            const insuranceValue = 100000 + Math.random() * 900000;

            const packing = calculatePacking({
                h_cm: h,
                w_cm: w,
                d_cm: d,
                weight_kg: weight,
                typology: i % 2 === 0 ? 'TABLEAU' : 'OBJET',
                fragility: (Math.floor(Math.random() * 3) + 3) as any, // 3 to 5
                hasFragileFrame: Math.random() > 0.7
            });

            const cost = calculateCost(packing);

            const artwork: Artwork = {
                id: artworkId,
                project_id: projectId,
                title: `${country.name} Masterpiece #${i}`,
                artist: `Artiste ${String.fromCharCode(65 + countryIdx)}${i}`,
                dimensions_h_cm: Math.round(h),
                dimensions_w_cm: Math.round(w),
                dimensions_d_cm: Math.round(d),
                weight_kg: Math.round(weight),
                typology: i % 2 === 0 ? 'TABLEAU' : 'OBJET',
                lender_museum: country.museum,
                lender_city: country.city,
                lender_country: country.name,
                insurance_value: Math.round(insuranceValue),
                crate_specs: {
                    crate_type: packing.crateType === 'T2_MUSEE' ? 'MUSÉE' : 'VOYAGE',
                    internal_dimensions: {
                        h: Math.round(packing.internal_h_mm / 10),
                        w: Math.round(packing.internal_w_mm / 10),
                        d: Math.round(packing.internal_d_mm / 10)
                    },
                    external_dimensions: {
                        h: Math.round(packing.external_h_mm / 10),
                        w: Math.round(packing.external_w_mm / 10),
                        d: Math.round(packing.external_d_mm / 10)
                    }
                },
                recommended_crate: getCrateTypeLabel(packing.crateType),
                crate_estimated_cost: Math.round(cost.sellingPrice_eur),
                crate_factory_cost: Math.round(cost.factoryCost_eur),
                crate_calculation_details: formatCostBreakdown(cost),
                flow_id: flowId,
                created_at: now
            };
            artworks.push(artwork);

            // Add packing quote line
            quoteLines.push({
                id: generateSimpleId(),
                project_id: projectId,
                flow_id: flowId,
                category: 'PACKING',
                description: `Emballage caisse pour "${artwork.title}"`,
                quantity: 1,
                unit_price: Math.round(cost.sellingPrice_eur),
                total_price: Math.round(cost.sellingPrice_eur),
                currency: 'EUR',
                source: 'CALCULATION',
                created_at: now
            });
        }

        // Add dummy transport line for the flow
        const transportCost = flowType === 'INTL_AIR' ? 12000 : 1500;
        quoteLines.push({
            id: generateSimpleId(),
            project_id: projectId,
            flow_id: flowId,
            category: 'TRANSPORT',
            description: `Transport international de ${country.city} à Paris`,
            quantity: 1,
            unit_price: transportCost,
            total_price: transportCost,
            currency: 'EUR',
            source: 'AGENT',
            agent_name: 'Grospiron Fine Art',
            created_at: now
        });
    });

    return { project, artworks, flows, quoteLines };
};
