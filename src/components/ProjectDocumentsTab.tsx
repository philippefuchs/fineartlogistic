"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    FileText, FileSpreadsheet, UploadCloud, Sparkles, Loader2,
    CheckCircle2, Trash2, ExternalLink, Wand2, Shield, AlertTriangle,
    Truck, Clock, Package
} from "lucide-react";
import { Project, ProjectDocument, Artwork, LogisticsFlow, QuoteLine } from "@/types";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/generateId";
import { analyzeCCTP } from "@/services/geminiService";
import { applyCCTPBusinessRules } from "@/services/businessRules";

interface ProjectDocumentsTabProps {
    project: Project;
    artworks: Artwork[];
    flows: LogisticsFlow[];
    quoteLines: QuoteLine[];
    onUpdateProject: (id: string, updates: Partial<Project>) => void;
    onAddQuoteLines: (lines: QuoteLine[]) => void;
    onUpdateQuoteLine: (id: string, updates: Partial<QuoteLine>) => void;
    onUpdateFlow: (id: string, updates: Partial<LogisticsFlow>) => void;
}

export function ProjectDocumentsTab({
    project,
    artworks,
    flows,
    quoteLines,
    onUpdateProject,
    onAddQuoteLines,
    onUpdateQuoteLine,
    onUpdateFlow
}: ProjectDocumentsTabProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        uploadFiles(files);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        uploadFiles(files);
    };

    const uploadFiles = (files: File[]) => {
        const newDocs: ProjectDocument[] = files.map(file => ({
            id: generateId(),
            name: file.name,
            type: file.name.endsWith('.pdf') ? 'PDF' : (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) ? 'EXCEL' : 'OTHER',
            size: file.size,
            upload_date: new Date().toISOString(),
            is_analyzed: false
        }));

        onUpdateProject(project.id, {
            documents: [...(project.documents || []), ...newDocs]
        });
    };

    const handleDelete = (docId: string) => {
        if (confirm("Supprimer ce document ?")) {
            onUpdateProject(project.id, {
                documents: (project.documents || []).filter(d => d.id !== docId)
            });
        }
    };

    const handleAnalyze = async (doc: ProjectDocument) => {
        setAnalyzingId(doc.id);
        try {
            // 1. AI Analysis
            const result = await analyzeCCTP("mock_base64");

            // 2. Apply Business Rules
            const actions = applyCCTPBusinessRules(project, result.constraints_detected, artworks, flows, quoteLines);

            // Execute actions
            const alerts = actions.filter(a => a.type === 'ALERT');
            const quoteLinesToAdd = actions.filter(a => a.type === 'ADD_QUOTE_LINE').map(a => a.payload);
            const quoteLineUpdates = actions.filter(a => a.type === 'UPDATE_QUOTE_LINE');
            const flowUpdates = actions.filter(a => a.type === 'UPDATE_FLOW');

            // 3. Batch Update
            onUpdateProject(project.id, {
                documents: (project.documents || []).map(d =>
                    d.id === doc.id ? { ...d, is_analyzed: true, analysis_result: result } : d
                ),
                constraints: result.constraints_detected
            });

            if (quoteLinesToAdd.length > 0) {
                onAddQuoteLines(quoteLinesToAdd);
            }

            quoteLineUpdates.forEach(u => onUpdateQuoteLine(u.payload.id, u.payload));
            flowUpdates.forEach(u => onUpdateFlow(u.payload.id, u.payload));

            if (alerts.length > 0) {
                const message = alerts.map(a => a.payload.message).join('\n');
                alert(`⚠️ Contraintes CCTP détectées :\n\n${message}`);
            } else {
                alert(`Analyse terminée pour ${doc.name}\n\nRésumé: ${result.summary}`);
            }

        } catch (error) {
            console.error("Analysis failed", error);
            alert("L'analyse a échoué.");
        } finally {
            setAnalyzingId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Left: Documents List */}
            <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Documents du Projet
                        <span className="text-sm font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md">
                            {(project.documents || []).length}
                        </span>
                    </h2>
                </div>

                <div className="space-y-3">
                    {(!project.documents || project.documents.length === 0) ? (
                        <div className="py-12 text-center rounded-2xl border border-dashed border-white/5 bg-white/[0.01]">
                            <FileText size={40} className="text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500 italic">Aucun document importé.</p>
                        </div>
                    ) : (
                        project.documents.map((doc) => (
                            <GlassCard key={doc.id} className="p-4 flex items-center justify-between border-white/5 hover:border-white/10 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
                                        doc.type === 'PDF' ? "bg-red-500/10 text-red-500" :
                                            doc.type === 'EXCEL' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-500"
                                    )}>
                                        {doc.type === 'EXCEL' ? <FileSpreadsheet size={24} /> : <FileText size={24} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{doc.name}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-zinc-500 uppercase font-black">
                                                {doc.type} • {(doc.size / 1024).toFixed(0)} KB
                                            </span>
                                            <span className="text-[10px] text-zinc-600">
                                                Le {new Date(doc.upload_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {doc.type === 'PDF' && (
                                        doc.is_analyzed ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                                                <CheckCircle2 size={12} />
                                                ANALYSÉ
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleAnalyze(doc)}
                                                disabled={analyzingId !== null}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                            >
                                                {analyzingId === doc.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                ANALYSER IA
                                            </button>
                                        )
                                    )}
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </GlassCard>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Dropzone & Info */}
            <div className="lg:col-span-5 space-y-6">
                {project.constraints ? (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles size={20} className="text-blue-400" />
                            Matrice de Contraintes
                        </h2>

                        <div className="grid grid-cols-1 gap-3">
                            {/* Access */}
                            <ConstraintCard
                                icon={<Truck size={16} className="text-blue-400" />}
                                title="Accès & Véhicules"
                                rationale={project.constraints.access.rationale}
                                details={[
                                    project.constraints.access.max_height_meters ? `Hmax: ${project.constraints.access.max_height_meters}m` : null,
                                    project.constraints.access.tail_lift_required ? "Hayon requis" : null
                                ].filter(Boolean).join(' • ')}
                            />

                            {/* Security */}
                            <ConstraintCard
                                icon={<Shield size={16} className="text-amber-400" />}
                                title="Sécurité & Sûreté"
                                rationale={project.constraints.security.rationale}
                                details={[
                                    project.constraints.security.armored_truck_required ? "Camion Blindé" : null,
                                    project.constraints.security.police_escort_required ? "Escorte Police" : null,
                                    project.constraints.security.courier_supervision ? "Convoyage" : null
                                ].filter(Boolean).join(' • ')}
                            />

                            {/* Packing */}
                            <ConstraintCard
                                icon={<Package size={16} className="text-emerald-400" />}
                                title="Conservation & Climat"
                                rationale={project.constraints.packing.rationale}
                                details={[
                                    project.constraints.packing.nimp15_mandatory ? "NIMP15" : null,
                                    project.constraints.packing.acclimatization_hours ? `Acclimatation ${project.constraints.packing.acclimatization_hours}h` : null
                                ].filter(Boolean).join(' • ')}
                            />

                            {/* Schedule */}
                            <ConstraintCard
                                icon={<Clock size={16} className="text-purple-400" />}
                                title="Planning & Horaires"
                                rationale={project.constraints.schedule.rationale}
                                details={[
                                    project.constraints.schedule.night_work ? "Travail de nuit" : null,
                                    project.constraints.schedule.sunday_work ? "Dimanche/Férié" : null,
                                    project.constraints.schedule.hard_deadline ? `Echéance: ${new Date(project.constraints.schedule.hard_deadline).toLocaleDateString()}` : null
                                ].filter(Boolean).join(' • ')}
                            />
                        </div>

                        <button
                            onClick={() => onUpdateProject(project.id, { constraints: undefined })}
                            className="w-full py-3 rounded-xl border border-white/5 bg-white/[0.02] text-zinc-500 text-[10px] font-bold uppercase hover:bg-white/5 transition-all"
                        >
                            Réinitialiser la Matrice
                        </button>
                    </div>
                ) : (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleFileDrop}
                        onClick={() => document.getElementById('tab-doc-upload')?.click()}
                        className={cn(
                            "flex flex-col items-center justify-center p-12 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer group",
                            isDragging ? "border-blue-500 bg-blue-500/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                        )}
                    >
                        <input id="tab-doc-upload" type="file" multiple className="hidden" onChange={handleFileInput} />
                        <div className={cn(
                            "p-6 rounded-full mb-4 transition-transform group-hover:scale-110 shadow-xl",
                            isDragging ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
                        )}>
                            <UploadCloud size={32} />
                        </div>
                        <p className="text-lg font-bold text-white">Ajouter des documents</p>
                        <p className="text-zinc-500 text-sm mt-1">Glissez vos fichiers PDF ou Excel</p>
                        <button className="mt-6 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all">
                            Parcourir les fichiers
                        </button>
                    </div>
                )}

                <GlassCard className="p-6 border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-blue-600 text-white shadow-lg">
                            <Wand2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Analyse Intelligente CCTP</h3>
                            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                                Importez vos cahiers des charges (CCTP) au format PDF pour extraire automatiquement les contraintes techniques, les dates clés et les exigences de transport.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-zinc-500 border border-white/5">Dimensions vannes</span>
                                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-zinc-500 border border-white/5">Sécurité convoi</span>
                                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-zinc-500 border border-white/5">Climatologie</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

function ConstraintCard({ icon, title, rationale, details }: { icon: React.ReactNode, title: string, rationale: string, details?: string }) {
    return (
        <GlassCard className="p-4 border-white/5">
            <div className="flex items-start gap-3">
                <div className="mt-1">{icon}</div>
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
                        {details && (
                            <span className="text-[9px] bg-white/10 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5">
                                {details}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">{rationale}</p>
                </div>
            </div>
        </GlassCard>
    );
}
