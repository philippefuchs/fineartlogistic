"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { X, FileText, Truck, Package, Calculator, Download, MapPin } from "lucide-react";
import { Artwork, Project } from "@/types";
import { calculateFlowTotalCost, calculatePackingService, calculateTransport } from "@/services/logisticsEngine";
import { cn } from "@/lib/utils";
import { exportCompleteQuoteToPDF } from "@/services/reportService";

interface CompleteQuoteModalProps {
    project: Project;
    artworks: Artwork[];
    onClose: () => void;
}

export function CompleteQuoteModal({ project, artworks, onClose }: CompleteQuoteModalProps) {
    const [distance_km, setDistance] = useState(500); // Default 500km
    const [showDetails, setShowDetails] = useState(false);

    // Calcul du devis complet
    const quote = calculateFlowTotalCost(artworks, distance_km);
    const transport = calculateTransport(artworks, distance_km);

    // Calcul des services individuels pour affichage détaillé
    const packingServices = artworks.map(a => ({
        artwork: a,
        service: calculatePackingService(a)
    }));

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <GlassCard className="max-w-4xl w-full max-h-[90vh] overflow-hidden p-0 border-white/10 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-blue-900/20 to-purple-900/20 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <FileText className="text-blue-500" />
                            Devis Complet - {project.name}
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1">Calcul automatique basé sur la Business Logic</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Distance Input */}
                <div className="p-6 border-b border-white/5 bg-zinc-900/30">
                    <div className="flex items-center gap-4">
                        <MapPin size={16} className="text-zinc-500" />
                        <label className="text-sm font-bold text-zinc-400">Distance estimée (km)</label>
                        <input
                            type="number"
                            value={distance_km}
                            onChange={(e) => setDistance(Number(e.target.value))}
                            className="w-32 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                        />
                        <span className="text-xs text-zinc-600">
                            (Utilisé pour le calcul du transport PL)
                        </span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        <GlassCard className="p-4 border-white/5 bg-white/[0.02] text-center">
                            <Package size={20} className="mx-auto mb-2 text-blue-500" />
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Caisses</p>
                            <p className="text-xl font-black text-white">{quote.crateCosts_eur.toLocaleString()} €</p>
                        </GlassCard>
                        <GlassCard className="p-4 border-white/5 bg-white/[0.02] text-center">
                            <Package size={20} className="mx-auto mb-2 text-purple-500" />
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Emballage</p>
                            <p className="text-xl font-black text-white">{quote.packingCosts_eur.toLocaleString()} €</p>
                        </GlassCard>
                        <GlassCard className="p-4 border-white/5 bg-white/[0.02] text-center">
                            <Truck size={20} className="mx-auto mb-2 text-emerald-500" />
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Transport</p>
                            <p className="text-xl font-black text-white">{quote.transportCost_eur.toLocaleString()} €</p>
                        </GlassCard>
                        <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/10 text-center">
                            <Calculator size={20} className="mx-auto mb-2 text-emerald-500" />
                            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Total</p>
                            <p className="text-2xl font-black text-emerald-400">{quote.totalCost_eur.toLocaleString()} €</p>
                        </GlassCard>
                    </div>

                    {/* Transport Details */}
                    <GlassCard className="p-5 border-white/5 bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Truck size={14} className="text-emerald-500" />
                            Détails Transport
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-zinc-500 mb-1">Volume Total</p>
                                <p className="text-lg font-bold text-white">{transport.totalVolume_m3.toFixed(2)} m³</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 mb-1">Véhicule</p>
                                <p className="text-lg font-bold text-white">
                                    {transport.vehicleType === 'CAMION_20M3' ? 'Camion 20m³' : 'Poids Lourd'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 mb-1">Forfait de Base</p>
                                <p className="text-sm font-mono text-zinc-300">{transport.baseCost_eur.toFixed(2)} €</p>
                            </div>
                            {transport.distanceCost_eur > 0 && (
                                <div>
                                    <p className="text-xs text-zinc-500 mb-1">Kilométrage ({distance_km}km)</p>
                                    <p className="text-sm font-mono text-zinc-300">{transport.distanceCost_eur.toFixed(2)} €</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Detailed Breakdown Toggle */}
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                        {showDetails ? 'Masquer' : 'Afficher'} le Détail par Œuvre
                    </button>

                    {/* Per-Artwork Breakdown */}
                    {showDetails && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Détail par Œuvre</h3>
                            {artworks.map((artwork, idx) => {
                                const service = packingServices[idx].service;
                                return (
                                    <GlassCard key={artwork.id} className="p-4 border-white/5 bg-white/[0.01]">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-sm font-bold text-white">{artwork.title}</p>
                                                <p className="text-xs text-zinc-500">{artwork.artist}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-zinc-500">Total Œuvre</p>
                                                <p className="text-lg font-bold text-emerald-400">
                                                    {((artwork.crate_estimated_cost || 0) + service.packingCost_eur).toFixed(0)} €
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-xs">
                                            <div>
                                                <p className="text-zinc-600 mb-1">Caisse</p>
                                                <p className="text-white font-mono">{artwork.crate_estimated_cost || 0} €</p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-600 mb-1">Emballage</p>
                                                <p className="text-white font-mono">{service.packingCost_eur.toFixed(0)} €</p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-600 mb-1">Temps</p>
                                                <p className="text-white font-mono">{service.packingTime_hours}h × {service.packingWorkers}p</p>
                                            </div>
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    )}

                    {/* Full Breakdown (Expandable) */}
                    <details className="group">
                        <summary className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider">
                            Voir le Breakdown Technique Complet
                        </summary>
                        <pre className="mt-3 p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-400 font-mono overflow-x-auto">
                            {quote.breakdown}
                        </pre>
                    </details>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-zinc-900/50 flex justify-between items-center">
                    <div className="text-sm text-zinc-500">
                        <p>Devis calculé automatiquement • {artworks.length} œuvre(s)</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Fermer
                        </button>
                        <button
                            onClick={() => {
                                alert('Génération du PDF en cours...');
                                exportCompleteQuoteToPDF(project, artworks, distance_km);
                            }}
                            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                            <Download size={16} />
                            Exporter le Devis
                        </button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
