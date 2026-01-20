import React, { useState, useEffect } from 'react';

import { GlassCard } from '@/components/ui/GlassCard';
import { X, Upload, FileSpreadsheet, AlertCircle, ArrowRight, Check, Loader2, Table, Wand2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Artwork, LogisticsFlow, QuoteLine } from '@/types';
import { generateId } from '@/lib/generateId';
import { cn } from '@/lib/utils';
import {
    TARGET_FIELDS,
    detectHeaderRow,
    autoMapFields,
    processArtworkRows,
    enrichArtworksWithAI
} from "@/services/excelImportService";


interface ExcelImportModalProps {
    projectId: string;
    onClose: () => void;
    onImport: (artworks: Artwork[]) => void;
    file: File | null;
}

// TARGET_FIELDS now imported from @/services/excelImportService

export default function ExcelImportModal({ projectId, onClose, onImport, file }: ExcelImportModalProps) {
    const [headers, setHeaders] = useState<string[]>([]);
    const [dataPreview, setDataPreview] = useState<any[][]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [useInches, setUseInches] = useState(false);
    const [headerRowIndex, setHeaderRowIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [hideIgnored, setHideIgnored] = useState(false);


    // Template System State
    const [templates, setTemplates] = useState<Record<string, Record<string, string>>>({});
    const [newTemplateName, setNewTemplateName] = useState("");
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [selectedTemplateName, setSelectedTemplateName] = useState("");

    useEffect(() => {
        const saved = localStorage.getItem('excel_import_templates');
        if (saved) {
            try {
                setTemplates(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load templates", e);
            }
        }
    }, []);

    useEffect(() => {
        if (file) {
            parseFile(file);
        }
    }, [file]); // Trigger on file change

    const saveTemplate = () => {
        if (!newTemplateName) return;
        const newTemplates = { ...templates, [newTemplateName]: mapping };
        setTemplates(newTemplates);
        localStorage.setItem('excel_import_templates', JSON.stringify(newTemplates));
        setSelectedTemplateName(newTemplateName);
        setNewTemplateName("");
        setShowSaveTemplate(false);
    };

    const loadTemplate = (name: string) => {
        const template = templates[name];
        if (template) {
            setMapping(template);
            setSelectedTemplateName(name);
        }
    };

    const deleteTemplate = () => {
        if (!selectedTemplateName) return;
        if (confirm(`Supprimer le modèle "${selectedTemplateName}" ? `)) {
            const { [selectedTemplateName]: removed, ...rest } = templates;
            setTemplates(rest);
            localStorage.setItem('excel_import_templates', JSON.stringify(rest));
            setSelectedTemplateName("");
        }
    };

    const parseFile = async (f: File) => {
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 }); // Array of arrays

                if (jsonData.length > 0) {
                    // Intelligent Header Detection
                    const bestRowIndex = detectHeaderRow(jsonData);
                    const headerRow = jsonData[bestRowIndex] as string[];
                    const previewRows = jsonData.slice(bestRowIndex + 1, bestRowIndex + 6); // Next 5 rows

                    setHeaderRowIndex(bestRowIndex);
                    setHeaders(headerRow);
                    setDataPreview(previewRows);

                    // Try to find a matching template
                    let matchedTemplateName = "";
                    let maxTemplateScore = 0;

                    // Read directly from localStorage to avoid race condition with state initialization
                    let availableTemplates = templates;
                    if (Object.keys(availableTemplates).length === 0) {
                        try {
                            const saved = localStorage.getItem('excel_import_templates');
                            if (saved) {
                                availableTemplates = JSON.parse(saved);
                                // Sync state just in case
                                setTemplates(availableTemplates);
                            }
                        } catch (e) { console.error(e); }
                    }

                    Object.entries(availableTemplates).forEach(([name, map]) => {
                        let score = 0;
                        // Check how many headers from the file are present in this template's mapping keys
                        headerRow.forEach(h => {
                            // The template keys are the headers. The values are the target fields.
                            // We check if the template has a mapping for this header.
                            if (map[h] && map[h] !== "ignore") {
                                score++;
                            }
                        });

                        // Normalize score by template size or file header size
                        if (score > maxTemplateScore) {
                            maxTemplateScore = score;
                            matchedTemplateName = name;
                        }
                    });

                    // If good match found (e.g. at least 3 mapped columns matched), use it
                    if (matchedTemplateName && maxTemplateScore >= 3) {
                        setMapping(availableTemplates[matchedTemplateName]);
                        // Only alert if we found it automatically to avoid spam
                        // console.log("Template autodetected:", matchedTemplateName);
                    } else {
                        setMapping(autoMapFields(headerRow));
                    }
                }
                setIsAnalyzing(false);
            } catch (error) {
                console.error("Parse Error:", error);
                alert("Erreur d'analyse du fichier Excel.");
                setIsAnalyzing(false);
            }
        };
        reader.readAsBinaryString(f);
    };

    // parseDimensions now in excelImportService

    const handleImport = () => {
        setImporting(true);
        // Process all data
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];

                // Use array of arrays to avoid key mismatch issues
                const allRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

                if (!allRows || allRows.length <= headerRowIndex) {
                    alert("Erreur de lecture: En-têtes non trouvés");
                    setImporting(false);
                    return;
                }

                // Process all rows using centralized service
                const artworks = processArtworkRows(allRows, headerRowIndex, mapping, projectId, useInches);

                // Batch AI Enrichment for addresses
                enrichArtworksWithAI(artworks).then((enrichedArtworks) => {
                    // Finalize
                    onImport(enrichedArtworks);
                    onClose();
                }).catch(err => {
                    console.error("AI Enrichment failed", err);
                    onImport(artworks); // Import anyway if AI fails
                    onClose();
                });
            } catch (error: any) {
                console.error("Import Error:", error);
                alert("Erreur lors de l'import: " + (error.message || String(error)));
                setImporting(false);
            }
        };
        if (file) reader.readAsBinaryString(file);
    };

    if (!file) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <GlassCard className="max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden p-0 border-white/10">
                <div className="flex-none p-6 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Table className="text-emerald-500" />
                            Importateur AO (Loader)
                        </h2>
                        <p className="text-zinc-500 text-sm">Validations des colonnes et conversion automatique.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleImport}
                            disabled={importing || isAnalyzing}
                            className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:grayscale"
                        >
                            {importing ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                            {importing ? "..." : "VALIDER"}
                        </button>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="text-right">
                                <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">Inches</p>
                            </div>
                            <div
                                onClick={() => setUseInches(!useInches)}
                                className={cn(
                                    "w-8 h-4 rounded-full relative transition-colors duration-300",
                                    useInches ? "bg-emerald-500" : "bg-zinc-800"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm",
                                    useInches ? "left-4.5" : "left-0.5"
                                )} />
                            </div>
                        </label>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-4">
                            <Loader2 className="animate-spin text-emerald-500" size={32} />
                            <p className="text-zinc-400">Analyse du fichier Excel...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Template Controls */}
                            <div className="flex flex-col gap-4 bg-white/5 p-4 rounded-xl border border-white/5 mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <FileSpreadsheet size={18} className="text-emerald-500" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">Modèles d'import</span>
                                            <span className="text-xs text-zinc-500">Charger une configuration sauvegardée</span>
                                        </div>
                                        <div className="h-8 w-[1px] bg-white/10 mx-2" />

                                        <select
                                            className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-300 outline-none focus:border-emerald-500/50"
                                            onChange={(e) => loadTemplate(e.target.value)}
                                            value={selectedTemplateName}
                                        >
                                            <option value="" disabled>Choisir un modèle...</option>
                                            {Object.keys(templates).map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>

                                        {selectedTemplateName && (
                                            <button
                                                onClick={deleteTemplate}
                                                className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-lg transition-colors"
                                                title="Supprimer ce modèle"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {showSaveTemplate ? (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                                <input
                                                    type="text"
                                                    placeholder="Nom du modèle..."
                                                    className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-300 outline-none focus:border-emerald-500/50 w-48"
                                                    value={newTemplateName}
                                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                                />
                                                <button
                                                    onClick={saveTemplate}
                                                    disabled={!newTemplateName}
                                                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                                >
                                                    Sauvegarder
                                                </button>
                                                <button
                                                    onClick={() => setShowSaveTemplate(false)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowSaveTemplate(true)}
                                                className="px-3 py-1.5 bg-white/5 text-zinc-400 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Sauvegarder la config actuelle
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="h-[1px] bg-white/5 w-full" />

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 relative">
                                        <Table size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            type="text"
                                            placeholder="Filtrer les colonnes (ex: Titre, Prix...)"
                                            className="w-full bg-zinc-900 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-300 outline-none focus:border-emerald-500/30 transition-all font-medium"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setHideIgnored(!hideIgnored)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                                            hideIgnored
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                : "bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10"
                                        )}
                                    >
                                        {hideIgnored ? <Check size={12} /> : <div className="w-3" />}
                                        Masquer colonnes ignorées
                                    </button>
                                </div>
                            </div>


                            {/* Mapping Grid */}
                            <div className="grid grid-cols-1 gap-2">
                                {headers
                                    .filter(header => {
                                        const matchesSearch = header.toLowerCase().includes(searchQuery.toLowerCase());
                                        const isIgnored = mapping[header] === "ignore" || !mapping[header];
                                        if (hideIgnored && isIgnored && !matchesSearch) return false;
                                        return matchesSearch;
                                    })
                                    .sort((a, b) => {
                                        // Mapped items first
                                        const aMapped = mapping[a] && mapping[a] !== "ignore" ? 1 : 0;
                                        const bMapped = mapping[b] && mapping[b] !== "ignore" ? 1 : 0;
                                        return bMapped - aMapped;
                                    })
                                    .map((header, idx) => (
                                        <div key={`${header}-${idx}`} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 animate-in fade-in duration-300">
                                            <div className="w-1/3 text-sm font-bold text-zinc-300 truncate" title={header}>
                                                {header}
                                            </div>
                                            <ArrowRight size={16} className="text-zinc-600" />
                                            <div className="flex-1">
                                                <select
                                                    value={mapping[header] || "ignore"}
                                                    onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                                                    className={cn(
                                                        "w-full bg-zinc-900 border rounded-lg px-3 py-2 text-sm outline-none transition-colors",
                                                        mapping[header] && mapping[header] !== 'ignore'
                                                            ? "border-emerald-500/50 text-emerald-400"
                                                            : "border-white/10 text-zinc-500 hover:border-white/20"
                                                    )}
                                                >
                                                    {TARGET_FIELDS.map(f => (
                                                        <option key={f.key} value={f.key}>{f.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {mapping[header] && mapping[header] !== 'ignore' && (
                                                <Check size={16} className="text-emerald-500" />
                                            )}
                                        </div>
                                    ))}
                            </div>


                            {/* Preview Table */}
                            <div className="mt-8">
                                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">Aperçu (5 premières lignes)</h3>
                                <div className="overflow-x-auto rounded-xl border border-white/5">
                                    <table className="w-full text-left text-xs text-zinc-400 whitespace-nowrap">
                                        <thead className="bg-white/5">
                                            <tr>
                                                {headers.slice(0, 5).map((h, idx) => <th key={`${h}-${idx}`} className="p-3">{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dataPreview.map((row, i) => (
                                                <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                                                    {row.slice(0, 5).map((cell: any, j: number) => (
                                                        <td key={j} className="p-3">{String(cell)}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
