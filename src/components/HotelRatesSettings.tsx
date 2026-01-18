"use client";

import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "./ui/GlassCard";
import { Hotel } from "lucide-react";

export function HotelRatesSettings() {
    const { logisticsConfig, updateLogisticsConfig } = useProjectStore();

    const handleUpdateRate = (category: 'standard' | 'comfort' | 'premium', value: number) => {
        const updatedRates = {
            ...logisticsConfig.hotel_rates,
            [category]: {
                ...logisticsConfig.hotel_rates[category],
                default: value
            }
        };
        updateLogisticsConfig({ hotel_rates: updatedRates });
    };

    return (
        <GlassCard>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
                    <Hotel size={20} className="text-purple-500" />
                </div>
                <div>
                    <h4 className="font-bold text-white">Tarifs Hôtels</h4>
                    <p className="text-xs text-zinc-500">Prix par nuitée selon la catégorie</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Standard */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Standard</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={logisticsConfig.hotel_rates.standard.default}
                            onChange={(e) => handleUpdateRate('standard', Number(e.target.value))}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-center font-bold focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-zinc-500">€</span>
                    </div>
                    <p className="text-xs text-zinc-600 text-center">
                        {logisticsConfig.hotel_rates.standard.min}-{logisticsConfig.hotel_rates.standard.max}€
                    </p>
                </div>

                {/* Comfort */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Comfort</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={logisticsConfig.hotel_rates.comfort.default}
                            onChange={(e) => handleUpdateRate('comfort', Number(e.target.value))}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-center font-bold focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-zinc-500">€</span>
                    </div>
                    <p className="text-xs text-zinc-600 text-center">
                        {logisticsConfig.hotel_rates.comfort.min}-{logisticsConfig.hotel_rates.comfort.max}€
                    </p>
                </div>

                {/* Premium */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Premium</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={logisticsConfig.hotel_rates.premium.default}
                            onChange={(e) => handleUpdateRate('premium', Number(e.target.value))}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-center font-bold focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-zinc-500">€</span>
                    </div>
                    <p className="text-xs text-zinc-600 text-center">
                        {logisticsConfig.hotel_rates.premium.min}-{logisticsConfig.hotel_rates.premium.max}€
                    </p>
                </div>
            </div>
        </GlassCard>
    );
}
