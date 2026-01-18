"use client";

import { Artwork } from "@/types";
import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Check, Box, AlertCircle, Trash2, MoreVertical, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartInventoryTableProps {
    artworks: Artwork[];
    onUpdate: (id: string, updates: Partial<Artwork>) => void;
    onDelete: (id: string) => void;
}

export function SmartInventoryTable({ artworks, onUpdate, onDelete }: SmartInventoryTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastUpdatedIds, setLastUpdatedIds] = useState<Set<string>>(new Set());

    // Toggle single selection
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    // Toggle all
    const toggleAll = () => {
        if (selectedIds.size === artworks.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(artworks.map(a => a.id)));
    };

    // Bulk Action: Assign Caisse T1
    const assignCrateT1 = () => {
        const ids = Array.from(selectedIds);
        ids.forEach(id => {
            onUpdate(id, {
                recommended_crate: "CAISSE T1 (Standard)",
                crate_estimated_cost: 450
            });
        });

        // Flash Effect
        setLastUpdatedIds(new Set(ids));
        setTimeout(() => setLastUpdatedIds(new Set()), 2000); // Remove flash after 2s
        setSelectedIds(new Set()); // Deselect
    };

    // Logic: Is Oversized? (Rule: Any dim > 150cm or Sum > 300cm)
    const isOversized = (a: Artwork) => {
        return (
            (a.dimensions_h_cm || 0) > 150 ||
            (a.dimensions_w_cm || 0) > 150 ||
            ((a.dimensions_h_cm || 0) + (a.dimensions_w_cm || 0) + (a.dimensions_d_cm || 0)) > 300
        );
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Bulk Toolbar */}
            {selectedIds.size > 0 && (
                <div className="sticky top-4 z-50 flex items-center justify-between bg-blue-600 text-white p-4 rounded-xl shadow-xl shadow-blue-500/20 animate-in slide-in-from-top-2 fade-in">
                    <div className="flex items-center gap-4">
                        <span className="font-bold bg-white/20 px-3 py-1 rounded-lg">{selectedIds.size} Payés</span>
                        <span className="text-sm border-l border-white/20 pl-4">Actions de masse :</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={assignCrateT1}
                            className="bg-white text-blue-600 hover:bg-zinc-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <Package size={16} />
                            Assigner Caisse T1 (450€)
                        </button>
                        <button
                            onClick={() => {
                                Array.from(selectedIds).forEach(id => onDelete(id));
                                setSelectedIds(new Set());
                            }}
                            className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-lg transition-colors"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Smart Table */}
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-900/50 uppercase tracking-widest text-[10px] font-bold text-zinc-500">
                        <tr>
                            <th className="p-4 w-12">
                                <input
                                    type="checkbox"
                                    className="rounded border-zinc-700 bg-zinc-800"
                                    checked={selectedIds.size === artworks.length && artworks.length > 0}
                                    onChange={toggleAll}
                                />
                            </th>
                            <th className="p-4">Œuvre</th>
                            <th className="p-4">Dimensions</th>
                            <th className="p-4">Valeur</th>
                            <th className="p-4">Caisse</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {artworks.map(artwork => {
                            const oversized = isOversized(artwork);
                            const updated = lastUpdatedIds.has(artwork.id);
                            const selected = selectedIds.has(artwork.id);

                            return (
                                <tr
                                    key={artwork.id}
                                    className={cn(
                                        "group transition-all duration-500",
                                        selected ? "bg-blue-500/10" : "hover:bg-white/[0.04]",
                                        updated && "bg-emerald-500/20"
                                    )}
                                >
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            className="rounded border-zinc-700 bg-zinc-800"
                                            checked={selected}
                                            onChange={() => toggleSelection(artwork.id)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 flex-shrink-0 rounded bg-zinc-800 overflow-hidden relative">
                                                {/* Placeholder for Image */}
                                                <div className="absolute inset-0 flex items-center justify-center text-zinc-600 font-bold text-xs">
                                                    {artwork.title.slice(0, 2).toUpperCase()}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{artwork.title}</p>
                                                <p className="text-xs text-zinc-500">{artwork.artist} • {artwork.typology}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-mono",
                                            oversized ? "bg-red-500/10 text-red-400 border border-red-500/20" : "text-zinc-300"
                                        )}>
                                            {artwork.dimensions_h_cm}x{artwork.dimensions_w_cm}x{artwork.dimensions_d_cm}
                                            {oversized && (
                                                <div className="group/tooltip relative">
                                                    <AlertCircle size={12} className="text-red-500 animate-pulse" />
                                                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 bg-zinc-900 border border-red-500/50 p-2 rounded-lg z-50 hidden group-hover/tooltip:block">
                                                        <p className="text-[10px] text-red-200">
                                                            Hors Gabarit Standard (&gt;150cm ou somme &gt;300cm). Nécessite Caisse Sur-mesure.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-white font-mono">
                                        {artwork.insurance_value.toLocaleString()} €
                                    </td>
                                    <td className="p-4">
                                        {artwork.recommended_crate ? (
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border",
                                                    artwork.recommended_crate.includes("T1")
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                        : "bg-zinc-800 text-zinc-400 border-white/5"
                                                )}>
                                                    {artwork.recommended_crate}
                                                </span>
                                                {artwork.crate_estimated_cost && (
                                                    <span className="text-xs font-bold text-emerald-500">{artwork.crate_estimated_cost} €</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs italic text-zinc-600">Non assigné</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => onDelete(artwork.id)}
                                            className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {artworks.length === 0 && (
                <div className="text-center py-12 text-zinc-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    <Box size={32} className="mx-auto mb-2 opacity-50" />
                    Pas d'œuvres dans l'inventaire.
                </div>
            )}
        </div>
    );
}
