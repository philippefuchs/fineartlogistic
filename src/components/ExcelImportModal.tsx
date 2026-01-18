import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { X, ArrowRight, Table, Wand2, Loader2, Check } from "lucide-react";
import { Artwork } from "@/types";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

// Target fields in our DB
const TARGET_FIELDS: { key: keyof Artwork | string, label: string }[] = [
    { key: "ignore", label: "-- Ignorer --" },
    { key: "title", label: "Titre" },
    { key: "artist", label: "Artiste" },
    { key: "typology", label: "Typologie" },
    { key: "dimensions_h_cm", label: "Hauteur (cm)" },
    { key: "dimensions_w_cm", label: "Largeur (cm)" },
    { key: "dimensions_d_cm", label: "Profondeur (cm)" },
    { key: "insurance_value", label: "Valeur (€)" },
    { key: "notes", label: "Notes / Description" }
];

interface ExcelImportModalProps {
    file: File | null;
    projectId: string;
    onClose: () => void;
    onImport: (artworks: Artwork[]) => void;
}

export function ExcelImportModal({ file, projectId, onClose, onImport }: ExcelImportModalProps) {
    const [headers, setHeaders] = useState<string[]>([]);
    const [dataPreview, setDataPreview] = useState<any[][]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({}); // Header -> TargetKey
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        if (file) {
            parseFile(file);
        }
    }, [file]);

    const parseFile = async (f: File) => {
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 }); // Array of arrays

            if (jsonData.length > 0) {
                const headerRow = jsonData[0] as string[];
                const previewRows = jsonData.slice(1, 6); // First 5 rows

                setHeaders(headerRow);
                setDataPreview(previewRows);
                autoMapColumns(headerRow);
            }
            setIsAnalyzing(false);
        };
        reader.readAsBinaryString(f);
    };

    const autoMapColumns = (cols: string[]) => {
        const newMap: Record<string, string> = {};
        cols.forEach(col => {
            const lower = col.toLowerCase();
            if (lower.includes("titr") || lower.includes("title") || lower.includes("oeuvr")) newMap[col] = "title";
            else if (lower.includes("artist")) newMap[col] = "artist";
            else if (lower.includes("type") || lower.includes("cat")) newMap[col] = "typology";
            else if ((lower.includes("haut") || lower.includes("height")) && !lower.includes("unit")) newMap[col] = "dimensions_h_cm";
            else if ((lower.includes("larg") || lower.includes("width")) && !lower.includes("unit")) newMap[col] = "dimensions_w_cm";
            else if ((lower.includes("prof") || lower.includes("depth")) && !lower.includes("unit")) newMap[col] = "dimensions_d_cm";
            else if (lower.includes("val") || lower.includes("price") || lower.includes("insur")) newMap[col] = "insurance_value";
            else if (lower.includes("desc") || lower.includes("remarqu") || lower.includes("not")) newMap[col] = "notes";
            else newMap[col] = "ignore";
        });
        setMapping(newMap);
    };

    const handleImport = () => {
        setImporting(true);
        // Process all data
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawObjects = XLSX.utils.sheet_to_json<any>(sheet); // Array of objects keyed by header

            const newArtworks: Artwork[] = rawObjects.map(row => {
                const artwork: any = {
                    id: crypto.randomUUID(),
                    project_id: projectId,
                    created_at: new Date().toISOString(),
                    // Defaults
                    title: "Sans titre",
                    artist: "Inconnu",
                    typology: "ŒUVRE",
                    dimensions_h_cm: 0,
                    dimensions_w_cm: 0,
                    dimensions_d_cm: 0,
                    insurance_value: 0
                };

                // Map fields
                Object.keys(mapping).forEach(header => {
                    const targetKey = mapping[header];
                    if (targetKey !== "ignore" && row[header] !== undefined) {
                        let value = row[header];
                        // Parsing numbers
                        if (targetKey.includes("dimensions") || targetKey === "insurance_value") {
                            const num = parseFloat(String(value).replace(/,/g, '.').replace(/[^0-9.]/g, ''));
                            artwork[targetKey] = isNaN(num) ? 0 : num;
                        } else {
                            artwork[targetKey] = String(value);
                        }
                    }
                });

                return artwork as Artwork;
            });

            // Delay for effect
            setTimeout(() => {
                onImport(newArtworks);
                setImporting(false);
                onClose();
            }, 800);
        };
        if (file) reader.readAsBinaryString(file);
    };

    if (!file) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <GlassCard className="max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden p-0 border-white/10">
                <div className="p-6 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Table className="text-emerald-500" />
                            Mapping Intelligent
                        </h2>
                        <p className="text-zinc-500 text-sm">Validations des colonnes détectées par l'IA.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-4">
                            <Loader2 className="animate-spin text-emerald-500" size={32} />
                            <p className="text-zinc-400">Analyse du fichier Excel...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Mapping Grid */}
                            <div className="grid grid-cols-1 gap-2">
                                {headers.map(header => (
                                    <div key={header} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
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
                                                        : "border-white/10 text-zinc-500"
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
                                                {headers.slice(0, 5).map(h => <th key={h} className="p-3">{h}</th>)}
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

                <div className="p-6 border-t border-white/5 bg-zinc-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
                        Annuler
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={importing || isAnalyzing}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        {importing ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                        {importing ? "Importation..." : "Importer les Œuvres"}
                    </button>
                </div>
            </GlassCard>
        </div>
    );
}
