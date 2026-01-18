"use client";

import { use, useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "@/components/ui/GlassCard";
import { Box, Plus, Ruler, Weight, Tag, ChevronLeft, Truck, Receipt, Trash2, Mail, BarChart3, CheckCircle2, Download, TrendingUp, FileText } from "lucide-react";
import Link from "next/link";
import { ArtworkForm } from "@/components/ArtworkForm";
import { LogisticsPlanner } from "@/components/LogisticsPlanner";
import { QuoteExtractor } from "@/components/QuoteExtractor";
import { QuoteComparison } from "@/components/QuoteComparison";
import { BudgetControl } from "@/components/BudgetControl";
import { TaskManager } from "@/components/TaskManager";
import { Artwork, LogisticsFlow, QuoteLine, Project } from "@/types";
import { exportProjectToPDF, exportPackingList, exportProformaInvoice } from "@/services/reportService";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/generateId";

import { ExcelImportModal } from "@/components/ExcelImportModal";
import { AgentRequestModal } from "@/components/AgentRequestModal";
import { FinancialConsolidation } from "@/components/FinancialConsolidation";
import { CompleteQuoteModal } from "@/components/CompleteQuoteModal";
import { UploadCloud } from "lucide-react";

import { SmartInventoryTable } from "@/components/SmartInventoryTable";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const {
        projects,
        artworks,
        flows,
        quoteLines,
        tasks,
        agents,
        addArtwork,
        updateArtwork,
        deleteArtwork,
        addFlow,
        deleteFlow,
        addQuoteLines,
        deleteQuoteLine,
        updateProject,
        updateFlow
    } = useProjectStore();
    const [showForm, setShowForm] = useState(false);
    const [showPlanner, setShowPlanner] = useState(false);
    const [showExtractor, setShowExtractor] = useState(false);
    const [showComparison, setShowComparison] = useState(false);
    const [showAgentRequest, setShowAgentRequest] = useState(false);
    const [showFinancial, setShowFinancial] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [isEditingMuseum, setIsEditingMuseum] = useState(false);
    const [editedMuseum, setEditedMuseum] = useState("");
    const [showCompleteQuote, setShowCompleteQuote] = useState(false);
    // New State for DnD
    const [isDragging, setIsDragging] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);

    const project = projects.find(p => p.id === id);

    // Drag Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            setImportFile(file);
        }
    };

    if (!project) return null;

    const projectArtworks = artworks.filter(a => a.project_id === id);
    const projectQuoteLines = quoteLines.filter(l => l.project_id === id);
    const projectFlows = flows.filter(f => f.project_id === id);

    const totalLogisticsCost = projectFlows.reduce((acc, flow) => {
        const flowQuotes = projectQuoteLines.filter(l => l.flow_id === flow.id);
        if (flowQuotes.length === 0) return acc;

        if (flow.validated_agent_name) {
            const agentTotal = flowQuotes.filter(l => l.agent_name === flow.validated_agent_name)
                .reduce((sum, l) => sum + l.total_price, 0);
            return acc + agentTotal;
        }

        const agents = Array.from(new Set(flowQuotes.map(l => l.agent_name).filter(Boolean)));
        if (agents.length === 0) return acc + flowQuotes.reduce((sum, l) => sum + l.total_price, 0);

        const agentTotals = agents.map(agent =>
            flowQuotes.filter(l => l.agent_name === agent).reduce((sum, l) => sum + l.total_price, 0)
        );
        return acc + Math.min(...agentTotals);
    }, 0) + projectQuoteLines.filter(l => l.flow_id === 'none').reduce((acc, l) => acc + l.total_price, 0);

    if (!project) return <div>Projet non trouvé</div>;

    return (
        <AppLayout>
            {/* Import Modal */}
            {importFile && (
                <ExcelImportModal
                    file={importFile}
                    projectId={project.id}
                    onClose={() => setImportFile(null)}
                    onImport={(newArtworks) => {
                        newArtworks.forEach(a => addArtwork(a));
                    }}
                />
            )}

            {/* Agent Request Modal */}
            {showAgentRequest && (
                <AgentRequestModal
                    project={project}
                    artworks={projectArtworks}
                    agents={agents}
                    flows={projectFlows}
                    onClose={() => setShowAgentRequest(false)}
                    onSend={(flowId, agentId) => {
                        updateFlow(flowId, { status: 'AWAITING_QUOTE', assigned_agent_id: agentId });
                    }}
                />
            )}

            {/* Financial Consolidation Modal */}
            {showFinancial && (
                <FinancialConsolidation
                    project={project}
                    flows={projectFlows}
                    quoteLines={projectQuoteLines}
                    artworks={projectArtworks}
                    onClose={() => setShowFinancial(false)}
                    onExport={(data) => {
                        console.log('Export data:', data);
                        alert('Offre finale générée !');
                    }}
                />
            )}

            {/* Complete Quote Modal */}
            {showCompleteQuote && (
                <CompleteQuoteModal
                    project={project}
                    artworks={projectArtworks}
                    onClose={() => setShowCompleteQuote(false)}
                />
            )}
            {showForm && (
                <ArtworkForm
                    projectId={id}
                    onClose={() => setShowForm(false)}
                    onSave={(artwork) => {
                        addArtwork(artwork);
                        setShowForm(false);
                    }}
                />
            )}
            {showPlanner && (
                <LogisticsPlanner
                    project={project}
                    artworks={projectArtworks}
                    onClose={() => setShowPlanner(false)}
                    onSave={(result, origin, destination) => {
                        // Detect countries from city names
                        const originCountry = origin.toLowerCase().includes('france') || origin.toLowerCase().includes('paris') || origin.toLowerCase().includes('lyon') || origin.toLowerCase().includes('marseille') ? 'FR' :
                            origin.toLowerCase().includes('usa') || origin.toLowerCase().includes('new york') || origin.toLowerCase().includes('los angeles') ? 'US' :
                                origin.toLowerCase().includes('uk') || origin.toLowerCase().includes('london') ? 'GB' : 'FR';

                        const destCountry = destination.toLowerCase().includes('france') || destination.toLowerCase().includes('paris') || destination.toLowerCase().includes('lyon') || destination.toLowerCase().includes('marseille') ? 'FR' :
                            destination.toLowerCase().includes('usa') || destination.toLowerCase().includes('new york') || destination.toLowerCase().includes('los angeles') ? 'US' :
                                destination.toLowerCase().includes('uk') || destination.toLowerCase().includes('london') ? 'GB' : 'FR';

                        const res = result as any;

                        // Determine flow type based on geography
                        let flowType: any;
                        if (res.recommended_method === 'AIR_FREIGHT') {
                            flowType = 'AIR_FREIGHT';
                        } else if (originCountry === 'FR' && destCountry === 'FR') {
                            flowType = 'FRANCE_INTERNAL';
                        } else if (res.recommended_method === 'DEDICATED_TRUCK') {
                            flowType = 'DEDICATED_TRUCK';
                        } else if (res.recommended_method === 'ART_SHUTTLE') {
                            flowType = 'ART_SHUTTLE';
                        } else {
                            flowType = 'EU_ROAD';
                        }

                        const flowId = crypto.randomUUID();
                        const newFlow: LogisticsFlow = {
                            id: flowId,
                            project_id: id,
                            origin_city: origin,
                            destination_city: destination,
                            origin_country: originCountry,
                            destination_country: destCountry,
                            flow_type: flowType,
                            status: res.status || 'PENDING_QUOTE',
                            team_members: res.team_members || [],
                            mission_duration_days: res.mission_duration_days || 0,
                            per_diem_total: res.per_diem_total || 0,
                            hotel_total: res.hotel_total || 0,
                            team_cost_total: res.team_cost_total || 0,
                            transport_cost_total: res.transport_cost_total || 0,
                            transport_cost_breakdown: res.transport_cost_breakdown,
                            created_at: new Date().toISOString()
                        } as any;

                        addFlow(newFlow);

                        // If validated, automatically create QuoteLines
                        if (res.status === 'VALIDATED') {
                            const newLines: QuoteLine[] = [];

                            // Transport Line
                            if (res.transport_cost_total > 0) {
                                newLines.push({
                                    id: crypto.randomUUID(),
                                    project_id: id,
                                    flow_id: flowId,
                                    category: 'TRANSPORT',
                                    description: `Frais de transport (${res.recommended_method}) - ${origin} → ${destination}`,
                                    quantity: 1,
                                    unit_price: res.transport_cost_total,
                                    total_price: res.transport_cost_total,
                                    currency: project.currency || 'EUR',
                                    source: 'CALCULATION',
                                    agent_name: 'Estimation Interne',
                                    created_at: new Date().toISOString()
                                });
                            }

                            // Team/Handling Line
                            if (res.team_cost_total > 0) {
                                newLines.push({
                                    id: crypto.randomUUID(),
                                    project_id: id,
                                    flow_id: flowId,
                                    category: 'HANDLING',
                                    description: `Équipe technique (${res.team_members.length} pers, ${res.mission_duration_days}j)`,
                                    quantity: 1,
                                    unit_price: res.team_cost_total,
                                    total_price: res.team_cost_total,
                                    currency: project.currency || 'EUR',
                                    source: 'CALCULATION',
                                    agent_name: 'Estimation Interne',
                                    created_at: new Date().toISOString()
                                });
                            }

                            if (newLines.length > 0) {
                                addQuoteLines(newLines);
                            }
                        }

                        setShowPlanner(false);
                    }}
                />
            )}
            {showExtractor && (
                <QuoteExtractor
                    flows={projectFlows}
                    onClose={() => setShowExtractor(false)}
                    onExtracted={(lines, flowId, agentName) => {
                        const formattedLines = lines.map(line => ({
                            ...line,
                            id: Math.random().toString(36).substr(2, 9),
                            project_id: id,
                            flow_id: flowId,
                            agent_name: agentName,
                            source: 'AGENT',
                            created_at: new Date().toISOString()
                        } as any));
                        addQuoteLines(formattedLines);

                        // If linked to a flow, update that flow's status
                        if (flowId !== 'none') {
                            const updates: any = { status: 'QUOTE_RECEIVED' };
                            // Also assign agent if not yet assigned
                            updateFlow(flowId, updates);
                        }

                        setShowExtractor(false);
                    }}
                />
            )}
            <div className="flex flex-col gap-8">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-blue-400 transition-colors"
                >
                    <ChevronLeft size={16} />
                    Retour au Tableau de Bord
                </Link>

                {/* Project Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">
                            {project.reference_code}
                        </p>
                        {isEditingName ? (
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        updateProject(project.id, { name: editedName });
                                        setIsEditingName(false);
                                    } else if (e.key === 'Escape') {
                                        setIsEditingName(false);
                                    }
                                }}
                                onBlur={() => {
                                    if (editedName.trim()) {
                                        updateProject(project.id, { name: editedName });
                                    }
                                    setIsEditingName(false);
                                }}
                                autoFocus
                                className="mt-2 text-4xl font-bold text-white bg-white/10 border border-blue-500/50 rounded-lg px-3 py-1 outline-none focus:border-blue-500"
                            />
                        ) : (
                            <h1
                                className="mt-2 text-4xl font-bold tracking-tight text-white cursor-pointer hover:text-blue-400 transition-colors inline-flex items-center gap-2 group"
                                onClick={() => {
                                    setEditedName(project.name);
                                    setIsEditingName(true);
                                }}
                                title="Cliquez pour modifier"
                            >
                                {project.name}
                                <span className="text-sm text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                            </h1>
                        )}
                        {isEditingMuseum ? (
                            <input
                                type="text"
                                value={editedMuseum}
                                onChange={(e) => setEditedMuseum(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        updateProject(project.id, { organizing_museum: editedMuseum });
                                        setIsEditingMuseum(false);
                                    } else if (e.key === 'Escape') {
                                        setIsEditingMuseum(false);
                                    }
                                }}
                                onBlur={() => {
                                    if (editedMuseum.trim()) {
                                        updateProject(project.id, { organizing_museum: editedMuseum });
                                    }
                                    setIsEditingMuseum(false);
                                }}
                                autoFocus
                                className="mt-1 text-base text-zinc-300 bg-white/10 border border-blue-500/50 rounded-lg px-2 py-1 outline-none focus:border-blue-500"
                            />
                        ) : (
                            <p
                                className="mt-1 text-zinc-400 cursor-pointer hover:text-blue-400 transition-colors inline-flex items-center gap-2 group"
                                onClick={() => {
                                    setEditedMuseum(project.organizing_museum);
                                    setIsEditingMuseum(true);
                                }}
                                title="Cliquez pour modifier"
                            >
                                {project.organizing_museum}
                                <span className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {projectQuoteLines.length > 0 && (
                            <button
                                onClick={() => setShowComparison(!showComparison)}
                                className={cn(
                                    "rounded-xl border border-white/5 px-4 py-2 text-sm font-semibold transition-all flex items-center gap-2",
                                    showComparison ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                                )}
                            >
                                <BarChart3 size={16} />
                                {showComparison ? "Retour aux Détails" : "Comparer les Devis"}
                            </button>
                        )}
                        <button
                            onClick={() => setShowAgentRequest(true)}
                            className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-all text-zinc-400 flex items-center gap-2"
                        >
                            <Mail size={16} />
                            Demander Devis
                        </button>
                        <button
                            onClick={() => setShowExtractor(true)}
                            className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-all text-zinc-400"
                        >
                            Importer un Devis
                        </button>
                        <button
                            onClick={() => setShowPlanner(true)}
                            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all"
                        >
                            Gérer la Logistique
                        </button>
                        <div className="relative group">
                            <button className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center gap-2">
                                <Download size={16} />
                                Documents
                            </button>
                            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-zinc-900 border border-white/10 shadow-xl overflow-hidden hidden group-hover:block z-50">
                                <button onClick={() => exportProjectToPDF(project, projectArtworks, projectFlows, projectQuoteLines)} className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
                                    Rapport Logistique
                                </button>
                                <button onClick={() => exportPackingList(project, projectArtworks)} className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5">
                                    Packing List
                                </button>
                                <button onClick={() => exportProformaInvoice(project, projectArtworks)} className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5">
                                    Facture Proforma
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowFinancial(true)}
                            disabled={projectQuoteLines.length === 0}
                            className="rounded-xl bg-gradient-to-r from-yellow-600 to-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-yellow-500/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <TrendingUp size={16} />
                            Consolidation Financière
                        </button>
                        <button
                            onClick={() => setShowCompleteQuote(true)}
                            disabled={projectArtworks.length === 0}
                            className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText size={16} />
                            Devis Complet
                        </button>
                    </div>
                </div>

                {showComparison ? (
                    <QuoteComparison
                        flows={projectFlows}
                        quoteLines={projectQuoteLines}
                        onValidateAgent={(flowId, agentName) => {
                            updateFlow(flowId, { validated_agent_name: agentName, status: 'VALIDATED' });
                        }}
                    />
                ) : (
                    <>
                        {/* Project Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Œuvres du Projet</p>
                                <div className="flex items-end justify-between">
                                    <p className="text-3xl font-black text-white">{projectArtworks.length}</p>
                                    <Box size={24} className="text-zinc-800" />
                                </div>
                            </GlassCard>
                            <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Valeur d'Assurance</p>
                                <div className="flex items-end justify-between">
                                    <p className="text-3xl font-black text-white">
                                        {projectArtworks.reduce((acc, a) => acc + a.insurance_value, 0).toLocaleString()} <span className="text-sm font-normal text-zinc-500">EUR</span>
                                    </p>
                                    <Tag size={24} className="text-zinc-800" />
                                </div>
                            </GlassCard>
                            <BudgetControl project={project} quoteLines={projectQuoteLines} artworks={projectArtworks} />
                            <TaskManager projectId={project.id} />
                        </div>

                        {/* Inventory Section */}
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    Inventaire des Œuvres
                                    <span className="text-sm font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md">
                                        {projectArtworks.length}
                                    </span>
                                </h2>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-bold text-black hover:bg-white transition-all"
                                >
                                    <Plus size={16} />
                                    Ajouter une Œuvre
                                </button>
                            </div>

                            {projectArtworks.length > 0 ? (
                                <SmartInventoryTable
                                    artworks={projectArtworks}
                                    onUpdate={updateArtwork}
                                    onDelete={deleteArtwork}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
                                    <Box size={40} className="text-zinc-700 mb-4" />
                                    <p className="text-zinc-500">Aucune œuvre ajoutée à cette exposition.</p>
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="mt-4 text-sm font-bold text-blue-500 hover:underline"
                                    >
                                        Ajouter votre première pièce
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Logistics Flows */}
                        <div className="flex flex-col gap-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Truck size={24} className="text-blue-500" />
                                Flux Logistiques
                                <span className="text-sm font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md">
                                    {projectFlows.length}
                                </span>
                            </h2>

                            {projectFlows.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {projectFlows.map((flow) => (
                                        <GlassCard key={flow.id} className="p-4 flex items-center justify-between border-white/10 group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <Truck size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-white uppercase text-xs tracking-wider">
                                                        {(() => {
                                                            const typeMap: Record<string, string> = {
                                                                'ART_SHUTTLE': 'NAVETTE ART',
                                                                'DEDICATED_TRUCK': 'CAMION DÉDIÉ',
                                                                'AIR_FREIGHT': 'FRET AÉRIEN',
                                                                'EU_ROAD': 'ROUTE EUROPE',
                                                                'FRANCE_INTERNAL': 'FRANCE INTERNE'
                                                            };
                                                            return typeMap[flow.flow_type] || flow.flow_type.replace('_', ' ');
                                                        })()}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-500">
                                                        {flow.origin_city || flow.origin_country} → {flow.destination_city || flow.destination_country}
                                                    </p>
                                                    {flow.status === 'VALIDATED' && (
                                                        <div className="mt-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <CheckCircle2 size={10} className="text-emerald-500" />
                                                                <span className="text-[9px] uppercase font-bold text-zinc-600">Agent Validé</span>
                                                            </div>
                                                            <select
                                                                value={flow.validated_agent_name || ""}
                                                                onChange={(e) => updateFlow(flow.id, { validated_agent_name: e.target.value })}
                                                                className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-blue-500"
                                                            >
                                                                <option value="">Sélectionner un agent...</option>
                                                                {agents.map(agent => (
                                                                    <option key={agent.id} value={agent.name}>{agent.name} ({agent.country})</option>
                                                                ))}
                                                                {!agents.find(a => a.name === flow.validated_agent_name) && flow.validated_agent_name && (
                                                                    <option value={flow.validated_agent_name}>{flow.validated_agent_name}</option>
                                                                )}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {flow.status === 'VALIDATED' && (
                                                        <div className="flex gap-4 mt-2 pt-2 border-t border-white/5 w-full">
                                                            <div className="flex-1">
                                                                <label className="text-[9px] uppercase font-bold text-zinc-600 block mb-1">Enlèvement</label>
                                                                <input
                                                                    type="date"
                                                                    value={flow.pickup_date || ''}
                                                                    onChange={(e) => updateFlow(flow.id, { pickup_date: e.target.value })}
                                                                    className="w-full bg-transparent text-[10px] text-zinc-300 outline-none border-b border-white/10 focus:border-blue-500 py-0.5"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[9px] uppercase font-bold text-zinc-600 block mb-1">Livraison</label>
                                                                <input
                                                                    type="date"
                                                                    value={flow.delivery_date || ''}
                                                                    onChange={(e) => updateFlow(flow.id, { delivery_date: e.target.value })}
                                                                    className="w-full bg-transparent text-[10px] text-zinc-300 outline-none border-b border-white/10 focus:border-blue-500 py-0.5"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "text-[10px] font-black px-2 py-1 rounded transition-colors",
                                                    flow.status === 'VALIDATED' ? "bg-emerald-500 text-white" :
                                                        flow.status === 'QUOTE_RECEIVED' ? "bg-emerald-500/10 text-emerald-500" :
                                                            flow.status === 'AWAITING_QUOTE' ? "bg-amber-500/10 text-amber-500" : "bg-zinc-800 text-zinc-400"
                                                )}>
                                                    {(() => {
                                                        const statusMap: Record<string, string> = {
                                                            'VALIDATED': 'VALIDÉ',
                                                            'QUOTE_RECEIVED': 'DEVIS REÇU',
                                                            'AWAITING_QUOTE': 'ATTENTE DEVIS',
                                                            'PENDING_QUOTE': 'EN ATTENTE'
                                                        };
                                                        return statusMap[flow.status] || flow.status.replace('_', ' ');
                                                    })()}
                                                </span>
                                                {flow.status === 'PENDING_QUOTE' && (
                                                    <button
                                                        onClick={() => updateFlow(flow.id, { status: 'AWAITING_QUOTE' })}
                                                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                                        title="Envoyer Demande aux Agents"
                                                    >
                                                        <Mail size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteFlow(flow.id)}
                                                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center rounded-2xl border border-dashed border-white/5 text-zinc-600 italic text-sm">
                                    Aucun flux logistique planifié.
                                </div>
                            )}
                        </div>

                        {/* Extracted Quotes */}
                        <div className="flex flex-col gap-6 pb-20">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Receipt size={24} className="text-emerald-500" />
                                Devis Extraits
                                <span className="text-sm font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md">
                                    {projectQuoteLines.length}
                                </span>
                            </h2>

                            {projectQuoteLines.length > 0 ? (
                                <div className="space-y-3">
                                    {projectQuoteLines.map((line) => (
                                        <div key={line.id} className="group relative flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "h-2 w-2 rounded-full",
                                                    line.category === 'TRANSPORT' ? "bg-blue-500" :
                                                        line.category === 'PACKING' ? "bg-amber-500" :
                                                            line.category === 'CUSTOMS' ? "bg-purple-500" : "bg-zinc-500"
                                                )} />
                                                <div>
                                                    <p className="text-sm font-medium text-white">{line.description}</p>
                                                    <p className="text-[10px] text-zinc-500 font-mono uppercase">
                                                        {line.agent_name && <span className="text-blue-400 font-bold mr-2">[{line.agent_name}]</span>}
                                                        {line.category} • QTY: {line.quantity}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right font-mono">
                                                    <p className="text-sm font-bold text-white">{line.total_price} {line.currency}</p>
                                                </div>
                                                <button
                                                    onClick={() => deleteQuoteLine(line.id)}
                                                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-end pt-4 border-t border-white/5">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Estimé</p>
                                            <p className="text-2xl font-black text-white">
                                                {totalLogisticsCost.toLocaleString()} <span className="text-sm font-normal text-zinc-500">{projectQuoteLines[0]?.currency || 'EUR'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center rounded-2xl border border-dashed border-white/5 text-zinc-600 italic text-sm">
                                    Aucune donnée de devis importée. Utilisez 'Importer un Devis' pour commencer.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </AppLayout >
    );
}

function ArtworkListItem({ artwork, onDelete }: { artwork: Artwork, onDelete: () => void }) {
    return (
        <GlassCard className="p-4 flex items-center gap-6 group">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-900 border border-white/5 overflow-hidden">
                {artwork.image_data ? (
                    <img src={artwork.image_data} alt={artwork.title} className="h-full w-full object-cover" />
                ) : (
                    <Box size={24} className="text-zinc-500" />
                )}
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-white">{artwork.title}</h4>
                <p className="text-sm text-zinc-500">{artwork.artist}</p>
                {artwork.notes && (
                    <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1 italic">
                        "{artwork.notes}"
                    </p>
                )}
                {artwork.crate_specs && (
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase">
                            {artwork.crate_specs.crate_type} CRATE
                        </span>
                        <span className="text-[9px] text-zinc-500">
                            {artwork.crate_specs.external_dimensions.h}x{artwork.crate_specs.external_dimensions.w}x{artwork.crate_specs.external_dimensions.d} cm
                        </span>
                    </div>
                )}
            </div>
            <div className="hidden lg:flex items-center gap-8">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-600">Dimensions</span>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Ruler size={12} />
                        {artwork.dimensions_h_cm} x {artwork.dimensions_w_cm} x {artwork.dimensions_d_cm} cm
                    </div>
                </div>
                <div className="flex flex-col gap-1 pr-6">
                    <span className="text-[10px] font-bold uppercase text-zinc-600">Valeur</span>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                        <Tag size={12} />
                        {artwork.insurance_value.toLocaleString()} EUR
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => {
                        if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${artwork.title}" ?`)) {
                            onDelete();
                        }
                    }}
                    className="rounded-lg border border-white/5 bg-zinc-900 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={18} />
                </button>
                <button className="rounded-lg border border-white/5 bg-zinc-900 p-2 text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={18} className="rotate-180" />
                </button>
            </div>
        </GlassCard>
    );
}
