"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { X, Calendar, FileSpreadsheet, FileText, UploadCloud, ChevronRight, ChevronLeft, Loader2, CheckCircle2, Wand2, Sparkles, Plus } from "lucide-react";
import { Project, Artwork, ProjectDocument } from "@/types";
import { generateId } from "@/lib/generateId";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { detectHeaderRow, autoMapFields, processArtworkRows, enrichArtworksWithAI } from "@/services/excelImportService";
import { analyzeCCTP } from "@/services/geminiService";

interface ProjectWizardModalProps {
    onClose: () => void;
    onComplete: (project: Project, artworks: Artwork[]) => void;
}

type WizardStep = 'INFO' | 'UPLOAD' | 'ANALYSIS' | 'CONFIRM';

export function ProjectWizardModal({ onClose, onComplete }: ProjectWizardModalProps) {
    const [step, setStep] = useState<WizardStep>('INFO');
    const [projectName, setProjectName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<{ excel: File | null, pdf: File | null }>({ excel: null, pdf: null });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [extractedArtworks, setExtractedArtworks] = useState<Artwork[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);

        const newFiles = { ...files };
        droppedFiles.forEach(file => {
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                newFiles.excel = file;
            } else if (file.name.endsWith('.pdf')) {
                newFiles.pdf = file;
            }
        });
        setFiles(newFiles);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const newFiles = { ...files };
        selectedFiles.forEach(file => {
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                newFiles.excel = file;
            } else if (file.name.endsWith('.pdf')) {
                newFiles.pdf = file;
            }
        });
        setFiles(newFiles);
    };

    const startAnalysis = async () => {
        setIsProcessing(true);
        setStep('ANALYSIS');
        setError(null);
        setProgress(0);

        const interval = setInterval(() => {
            setProgress(prev => (prev >= 90 ? prev : prev + 5));
        }, 300);

        try {
            let artworks: Artwork[] = [];

            // 1. Process Excel
            if (files.excel) {
                const buffer = await files.excel.arrayBuffer();
                const workbook = XLSX.read(buffer);
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const allRows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });

                if (allRows.length > 0) {
                    const bestRowIndex = detectHeaderRow(allRows);
                    const headerRow = allRows[bestRowIndex] as string[];
                    const mapping = autoMapFields(headerRow);

                    // Note: ProjectWizard currently uses a hardcoded projectId empty string until finalize
                    artworks = processArtworkRows(allRows, bestRowIndex, mapping, "");

                    // Helper for debug
                    setAnalysisResult((prev: any) => ({ ...prev, bestRowIndex, headers: headerRow, mapping }));
                }
                setExtractedArtworks(artworks);
            }

            // 2. Process PDF
            if (files.pdf) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64 = (e.target?.result as string).split(',')[1];
                    try {
                        const result = await analyzeCCTP(base64);
                        setAnalysisResult((prev: any) => ({ ...prev, ...result }));
                        finish();
                    } catch (err: any) {
                        console.error("PDF Analysis failed", err);
                        setError(err.message || "L'analyse du document PDF a échoué.");
                        finish();
                    }
                };
                reader.readAsDataURL(files.pdf);
            } else {
                finish();
            }

            // 3. AI Address Enrichment
            if (artworks.length > 0) {
                try {
                    const enriched = await enrichArtworksWithAI(artworks);
                    setExtractedArtworks(enriched);
                } catch (e) {
                    console.error("AI Address Enhancement failed", e);
                }
            }

            function finish() {
                clearInterval(interval);
                setProgress(100);
                setIsProcessing(false);
            }

        } catch (err: any) {
            console.error("General analysis error", err);
            setError(err.message || "Une erreur est survenue.");
            clearInterval(interval);
            setIsProcessing(false);
        }
    };

    const handleFinalize = () => {
        if (isFinalizing) return;
        if (!projectName) {
            alert("Veuillez donner un nom à votre projet.");
            return;
        }
        setIsFinalizing(true);

        const projectId = generateId();
        const documents: ProjectDocument[] = [];

        if (files.excel) documents.push({ id: generateId(), name: files.excel.name, type: 'EXCEL', size: files.excel.size, upload_date: new Date().toISOString(), is_analyzed: true });
        if (files.pdf) documents.push({ id: generateId(), name: files.pdf.name, type: 'PDF', size: files.pdf.size, upload_date: new Date().toISOString(), is_analyzed: true });

        const project: Project = {
            id: projectId,
            reference_code: `EXP-2026-${Math.floor(Math.random() * 900) + 100}`,
            name: projectName,
            organizing_museum: "The Metropolitan Museum of Art",
            status: 'DRAFT',
            currency: 'EUR',
            start_date: startDate,
            end_date: endDate,
            documents,
            constraints: analysisResult?.constraints_detected || undefined,
            created_at: new Date().toISOString()
        };

        const finalizedArtworks = extractedArtworks.map(a => ({ ...a, project_id: projectId }));
        onComplete(project, finalizedArtworks);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <GlassCard className="max-w-3xl w-full h-[85vh] flex flex-col overflow-hidden p-0 border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)]">
                {/* Header */}
                <div className="p-6 flex-none border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                            <Plus className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Démarrer un nouveau projet</h2>
                            <p className="text-zinc-500 text-sm">Suivez les étapes pour initialiser votre exposition.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper */}
                <div className="flex-none flex px-8 py-4 bg-black/20 border-b border-white/5">
                    {[
                        { id: 'INFO', label: 'Informations' },
                        { id: 'UPLOAD', label: 'Documents' },
                        { id: 'ANALYSIS', label: 'Analyse IA' }
                    ].map((s, idx) => (
                        <div key={s.id} className="flex items-center flex-1 last:flex-none">
                            <div className={cn("flex items-center gap-2", step === s.id ? "text-blue-400" : "text-zinc-600")}>
                                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border", step === s.id ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 bg-zinc-900")}>
                                    {idx + 1}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">{s.label}</span>
                            </div>
                            {idx < 2 && <div className="h-[1px] flex-1 mx-4 bg-zinc-800" />}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 min-h-0">
                    {step === 'INFO' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nom de l'exposition</label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="Ex: Impressionnisme en Normandie 2026"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-lg text-white outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Date de début</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all opacity-80"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Date de fin</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all opacity-80"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'UPLOAD' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleFileDrop}
                                onClick={() => document.getElementById('wizard-files')?.click()}
                                className={cn(
                                    "flex flex-col items-center justify-center p-12 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer group",
                                    isDragging ? "border-blue-500 bg-blue-500/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                                )}
                            >
                                <input id="wizard-files" type="file" multiple className="hidden" onChange={handleFileInput} accept=".xlsx,.xls,.pdf" />
                                <div className={cn("p-6 rounded-full mb-4 shadow-xl transition-transform group-hover:scale-110", isDragging ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400")}>
                                    <UploadCloud size={32} />
                                </div>
                                <p className="text-lg font-bold text-white">Glissez vos fichiers ici</p>
                                <p className="text-zinc-500 mt-1">Excel Liste d'œuvres + PDF CCTP</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className={cn("p-4 rounded-2xl border transition-all flex items-center gap-4", files.excel ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/5 opacity-40")}>
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", files.excel ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-600")}><FileSpreadsheet size={20} /></div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-bold text-white truncate">{files.excel ? files.excel.name : "Liste d'œuvres (.xlsx)"}</p>
                                        <p className="text-[10px] text-zinc-500">{files.excel ? `${(files.excel.size / 1024).toFixed(0)} KB` : "Non sélectionné"}</p>
                                    </div>
                                    {files.excel && <CheckCircle2 className="text-emerald-500" size={16} />}
                                </div>
                                <div className={cn("p-4 rounded-2xl border transition-all flex items-center gap-4", files.pdf ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/5 opacity-40")}>
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", files.pdf ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-600")}><FileText size={20} /></div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-bold text-white truncate">{files.pdf ? files.pdf.name : "CCTP Technique (.pdf)"}</p>
                                        <p className="text-[10px] text-zinc-500">{files.pdf ? `${(files.pdf.size / 1024).toFixed(0)} KB` : "Non sélectionné"}</p>
                                    </div>
                                    {files.pdf && <CheckCircle2 className="text-emerald-500" size={16} />}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'ANALYSIS' && (
                        <div className="flex flex-col items-center justify-center space-y-8 py-12">
                            <div className="relative">
                                <div className="h-24 w-24 rounded-full border-4 border-white/5 flex items-center justify-center">
                                    {isProcessing ? <Loader2 size={40} className="text-blue-500 animate-spin" /> : <Sparkles size={40} className="text-emerald-500 animate-bounce" />}
                                </div>
                                <div className="absolute -top-2 -right-2 bg-blue-600 rounded-full p-2 shadow-lg"><Wand2 size={16} /></div>
                            </div>
                            <div className="w-full max-w-sm space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                                    <span>{isProcessing ? "Analyse en cours..." : "Analyse terminée"}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                            {!isProcessing && error && (
                                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 w-full animate-in fade-in duration-700 text-center">
                                    <p className="text-red-400 font-bold mb-1">Erreur d'analyse</p>
                                    <p className="text-zinc-500 text-xs">{error}</p>
                                </div>
                            )}
                            {!isProcessing && !error && (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 w-full animate-in fade-in duration-700 text-center space-y-4">
                                    <div>
                                        <p className="text-emerald-400 font-bold mb-1">Succès</p>
                                        <p className="text-zinc-500 text-xs">{extractedArtworks.length} œuvres détectées.</p>
                                    </div>
                                    <div className="text-left bg-black/20 p-4 rounded-xl text-[10px] font-mono whitespace-pre-wrap overflow-auto max-h-60 border border-white/5">
                                        <p className="font-bold text-blue-400 mb-2">DEBUG MAPPING:</p>
                                        <div className="mb-4 p-2 bg-white/5 rounded border border-white/5">
                                            <p className="text-zinc-400 font-bold">En-têtes détectés (Ligne {analysisResult?.bestRowIndex || "?"}):</p>
                                            <p className="text-zinc-300">{analysisResult?.headers?.join(" | ") || "Non disponible"}</p>
                                        </div>
                                        {extractedArtworks.length > 0 && (
                                            <>
                                                <p>1ère œuvre: {extractedArtworks[0].title}</p>
                                                <p>Ville Départ: <span className={extractedArtworks[0].lender_city === "Paris" ? "text-yellow-400" : "text-green-400"}>{extractedArtworks[0].lender_city}</span></p>
                                                <p className="text-[9px] text-zinc-500">Raw Address: {(extractedArtworks[0] as any)._debug_address_raw}</p>
                                                <p className="text-[9px] text-blue-400">
                                                    AI Status: {(extractedArtworks[0] as any)._ai_processed ? "Processed ✅" : "Pending/Skipped ⏳"}
                                                </p>
                                                <p className="text-[9px] text-zinc-600">Context Raw: {(extractedArtworks[0] as any)._debug_context_raw}</p>
                                                <p className="text-[9px] text-zinc-600">Trace Addr: {JSON.stringify((extractedArtworks[0] as any)._debug_addr_trace)}</p>
                                                <p className="text-[9px] text-zinc-600">Trace Dims: {JSON.stringify((extractedArtworks[0] as any)._debug_dim_trace)}</p>
                                                <div className="text-[8px] text-zinc-400 mt-2 border-t pt-1">
                                                    Mapping: {JSON.stringify(analysisResult?.mapping)}
                                                </div>
                                                <p>Pays Départ: {extractedArtworks[0].lender_country}</p>
                                                <p>Ville Arrivée 1: {extractedArtworks[0].destination_city}</p>
                                                <p>Ville Arrivée 2: {extractedArtworks[0].destination_city_2}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 flex-none border-t border-white/5 bg-zinc-900/50 flex justify-between items-center">
                    <div>
                        {step !== 'INFO' && !isProcessing && (
                            <button onClick={() => setStep(step === 'UPLOAD' ? 'INFO' : 'UPLOAD')} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-white transition-colors">
                                <ChevronLeft size={18} /> Retour
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Plus tard</button>
                        {step === 'INFO' && <button onClick={() => setStep('UPLOAD')} disabled={!projectName} className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all disabled:opacity-50 group">Suivant <ChevronRight size={18} /></button>}
                        {step === 'UPLOAD' && <button onClick={startAnalysis} disabled={!files.excel && !files.pdf} className="flex items-center gap-2 px-10 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all disabled:opacity-50 group"><Wand2 size={18} /> Analyser & Créer</button>}
                        {step === 'ANALYSIS' && !isProcessing && <button onClick={handleFinalize} className="flex items-center gap-2 px-10 py-3 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all"><Sparkles size={18} /> Accéder au Projet</button>}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
