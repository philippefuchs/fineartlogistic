"use client";

import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "./ui/GlassCard";
import { DollarSign, PieChart, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Project, QuoteLine, QuoteLineCategory, Artwork } from "@/types";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface BudgetControlProps {
    project: Project;
    quoteLines: QuoteLine[];
    artworks: Artwork[];
}

export function BudgetControl({ project, quoteLines, artworks }: BudgetControlProps) {
    const { updateProject } = useProjectStore();
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [budgetInput, setBudgetInput] = useState(project.target_budget?.toString() || "");

    const packingTotal = useMemo(() => {
        return artworks.reduce((acc, artwork) => acc + (artwork.crate_estimated_cost || 0), 0);
    }, [artworks]);

    const totalSpend = useMemo(() => {
        const linesTotal = quoteLines.reduce((acc, line) => acc + line.total_price, 0);
        return linesTotal + packingTotal;
    }, [quoteLines, packingTotal]);

    const spendByCategory = useMemo(() => {
        const categories: Record<string, number> = {};

        // Add packing costs from artworks first
        if (packingTotal > 0) {
            categories['PACKING'] = (categories['PACKING'] || 0) + packingTotal;
        }

        quoteLines.forEach(line => {
            const cat = line.category || 'OTHER';
            categories[cat] = (categories[cat] || 0) + line.total_price;
        });
        return Object.entries(categories).sort((a, b) => b[1] - a[1]);
    }, [quoteLines, packingTotal]);

    const budgetStatus = useMemo(() => {
        if (!project.target_budget) return 'unset';
        const percent = (totalSpend / project.target_budget) * 100;
        if (percent > 100) return 'over_budget';
        if (percent > 90) return 'warning';
        return 'good';
    }, [totalSpend, project.target_budget]);

    const handleSaveBudget = () => {
        const value = parseFloat(budgetInput);
        if (!isNaN(value)) {
            updateProject(project.id, { target_budget: value });
            setIsEditingBudget(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString() + " " + project.currency;
    };

    const getCategoryColor = (cat: string) => {
        const colors: Record<string, string> = {
            'PACKING': 'bg-blue-500',
            'TRANSPORT': 'bg-emerald-500',
            'HANDLING': 'bg-amber-500',
            'CUSTOMS': 'bg-purple-500',
            'INSURANCE': 'bg-red-500',
            'COURIER': 'bg-pink-500'
        };
        return colors[cat] || 'bg-zinc-500';
    };

    return (
        <GlassCard className="p-6 border-white/10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-400" />
                        Contrôle Budgétaire
                    </h3>
                    <p className="text-sm text-zinc-500">Suivi des dépenses et marges</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Dépenses Totales</p>
                    <p className="text-2xl font-black text-white">{formatCurrency(totalSpend)}</p>
                </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="mb-8 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Budget Cible</span>
                    <div className="flex items-center gap-2">
                        {isEditingBudget ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={budgetInput}
                                    onChange={(e) => setBudgetInput(e.target.value)}
                                    className="w-32 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-emerald-500"
                                    placeholder="0.00"
                                />
                                <button
                                    onClick={handleSaveBudget}
                                    className="text-emerald-400 hover:text-emerald-300"
                                >
                                    <CheckCircle2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingBudget(true)}>
                                <span className={cn(
                                    "text-lg font-bold",
                                    !project.target_budget ? "text-zinc-600 italic" : "text-white"
                                )}>
                                    {project.target_budget ? formatCurrency(project.target_budget) : "Non défini"}
                                </span>
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-500 transition-opacity">
                                    Éditer
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {project.target_budget ? (
                    <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-1000 ease-out",
                                budgetStatus === 'over_budget' ? "bg-red-500" :
                                    budgetStatus === 'warning' ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min((totalSpend / project.target_budget) * 100, 100)}%` }}
                        />
                    </div>
                ) : (
                    <div className="h-4 bg-zinc-800/50 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
                        <span className="text-[9px] text-zinc-600">Définissez un budget pour voir la progression</span>
                    </div>
                )}

                {project.target_budget && (
                    <div className="mt-2 flex justify-between text-[10px] uppercase font-bold text-zinc-500">
                        <span>0%</span>
                        <span>{Math.round((totalSpend / project.target_budget) * 100)}% Utilisé</span>
                    </div>
                )}
            </div>

            {/* Cost Breakdown */}
            <div>
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <PieChart size={14} />
                    Répartition par Catégorie
                </h4>
                <div className="space-y-3">
                    {spendByCategory.length > 0 ? spendByCategory.map(([cat, amount]) => (
                        <div key={cat} className="flex items-center gap-3">
                            <div className={`w-2 h-8 rounded-full ${getCategoryColor(cat)}`} />
                            <div className="flex-1">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-medium text-white">{cat}</span>
                                    <span className="text-sm text-zinc-400">{formatCurrency(amount)}</span>
                                </div>
                                <div className="w-full bg-zinc-800/50 h-1 rounded-full mt-1">
                                    <div
                                        className={`h-full rounded-full ${getCategoryColor(cat)}`}
                                        style={{ width: `${(amount / totalSpend) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-8 text-center text-zinc-600 text-sm italic">
                            Aucune dépense enregistrée.
                        </div>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}
