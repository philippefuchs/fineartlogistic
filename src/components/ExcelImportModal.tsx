import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { X, ArrowRight, Table, Wand2, Loader2, Check } from "lucide-react";
import { Artwork } from "@/types";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { calculatePacking, getCrateTypeLabel } from "@/services/packingEngine";
import { calculateCost } from "@/services/costCalculator";
import { generateId } from "@/lib/generateId";

// Target fields in our DB
const TARGET_FIELDS: { key: string, label: string }[] = [
    { key: "ignore", label: "-- Ignorer --" },
    { key: "title", label: "Titre" },
    { key: "artist", label: "Artiste" },
    { key: "typology", label: "Typologie" },
    { key: "dimensions_all", label: "Dimensions (H x L x P)" },
    { key: "dimensions_h_cm", label: "Hauteur (cm)" },
    { key: "dimensions_w_cm", label: "Largeur (cm)" },
    { key: "dimensions_d_cm", label: "Profondeur (cm)" },
    { key: "weight_kg", label: "Poids (kg)" },
    { key: "insurance_value", label: "Valeur (€)" },
    { key: "lender_city", label: "Ville de Départ" },
    { key: "lender_country", label: "Pays de Départ" },
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
    const [useInches, setUseInches] = useState(false);

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
            const cleanCol = col.trim();
            const lower = cleanCol.toLowerCase();

            if (lower.includes("titr") || lower.includes("title") || lower.includes("oeuvr") || lower.includes("nom")) newMap[col] = "title";
            else if (lower.includes("artist") || lower.includes("auteur") || lower.includes("peintre") || lower.includes("createur")) newMap[col] = "artist";
            else if (lower.includes("type") || lower.includes("cat") || lower.includes("typologie")) newMap[col] = "typology";
            // Dimensions: Check simply for "dim" to catch "Dimensions (H x L x P)"
            else if (lower.includes("dim")) newMap[col] = "dimensions_all";
            else if ((lower.includes("haut") || lower.includes("height")) && !lower.includes("unit")) newMap[col] = "dimensions_h_cm";
            else if ((lower.includes("larg") || lower.includes("width")) && !lower.includes("unit")) newMap[col] = "dimensions_w_cm";
            else if ((lower.includes("prof") || lower.includes("depth")) && !lower.includes("unit")) newMap[col] = "dimensions_d_cm";
            else if (lower.includes("poid") || lower.includes("weight")) newMap[col] = "weight_kg";
            else if (lower.includes("val") || lower.includes("price") || lower.includes("insur") || lower.includes("montant")) newMap[col] = "insurance_value";
            else if (lower.includes("city") || lower.includes("ville") || lower.includes("départ") || lower.includes("origin") || lower.includes("lieu")) newMap[col] = "lender_city";
            else if (lower.includes("country") || lower.includes("pays")) newMap[col] = "lender_country";
            else if (lower.includes("desc") || lower.includes("remarqu") || lower.includes("not")) newMap[col] = "notes";
            else newMap[col] = "ignore";
        });
        setMapping(newMap);
    };

    const parseDimensions = (dimString: string) => {
        const str = String(dimString).trim();
        console.log("DEBUG: Parsing dimensions:", dimString, "->", str);
        if (!str) return { h: 0, w: 0, d: 0 };

        // CLEANUP: Replace commas with dots
        const cleanStr = str.replace(/,/g, '.');

        // Strategy 1: Look for explicit labelling H/L/W/P/D (e.g. "H.45 L.20 P.20")
        // We look for patterns like "H 100", "H.100", "H:100", "Height 100"
        const hMatch = cleanStr.match(/(?:h|haut|height)[\.\s:]*([0-9.]+)/i);
        const wMatch = cleanStr.match(/(?:l|larg|w|width)[\.\s:]*([0-9.]+)/i);
        const dMatch = cleanStr.match(/(?:p|prof|d|depth)[\.\s:]*([0-9.]+)/i);

        if (hMatch || wMatch || dMatch) {
            const parseVal = (m: RegExpMatchArray | null) => m ? parseFloat(m[1]) : 0;
            return {
                h: parseVal(hMatch),
                w: parseVal(wMatch),
                d: parseVal(dMatch)
            };
        }

        // Strategy 2: Split by standard separators x, X, *, ×
        // "100 x 200 x 3" -> [100, 200, 3]
        if (cleanStr.match(/[xX\*×]/)) {
            const parts = cleanStr.split(/[xX\*×]/).map(p => {
                // Keep only numbers and dots
                const numStr = p.replace(/[^0-9.]/g, '');
                return parseFloat(numStr) || 0;
            });
            return {
                h: parts[0] || 0,
                w: parts[1] || 0,
                d: parts[2] || 0
            };
        }

        // Strategy 3: Just extract all numbers in order
        // "100 200 3" or other variations
        const numbers = cleanStr.match(/[0-9.]+/g);
        if (numbers && numbers.length >= 2) {
            const vals = numbers.map(n => parseFloat(n));
            return {
                h: vals[0] || 0,
                w: vals[1] || 0, // Assume W is 2nd
                d: vals[2] || 0  // Assume D is 3rd
            };
        }

        return { h: 0, w: 0, d: 0 };
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

            const conversionFactor = useInches ? 2.54 : 1;

            const newArtworks: Artwork[] = rawObjects.map(row => {
                const artwork: any = {
                    id: generateId(),
                    project_id: projectId,
                    created_at: new Date().toISOString(),
                    // Defaults
                    title: "Sans titre",
                    artist: "Inconnu",
                    typology: "TABLEAU",
                    dimensions_h_cm: 0,
                    dimensions_w_cm: 0,
                    dimensions_d_cm: 0,
                    weight_kg: 2,
                    insurance_value: 0,
                    lender_city: "Paris",
                    lender_country: "France"
                };

                // Map fields
                Object.keys(mapping).forEach(header => {
                    const targetKey = mapping[header];
                    if (targetKey !== "ignore" && row[header] !== undefined) {
                        let value = row[header];

                        if (targetKey === "dimensions_all") {
                            const dims = parseDimensions(String(value));
                            artwork.dimensions_h_cm = Math.round(dims.h * conversionFactor);
                            artwork.dimensions_w_cm = Math.round(dims.w * conversionFactor);
                            artwork.dimensions_d_cm = Math.round(dims.d * conversionFactor);
                        } else if (targetKey.includes("dimensions") || targetKey === "insurance_value" || targetKey === "weight_kg") {
                            // Enhanced number parsing for French format (15 000 000 -> 15000000, 12,5 -> 12.5)
                            // Remove spaces, replace comma with dot, then remove anything else
                            const cleanValue = String(value).replace(/\s/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
                            const num = parseFloat(cleanValue);
                            const finalValue = isNaN(num) ? 0 : num;

                            if (targetKey.includes("dimensions")) {
                                artwork[targetKey] = Math.round(finalValue * conversionFactor);
                            } else {
                                artwork[targetKey] = finalValue;
                            }
                        } else {
                            artwork[targetKey] = String(value);
                        }
                    }
                });

                // Priority 2: Automation of Packing & Cost
                const packingInput = {
                    h_cm: artwork.dimensions_h_cm,
                    w_cm: artwork.dimensions_w_cm,
                    d_cm: artwork.dimensions_d_cm,
                    weight_kg: artwork.weight_kg,
                    typology: artwork.typology,
                    fragility: (artwork.fragility || 2) as 1 | 2 | 3 | 4 | 5,
                    hasFragileFrame: artwork.hasFragileFrame
                };

                const packing = calculatePacking(packingInput);
                const cost = calculateCost(packing);

                artwork.crate_specs = {
                    crate_type: packing.crateType === 'T2_MUSEE' ? 'MUSÉE' : 'VOYAGE',
                    internal_dimensions: { h: packing.internal_h_mm, w: packing.internal_w_mm, d: packing.internal_d_mm },
                    external_dimensions: { h: packing.external_h_mm, w: packing.external_w_mm, d: packing.external_d_mm }
                };
                artwork.recommended_crate = getCrateTypeLabel(packing.crateType);
                artwork.crate_estimated_cost = Math.ceil(cost.sellingPrice_eur);
                artwork.crate_factory_cost = cost.factoryCost_eur;
                artwork.crate_calculation_details = `Caisse ${packing.crateType} | Volume ext: ${packing.externalVolume_m3.toFixed(3)}m3 | MO: ${cost.fabricationTime_hours}h`;

                return artwork as Artwork;
            });

            // Delay for effect
            setTimeout(() => {
                onImport(newArtworks);
                // We DON'T setImporting(false) here to keep it disabled until it closes
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
                            Importateur AO (Loader)
                        </h2>
                        <p className="text-zinc-500 text-sm">Validations des colonnes et conversion automatique.</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="text-right">
                                <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">Dimensions en Inches</p>
                                <p className="text-[10px] text-zinc-500">Conversion auto vers cm (x2.54)</p>
                            </div>
                            <div
                                onClick={() => setUseInches(!useInches)}
                                className={cn(
                                    "w-12 h-6 rounded-full relative transition-colors duration-300",
                                    useInches ? "bg-emerald-500" : "bg-zinc-800"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm",
                                    useInches ? "left-7" : "left-1"
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
