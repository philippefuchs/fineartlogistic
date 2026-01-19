"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { X, Calendar, FileSpreadsheet, FileText, UploadCloud, ChevronRight, ChevronLeft, Loader2, CheckCircle2, Wand2, Sparkles, Plus } from "lucide-react";
import { Project, Artwork, ProjectDocument, LogisticsFlow } from "@/types";
import { generateId } from "@/lib/generateId";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { calculatePacking, getCrateTypeLabel } from "@/services/packingEngine";
import { calculateCost } from "@/services/costCalculator";
import { analyzeCCTP } from "@/services/geminiService";
import { generateFlowsFromArtworks } from "@/services/flowGenerator";

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

        // Progress simulation
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return prev;
                return prev + 10;
            });
        }, 300);

        try {
            const artworks: Artwork[] = [];
            let cctpResult = null;

            // 1. Process Excel if present
            if (files.excel) {
                const data = await files.excel.arrayBuffer();
                const workbook = XLSX.read(data);
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawObjects = XLSX.utils.sheet_to_json<any>(firstSheet);

                const projectId = generateId(); // Temporary ID for artwork mapping

                // HELPER: Auto-map columns (Simplified version of ExcelImportModal)
                const headers = rawObjects.length > 0 ? Object.keys(rawObjects[0]) : [];
                const mapping: Record<string, string> = {};

                headers.forEach(col => {
                    const cleanCol = col.trim();
                    const lower = cleanCol.toLowerCase();

                    if (lower.includes("titr") || lower.includes("title") || lower.includes("oeuvr") || lower.includes("nom")) mapping["title"] = col;
                    else if (lower.includes("artist") || lower.includes("auteur") || lower.includes("peintre") || lower.includes("createur")) mapping["artist"] = col;
                    else if (lower.includes("type") || lower.includes("cat") || lower.includes("typologie")) mapping["typology"] = col;
                    else if (lower.includes("dim")) mapping["dimensions_all"] = col;
                    else if ((lower.includes("haut") || lower.includes("height")) && !lower.includes("unit")) mapping["h"] = col;
                    else if ((lower.includes("larg") || lower.includes("width")) && !lower.includes("unit")) mapping["w"] = col;
                    else if ((lower.includes("prof") || lower.includes("depth")) && !lower.includes("unit")) mapping["d"] = col;
                    else if (lower.includes("poid") || lower.includes("weight")) mapping["weight"] = col;
                    else if (lower.includes("val") || lower.includes("price") || lower.includes("insur") || lower.includes("montant")) mapping["value"] = col;
                    else if (lower.includes("city") || lower.includes("ville") || lower.includes("départ") || lower.includes("origin") || lower.includes("lieu")) mapping["city"] = col;
                    else if (lower.includes("country") || lower.includes("pays")) mapping["country"] = col;
                });

                // HELPER: Robust dimension parser
                const parseDimensions = (dimString: string) => {
                    const str = String(dimString).trim();
                    if (!str) return { h: 0, w: 0, d: 0 };
                    const cleanStr = str.replace(/,/g, '.');

                    const hMatch = cleanStr.match(/(?:h|haut|height)[\.\s:]*([0-9.]+)/i);
                    const wMatch = cleanStr.match(/(?:l|larg|w|width)[\.\s:]*([0-9.]+)/i);
                    const dMatch = cleanStr.match(/(?:p|prof|d|depth)[\.\s:]*([0-9.]+)/i);

                    if (hMatch || wMatch || dMatch) {
                        const parseVal = (m: RegExpMatchArray | null) => m ? parseFloat(m[1]) : 0;
                        return { h: parseVal(hMatch), w: parseVal(wMatch), d: parseVal(dMatch) };
                    }

                    if (cleanStr.match(/[xX\*×]/)) {
                        const parts = cleanStr.split(/[xX\*×]/).map(p => parseFloat(p.replace(/[^0-9.]/g, '')) || 0);
                        return { h: parts[0] || 0, w: parts[1] || 0, d: parts[2] || 0 };
                    }

                    const numbers = cleanStr.match(/[0-9.]+/g);
                    if (numbers && numbers.length >= 2) {
                        const vals = numbers.map(n => parseFloat(n));
                        return { h: vals[0] || 0, w: vals[1] || 0, d: vals[2] || 0 };
                    }
                    return { h: 0, w: 0, d: 0 };
                };

                // HELPER: Value parser
                const parseValue = (val: any) => {
                    if (!val) return 0;
                    const clean = String(val).replace(/\s/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
                    return parseFloat(clean) || 0;
                };

                rawObjects.forEach(row => {
                    // Extract values using mapping
                    let h = 0, w = 0, d = 0;

                    if (mapping["dimensions_all"] && row[mapping["dimensions_all"]]) {
                        const dims = parseDimensions(row[mapping["dimensions_all"]]);
                        h = dims.h; w = dims.w; d = dims.d;
                    } else {
                        h = mapping["h"] ? parseValue(row[mapping["h"]]) : 0;
                        w = mapping["w"] ? parseValue(row[mapping["w"]]) : 0;
                        d = mapping["d"] ? parseValue(row[mapping["d"]]) : 0;
                    }

                    const artwork: any = {
                        id: generateId(),
                        project_id: projectId,
                        created_at: new Date().toISOString(),
                        title: mapping["title"] ? row[mapping["title"]] : "Sans titre",
                        artist: mapping["artist"] ? row[mapping["artist"]] : "Inconnu",
                        typology: mapping["typology"] ? (row[mapping["typology"]] || "TABLEAU").toUpperCase() : "TABLEAU",
                        dimensions_h_cm: Math.round(h),
                        dimensions_w_cm: Math.round(w),
                        dimensions_d_cm: Math.round(d),
                        weight_kg: mapping["weight"] ? parseValue(row[mapping["weight"]]) : 2, // Default weight of 2kg reasonable? keeping for now but no 100/80/10
                        insurance_value: mapping["value"] ? parseValue(row[mapping["value"]]) : 0,
                        lender_city: mapping["city"] ? row[mapping["city"]] : "Paris",
                        lender_country: (() => {
                            // 1. Try explicit country column
                            if (mapping["country"] && row[mapping["country"]]) {
                                return row[mapping["country"]];
                            }

                            // 2. Try to parse "City (CC)" from city column
                            const cityVal = mapping["city"] ? row[mapping["city"]] : "";
                            const countryMatch = cityVal && typeof cityVal === 'string' ? cityVal.match(/\(([A-Z]{2,3})\)/) : null;

                            if (countryMatch) {
                                const code = countryMatch[1].toUpperCase();
                                const codeMap: Record<string, string> = {
                                    'FR': 'France', 'US': 'USA', 'UK': 'United Kingdom', 'GB': 'United Kingdom',
                                    'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain', 'CH': 'Switzerland',
                                    'BE': 'Belgium', 'NL': 'Netherlands', 'JP': 'Japan', 'CN': 'China',
                                    'KR': 'South Korea', 'AE': 'UAE', 'QA': 'Qatar', 'SA': 'Saudi Arabia'
                                };
                                return codeMap[code] || code;
                            }

                            // 3. Fallback: Deduce from city name
                            const city = (cityVal || "Paris").toLowerCase().trim();
                            const cityToCountry: Record<string, string> = {
                                'paris': 'France',
                                'lyon': 'France',
                                'marseille': 'France',
                                'new york': 'USA',
                                'los angeles': 'USA',
                                'chicago': 'USA',
                                'london': 'UK',
                                'londres': 'UK',
                                'berlin': 'Germany',
                                'munich': 'Germany',
                                'rome': 'Italy',
                                'milan': 'Italy',
                                'madrid': 'Spain',
                                'barcelona': 'Spain',
                                'bilbao': 'Spain',
                                'amsterdam': 'Netherlands',
                                'brussels': 'Belgium',
                                'bruxelles': 'Belgium',
                                'geneva': 'Switzerland',
                                'genève': 'Switzerland',
                                'tokyo': 'Japan',
                                'seoul': 'South Korea',
                                'séoul': 'South Korea',
                                'beijing': 'China',
                                'shanghai': 'China',
                            };
                            return cityToCountry[city] || "France";
                        })(),
                        lender_museum: row.prêteur || row.Lender || ""
                    };

                    // Clean up city name if it has (CC)
                    if (artwork.lender_city && typeof artwork.lender_city === 'string' && artwork.lender_city.match(/\([A-Z]{2,3}\)/)) {
                        artwork.lender_city = artwork.lender_city.replace(/\s*\([A-Z]{2,3}\)/, '').trim();
                    }

                    // Auto-packing
                    const packing = calculatePacking({
                        h_cm: artwork.dimensions_h_cm,
                        w_cm: artwork.dimensions_w_cm,
                        d_cm: artwork.dimensions_d_cm,
                        weight_kg: artwork.weight_kg,
                        typology: artwork.typology,
                        fragility: 2
                    });
                    const cost = calculateCost(packing);

                    artwork.crate_specs = {
                        crate_type: packing.crateType === 'T2_MUSEE' ? 'MUSÉE' : 'VOYAGE',
                        internal_dimensions: { h: packing.internal_h_mm, w: packing.internal_w_mm, d: packing.internal_d_mm },
                        external_dimensions: { h: packing.external_h_mm, w: packing.external_w_mm, d: packing.external_d_mm }
                    };
                    artwork.recommended_crate = getCrateTypeLabel(packing.crateType);
                    artwork.crate_estimated_cost = Math.ceil(cost.sellingPrice_eur);

                    artworks.push(artwork);
                });
                console.log("📊 Extracted artworks from Excel:", artworks.length);
                setExtractedArtworks(artworks);
            }

            // 2. Process PDF if present
            if (files.pdf) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64 = (e.target?.result as string).split(',')[1];
                    try {
                        const result = await analyzeCCTP(base64);
                        setAnalysisResult(result);
                        setProgress(100);
                        clearInterval(interval);
                        setIsProcessing(false);
                    } catch (err: any) {
                        console.error("PDF Analysis failed", err);
                        setError(err.message || "L'analyse du document PDF a échoué. Vous pouvez continuer sans l'analyse.");
                        setProgress(100);
                        clearInterval(interval);
                        setIsProcessing(false);
                    }
                };
                reader.readAsDataURL(files.pdf);
            } else {
                setProgress(100);
                clearInterval(interval);
                setIsProcessing(false);
            }

        } catch (error: any) {
            console.error("Analysis error", error);
            setError(error.message || "Une erreur est survenue lors de l'initialisation du projet.");
            clearInterval(interval);
            setIsProcessing(false);
        }
    };

    const handleFinalize = () => {
        console.log("🎯 handleFinalize called");
        console.log("  - extractedArtworks state:", extractedArtworks.length);
        console.log("  - projectName:", projectName);

        if (isFinalizing) return;
        if (!projectName) {
            alert("Veuillez donner un nom à votre projet.");
            return;
        }
        setIsFinalizing(true);

        const projectId = generateId();
        const documents: ProjectDocument[] = [];

        if (files.excel) {
            documents.push({
                id: generateId(),
                name: files.excel.name,
                type: 'EXCEL',
                size: files.excel.size,
                upload_date: new Date().toISOString(),
                is_analyzed: true
            });
        }

        if (files.pdf) {
            documents.push({
                id: generateId(),
                name: files.pdf.name,
                type: 'PDF',
                size: files.pdf.size,
                upload_date: new Date().toISOString(),
                is_analyzed: true
            });
        }

        const project: Project = {
            id: projectId,
            reference_code: `EXP-2026-${Math.floor(Math.random() * 900) + 100}`,
            name: projectName || "Nouvelle Exposition",
            organizing_museum: "The Metropolitan Museum of Art", // Default or extract from CCTP
            status: 'DRAFT',
            currency: 'EUR',
            start_date: startDate,
            end_date: endDate,
            documents,
            constraints: analysisResult?.constraints_detected || undefined,
            created_at: new Date().toISOString()
        };

        // Re-map artworks to actual projectId
        const finalizedArtworks = extractedArtworks.map(a => ({ ...a, project_id: projectId }));

        onComplete(project, finalizedArtworks);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <GlassCard className="max-w-3xl w-full flex flex-col overflow-hidden p-0 border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
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
                <div className="flex px-8 py-4 bg-black/20 border-b border-white/5">
                    {[
                        { id: 'INFO', label: 'Informations' },
                        { id: 'UPLOAD', label: 'Documents' },
                        { id: 'ANALYSIS', label: 'Analyse IA' }
                    ].map((s, idx) => (
                        <div key={s.id} className="flex items-center flex-1 last:flex-none">
                            <div className={cn(
                                "flex items-center gap-2",
                                step === s.id ? "text-blue-400" : "text-zinc-600"
                            )}>
                                <div className={cn(
                                    "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                                    step === s.id ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 bg-zinc-900"
                                )}>
                                    {idx + 1}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">{s.label}</span>
                            </div>
                            {idx < 2 && <div className="h-[1px] flex-1 mx-4 bg-zinc-800" />}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="p-8 min-h-[350px]">
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
                                <div className={cn(
                                    "p-6 rounded-full mb-4 shadow-xl transition-transform group-hover:scale-110",
                                    isDragging ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
                                )}>
                                    <UploadCloud size={32} />
                                </div>
                                <p className="text-lg font-bold text-white">Glissez vos fichiers ici</p>
                                <p className="text-zinc-500 mt-1">Excel Liste d'œuvres + PDF CCTP</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className={cn(
                                    "p-4 rounded-2xl border transition-all flex items-center gap-4",
                                    files.excel ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/5 opacity-40"
                                )}>
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", files.excel ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-600")}>
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-bold text-white truncate">{files.excel ? files.excel.name : "Liste d'œuvres (.xlsx)"}</p>
                                        <p className="text-[10px] text-zinc-500">{files.excel ? `${(files.excel.size / 1024).toFixed(0)} KB` : "Non sélectionné"}</p>
                                    </div>
                                    {files.excel && <CheckCircle2 className="text-emerald-500" size={16} />}
                                </div>
                                <div className={cn(
                                    "p-4 rounded-2xl border transition-all flex items-center gap-4",
                                    files.pdf ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/5 opacity-40"
                                )}>
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", files.pdf ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-600")}>
                                        <FileText size={20} />
                                    </div>
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
                                    {isProcessing ? (
                                        <Loader2 size={40} className="text-blue-500 animate-spin" />
                                    ) : (
                                        <Sparkles size={40} className="text-emerald-500 animate-bounce" />
                                    )}
                                </div>
                                <div className="absolute -top-2 -right-2 bg-blue-600 rounded-full p-2 shadow-lg">
                                    <Wand2 size={16} />
                                </div>
                            </div>

                            <div className="w-full max-w-sm space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                                    <span>{isProcessing ? "Analyse en cours..." : "Analyse terminée"}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            {!isProcessing && error && (
                                <div className="grid grid-cols-1 gap-4 w-full animate-in fade-in duration-700">
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                                        <div className="flex items-center gap-2 text-red-400 mb-2">
                                            <X size={18} />
                                            <span className="text-sm font-bold uppercase">Erreur d'analyse</span>
                                        </div>
                                        <p className="text-zinc-400 text-sm leading-relaxed">
                                            {error}
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-white/5 text-zinc-500 text-xs">
                                            Vous pouvez tout de même finaliser la création du projet.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isProcessing && analysisResult && !error && (
                                <div className="grid grid-cols-1 gap-4 w-full animate-in fade-in duration-700">
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                                        <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                            <CheckCircle2 size={18} />
                                            <span className="text-sm font-bold uppercase">Succès de l'extraction</span>
                                        </div>
                                        <p className="text-zinc-400 text-sm leading-relaxed">
                                            L'IA a identifié <span className="text-white font-bold">{extractedArtworks.length} œuvres</span> et extrait les contraintes techniques du CCTP.
                                        </p>
                                        {analysisResult.summary && (
                                            <div className="mt-4 pt-4 border-t border-white/5 italic text-zinc-500 text-xs">
                                                "{analysisResult.summary}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/5 bg-zinc-900/50 flex justify-between items-center">
                    <div>
                        {step !== 'INFO' && !isProcessing && (
                            <button
                                onClick={() => setStep(step === 'UPLOAD' ? 'INFO' : 'UPLOAD')}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-white transition-colors"
                            >
                                <ChevronLeft size={18} />
                                Retour
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
                            Plus tard
                        </button>

                        {step === 'INFO' && (
                            <button
                                onClick={() => setStep('UPLOAD')}
                                disabled={!projectName}
                                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Suivant
                                <ChevronRight size={18} />
                            </button>
                        )}

                        {step === 'UPLOAD' && (
                            <button
                                onClick={startAnalysis}
                                disabled={!files.excel && !files.pdf}
                                className="flex items-center gap-2 px-10 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <Wand2 size={18} className="group-hover:rotate-12 transition-transform" />
                                Analyser & Créer le projet
                            </button>
                        )}

                        {step === 'ANALYSIS' && !isProcessing && (
                            <button
                                onClick={handleFinalize}
                                className="flex items-center gap-2 px-10 py-3 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
                            >
                                <Sparkles size={18} />
                                Accéder au Projet
                            </button>
                        )}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
