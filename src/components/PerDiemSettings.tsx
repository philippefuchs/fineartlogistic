"use client";

import { useState } from "react";
import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "./ui/GlassCard";
import { DollarSign, Plus, Trash2 } from "lucide-react";

const COUNTRY_FLAGS: Record<string, string> = {
    'FR': '🇫🇷',
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'DE': '🇩🇪',
    'IT': '🇮🇹',
    'ES': '🇪🇸',
    'JP': '🇯🇵',
    'CN': '🇨🇳'
};

const COUNTRY_NAMES: Record<string, string> = {
    'FR': 'France',
    'US': 'USA',
    'GB': 'Royaume-Uni',
    'DE': 'Allemagne',
    'IT': 'Italie',
    'ES': 'Espagne',
    'JP': 'Japon',
    'CN': 'Chine'
};

export function PerDiemSettings() {
    const { logisticsConfig, updateLogisticsConfig } = useProjectStore();
    const [newCountryCode, setNewCountryCode] = useState("");

    const handleUpdateRate = (countryCode: string, category: 'standard' | 'comfort' | 'premium', value: number) => {
        const updatedRates = {
            ...logisticsConfig.per_diem_rates,
            [countryCode]: {
                ...logisticsConfig.per_diem_rates[countryCode],
                [category]: value
            }
        };
        updateLogisticsConfig({ per_diem_rates: updatedRates });
    };

    const handleAddCountry = () => {
        if (newCountryCode && !logisticsConfig.per_diem_rates[newCountryCode]) {
            const updatedRates = {
                ...logisticsConfig.per_diem_rates,
                [newCountryCode]: { standard: 70, comfort: 90, premium: 120 }
            };
            updateLogisticsConfig({ per_diem_rates: updatedRates });
            setNewCountryCode("");
        }
    };

    const handleDeleteCountry = (countryCode: string) => {
        const { [countryCode]: _, ...rest } = logisticsConfig.per_diem_rates;
        updateLogisticsConfig({ per_diem_rates: rest });
    };

    return (
        <GlassCard>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                    <DollarSign size={20} className="text-emerald-500" />
                </div>
                <div>
                    <h4 className="font-bold text-white">Per Diems par Pays</h4>
                    <p className="text-xs text-zinc-500">Indemnités journalières selon le niveau de confort</p>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-zinc-500 text-xs border-b border-white/5">
                            <th className="text-left py-3 px-2">Pays</th>
                            <th className="text-right py-3 px-2">Standard</th>
                            <th className="text-right py-3 px-2">Comfort</th>
                            <th className="text-right py-3 px-2">Premium</th>
                            <th className="w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(logisticsConfig.per_diem_rates).map(([code, rates]) => (
                            <tr key={code} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{COUNTRY_FLAGS[code] || '🌍'}</span>
                                        <span className="text-white font-medium">{COUNTRY_NAMES[code] || code}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-2">
                                    <div className="flex items-center justify-end gap-1">
                                        <input
                                            type="number"
                                            value={rates.standard}
                                            onChange={(e) => handleUpdateRate(code, 'standard', Number(e.target.value))}
                                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:border-blue-500 focus:outline-none"
                                        />
                                        <span className="text-zinc-500">€</span>
                                    </div>
                                </td>
                                <td className="py-3 px-2">
                                    <div className="flex items-center justify-end gap-1">
                                        <input
                                            type="number"
                                            value={rates.comfort}
                                            onChange={(e) => handleUpdateRate(code, 'comfort', Number(e.target.value))}
                                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:border-blue-500 focus:outline-none"
                                        />
                                        <span className="text-zinc-500">€</span>
                                    </div>
                                </td>
                                <td className="py-3 px-2">
                                    <div className="flex items-center justify-end gap-1">
                                        <input
                                            type="number"
                                            value={rates.premium}
                                            onChange={(e) => handleUpdateRate(code, 'premium', Number(e.target.value))}
                                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:border-blue-500 focus:outline-none"
                                        />
                                        <span className="text-zinc-500">€</span>
                                    </div>
                                </td>
                                <td className="py-3 px-2">
                                    <button
                                        onClick={() => handleDeleteCountry(code)}
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Country */}
            <div className="mt-4 flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Code pays (ex: BE)"
                    value={newCountryCode}
                    onChange={(e) => setNewCountryCode(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                    onClick={handleAddCountry}
                    disabled={!newCountryCode || newCountryCode.length !== 2}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Plus size={16} />
                    Ajouter un pays
                </button>
            </div>
        </GlassCard>
    );
}
