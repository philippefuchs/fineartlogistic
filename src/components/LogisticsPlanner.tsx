"use client";

import { useState, useEffect, useMemo } from "react";
import { Artwork, Project, LogisticsFlow, LogisticsStep, LogisticsPlanResult } from "@/types";
import { GlassCard } from "./ui/GlassCard";
import { Truck, Info, Calendar, Users, MapPin, CheckCircle2, AlertTriangle, GitFork, X, Ship, Plane, Sparkles, Loader2, AlertCircle, Plus, Minus, Trash2, Bot, FileText } from "lucide-react";
import { planLogisticsFlow } from "@/services/geminiService";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/hooks/useProjectStore";
import { recommendTeam, TeamMemberRecommendation, estimateMissionDuration } from "@/services/teamRecommendation";
import { calculateTeamCosts, calculateTeamCostsFromSteps } from "@/services/teamCostCalculator";
import { calculateRoute } from "@/services/googleMapsService";
import { getPricingConfig } from "@/config/pricing";
import { TimelineLogistique } from "./TimelineLogistique";
import { FormalitiesModule } from "./FormalitiesModule";

interface LogisticsPlannerProps {
    project: Project;
    artworks: Artwork[];
    onClose: () => void;
    onSave: (result: LogisticsPlanResult, origin: string, destination: string, flowId?: string) => void;
    flow?: LogisticsFlow;
    projectFlows?: LogisticsFlow[];
}

export function LogisticsPlanner({ project, artworks, onClose, onSave, flow, projectFlows = [] }: LogisticsPlannerProps) {
    const [planning, setPlanning] = useState(false);
    const [planResult, setPlanResult] = useState<LogisticsPlanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [origin, setOrigin] = useState(flow?.origin_city || "Paris, France");
    const [destination, setDestination] = useState(flow?.destination_city || "New York, USA");

    // Internal flow selection for global view
    const [selectedFlowId, setSelectedFlowId] = useState<string>(flow?.id || (projectFlows.length > 0 ? projectFlows[0].id : "ALL"));

    // Filter artworks based on context
    const filteredArtworks = useMemo(() => {
        if (flow) return artworks; // If focused on a specific flow, assume parent filtered correctly or we want only those
        if (selectedFlowId === "ALL") return artworks;
        return artworks.filter(a => a.flow_id === selectedFlowId);
    }, [artworks, flow, selectedFlowId]);

    // Update form when selecting a flow internally
    useEffect(() => {
        if (!flow && selectedFlowId !== "ALL") {
            const f = projectFlows.find(f => f.id === selectedFlowId);
            if (f) {
                setOrigin(f.origin_city || f.origin_country);
                setDestination(f.destination_city || f.destination_country);
            }
        }
    }, [selectedFlowId, flow, projectFlows]);

    // Team Management State
    const { logisticsConfig } = useProjectStore();
    const [teamMembers, setTeamMembers] = useState<TeamMemberRecommendation[]>([]);
    const [steps, setSteps] = useState<LogisticsStep[]>([]);
    const [selectedFormalities, setSelectedFormalities] = useState<string[]>([]);
    const [missionDuration, setMissionDuration] = useState(5);
    const [teamRecommendation, setTeamRecommendation] = useState<string>("");

    // Transport Cost State
    const [distanceKm, setDistanceKm] = useState<number>(flow?.transport_cost_breakdown?.distance_km || 0);
    const [manualTransportCost, setManualTransportCost] = useState<number | null>(flow?.transport_cost_total || null);
    const pricing = getPricingConfig();

    // Effect to initialize from flow
    useEffect(() => {
        if (flow) {
            let initialMethod = flow.flow_type as any;
            if (initialMethod === 'FRANCE_INTERNAL' || initialMethod === 'FRANCE_ROAD' || initialMethod === 'EU_ROAD') {
                initialMethod = 'DEDICATED_TRUCK'; // Default icon/logic for road
            } else if (initialMethod === 'AIR_FREIGHT' || initialMethod === 'INTL_AIR') {
                initialMethod = 'AIR_FREIGHT';
            }

            setPlanResult({
                recommended_method: initialMethod,
                rationale: "Flux chargé depuis la sauvegarde.",
                estimated_lead_time: "Consulter planning",
                required_crate_level: "VOYAGE",
                risk_assessment: "LOW"
            });

            if (flow.team_members) {
                setTeamMembers(flow.team_members.map(m => ({
                    role_id: m.role_id,
                    role_name: m.role_name,
                    count: m.count,
                    daily_rate: m.daily_rate,
                    hotel_category: m.hotel_category,
                    rationale: "Chargé depuis le flux"
                })));
            }

            if (flow.steps) {
                setSteps(flow.steps);
            }
        }
    }, [flow]);

    const handlePlanFlow = async () => {
        if (filteredArtworks.length === 0) return;

        setPlanning(true);
        setError(null);
        try {
            // Get logistics strategy from AI
            // Pass constraints if available (from CCTP analysis)
            const result = await planLogisticsFlow(filteredArtworks, origin, destination, project.constraints);
            setPlanResult(result);

            // Generate team recommendation
            const route = await calculateRoute(origin, destination);
            const recommendation = recommendTeam(filteredArtworks, route.distanceKm, logisticsConfig.team_roles);

            // Recalculate duration based on real travel time
            const estimatedDuration = estimateMissionDuration(route.durationHours, result.recommended_method);

            setTeamMembers(recommendation.team_members);

            // Initialize with default steps based on recommendation
            const initialSteps: LogisticsStep[] = [
                {
                    id: 'step_1',
                    flow_id: '',
                    label: `Mission de transport - ${result.recommended_method}`,
                    duration_days: estimatedDuration,
                    start_day: 0,
                    team_composition: recommendation.team_members.map(m => ({
                        role_id: m.role_id,
                        count: m.count
                    }))
                }
            ];
            setSteps(initialSteps);

            setMissionDuration(estimatedDuration);
            setTeamRecommendation(recommendation.rationale);
            setDistanceKm(route.distanceKm);
            setManualTransportCost(null); // Reset manual override
        } catch (error: any) {
            console.error("Logistics planning error:", error);
            setError(error?.message || "Erreur lors de la génération de la stratégie. Vérifiez que la clé API Gemini est configurée.");
        } finally {
            setPlanning(false);
        }
    };

    // Team Management Handlers
    const handleUpdateMemberCount = (roleId: string, delta: number) => {
        setTeamMembers((prev: TeamMemberRecommendation[]) => prev.map((member: TeamMemberRecommendation) =>
            member.role_id === roleId
                ? { ...member, count: Math.max(0, member.count + delta) }
                : member
        ).filter((m: TeamMemberRecommendation) => m.count > 0)); // Remove if count reaches 0
    };

    const handleRemoveMember = (roleId: string) => {
        setTeamMembers((prev: TeamMemberRecommendation[]) => prev.filter((m: TeamMemberRecommendation) => m.role_id !== roleId));
    };

    const handleAddRole = (roleId: string) => {
        const role = logisticsConfig.team_roles.find(r => r.id === roleId);
        if (!role) return;

        // Check if already exists
        if (teamMembers.some(m => m.role_id === roleId)) {
            // Just increment count
            handleUpdateMemberCount(roleId, 1);
        } else {
            // Add new member
            setTeamMembers(prev => [...prev, {
                role_id: role.id,
                role_name: role.name,
                count: 1,
                daily_rate: role.daily_rate,
                hotel_category: role.default_hotel_category,
                rationale: "Ajouté manuellement"
            }]);
        }
    };

    // Calculate costs
    // Calculate costs
    const destinationCountry = destination.split(',')[1]?.trim() || 'FR';
    const destinationCity = destination.split(',')[0]?.trim() || '';

    const teamCosts = steps.length > 0
        ? calculateTeamCostsFromSteps(steps, destinationCity, destinationCountry, logisticsConfig, logisticsConfig.team_roles)
        : teamMembers.length > 0
            ? calculateTeamCosts(teamMembers, missionDuration, destinationCountry, logisticsConfig)
            : null;

    const formalitiesTotal = selectedFormalities.length * 250; // Mock calculation or use component total

    const calculateEstimatedTransportCost = () => {
        if (!planResult || distanceKm === 0) return 0;

        let baseFee = 0;
        let ratePerKm = pricing.PRIX_KM_PL;

        if (planResult.recommended_method === 'DEDICATED_TRUCK') {
            baseFee = pricing.FORFAIT_PL_JOURNEE;
        } else if (planResult.recommended_method === 'ART_SHUTTLE') {
            baseFee = pricing.FORFAIT_CAMION_20M3 / 2; // Split cost for shuttle
            ratePerKm = pricing.PRIX_KM_PL / 2;
        } else if (planResult.recommended_method === 'AIR_FREIGHT') {
            baseFee = 1500; // Base airport/handling fee
            ratePerKm = 5; // Theoretical air freight rate
        }

        return baseFee + (distanceKm * ratePerKm);
    };

    const autoTransportCost = calculateEstimatedTransportCost();
    const finalTransportCost = manualTransportCost ?? autoTransportCost;

    const methodIcons: Record<string, React.ReactNode> = {
        ART_SHUTTLE: <Truck size={24} className="text-blue-400" />,
        DEDICATED_TRUCK: <Truck size={24} className="text-indigo-400" />,
        AIR_FREIGHT: <Plane size={24} className="text-purple-400" />,
        INTL_AIR: <Plane size={24} className="text-purple-400" />,
        EU_ROAD: <Truck size={24} className="text-zinc-400" />,
        FRANCE_INTERNAL: <Truck size={24} className="text-emerald-400" />,
        FRANCE_ROAD: <Truck size={24} className="text-emerald-400" />,
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <GlassCard className="max-w-5xl w-full max-h-[90vh] overflow-y-auto border-white/10 p-0">
                <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl p-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Planificateur de Stratégie Logistique</h2>
                        <p className="text-sm text-zinc-500">Itinéraires optimisés par IA selon valeur, fragilité et distance.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5 text-zinc-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Settings Column */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Configuration Itinéraire</h3>

                            {/* Flow Selector if not in flow-specific mode */}
                            {!flow && projectFlows.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Filtrer par Flux</label>
                                    <select
                                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-white focus:border-blue-500/50 outline-none hover:bg-white/10 transition-colors cursor-pointer"
                                        value={selectedFlowId}
                                        onChange={e => setSelectedFlowId(e.target.value)}
                                    >
                                        <option value="ALL" className="bg-zinc-900 text-white">Tous les flux ({artworks.length} œuvres)</option>
                                        {projectFlows.map(f => (
                                            <option key={f.id} value={f.id} className="bg-zinc-900 text-white">
                                                {(() => {
                                                    const typeMap: Record<string, string> = {
                                                        'FRANCE_INTERNAL': "🇫🇷 France",
                                                        'FRANCE_ROAD': "🇫🇷 France",
                                                        'EU_ROAD': "🇪🇺 Europe",
                                                        'AIR_FREIGHT': `✈️ ${f.origin_country}`,
                                                        'INTL_AIR': `✈️ ${f.origin_country}`,
                                                        'ART_SHUTTLE': 'NAVETTE',
                                                        'DEDICATED_TRUCK': 'DÉDIÉ'
                                                    };
                                                    const label = typeMap[f.flow_type] || f.flow_type;
                                                    const count = artworks.filter(a => a.flow_id === f.id).length;
                                                    return `${label} (${count} œuvres)`;
                                                })()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Ville de Départ</label>
                                    <input
                                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-white focus:border-blue-500/50 outline-none"
                                        value={origin}
                                        onChange={e => setOrigin(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Ville de Destination</label>
                                    <input
                                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-white focus:border-blue-500/50 outline-none"
                                        value={destination}
                                        onChange={e => setDestination(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Œuvres Sélectionnées ({filteredArtworks.length})</h3>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                {filteredArtworks.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2">
                                        <div className="h-8 w-8 rounded bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500">
                                            BOX
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{a.title}</p>
                                            <p className="text-[10px] text-zinc-500">{a.insurance_value.toLocaleString()} EUR</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handlePlanFlow}
                            disabled={planning || filteredArtworks.length === 0}
                            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/10 disabled:opacity-50"
                        >
                            {planning ? "Analyse des Corridors..." : "Générer la Stratégie"}
                        </button>
                    </div>

                    {/* Result Column */}
                    <div className="lg:col-span-8 flex flex-col">
                        {planning ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl animate-pulse" />
                                    <Loader2 className="animate-spin text-blue-500 relative" size={48} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Génération de la Stratégie</h3>
                                <p className="mt-2 text-zinc-400 max-w-xs">
                                    Analyse des navettes, planning vols et seuils d'assurance...
                                </p>
                            </div>
                        ) : error ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 rounded-full bg-red-500/20 blur-2xl" />
                                    <AlertCircle className="text-red-500 relative" size={48} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Erreur de Génération</h3>
                                <p className="mt-2 text-zinc-400 max-w-md">
                                    {error}
                                </p>
                                <button
                                    onClick={() => setError(null)}
                                    className="mt-6 px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                                >
                                    Réessayer
                                </button>
                            </div>
                        ) : planResult ? (
                            <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                                <GlassCard className="bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/20 p-8">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 rounded-2xl bg-blue-500/20 border border-blue-500/30">
                                            {methodIcons[planResult.recommended_method]}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight text-white uppercase italic">
                                                {planResult.recommended_method?.replace('_', ' ') || 'NON DÉFINI'}
                                            </h3>
                                            <p className="text-blue-400 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                                <Sparkles size={12} />
                                                Recommandation IA
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <p className="text-zinc-300 leading-relaxed text-sm bg-white/5 p-4 rounded-xl border border-white/5">
                                            "{planResult.rationale}"
                                        </p>

                                        {/* AI Alerts Display */}
                                        {planResult.alerts && planResult.alerts.length > 0 && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                                                {planResult.alerts.map((alert, idx) => (
                                                    <div key={idx} className={cn(
                                                        "flex items-start gap-3 p-3 rounded-lg border text-sm",
                                                        alert.level === 'CRITICAL' ? "bg-red-500/10 border-red-500/20 text-red-200" :
                                                            alert.level === 'WARNING' ? "bg-amber-500/10 border-amber-500/20 text-amber-200" :
                                                                "bg-blue-500/10 border-blue-500/20 text-blue-200"
                                                    )}>
                                                        <AlertTriangle size={16} className={cn(
                                                            "mt-0.5 shrink-0",
                                                            alert.level === 'CRITICAL' ? "text-red-400" :
                                                                alert.level === 'WARNING' ? "text-amber-400" :
                                                                    "text-blue-400"
                                                        )} />
                                                        <span>{alert.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Split Recommendation Display */}
                                        {planResult.split_recommendation && planResult.split_recommendation.required && (
                                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl animate-in fade-in slide-in-from-bottom-3">
                                                <div className="flex items-center gap-2 text-indigo-400 mb-2 font-bold uppercase text-xs tracking-wider">
                                                    <GitFork size={14} />
                                                    Division de Flux Recommandée
                                                </div>
                                                <p className="text-indigo-200 text-sm mb-3">
                                                    {planResult.split_recommendation.reason}
                                                </p>
                                                <div className="grid gap-2">
                                                    {planResult.split_recommendation.shipments.map((shipment, sIdx) => (
                                                        <div key={sIdx} className="bg-black/20 p-2 rounded text-xs text-zinc-400 flex justify-between">
                                                            <span>Envoi {shipment.id} ({shipment.items.length} œuvres)</span>
                                                            <span className="font-mono text-indigo-300">{(shipment.value || 0).toLocaleString()} €</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-zinc-600 uppercase">Délai Estimé</p>
                                            <p className="text-sm font-bold text-white">{planResult.estimated_lead_time}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-zinc-600 uppercase">Caisse Requise</p>
                                            <p className="text-sm font-bold text-white">{planResult.required_crate_level} GRADE</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-zinc-600 uppercase">Niveau de Risque</p>
                                            <span className={cn(
                                                "text-[10px] font-black px-2 py-0.5 rounded",
                                                planResult.risk_assessment === 'LOW' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                                            )}>
                                                {planResult.risk_assessment === 'LOW' ? "FAIBLE" : "MOYEN"}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] font-black text-zinc-600 uppercase">Exclusivité</p>
                                            <p className="text-sm font-bold text-zinc-400">
                                                {planResult.recommended_method === 'DEDICATED_TRUCK' ? 'DÉDIÉ' : 'PARTAGÉ'}
                                            </p>
                                        </div>
                                    </div>
                                </GlassCard>

                                {/* Team Management Section */}
                                {steps.length > 0 && (
                                    <GlassCard className="bg-gradient-to-br from-purple-600/10 to-transparent border-purple-500/20 p-8">
                                        <TimelineLogistique
                                            steps={steps}
                                            onUpdateSteps={setSteps}
                                            availableRoles={logisticsConfig.team_roles}
                                        />
                                    </GlassCard>
                                )}

                                {/* Formalities Section */}
                                <GlassCard className="bg-gradient-to-br from-purple-600/10 to-transparent border-purple-500/20 p-8">
                                    <FormalitiesModule
                                        origin={origin}
                                        destination={destination}
                                        selectedIds={selectedFormalities}
                                        onChange={setSelectedFormalities}
                                    />
                                </GlassCard>

                                {/* Transport Cost Section */}
                                {planResult && distanceKm > 0 && (
                                    <GlassCard className="bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/20 p-8">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
                                                <Truck size={24} className="text-emerald-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-black tracking-tight text-white uppercase italic">
                                                    Détails du Transport
                                                </h3>
                                                <p className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                                    <Info size={12} />
                                                    Basé sur une distance de {distanceKm} km
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                                <div className="flex justify-between items-center mb-4">
                                                    <label className="text-sm font-bold text-white">
                                                        Estimation Frais de Transport
                                                    </label>
                                                    <span className="text-xs text-zinc-500 uppercase font-black">Mode Hybride</span>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={finalTransportCost}
                                                        onChange={(e) => setManualTransportCost(Number(e.target.value))}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl font-black text-white focus:border-emerald-500 outline-none pr-12"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">€</span>
                                                </div>
                                                {manualTransportCost !== null && (
                                                    <button
                                                        onClick={() => setManualTransportCost(null)}
                                                        className="mt-2 text-[10px] text-emerald-500 hover:text-emerald-400 font-bold uppercase transition-colors"
                                                    >
                                                        Rétablir l'estimation automatique ({autoTransportCost.toLocaleString()} €)
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Coût d'Équipe</p>
                                                    <p className="text-xl font-bold text-white">{teamCosts?.team_total.toLocaleString() || 0} €</p>
                                                </div>
                                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Total Logistique</p>
                                                    <p className="text-xl font-bold text-emerald-400">{(finalTransportCost + (teamCosts?.team_total || 0) + formalitiesTotal).toLocaleString()} €</p>
                                                </div>
                                            </div>
                                        </div>
                                    </GlassCard>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                            Pourquoi cette option ?
                                        </h4>
                                        <ul className="space-y-3">
                                            <li className="text-xs text-zinc-400 flex items-start gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                                Minimizes handling frequency for fragile items.
                                            </li>
                                            <li className="text-xs text-zinc-400 flex items-start gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                                Cost efficiency optimized for collective shipment.
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="flex items-center justify-end gap-4">
                                        <button
                                            onClick={() => {
                                                if (planResult) {
                                                    // Extend result with team and transport data
                                                    const extendedResult = {
                                                        ...planResult,
                                                        team_members: teamMembers,
                                                        mission_duration_days: missionDuration,
                                                        per_diem_total: teamCosts?.per_diem_total || 0,
                                                        hotel_total: teamCosts?.hotel_total || 0,
                                                        team_cost_total: teamCosts?.team_total || 0,
                                                        transport_cost_total: finalTransportCost,
                                                        transport_cost_breakdown: {
                                                            distance_km: distanceKm,
                                                            rate_per_km: pricing.PRIX_KM_PL,
                                                            base_fee: finalTransportCost - (distanceKm * pricing.PRIX_KM_PL)
                                                        },
                                                        status: 'PENDING_QUOTE'
                                                    };
                                                    const activeFlowId = flow?.id || (selectedFlowId !== "ALL" ? selectedFlowId : undefined);
                                                    onSave(extendedResult as any, origin, destination, activeFlowId);
                                                }
                                            }}
                                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-zinc-400 hover:bg-white/10 transition-all"
                                        >
                                            Demander un devis
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (planResult) {
                                                    // Extend result with team and transport data
                                                    const extendedResult = {
                                                        ...planResult,
                                                        team_members: teamMembers,
                                                        steps: steps,
                                                        formalities: selectedFormalities,
                                                        mission_duration_days: missionDuration,
                                                        per_diem_total: teamCosts?.per_diem_total || 0,
                                                        hotel_total: teamCosts?.hotel_total || 0,
                                                        team_cost_total: teamCosts?.team_total || 0,
                                                        transport_cost_total: finalTransportCost,
                                                        transport_cost_breakdown: {
                                                            distance_km: distanceKm,
                                                            rate_per_km: pricing.PRIX_KM_PL,
                                                            base_fee: finalTransportCost - (distanceKm * pricing.PRIX_KM_PL)
                                                        },
                                                        status: 'VALIDATED'
                                                    };
                                                    const activeFlowId = flow?.id || (selectedFlowId !== "ALL" ? selectedFlowId : undefined);
                                                    onSave(extendedResult as any, origin, destination, activeFlowId);
                                                }
                                            }}
                                            className="flex items-center gap-2 rounded-xl border border-white/40 bg-white px-6 py-3 text-sm font-bold text-black hover:scale-[1.02] transition-all shadow-xl shadow-white/10"
                                        >
                                            {flow ? "Mettre à jour le Flux" : "Valider la Proposition →"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 border border-dashed border-white/5 rounded-3xl group">
                                <Truck size={48} className="text-zinc-800 mb-6 group-hover:text-zinc-700 transition-colors" />
                                <h3 className="text-lg font-bold text-zinc-600">Aucune stratégie générée</h3>
                                <p className="text-xs text-zinc-500 max-w-xs mt-2 italic">
                                    Complétez l'inventaire et cliquez sur 'Générer la Stratégie' pour voir les solutions optimisées.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
