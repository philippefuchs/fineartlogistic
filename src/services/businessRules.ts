import { CCTPConstraints, Project, Artwork, LogisticsFlow, QuoteLine } from "../types";
import { generateId } from "../lib/generateId";

export interface BusinessRuleAction {
    type: 'UPDATE_PROJECT' | 'ADD_QUOTE_LINE' | 'UPDATE_QUOTE_LINE' | 'ALERT' | 'UPDATE_FLOW' | 'UPDATE_ARTWORK';
    payload: any;
    description: string;
}

/**
 * Applies business rules based on detected CCTP constraints.
 */
export function applyCCTPBusinessRules(
    project: Project,
    constraints: CCTPConstraints,
    artworks: Artwork[],
    flows: LogisticsFlow[],
    quoteLines: QuoteLine[]
): BusinessRuleAction[] {
    const actions: BusinessRuleAction[] = [];
    const now = new Date().toISOString();

    // 1. ACCESS CONSTRAINTS
    if (constraints.access.max_height_meters !== null) {
        if (constraints.access.max_height_meters < 4.0) {
            actions.push({
                type: 'ALERT',
                payload: {
                    severity: 'ERROR',
                    message: `⛔ Camion incompatible avec CCTP (Hmax détecté: ${constraints.access.max_height_meters}m). Basculement forcé sur "Porteur".`
                },
                description: 'Alerte Hauteur Limitée'
            });

            // Rule: Force "Porteur" for all flows that might use Semi
            flows.forEach(flow => {
                if (flow.flow_type === 'DEDICATED_TRUCK') {
                    actions.push({
                        type: 'UPDATE_FLOW',
                        payload: { id: flow.id, flow_type: 'ART_SHUTTLE', notes: 'Forcé en "Porteur" (Shuttle) suite contrainte hauteur CCTP' },
                        description: `Correction véhicule pour ${flow.origin_country}`
                    });
                }
            });
        }
    }

    if (constraints.access.tail_lift_required) {
        actions.push({
            type: 'ALERT',
            payload: {
                severity: 'INFO',
                message: '🚚 Hayon élévateur requis : Vérification de la disponibilité sur tous les véhicules.'
            },
            description: 'Note Hayon Requis'
        });

        // Add surcharge for tail-lift if not standard
        flows.forEach(flow => {
            actions.push({
                type: 'ADD_QUOTE_LINE',
                payload: {
                    id: generateId(),
                    project_id: project.id,
                    flow_id: flow.id,
                    category: 'TRANSPORT',
                    description: `Supplément Hayon Élévateur - ${flow.origin_country} → ${flow.destination_country}`,
                    quantity: 1,
                    unit_price: 150,
                    total_price: 150,
                    currency: 'EUR',
                    source: 'CALCULATION',
                    created_at: now
                },
                description: 'Ajout frais hayon'
            });
        });
    }

    if (constraints.access.elevator_dimensions) {
        const { h, w, d } = constraints.access.elevator_dimensions;
        artworks.forEach(art => {
            if (art.crate_specs) {
                const crateExt = art.crate_specs.external_dimensions;
                // Convert mm to m
                if (crateExt.h / 1000 > h || crateExt.w / 1000 > w || crateExt.d / 1000 > d) {
                    actions.push({
                        type: 'ALERT',
                        payload: {
                            severity: 'CRITICAL',
                            message: `🚨 Grutage requis ou décaissage pour "${art.title}" : Caisse trop grande pour le monte-charge.`
                        },
                        description: 'Alerte Dimensions Monte-Charge'
                    });

                    // Add crane service line
                    actions.push({
                        type: 'ADD_QUOTE_LINE',
                        payload: {
                            id: generateId(),
                            project_id: project.id,
                            category: 'HANDLING',
                            description: `Grutage Extérieur - ${art.title}`,
                            quantity: 1,
                            unit_price: 800,
                            total_price: 800,
                            currency: 'EUR',
                            source: 'CALCULATION',
                            created_at: now
                        },
                        description: 'Ajout frais grutage'
                    });
                }
            }
        });
    }

    // 2. SECURITY CONSTRAINTS
    if (constraints.security.armored_truck_required) {
        actions.push({
            type: 'ALERT',
            payload: {
                severity: 'WARNING',
                message: '🛡️ Camion Blindé Requis : Application de la majoration x3 sur les estimations de transport.'
            },
            description: 'Note Sécurité Blindée'
        });

        // Rule: Multiply all TRANSPORT ESTIMATIONS by 3
        quoteLines.forEach(line => {
            if (line.category === 'TRANSPORT' && line.source === 'ESTIMATION') {
                actions.push({
                    type: 'UPDATE_QUOTE_LINE',
                    payload: {
                        id: line.id,
                        unit_price: line.unit_price * 3,
                        total_price: line.total_price * 3,
                        description: line.description + " [MAJORATION BLINDÉ x3]"
                    },
                    description: 'Majoration transport blindé'
                });
            }
        });
    }

    if (constraints.security.police_escort_required) {
        actions.push({
            type: 'ADD_QUOTE_LINE',
            payload: {
                id: generateId(),
                project_id: project.id,
                category: 'SECURITY',
                description: 'Frais administratifs demande d\'escorte & Coordination Sécurité',
                quantity: 1,
                unit_price: 1500,
                total_price: 1500,
                currency: 'EUR',
                source: 'CALCULATION',
                created_at: now
            },
            description: 'Ajout frais escorte police'
        });
    }

    if (constraints.security.courier_supervision) {
        actions.push({
            type: 'ADD_QUOTE_LINE',
            payload: {
                id: generateId(),
                project_id: project.id,
                category: 'COURIER',
                description: 'Forfait Voyage Convoyeur (Billet + Hôtel + Per Diem)',
                quantity: 1,
                unit_price: 1250,
                total_price: 1250,
                currency: 'EUR',
                source: 'CALCULATION',
                created_at: now
            },
            description: 'Ajout frais convoyage'
        });
    }

    if (constraints.security.tarmac_access) {
        actions.push({
            type: 'ADD_QUOTE_LINE',
            payload: {
                id: generateId(),
                project_id: project.id,
                category: 'HANDLING',
                description: 'Badge Tarmac & Supervision Palettisation Aéroport',
                quantity: 1,
                unit_price: 450,
                total_price: 450,
                currency: 'EUR',
                source: 'CALCULATION',
                created_at: now
            },
            description: 'Ajout frais supervision tarmac'
        });
    }

    // 3. PACKING CONSTRAINTS
    if (constraints.packing.nimp15_mandatory) {
        actions.push({
            type: 'ALERT',
            payload: {
                severity: 'INFO',
                message: 'ℹ️ Certificat NIMP15 (ISPM15) forcé sur toutes les caisses.'
            },
            description: 'Note Qualité Caisse'
        });

        // Add NIMP15 certification cost per crate
        const cratedArtworks = artworks.filter(a => a.crate_specs);
        if (cratedArtworks.length > 0) {
            actions.push({
                type: 'ADD_QUOTE_LINE',
                payload: {
                    id: generateId(),
                    project_id: project.id,
                    category: 'PACKING',
                    description: 'Certification NIMP15 (Traitement Thermique Bois)',
                    quantity: cratedArtworks.length,
                    unit_price: 35,
                    total_price: cratedArtworks.length * 35,
                    currency: 'EUR',
                    source: 'CALCULATION',
                    created_at: now
                },
                description: 'Ajout frais NIMP15'
            });
        }
    }

    if (constraints.packing.acclimatization_hours) {
        actions.push({
            type: 'ALERT',
            payload: {
                severity: 'WARNING',
                message: `⏱️ Acclimatation de ${constraints.packing.acclimatization_hours}h requise avant déballage.`
            },
            description: 'Note Acclimatation'
        });

        // Add storage cost for acclimatization period
        const days = Math.ceil(constraints.packing.acclimatization_hours / 24);
        actions.push({
            type: 'ADD_QUOTE_LINE',
            payload: {
                id: generateId(),
                project_id: project.id,
                category: 'HANDLING',
                description: `Stockage Climatisé pour Acclimatation (${constraints.packing.acclimatization_hours}h)`,
                quantity: days,
                unit_price: 120,
                total_price: days * 120,
                currency: 'EUR',
                source: 'CALCULATION',
                created_at: now
            },
            description: 'Ajout frais acclimatation'
        });
    }

    if (constraints.packing.forbidden_materials.length > 0) {
        actions.push({
            type: 'ALERT',
            payload: {
                severity: 'WARNING',
                message: `⚠️ Matériaux interdits : ${constraints.packing.forbidden_materials.join(', ')}. Vérification des spécifications de caisses requise.`
            },
            description: 'Alerte Matériaux Interdits'
        });

        // If polyurethane is forbidden, add surcharge for alternative materials
        if (constraints.packing.forbidden_materials.some(m => m.toLowerCase().includes('polyur'))) {
            const cratedArtworks = artworks.filter(a => a.crate_specs);
            if (cratedArtworks.length > 0) {
                actions.push({
                    type: 'ADD_QUOTE_LINE',
                    payload: {
                        id: generateId(),
                        project_id: project.id,
                        category: 'PACKING',
                        description: 'Supplément Matériaux Neutres (Tyvek/Bondina)',
                        quantity: cratedArtworks.length,
                        unit_price: 85,
                        total_price: cratedArtworks.length * 85,
                        currency: 'EUR',
                        source: 'CALCULATION',
                        created_at: now
                    },
                    description: 'Ajout frais matériaux neutres'
                });
            }
        }
    }

    // 4. SCHEDULE CONSTRAINTS
    if (constraints.schedule.night_work || constraints.schedule.sunday_work) {
        const coeff = constraints.schedule.sunday_work ? 2.0 : 1.5;
        actions.push({
            type: 'ALERT',
            payload: {
                severity: 'WARNING',
                message: `⚠️ Majoration main d'œuvre x${coeff} détectée (Travail de nuit/dimanche).`
            },
            description: 'Alerte Surcoût Main d\'œuvre'
        });

        // Apply multiplier to all HANDLING quote lines
        quoteLines.forEach(line => {
            if (line.category === 'HANDLING' && line.source === 'ESTIMATION') {
                actions.push({
                    type: 'UPDATE_QUOTE_LINE',
                    payload: {
                        id: line.id,
                        unit_price: line.unit_price * coeff,
                        total_price: line.total_price * coeff,
                        description: line.description + ` [MAJORATION ${constraints.schedule.sunday_work ? 'DIMANCHE' : 'NUIT'} x${coeff}]`
                    },
                    description: 'Majoration main d\'œuvre'
                });
            }
        });
    }

    if (constraints.schedule.hard_deadline) {
        actions.push({
            type: 'ALERT',
            payload: {
                severity: 'CRITICAL',
                message: `🚨 ÉCHÉANCE IMPÉRATIVE : ${new Date(constraints.schedule.hard_deadline).toLocaleDateString('fr-FR')}. Aucun retard ne sera toléré.`
            },
            description: 'Alerte Deadline Critique'
        });

        // Update project end_date if not set or if CCTP deadline is earlier
        const deadlineDate = new Date(constraints.schedule.hard_deadline);
        const currentEndDate = project.end_date ? new Date(project.end_date) : null;

        if (!currentEndDate || deadlineDate < currentEndDate) {
            actions.push({
                type: 'UPDATE_PROJECT',
                payload: {
                    end_date: constraints.schedule.hard_deadline,
                    notes: (project.name || "") + " [DEADLINE CCTP APPLIQUÉE]"
                },
                description: 'Mise à jour deadline projet'
            });
        }
    }

    return actions;
}
