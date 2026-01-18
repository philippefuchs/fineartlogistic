"use client";

import { AppLayout } from "@/components/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Settings, Globe, Coins, Ruler, Building2, Bell, Database } from "lucide-react";
import { useProjectStore } from "@/hooks/useProjectStore";
import { DEMO_PROJECT, DEMO_ARTWORKS, DEMO_FLOWS } from "@/data/demoData";
import { PerDiemSettings } from "@/components/PerDiemSettings";
import { HotelRatesSettings } from "@/components/HotelRatesSettings";
import { TeamRolesSettings } from "@/components/TeamRolesSettings";
import { AncillaryCostsSettings } from "@/components/AncillaryCostsSettings";

export default function SettingsPage() {
    return (
        <AppLayout>
            <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                        Paramètres
                    </h1>
                    <p className="mt-2 text-zinc-400">
                        Configurez vos préférences, agents et paramètres régionaux.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* General Settings */}
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">Général</h2>
                        <GlassCard className="p-0 border-white/5 bg-white/[0.02] overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <Globe size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Langue</p>
                                        <p className="text-xs text-zinc-500">Langue de l'interface et des rapports</p>
                                    </div>
                                </div>
                                <select className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500/50">
                                    <option>Français</option>
                                    <option>English</option>
                                </select>
                            </div>

                            <div className="p-6 border-b border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Coins size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Devise par Défaut</p>
                                        <p className="text-xs text-zinc-500">Utilisée pour les nouvelles estimations</p>
                                    </div>
                                </div>
                                <select className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500/50">
                                    <option>EUR (€)</option>
                                    <option>USD ($)</option>
                                    <option>GBP (£)</option>
                                </select>
                            </div>

                            <div className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <Ruler size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Système de Mesure</p>
                                        <p className="text-xs text-zinc-500">Unités pour les dimensions et le poids</p>
                                    </div>
                                </div>
                                <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/10">
                                    <button className="px-3 py-1 bg-white/10 rounded text-xs font-bold text-white shadow-sm">Métrique</button>
                                    <button className="px-3 py-1 text-xs font-bold text-zinc-500 hover:text-zinc-300">Impérial</button>
                                </div>
                            </div>
                        </GlassCard>
                    </section>

                    {/* Company Settings */}
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">Organisation</h2>
                        <GlassCard className="p-0 border-white/5 bg-white/[0.02] overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Entité de Facturation</p>
                                        <p className="text-xs text-zinc-500">Adresse par défaut pour les devis</p>
                                    </div>
                                </div>
                                <button className="text-sm font-bold text-blue-400 hover:text-white transition-colors">
                                    Modifier
                                </button>
                            </div>
                        </GlassCard>
                    </section>

                    {/* Demo Data Injection */}
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">Gestion des Données</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <GlassCard className="p-6 border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-xs">Injecter Démo</p>
                                        <p className="text-[10px] text-zinc-500">Ajoute un projet de test</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm("Cela va ajouter un gros projet de démonstration. Continuer ?")) {
                                            useProjectStore.getState().addProject(DEMO_PROJECT);
                                            DEMO_ARTWORKS.forEach(a => useProjectStore.getState().addArtwork(a));
                                            DEMO_FLOWS.forEach(f => useProjectStore.getState().addFlow(f));
                                            alert("Données injectées avec succès !");
                                        }
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-[10px] hover:bg-emerald-500 hover:text-white transition-all"
                                >
                                    Injecter
                                </button>
                            </GlassCard>

                            <GlassCard className="p-6 border-red-500/20 bg-red-500/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-xs">Réinitialiser (Zéro)</p>
                                        <p className="text-[10px] text-zinc-500">Efface tous les projets</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm("ÊTES-VOUS SÛR ? Cela va effacer TOUS vos projets et données de l'application.")) {
                                            useProjectStore.getState().clearAllData();
                                            alert("L'application a été remise à zéro.");
                                        }
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 font-bold text-[10px] hover:bg-red-500 hover:text-white transition-all"
                                >
                                    Vider Tout
                                </button>
                            </GlassCard>
                        </div>
                    </section>

                    {/* Logistics Configuration */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Logistique</h2>
                            <button
                                onClick={() => {
                                    if (confirm("Réinitialiser tous les paramètres logistiques aux valeurs par défaut ?")) {
                                        useProjectStore.getState().resetLogisticsConfig();
                                        alert("Paramètres réinitialisés !");
                                    }
                                }}
                                className="text-xs font-bold text-zinc-500 hover:text-blue-400 transition-colors"
                            >
                                Réinitialiser
                            </button>
                        </div>
                        <div className="space-y-6">
                            <PerDiemSettings />
                            <HotelRatesSettings />
                            <TeamRolesSettings />
                            <AncillaryCostsSettings />
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
