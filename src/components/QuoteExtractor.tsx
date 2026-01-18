"use client";

import { useState } from "react";
import { QuoteLine, LogisticsFlow } from "@/types";
import { GlassCard } from "./ui/GlassCard";
import { X, FileText, Sparkles, Loader2, Upload, Receipt, Tag } from "lucide-react";
import { extractQuoteData } from "@/services/geminiService";
import { cn } from "@/lib/utils";

import { useProjectStore } from "@/hooks/useProjectStore";

interface QuoteExtractorProps {
    flows: LogisticsFlow[];
    onClose: () => void;
    onExtracted: (lines: Partial<QuoteLine>[], flowId: string, agentName: string) => void;
}

export function QuoteExtractor({ flows, onClose, onExtracted }: QuoteExtractorProps) {
    const { agents } = useProjectStore();
    const [extracting, setExtracting] = useState(false);
    const [content, setContent] = useState("");
    const [extractedLines, setExtractedLines] = useState<Partial<QuoteLine>[]>([]);
    const [selectedFlowId, setSelectedFlowId] = useState(flows[0]?.id || "none");
    const [agentName, setAgentName] = useState(agents[0]?.name || "");
    const [pdfFile, setPdfFile] = useState<{ name: string, base64: string } | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === "application/pdf") {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                setPdfFile({ name: file.name, base64 });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExtract = async () => {
        if (!content.trim() && !pdfFile) return;

        setExtracting(true);
        try {
            const results = await extractQuoteData(content, pdfFile?.base64);
            setExtractedLines(results);
        } catch (error) {
            console.error(error);
        } finally {
            setExtracting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <GlassCard className="max-w-6xl w-full max-h-[90vh] overflow-hidden border-white/10 p-0 flex flex-col">
                <div className="flex items-center justify-between border-b border-white/5 bg-black/40 p-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Receipt size={28} className="text-blue-500" />
                            Extracteur Intelligent de Devis
                        </h2>
                        <p className="text-sm text-zinc-500">Importez directement un PDF ou copiez le texte.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5 text-zinc-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
                    {/* Input Area */}
                    <div className="flex flex-col border-r border-white/5 p-8 gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sélectionner l'Agent</label>
                                <select
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none"
                                >
                                    <option value="">Choisir un partenaire...</option>
                                    {agents.map(a => <option key={a.id} value={a.name}>{a.name} ({a.country})</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Flux Cible</label>
                                <select
                                    value={selectedFlowId}
                                    onChange={(e) => setSelectedFlowId(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none"
                                >
                                    <option value="none">Coût Général du Projet</option>
                                    {flows.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.flow_type.replace('_', ' ')} ({f.origin_country} → {f.destination_country})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col flex-1 gap-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Source de Données</h3>
                                <button
                                    onClick={() => { setContent(""); setPdfFile(null); }}
                                    className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors"
                                >
                                    EFFACER
                                </button>
                            </div>

                            {/* PDF Upload Area */}
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={cn(
                                    "border-2 border-dashed rounded-2xl p-6 text-center transition-all",
                                    pdfFile ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/30"
                                )}>
                                    <div className="flex flex-col items-center gap-2">
                                        {pdfFile ? (
                                            <>
                                                <FileText className="text-emerald-500" size={32} />
                                                <p className="text-sm font-bold text-white">{pdfFile.name}</p>
                                                <p className="text-xs text-emerald-400">Prêt pour analyse</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="text-zinc-500 group-hover:text-blue-400" size={32} />
                                                <p className="text-sm font-medium text-zinc-300">Glissez un PDF ici ou cliquez pour parcourir</p>
                                                <p className="text-xs text-zinc-500">Supporte les devis officiels (Scan ou Natif)</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-white/10"></div>
                                <span className="flex-shrink-0 mx-4 text-zinc-600 text-xs font-bold uppercase">OU</span>
                                <div className="flex-grow border-t border-white/10"></div>
                            </div>

                            <textarea
                                className="flex-1 w-full rounded-2xl border border-white/5 bg-white/5 p-6 text-sm text-zinc-300 focus:border-blue-500/30 outline-none resize-none font-mono min-h-[100px]"
                                placeholder="Collez le texte brut ici..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                            />

                            <button
                                onClick={handleExtract}
                                disabled={extracting || (!content.trim() && !pdfFile)}
                                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 font-bold text-white hover:opacity-90 transition-all shadow-xl shadow-blue-500/10 disabled:grayscale disabled:opacity-30 flex items-center justify-center gap-2"
                            >
                                {extracting ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                {extracting ? "Analyse en cours..." : "Analyser le Document"}
                            </button>
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="bg-black/20 overflow-y-auto p-8 flex flex-col gap-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Lignes Extraites</h3>

                        {extracting ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="h-1 lg:w-48 w-32 bg-zinc-800 rounded-full overflow-hidden mb-6">
                                    <div className="h-full bg-blue-500 animate-progress" style={{ width: '40%' }} />
                                </div>
                                <p className="text-sm text-zinc-500 animate-pulse">Notre IA identifie les catégories...</p>
                            </div>
                        ) : extractedLines.length > 0 ? (
                            <div className="space-y-3 pb-20">
                                {extractedLines.map((line, i) => (
                                    <div key={i} className="group rounded-xl border border-white/5 bg-white/5 p-4 hover:border-blue-500/30 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
                                                line.category === 'TRANSPORT' ? "bg-indigo-500/20 text-indigo-400" :
                                                    line.category === 'PACKING' ? "bg-amber-500/20 text-amber-400" : "bg-zinc-500/20 text-zinc-400"
                                            )}>
                                                {line.category}
                                            </span>
                                            <span className="text-sm font-bold text-emerald-400">
                                                {line.total_price} {line.currency}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-300 font-medium">{line.description}</p>
                                        <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                                            <span>QTY: {line.quantity}</span>
                                            <span>•</span>
                                            <span>UNIT: {line.unit_price} {line.currency}</span>
                                        </div>
                                    </div>
                                ))}

                                <div className="fixed bottom-8 right-8 left-1/2 lg:left-3/4 transform -translate-x-1/2">
                                    <button
                                        onClick={() => onExtracted(extractedLines, selectedFlowId, agentName)}
                                        className="w-full rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
                                    >
                                        Importer les Données
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-700 opacity-40">
                                <Receipt size={64} className="mb-4" />
                                <p className="text-sm">Les données structurées apparaîtront ici après analyse.</p>
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
