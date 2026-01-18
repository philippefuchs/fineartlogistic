"use client";

import { QuoteLine, LogisticsFlow } from "@/types";
import { GlassCard } from "./ui/GlassCard";
import { CheckCircle2, TrendingUp, TrendingDown, User, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuoteComparisonProps {
    flows: LogisticsFlow[];
    quoteLines: QuoteLine[];
    onValidateAgent: (flowId: string, agentName: string) => void;
}

export function QuoteComparison({ flows, quoteLines, onValidateAgent }: QuoteComparisonProps) {
    // Group quotes by Agent
    const agents = Array.from(new Set(quoteLines.map(l => l.agent_name).filter(Boolean))) as string[];

    // For each flow, list agents who quoted it
    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {flows.map(flow => {
                const flowQuotes = quoteLines.filter(l => l.flow_id === flow.id);
                const agentsForFlow = Array.from(new Set(flowQuotes.map(l => l.agent_name))) as string[];

                if (agentsForFlow.length === 0) return null;

                const agentStats = agentsForFlow.map(agentName => {
                    const lines = flowQuotes.filter(l => l.agent_name === agentName);
                    const total = lines.reduce((acc, l) => acc + l.total_price, 0);
                    return { agentName, total, lines };
                }).sort((a, b) => a.total - b.total);

                return (
                    <div key={flow.id} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Truck size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white capitalize">{flow.flow_type.replace('_', ' ')}</h3>
                                <p className="text-xs text-zinc-500">{flow.origin_country} → {flow.destination_country}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {agentStats.map((stat, idx) => (
                                <GlassCard
                                    key={stat.agentName}
                                    className={cn(
                                        "p-6 flex flex-col border-white/5 bg-white/[0.01] hover:border-white/10 transition-all relative overflow-hidden",
                                        flow.validated_agent_name === stat.agentName && "border-emerald-500/30 bg-emerald-500/[0.02]"
                                    )}
                                >
                                    {idx === 0 && agentStats.length > 1 && (
                                        <div className="absolute top-0 right-0 bg-emerald-500 px-3 py-1 text-[9px] font-black text-white uppercase tracking-widest rounded-bl-lg">
                                            Meilleure Offre
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="h-8 w-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400">
                                            <User size={14} />
                                        </div>
                                        <p className="font-black text-white tracking-tight">{stat.agentName}</p>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        {stat.lines.map(line => (
                                            <div key={line.id} className="flex justify-between items-start">
                                                <p className="text-[10px] text-zinc-500 flex-1 pr-4">{line.description}</p>
                                                <p className="text-xs font-mono text-zinc-300">{line.total_price.toLocaleString()} {line.currency}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-white/5 flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Coût Total du Flux</p>
                                            <p className="text-2xl font-black text-white">
                                                {stat.total.toLocaleString()} <span className="text-sm font-normal text-zinc-500">EUR</span>
                                            </p>
                                        </div>

                                        {flow.validated_agent_name === stat.agentName ? (
                                            <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-500">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => onValidateAgent(flow.id, stat.agentName)}
                                                className="text-[10px] font-bold text-blue-400 hover:text-white transition-colors"
                                            >
                                                SÉLECTIONNER
                                            </button>
                                        )}
                                    </div>

                                    {idx > 0 && (
                                        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-amber-500 font-bold">
                                            <TrendingUp size={12} />
                                            + {(((stat.total - agentStats[0].total) / agentStats[0].total) * 100).toFixed(1)}% vs le moins cher
                                        </div>
                                    )}
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
