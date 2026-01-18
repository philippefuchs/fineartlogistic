"use client";

import { useState } from "react";
import { LogisticsStep, TeamRole } from "@/types";
import { GlassCard } from "./ui/GlassCard";
import { Plus, Trash2, Users, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineLogistiqueProps {
    steps: LogisticsStep[];
    onUpdateSteps: (steps: LogisticsStep[]) => void;
    availableRoles: TeamRole[];
}

export function TimelineLogistique({ steps, onUpdateSteps, availableRoles }: TimelineLogistiqueProps) {
    const [activeStepId, setActiveStepId] = useState<string | null>(null);

    const totalDays = steps.reduce((max, s) => Math.max(max, s.start_day + s.duration_days), 0) || 5;
    const displayDays = Math.max(totalDays, 10);

    const handleAddStep = () => {
        const newStep: LogisticsStep = {
            id: Math.random().toString(36).substr(2, 9),
            flow_id: "",
            label: "Nouvelle Mission",
            duration_days: 2,
            start_day: steps.length > 0 ? steps[steps.length - 1].start_day + steps[steps.length - 1].duration_days : 0,
            team_composition: []
        };
        onUpdateSteps([...steps, newStep]);
        setActiveStepId(newStep.id);
    };

    const handleUpdateStep = (id: string, updates: Partial<LogisticsStep>) => {
        onUpdateSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleDeleteStep = (id: string) => {
        onUpdateSteps(steps.filter(s => s.id !== id));
        if (activeStepId === id) setActiveStepId(null);
    };

    const handleAddRoleToStep = (stepId: string, roleId: string) => {
        const step = steps.find(s => s.id === stepId);
        if (!step) return;

        const existing = step.team_composition.find(tc => tc.role_id === roleId);
        if (existing) {
            handleUpdateStep(stepId, {
                team_composition: step.team_composition.map(tc => tc.role_id === roleId ? { ...tc, count: tc.count + 1 } : tc)
            });
        } else {
            handleUpdateStep(stepId, {
                team_composition: [...step.team_composition, { role_id: roleId, count: 1 }]
            });
        }
    };

    const handleUpdateRoleCount = (stepId: string, roleId: string, delta: number) => {
        const step = steps.find(s => s.id === stepId);
        if (!step) return;

        handleUpdateStep(stepId, {
            team_composition: step.team_composition.map(tc =>
                tc.role_id === roleId ? { ...tc, count: Math.max(0, tc.count + delta) } : tc
            ).filter(tc => tc.count > 0)
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="text-blue-400" size={20} />
                    Timeline Logistique
                </h3>
                <button
                    onClick={handleAddStep}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-all text-xs font-bold"
                >
                    <Plus size={14} />
                    Ajouter une étape
                </button>
            </div>

            {/* Timeline View */}
            <div className="relative overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-[800px] bg-white/5 rounded-2xl border border-white/5 p-6">
                    {/* Day markers */}
                    <div className="flex border-b border-white/5 mb-4">
                        {Array.from({ length: displayDays }).map((_, i) => (
                            <div key={i} className="flex-1 text-center py-2 text-[10px] font-black text-zinc-600 border-l border-white/5">
                                JOUR {i + 1}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {steps.map((step) => (
                            <div key={step.id} className="relative h-12 flex items-center">
                                {/* Block */}
                                <div
                                    className={cn(
                                        "absolute h-10 rounded-xl border transition-all cursor-pointer group flex items-center px-4",
                                        activeStepId === step.id
                                            ? "bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/10 z-10"
                                            : "bg-white/5 border-white/10 hover:border-white/30"
                                    )}
                                    style={{
                                        left: `${(step.start_day / displayDays) * 100}%`,
                                        width: `${(step.duration_days / displayDays) * 100}%`
                                    }}
                                    onClick={() => setActiveStepId(step.id)}
                                >
                                    <span className="text-xs font-bold text-white truncate mr-2">{step.label}</span>

                                    {/* Pull handles (visual only for now) */}
                                    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-1 h-3 bg-white/20 rounded-full" />
                                        <div className="w-1 h-3 bg-white/20 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {steps.length === 0 && (
                            <div className="py-10 text-center text-zinc-500 italic text-sm">
                                Aucune étape définie. Commencez par " staffer " le flux.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Step Detail Panel */}
            {activeStepId && (
                <GlassCard className="p-6 border-blue-500/20 bg-blue-500/5 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <input
                            className="bg-transparent text-xl font-black text-white outline-none border-b border-white/10 focus:border-blue-500 px-0 pb-1 w-full max-w-md"
                            value={steps.find(s => s.id === activeStepId)?.label || ""}
                            onChange={(e) => handleUpdateStep(activeStepId, { label: e.target.value })}
                        />
                        <button
                            onClick={() => handleDeleteStep(activeStepId)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                                <Clock size={14} /> Chronologie
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Jour de départ</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        value={steps.find(s => s.id === activeStepId)?.start_day}
                                        onChange={(e) => handleUpdateStep(activeStepId, { start_day: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Durée (jours)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        value={steps.find(s => s.id === activeStepId)?.duration_days}
                                        onChange={(e) => handleUpdateStep(activeStepId, { duration_days: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                                <Users size={14} /> Composition de l'Équipe
                            </h4>
                            <div className="space-y-2">
                                {steps.find(s => s.id === activeStepId)?.team_composition.map((tc) => {
                                    const role = availableRoles.find(r => r.id === tc.role_id);
                                    return (
                                        <div key={tc.role_id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role?.color || '#3b82f6' }} />
                                            <span className="flex-1 text-xs font-bold text-white">{role?.name}</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleUpdateRoleCount(activeStepId, tc.role_id, -1)}
                                                    className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-white"
                                                >
                                                    -
                                                </button>
                                                <span className="w-4 text-center text-xs font-bold text-white">{tc.count}</span>
                                                <button
                                                    onClick={() => handleUpdateRoleCount(activeStepId, tc.role_id, 1)}
                                                    className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-white"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                <select
                                    className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-400 focus:text-white outline-none"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleAddRoleToStep(activeStepId, e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                >
                                    <option value="">+ Ajouter un profil métier</option>
                                    {availableRoles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name} ({role.daily_rate}€/j)</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
