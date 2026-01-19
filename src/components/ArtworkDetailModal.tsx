"use client";

import { Artwork } from "@/types";
import { GlassCard } from "./ui/GlassCard";
import { X, Box, Ruler, Weight, Tag, ShieldCheck, Info, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtworkDetailModalProps {
    artwork: Artwork;
    onClose: () => void;
}

export function ArtworkDetailModal({ artwork, onClose }: ArtworkDetailModalProps) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <GlassCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto border-white/10 p-0 shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <Box size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white leading-tight">{artwork.title}</h2>
                            <p className="text-zinc-500 font-medium italic">{artwork.artist}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5 text-zinc-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Side: Artwork Visuals & Main Info */}
                    <div className="lg:col-span-5 space-y-8">
                        {/* Image Preview */}
                        <div className="aspect-square w-full rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden group">
                            {artwork.image_data ? (
                                <img src={artwork.image_data} alt={artwork.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                                    <Box size={64} className="mb-4 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Aucun aperçu</p>
                                </div>
                            )}
                        </div>

                        {/* Physical Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] font-black text-zinc-600 uppercase mb-2 flex items-center gap-1.5">
                                    <Ruler size={12} /> Dimensions
                                </p>
                                <p className="text-lg font-bold text-white">
                                    {artwork.dimensions_h_cm} <span className="text-xs text-zinc-500">×</span> {artwork.dimensions_w_cm} <span className="text-xs text-zinc-500">×</span> {artwork.dimensions_d_cm} <span className="text-xs text-zinc-500">cm</span>
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] font-black text-zinc-600 uppercase mb-2 flex items-center gap-1.5">
                                    <Weight size={12} /> Poids
                                </p>
                                <p className="text-lg font-bold text-white">
                                    {artwork.weight_kg} <span className="text-xs text-zinc-500">kg</span>
                                </p>
                            </div>
                        </div>

                        {/* Status & Category */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                                <span className="text-xs font-bold text-zinc-500 uppercase">Typologie</span>
                                <span className="text-xs font-black bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                                    {artwork.typology}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                                <span className="text-xs font-bold text-zinc-500 uppercase">Prêteur</span>
                                <span className="text-xs font-bold text-white">
                                    {artwork.lender_museum} ({artwork.lender_city})
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Logistical Details */}
                    <div className="lg:col-span-7 space-y-10">
                        {/* Packaging Recommendation */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                Colisage & Protection
                            </h3>

                            <GlassCard className="bg-emerald-500/5 border-emerald-500/20 p-6">
                                <div className="flex items-start justify-between gap-4 mb-6">
                                    <div>
                                        <p className="text-sm font-black text-emerald-400 uppercase tracking-tight italic">
                                            {artwork.recommended_crate || "NON DÉFINI"}
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Grade de protection calculé selon fragilité et typology.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-zinc-600 uppercase">Fragilité</p>
                                        <div className="flex gap-1 mt-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "h-1.5 w-4 rounded-full",
                                                        (artwork.fragility || 0) >= i ? "bg-red-500" : "bg-zinc-800"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {artwork.crate_specs && (
                                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-emerald-500/10">
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Intérieur (mm)</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-400">Hauteur</span>
                                                    <span className="font-mono text-white">{artwork.crate_specs.internal_dimensions.h}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-400">Largeur</span>
                                                    <span className="font-mono text-white">{artwork.crate_specs.internal_dimensions.w}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-400">Profondeur</span>
                                                    <span className="font-mono text-white">{artwork.crate_specs.internal_dimensions.d}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Extérieur (mm)</p>
                                            <div className="space-y-1 text-emerald-400">
                                                <div className="flex justify-between text-xs">
                                                    <span className="opacity-60">Hauteur</span>
                                                    <span className="font-mono font-bold">{artwork.crate_specs.external_dimensions.h}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="opacity-60">Largeur</span>
                                                    <span className="font-mono font-bold">{artwork.crate_specs.external_dimensions.w}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="opacity-60">Profondeur</span>
                                                    <span className="font-mono font-bold">{artwork.crate_specs.external_dimensions.d}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </GlassCard>
                        </section>

                        {/* Financial Detail */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-2">
                                <Tag size={14} className="text-blue-500" />
                                Valorisation & Devis Estimatif
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 space-y-2">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Assurance Clou à Clou</p>
                                    <p className="text-2xl font-black text-white italic">
                                        {artwork.insurance_value.toLocaleString()} <span className="text-sm font-normal text-zinc-500">EUR</span>
                                    </p>
                                </div>
                                <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-emerald-950 border border-emerald-500/20 space-y-2">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Prix Estimé Caisse</p>
                                    <p className="text-2xl font-black text-emerald-400 italic">
                                        {artwork.crate_estimated_cost?.toLocaleString() || "---"} <span className="text-sm font-normal opacity-50">EUR</span>
                                    </p>
                                </div>
                            </div>

                            {artwork.crate_calculation_details && (
                                <div className="mt-6">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase mb-3 flex items-center gap-2">
                                        <Info size={12} /> Détail des matériaux & main d'œuvre
                                    </h4>
                                    <pre className="p-5 rounded-xl bg-black/40 border border-white/5 text-[10px] leading-relaxed text-zinc-400 font-mono overflow-x-auto">
                                        {artwork.crate_calculation_details}
                                    </pre>
                                </div>
                            )}
                        </section>

                        {/* Additional Info */}
                        {artwork.notes && (
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-2">
                                    Observations
                                </h3>
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10">
                                    <p className="text-xs text-zinc-500 leading-relaxed italic">{artwork.notes}</p>
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01]">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-all shadow-xl"
                    >
                        Fermer le Détail
                    </button>
                </div>
            </GlassCard>
        </div>
    );
}
