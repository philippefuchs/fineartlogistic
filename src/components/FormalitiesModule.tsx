"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "./ui/GlassCard";
import { FileText, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Formality {
    id: string;
    label: string;
    price: number;
    description: string;
    isMandatory?: boolean;
    autoTrigger?: (origin: string, dest: string) => boolean;
}

const COMMON_FORMALITIES: Formality[] = [
    {
        id: 'export_customs',
        label: 'Douane Export (France)',
        price: 250,
        description: 'Déclaration hors Union Européenne',
        autoTrigger: (o, d) => !d.includes('France') && !d.includes('EU') && o.includes('France')
    },
    {
        id: 'import_customs',
        label: 'Douane Import (USA/Agent)',
        price: 350,
        description: 'Forfait dédouanement destination',
        autoTrigger: (o, d) => d.includes('USA') || d.includes('États-Unis')
    },
    {
        id: 'beaux_arts',
        label: 'Passeport Beaux-Arts',
        price: 150,
        description: 'Autorisation de sortie pour œuvres classées',
        autoTrigger: () => false // Manual
    },
    {
        id: 'cites',
        label: 'CITES / Certificat Ivoire',
        price: 450,
        description: 'Permis pour matériaux protégés',
        autoTrigger: () => false // Manual
    },
    {
        id: 'tarmac_access',
        label: 'Accès Tarmac / Supervision',
        price: 450,
        description: 'Badge obligatoire CDG/Orly pour supervision vol',
        autoTrigger: (o, d) => d.includes('USA') || d.includes('NY')
    }
];

interface FormalitiesModuleProps {
    origin: string;
    destination: string;
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

export function FormalitiesModule({ origin, destination, selectedIds, onChange }: FormalitiesModuleProps) {

    // Auto-trigger logic
    useEffect(() => {
        const autoSelected = COMMON_FORMALITIES
            .filter(f => f.autoTrigger?.(origin, destination))
            .map(f => f.id);

        // Merge with existing but only add if not already there
        const newSelection = Array.from(new Set([...selectedIds, ...autoSelected]));
        if (newSelection.length !== selectedIds.length) {
            onChange(newSelection);
        }
    }, [origin, destination]);

    const toggleFormality = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(v => v !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const totalFormalities = COMMON_FORMALITIES
        .filter(f => selectedIds.includes(f.id))
        .reduce((sum, f) => sum + f.price, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="text-purple-400" size={20} />
                    Module Formalités & Douanes
                </h3>
                <div className="px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                    <span className="text-xs font-black text-purple-400">TOTAL : {totalFormalities.toLocaleString()} €</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COMMON_FORMALITIES.map((f) => {
                    const isSelected = selectedIds.includes(f.id);
                    const isAuto = f.autoTrigger?.(origin, destination);

                    return (
                        <div
                            key={f.id}
                            onClick={() => toggleFormality(f.id)}
                            className={cn(
                                "flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                                isSelected
                                    ? "bg-purple-600/10 border-purple-500 shadow-lg shadow-purple-500/5"
                                    : "bg-white/5 border-white/5 hover:border-white/10"
                            )}
                        >
                            <div className={cn(
                                "mt-1 rounded-md p-1 border",
                                isSelected ? "bg-purple-500 text-white border-purple-500" : "bg-transparent text-transparent border-white/20"
                            )}>
                                <CheckCircle2 size={12} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-white">{f.label}</p>
                                    <span className="text-xs font-black text-purple-400">{f.price} €</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1">{f.description}</p>
                                {isAuto && !isSelected && (
                                    <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                                        <AlertTriangle size={10} />
                                        Recommandé pour ce flux
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 flex items-center gap-3">
                <ShieldCheck className="text-emerald-500" size={18} />
                <p className="text-[11px] text-zinc-400 leading-tight">
                    <span className="text-emerald-500 font-bold">Sécurité Logistique :</span> Les frais de douane sont des estimations forfaitaires. Les taxes d'importation réelles (VAT/Customs) seront facturées au débours.
                </p>
            </div>
        </div>
    );
}
