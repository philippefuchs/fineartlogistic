"use client";

import { AppLayout } from "@/components/AppLayout";
import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "@/components/ui/GlassCard";
import { Users, Plus, Search, MapPin, Mail, Phone, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Agent } from "@/types";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
    const { agents, addAgent, deleteAgent } = useProjectStore();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [newAgent, setNewAgent] = useState<Partial<Agent>>({
        name: "", country: "", city: "", email: "", phone: "", specialties: [], rating: 5
    });

    const filteredAgents = agents.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addAgent({
            ...newAgent,
            id: Math.random().toString(36).substr(2, 9),
            specialties: [], // Placeholder for now
            created_at: new Date().toISOString()
        } as Agent);
        setIsAdding(false);
        setNewAgent({ name: "", country: "", city: "", email: "", phone: "", specialties: [], rating: 5 });
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                            Annuaire Partenaires
                        </h1>
                        <p className="mt-2 text-zinc-400">
                            Gérez votre réseau mondial d'agents et de fournisseurs logistiques.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={20} />
                        Ajouter un Agent
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-zinc-500" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, pays, ville..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                {/* Add Agent Form */}
                {isAdding && (
                    <GlassCard className="p-6 border-blue-500/20 animate-in fade-in slide-in-from-top-4">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-400 font-bold uppercase">Nom de la Société</label>
                                    <input required className="w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-white"
                                        value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })} placeholder="ex: Yamato Global Logistics" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-zinc-400 font-bold uppercase">Pays</label>
                                        <input required className="w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-white"
                                            value={newAgent.country} onChange={e => setNewAgent({ ...newAgent, country: e.target.value })} placeholder="ex: Japan" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-400 font-bold uppercase">Ville</label>
                                        <input required className="w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-white"
                                            value={newAgent.city} onChange={e => setNewAgent({ ...newAgent, city: e.target.value })} placeholder="ex: Tokyo" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-400 font-bold uppercase">Email</label>
                                    <input type="email" className="w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-white"
                                        value={newAgent.email} onChange={e => setNewAgent({ ...newAgent, email: e.target.value })} placeholder="contact@agent.com" />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 font-bold uppercase">Téléphone</label>
                                    <input type="tel" className="w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-white"
                                        value={newAgent.phone} onChange={e => setNewAgent({ ...newAgent, phone: e.target.value })} placeholder="+81 3..." />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Annuler</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500">Sauvegarder</button>
                                </div>
                            </div>
                        </form>
                    </GlassCard>
                )}

                {/* Agents List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAgents.length > 0 ? filteredAgents.map(agent => (
                        <GlassCard key={agent.id} className="p-6 border-white/5 hover:bg-white/5 transition-all group relative">
                            <button
                                onClick={() => deleteAgent(agent.id)}
                                className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>

                            <div className="flex items-start gap-4 mb-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center text-xl font-bold text-zinc-500 border border-white/10">
                                    {agent.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg leading-tight">{agent.name}</h3>
                                    <div className="flex items-center gap-1 text-zinc-400 text-sm mt-1">
                                        <MapPin size={12} />
                                        {agent.city}, {agent.country}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <Mail size={14} className="text-zinc-500" />
                                    {agent.email || <span className="text-zinc-600 italic">Non renseigné</span>}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <Phone size={14} className="text-zinc-500" />
                                    {agent.phone || <span className="text-zinc-600 italic">Non renseigné</span>}
                                </div>
                            </div>

                            <div className="mt-4 flex gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star key={star} size={12} className={cn(
                                        star <= agent.rating ? "fill-amber-500 text-amber-500" : "text-zinc-700"
                                    )} />
                                ))}
                            </div>
                        </GlassCard>
                    )) : (
                        <div className="col-span-full py-20 text-center text-zinc-500">
                            <Users size={40} className="mx-auto mb-4 opacity-20" />
                            <p>Aucun agent trouvé. Ajoutez votre premier partenaire !</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
