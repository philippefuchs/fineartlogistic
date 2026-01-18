"use client";

import { AppLayout } from "@/components/AppLayout";
import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "@/components/ui/GlassCard";
import { Search, Package, Box, Filter } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
    const { artworks, projects } = useProjectStore();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredArtworks = artworks.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.artist.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getProjectName = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        return project ? project.name : "Inconnu";
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex flex-col">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                        Inventaire Global
                    </h1>
                    <p className="mt-2 text-zinc-400">
                        Visualisez et gérez toutes les œuvres de vos expositions.
                    </p>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher par titre ou artiste..."
                            className="w-full rounded-2xl border border-white/5 bg-white/5 py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-4 flex gap-2">
                        <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-400 hover:bg-white/10 transition-all">
                            <Filter size={16} />
                            Filtrer
                        </button>
                        <GlassCard className="flex items-center justify-center p-0 px-4 text-sm font-bold text-blue-400">
                            {artworks.length} Œuvres
                        </GlassCard>
                    </div>
                </div>

                {/* Artwork Grid/Table */}
                {filteredArtworks.length > 0 ? (
                    <div className="space-y-4">
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            <div className="col-span-4">Œuvre</div>
                            <div className="col-span-2">Dimensions</div>
                            <div className="col-span-2">Poids</div>
                            <div className="col-span-2">Valeur</div>
                            <div className="col-span-2">Projet</div>
                        </div>

                        {filteredArtworks.map(artwork => (
                            <GlassCard key={artwork.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                                <div className="col-span-4 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-600 group-hover:bg-zinc-700 group-hover:text-zinc-400 transition-colors">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg">{artwork.title}</p>
                                        <p className="text-sm text-zinc-500">{artwork.artist}</p>
                                    </div>
                                </div>
                                <div className="col-span-2 text-sm text-zinc-400 font-mono">
                                    {artwork.dimensions_h_cm}x{artwork.dimensions_w_cm}x{artwork.dimensions_d_cm} cm
                                </div>
                                <div className="col-span-2 text-sm text-zinc-400">
                                    {artwork.weight_kg} kg
                                </div>
                                <div className="col-span-2 text-sm text-white font-bold">
                                    {artwork.insurance_value.toLocaleString()} EUR
                                </div>
                                <div className="col-span-2">
                                    <Link
                                        href={`/projects/${artwork.project_id}`}
                                        className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors"
                                    >
                                        {getProjectName(artwork.project_id)}
                                    </Link>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-600">
                            <Box size={32} />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-400">Aucune œuvre trouvée</h3>
                        <p className="mt-1 text-zinc-500">Allez dans un projet pour ajouter des œuvres.</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
