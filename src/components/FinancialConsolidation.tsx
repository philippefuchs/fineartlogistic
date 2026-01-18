"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { X, Download, TrendingUp, DollarSign, Percent, FileSpreadsheet, Package } from "lucide-react";
import { QuoteLine, LogisticsFlow, Project, Artwork } from "@/types";
import { cn } from "@/lib/utils";
import { exportFinancialOffertoXLSX } from "@/services/excelExportService";

interface FinancialConsolidationProps {
    project: Project;
    flows: LogisticsFlow[];
    quoteLines: QuoteLine[];
    artworks: Artwork[];
    onClose: () => void;
    onExport: (finalData: any) => void;
}

export function FinancialConsolidation({ project, flows, quoteLines, artworks, onClose, onExport }: FinancialConsolidationProps) {
    const [globalMargin, setGlobalMargin] = useState(20); // 20% default
    const [flowMargins, setFlowMargins] = useState<Record<string, number>>({});
    const [exporting, setExporting] = useState(false);

    // Group quote lines by flow
    const flowData = useMemo(() => {
        return flows.map(flow => {
            const lines = quoteLines.filter(l => l.flow_id === flow.id);
            const totalCost = lines.reduce((acc, l) => acc + l.total_price, 0);
            const margin = flowMargins[flow.id] ?? globalMargin;
            const sellingPrice = totalCost * (1 + margin / 100);
            const profit = sellingPrice - totalCost;

            return {
                flow,
                lines,
                totalCost,
                margin,
                sellingPrice,
                profit
            };
        });
    }, [flows, quoteLines, flowMargins, globalMargin]);

    const totals = useMemo(() => {
        const packingCost = artworks.reduce((acc, a) => acc + (a.crate_estimated_cost || 0), 0);
        const flowTotalCost = flowData.reduce((acc, f) => acc + f.totalCost, 0);
        const totalCost = flowTotalCost + packingCost;

        const totalSelling = flowData.reduce((acc, f) => acc + f.sellingPrice, 0) + (packingCost * (1 + globalMargin / 100));
        const totalProfit = totalSelling - totalCost;
        const avgMargin = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;

        return { totalCost, totalSelling, totalProfit, avgMargin, packingCost };
    }, [flowData, artworks, globalMargin]);

    const handleFlowMarginChange = (flowId: string, value: number) => {
        setFlowMargins({ ...flowMargins, [flowId]: value });
    };

    const applyGlobalMargin = () => {
        const newMargins: Record<string, number> = {};
        flows.forEach(f => newMargins[f.id] = globalMargin);
        setFlowMargins(newMargins);
    };

    const handleExport = () => {
        setExporting(true);
        try {
            exportFinancialOffertoXLSX(project, flowData, totals, artworks);
            onExport(flowData);
        } catch (error) {
            console.error(error);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <GlassCard className="max-w-5xl w-full max-h-[90vh] overflow-hidden p-0 border-white/10 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-emerald-900/20 to-blue-900/20 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <TrendingUp className="text-emerald-500" />
                            Consolidation Financière
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1">Ajustez vos marges et générez l'offre finale.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Global Margin Control */}
                <div className="p-6 border-b border-white/5 bg-zinc-900/30">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Percent size={16} className="text-blue-500" />
                                Marge Globale
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1">Appliquer à tous les flux</p>
                        </div>
                        <button
                            onClick={applyGlobalMargin}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                        >
                            Appliquer Partout
                        </button>
                    </div>
                    <div className="flex items-center gap-6">
                        <input
                            type="range"
                            min="10"
                            max="40"
                            step="1"
                            value={globalMargin}
                            onChange={(e) => setGlobalMargin(Number(e.target.value))}
                            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="w-24 text-right">
                            <span className="text-3xl font-black text-emerald-400">{globalMargin}%</span>
                        </div>
                    </div>
                </div>

                {/* Packing Section */}
                {totals.packingCost > 0 && (
                    <div className="mx-6 mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                                <Package size={18} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Emballage & Colisage</h4>
                                <p className="text-[10px] text-orange-400/60 font-medium">Calculé sur {artworks.filter(a => a.crate_estimated_cost).length} œuvre(s)</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-zinc-500">Coût de Revient</p>
                            <p className="text-lg font-bold text-orange-400">{totals.packingCost.toLocaleString()} €</p>
                        </div>
                    </div>
                )}

                {/* Flow-by-Flow Breakdown */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {flowData.map(({ flow, lines, totalCost, margin, sellingPrice, profit }) => (
                        <GlassCard key={flow.id} className="p-5 border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="text-sm font-bold text-white">
                                        {flow.origin_country} → {flow.destination_country}
                                    </h4>
                                    <p className="text-xs text-zinc-500 mt-1">{lines.length} ligne(s) de coût</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">Coût Total</p>
                                    <p className="text-lg font-bold text-white">{totalCost.toLocaleString()} €</p>
                                </div>
                            </div>

                            {/* Margin Slider */}
                            <div className="flex items-center gap-4 mb-3">
                                <label className="text-xs font-bold text-zinc-400 w-16">Marge:</label>
                                <input
                                    type="range"
                                    min="10"
                                    max="40"
                                    step="1"
                                    value={margin}
                                    onChange={(e) => handleFlowMarginChange(flow.id, Number(e.target.value))}
                                    className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="text-lg font-black text-blue-400 w-16 text-right">{margin}%</span>
                            </div>

                            {/* Results */}
                            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/5">
                                <div>
                                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Prix de Vente</p>
                                    <p className="text-sm font-bold text-emerald-400">{sellingPrice.toLocaleString()} €</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Profit</p>
                                    <p className="text-sm font-bold text-yellow-400">+{profit.toLocaleString()} €</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Marge Réelle</p>
                                    <p className="text-sm font-bold text-white">{margin.toFixed(1)}%</p>
                                </div>
                            </div>
                        </GlassCard>
                    ))}

                    {flowData.length === 0 && (
                        <div className="text-center py-12 text-zinc-500">
                            <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                            Aucune donnée financière disponible.
                        </div>
                    )}
                </div>

                {/* Footer: Totals & Export */}
                <div className="p-6 border-t border-white/5 bg-gradient-to-r from-zinc-900/50 to-black/50">
                    <div className="grid grid-cols-4 gap-6 mb-6">
                        <div className="text-center p-4 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Coût Total</p>
                            <p className="text-xl font-black text-white">{totals.totalCost.toLocaleString()} €</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1">Prix de Vente</p>
                            <p className="text-xl font-black text-emerald-400">{totals.totalSelling.toLocaleString()} €</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-[10px] text-yellow-400 uppercase tracking-widest mb-1">Profit Total</p>
                            <p className="text-xl font-black text-yellow-400">+{totals.totalProfit.toLocaleString()} €</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">Marge Moyenne</p>
                            <p className="text-xl font-black text-blue-400">{totals.avgMargin.toFixed(1)}%</p>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={exporting || flowData.length === 0}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-xl shadow-emerald-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exporting ? (
                            "Génération en cours..."
                        ) : (
                            <>
                                <FileSpreadsheet size={20} />
                                Générer l'Offre Finale (XLSX)
                            </>
                        )}
                    </button>
                </div>
            </GlassCard>
        </div>
    );
}
