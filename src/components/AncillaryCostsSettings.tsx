"use client";

import { useState } from "react";
import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "./ui/GlassCard";
import { Receipt, Plus, Trash2 } from "lucide-react";
import { AncillaryCostTemplate } from "@/types";
import { generateId } from "@/lib/generateId";

export function AncillaryCostsSettings() {
    const { logisticsConfig, updateLogisticsConfig } = useProjectStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: "", amount: 0 });

    const handleUpdateTemplate = (templateId: string, updates: Partial<AncillaryCostTemplate>) => {
        const updatedTemplates = logisticsConfig.ancillary_cost_templates.map(t =>
            t.id === templateId ? { ...t, ...updates } : t
        );
        updateLogisticsConfig({ ancillary_cost_templates: updatedTemplates });
    };

    const handleAddTemplate = () => {
        if (newTemplate.name.trim() && newTemplate.amount > 0) {
            const template: AncillaryCostTemplate = {
                id: generateId(),
                category: 'EQUIPMENT',
                name: newTemplate.name.trim(),
                default_amount: newTemplate.amount
            };
            updateLogisticsConfig({
                ancillary_cost_templates: [...logisticsConfig.ancillary_cost_templates, template]
            });
            setNewTemplate({ name: "", amount: 0 });
            setIsAdding(false);
        }
    };

    const handleDeleteTemplate = (templateId: string) => {
        const updatedTemplates = logisticsConfig.ancillary_cost_templates.filter(t => t.id !== templateId);
        updateLogisticsConfig({ ancillary_cost_templates: updatedTemplates });
    };

    return (
        <GlassCard>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
                    <Receipt size={20} className="text-amber-500" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-white">Frais Annexes Types</h4>
                    <p className="text-xs text-zinc-500">Templates de frais courants</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-500 transition-colors text-sm"
                >
                    <Plus size={16} />
                    Ajouter
                </button>
            </div>

            <div className="space-y-2">
                {logisticsConfig.ancillary_cost_templates.map((template) => (
                    <div
                        key={template.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <input
                            type="text"
                            value={template.name}
                            onChange={(e) => handleUpdateTemplate(template.id, { name: e.target.value })}
                            className="flex-1 bg-transparent border-none text-white focus:outline-none"
                        />
                        <input
                            type="number"
                            value={template.default_amount}
                            onChange={(e) => handleUpdateTemplate(template.id, { default_amount: Number(e.target.value) })}
                            className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-zinc-500">€</span>
                        <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add new template */}
            {isAdding && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-blue-500/30">
                    <input
                        type="text"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="Nom du frais"
                        className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                        autoFocus
                    />
                    <input
                        type="number"
                        value={newTemplate.amount || ""}
                        onChange={(e) => setNewTemplate({ ...newTemplate, amount: Number(e.target.value) })}
                        placeholder="Montant"
                        className="w-24 bg-white/5 border border-white/10 rounded px-2 py-2 text-right text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-zinc-500">€</span>
                    <button
                        onClick={handleAddTemplate}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors"
                    >
                        OK
                    </button>
                    <button
                        onClick={() => {
                            setIsAdding(false);
                            setNewTemplate({ name: "", amount: 0 });
                        }}
                        className="px-4 py-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"
                    >
                        ✕
                    </button>
                </div>
            )}
        </GlassCard>
    );
}
