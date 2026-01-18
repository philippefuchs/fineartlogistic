"use client";

import { AppLayout } from "@/components/AppLayout";
import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "@/components/ui/GlassCard";
import { Truck, Plane, Map, ArrowRight, CheckCircle2, TrendingUp, AlertTriangle, Calendar, DollarSign, Package, BarChart3 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WorldMap } from "@/components/WorldMap";
import { useMemo } from "react";

export default function LogisticsPage() {
    const { flows, projects, quoteLines, tasks, artworks } = useProjectStore();

    // --- KPIs ---
    const totalSpend = useMemo(() => quoteLines.reduce((acc, l) => acc + l.total_price, 0), [quoteLines]);
    const totalValue = useMemo(() => artworks.reduce((acc, a) => acc + a.insurance_value, 0), [artworks]);
    const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length;

    // --- Charts Data ---
    const spendByAgent = useMemo(() => {
        const data: Record<string, number> = {};
        quoteLines.forEach(l => {
            if (l.agent_name) data[l.agent_name] = (data[l.agent_name] || 0) + l.total_price;
        });
        return Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 5); // Top 5
    }, [quoteLines]);

    const maxSpend = spendByAgent.length > 0 ? spendByAgent[0][1] : 0;

    const volumeByMode = useMemo(() => {
        const data: Record<string, number> = {};
        flows.forEach(f => {
            data[f.flow_type] = (data[f.flow_type] || 0) + 1;
        });
        return Object.entries(data).sort((a, b) => b[1] - a[1]);
    }, [flows]);

    // --- Aggregations ---
    const highPriorityTasks = tasks.filter(t => t.priority === 'HIGH' && t.status === 'PENDING');

    const upcomingOperations = useMemo(() => {
        return flows
            .filter(f => f.status === 'VALIDATED' && (f.pickup_date || f.delivery_date))
            .sort((a, b) => (new Date(a.pickup_date || '9999').getTime() - new Date(b.pickup_date || '9999').getTime()))
            .slice(0, 5);
    }, [flows]);

    const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || "Inconnu";

    const getTypeLabel = (type: string) => {
        const typeMap: Record<string, string> = {
            'ART_SHUTTLE': 'NAVETTE ART',
            'DEDICATED_TRUCK': 'CAMION DÉDIÉ',
            'AIR_FREIGHT': 'FRET AÉRIEN',
            'EU_ROAD': 'ROUTE EUROPE'
        };
        return typeMap[type] || type.replace('_', ' ');
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-8 pb-12">
                {/* Header */}
                <div className="flex flex-col">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                        Control Tower
                    </h1>
                    <p className="mt-2 text-zinc-400">
                        Supervision financière et opérationnelle globale.
                    </p>
                </div>

                {/* Macro KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <GlassCard className="p-6 border-emerald-500/20 bg-emerald-500/5">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Dépenses Totales</p>
                                <p className="text-2xl font-black text-white">{totalSpend.toLocaleString()} EUR</p>
                            </div>
                            <DollarSign className="text-emerald-500/50" />
                        </div>
                    </GlassCard>
                    <GlassCard className="p-6 border-blue-500/20 bg-blue-500/5">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Valeur Assurée</p>
                                <p className="text-2xl font-black text-white">{totalValue.toLocaleString()} EUR</p>
                            </div>
                            <Package className="text-blue-500/50" />
                        </div>
                    </GlassCard>
                    <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Projets Actifs</p>
                                <p className="text-2xl font-black text-white">{activeProjects}</p>
                            </div>
                            <TrendingUp className="text-zinc-500/50" />
                        </div>
                    </GlassCard>
                    <GlassCard className="p-6 border-amber-500/20 bg-amber-500/5">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Tâches Urgentes</p>
                                <p className="text-2xl font-black text-white">{highPriorityTasks.length}</p>
                            </div>
                            <AlertTriangle className="text-amber-500/50" />
                        </div>
                    </GlassCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Map Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <WorldMap />

                        {/* Financial Chart */}
                        <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <BarChart3 size={16} className="text-blue-500" />
                                Top Dépenses par Agent
                            </h3>
                            <div className="space-y-4">
                                {spendByAgent.map(([agent, amount]) => (
                                    <div key={agent} className="flex items-center gap-4">
                                        <div className="w-24 text-xs font-bold text-zinc-400 truncate text-right">{agent}</div>
                                        <div className="flex-1 h-8 bg-zinc-800/50 rounded-r-lg relative overflow-hidden group">
                                            <div
                                                className="absolute top-0 left-0 h-full bg-blue-600 rounded-r-lg transition-all duration-1000 group-hover:bg-blue-500"
                                                style={{ width: `${(amount / maxSpend) * 100}%` }}
                                            />
                                            <span className="absolute inset-y-0 left-2 flex items-center text-xs font-bold text-white z-10 text-shadow">
                                                {amount.toLocaleString()} EUR
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {spendByAgent.length === 0 && (
                                    <div className="text-center text-zinc-600 text-xs italic py-4">Aucune donnée financière disponible</div>
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    {/* Right Panel: Operations & Tasks */}
                    <div className="space-y-6">
                        {/* Upcoming Operations */}
                        <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Calendar size={16} className="text-emerald-500" />
                                Prochains Mouvements
                            </h3>
                            <div className="space-y-3">
                                {upcomingOperations.length > 0 ? upcomingOperations.map(f => (
                                    <Link href={`/projects/${f.project_id}`} key={f.id} className="block group">
                                        <div className="flex gap-3 items-start border-l-2 border-zinc-800 pl-3 py-1 group-hover:border-emerald-500 transition-colors">
                                            <div className="flex-col flex items-center text-zinc-500 text-[10px] font-mono leading-tight">
                                                <span className="font-bold text-zinc-300">
                                                    {new Date(f.pickup_date || '').getDate().toString().padStart(2, '0')}
                                                </span>
                                                <span>
                                                    {new Date(f.pickup_date || '').toLocaleString('default', { month: 'short' }).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white truncate">{getProjectName(f.project_id)}</p>
                                                <p className="text-[10px] text-zinc-500">
                                                    {f.origin_country} <ArrowRight size={8} className="inline" /> {f.destination_country}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="text-zinc-600 text-xs text-center py-4">Aucun mouvement planifié</div>
                                )}
                            </div>
                        </GlassCard>

                        {/* Priority Tasks */}
                        <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-500" />
                                Urgences ({highPriorityTasks.length})
                            </h3>
                            <div className="space-y-2">
                                {highPriorityTasks.length > 0 ? highPriorityTasks.slice(0, 5).map(t => (
                                    <Link href={`/projects/${t.project_id}`} key={t.id} className="block">
                                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                                            <p className="text-xs font-medium text-amber-200 truncate">{t.description}</p>
                                            <p className="text-[9px] text-amber-500/60 mt-1 uppercase font-bold">
                                                {getProjectName(t.project_id)}
                                            </p>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="text-zinc-600 text-xs text-center py-4">Aucune tâche urgente</div>
                                )}
                            </div>
                        </GlassCard>

                        {/* Mode Distribution */}
                        <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Modes de Transport</h3>
                            <div className="flex flex-wrap gap-2">
                                {volumeByMode.map(([mode, count]) => (
                                    <div key={mode} className="flex-1 min-w-[45%] p-3 rounded-lg bg-zinc-900 border border-white/5 text-center">
                                        <p className="text-lg font-black text-white">{count}</p>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase truncate">{getTypeLabel(mode)}</p>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
