"use client";

import { useState } from "react";
import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "./ui/GlassCard";
import { Users, Plus, Trash2 } from "lucide-react";
import { TeamRole } from "@/types";
import { generateId } from "@/lib/generateId";

export function TeamRolesSettings() {
    const { logisticsConfig, updateLogisticsConfig } = useProjectStore();
    const [newRoleName, setNewRoleName] = useState("");

    const handleUpdateRole = (roleId: string, updates: Partial<TeamRole>) => {
        const updatedRoles = logisticsConfig.team_roles.map(role =>
            role.id === roleId ? { ...role, ...updates } : role
        );
        updateLogisticsConfig({ team_roles: updatedRoles });
    };

    const handleAddRole = () => {
        if (newRoleName.trim()) {
            const newRole: TeamRole = {
                id: generateId(),
                name: newRoleName.trim(),
                daily_rate: 250,
                requires_hotel: true,
                default_hotel_category: 'STANDARD',
                color: '#6366f1'
            };
            updateLogisticsConfig({
                team_roles: [...logisticsConfig.team_roles, newRole]
            });
            setNewRoleName("");
        }
    };

    const handleDeleteRole = (roleId: string) => {
        const updatedRoles = logisticsConfig.team_roles.filter(r => r.id !== roleId);
        updateLogisticsConfig({ team_roles: updatedRoles });
    };

    return (
        <GlassCard>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
                    <Users size={20} className="text-blue-500" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-white">Rôles d'Équipe</h4>
                    <p className="text-xs text-zinc-500">Taux journaliers et préférences hôtel</p>
                </div>
                <button
                    onClick={() => setNewRoleName("Nouveau Rôle")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors text-sm"
                >
                    <Plus size={16} />
                    Ajouter
                </button>
            </div>

            <div className="space-y-3">
                {logisticsConfig.team_roles.map((role) => (
                    <div
                        key={role.id}
                        className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                    >
                        {/* Color indicator */}
                        <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: role.color }}
                        ></div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                            <input
                                type="text"
                                value={role.name}
                                onChange={(e) => handleUpdateRole(role.id, { name: e.target.value })}
                                className="w-full bg-transparent border-none text-white font-bold focus:outline-none"
                            />
                        </div>

                        {/* Daily Rate */}
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={role.daily_rate}
                                onChange={(e) => handleUpdateRole(role.id, { daily_rate: Number(e.target.value) })}
                                className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:border-blue-500 focus:outline-none"
                            />
                            <span className="text-sm text-zinc-400">€/jour</span>
                        </div>

                        {/* Hotel Category */}
                        <select
                            value={role.default_hotel_category}
                            onChange={(e) => handleUpdateRole(role.id, { default_hotel_category: e.target.value as any })}
                            className="bg-white/5 border border-white/10 rounded px-3 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="STANDARD">Standard</option>
                            <option value="COMFORT">Comfort</option>
                            <option value="PREMIUM">Premium</option>
                        </select>

                        {/* Delete */}
                        <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add new role */}
            {newRoleName && (
                <div className="mt-4 flex items-center gap-2">
                    <input
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                        placeholder="Nom du rôle"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                        autoFocus
                    />
                    <button
                        onClick={handleAddRole}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors"
                    >
                        Confirmer
                    </button>
                    <button
                        onClick={() => setNewRoleName("")}
                        className="px-4 py-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"
                    >
                        Annuler
                    </button>
                </div>
            )}
        </GlassCard>
    );
}
