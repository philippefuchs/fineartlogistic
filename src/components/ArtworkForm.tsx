"use client";

import { useState } from "react";
import { Artwork } from "@/types";
import { GlassCard } from "./ui/GlassCard";
import { ImageUpload } from "./ui/ImageUpload";
import { X, Ruler, Weight, Tag, Sparkles, Loader2, Box, AlertTriangle } from "lucide-react";
import { calculatePacking, getCrateTypeLabel, ArtworkInput } from "@/services/packingEngine";
import { calculateCost, formatCostBreakdown } from "@/services/costCalculator";
import { cn } from "@/lib/utils";

interface ArtworkFormProps {
    projectId: string;
    onClose: () => void;
    onSave: (artwork: Artwork) => void;
}

export function ArtworkForm({ projectId, onClose, onSave }: ArtworkFormProps) {
    const [loading, setLoading] = useState(false);
    const [showCalculation, setShowCalculation] = useState(false);

    const [formData, setFormData] = useState<Partial<Artwork>>({
        project_id: projectId,
        title: "",
        artist: "",
        dimensions_h_cm: 0,
        dimensions_w_cm: 0,
        dimensions_d_cm: 0,
        weight_kg: 0,
        typology: "TABLEAU",
        fragility: 3,
        hasFragileFrame: false,
        lender_museum: "",
        lender_city: "",
        lender_country: "",
        insurance_value: 0,
    });

    const handleCalculateCrate = () => {
        if (!formData.dimensions_h_cm || !formData.dimensions_w_cm || !formData.dimensions_d_cm) {
            alert("Veuillez renseigner toutes les dimensions.");
            return;
        }

        setLoading(true);

        // Préparer l'input pour le moteur
        const input: ArtworkInput = {
            h_cm: formData.dimensions_h_cm!,
            w_cm: formData.dimensions_w_cm!,
            d_cm: formData.dimensions_d_cm!,
            weight_kg: formData.weight_kg || 0,
            typology: formData.typology as any,
            fragility: formData.fragility || 3,
            hasFragileFrame: formData.hasFragileFrame || false
        };

        // ALGORITHME A: Calcul du Packing
        const packingResult = calculatePacking(input);

        // ALGORITHME B: Calcul du Coût
        const costResult = calculateCost(packingResult);

        // Mise à jour du formulaire avec les résultats
        setFormData({
            ...formData,
            recommended_crate: getCrateTypeLabel(packingResult.crateType),
            crate_estimated_cost: Math.round(costResult.sellingPrice_eur),
            crate_factory_cost: Math.round(costResult.factoryCost_eur),
            crate_calculation_details: formatCostBreakdown(costResult),
            crate_specs: {
                crate_type: packingResult.crateType === 'T2_MUSEE' ? 'MUSÉE' : 'VOYAGE',
                internal_dimensions: {
                    h: packingResult.internal_h_mm,
                    w: packingResult.internal_w_mm,
                    d: packingResult.internal_d_mm
                },
                external_dimensions: {
                    h: packingResult.external_h_mm,
                    w: packingResult.external_w_mm,
                    d: packingResult.external_d_mm
                }
            }
        });

        setShowCalculation(true);
        setLoading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
        } as Artwork);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard className="max-w-5xl w-full max-h-[90vh] overflow-y-auto border-white/10 p-0">
                <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl p-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Ajouter une Nouvelle Œuvre</h2>
                        <p className="text-sm text-zinc-500">Le système calculera automatiquement le colisage optimal.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5 text-zinc-500">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Artwork Info */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Informations Générales</h3>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400">Titre de l'Œuvre</label>
                                <input
                                    required
                                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500/50 outline-none"
                                    placeholder="ex: La Nuit Étoilée"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400">Artiste</label>
                                <input
                                    required
                                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500/50 outline-none"
                                    placeholder="ex: Vincent van Gogh"
                                    value={formData.artist}
                                    onChange={e => setFormData({ ...formData, artist: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400">Typologie</label>
                                <select
                                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500/50 outline-none"
                                    value={formData.typology}
                                    onChange={e => setFormData({ ...formData, typology: e.target.value })}
                                >
                                    <option value="TABLEAU">Tableau</option>
                                    <option value="SCULPTURE">Sculpture</option>
                                    <option value="OBJET">Objet</option>
                                    <option value="INSTALLATION">Installation</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Fragilité</label>
                                    <select
                                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500/50 outline-none"
                                        value={formData.fragility}
                                        onChange={e => setFormData({ ...formData, fragility: Number(e.target.value) as any })}
                                    >
                                        <option value={1}>1 - Standard</option>
                                        <option value={2}>2 - Peu Fragile</option>
                                        <option value={3}>3 - Moyen</option>
                                        <option value={4}>4 - Fragile</option>
                                        <option value={5}>5 - Très Fragile</option>
                                    </select>
                                </div>

                                {formData.typology === 'TABLEAU' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400">Cadre Fragile?</label>
                                        <div className="flex items-center h-[42px] px-4 rounded-xl border border-white/5 bg-white/5">
                                            <input
                                                type="checkbox"
                                                checked={formData.hasFragileFrame}
                                                onChange={e => setFormData({ ...formData, hasFragileFrame: e.target.checked })}
                                                className="rounded border-zinc-700 bg-zinc-800"
                                            />
                                            <span className="ml-2 text-sm text-zinc-400">Moulures</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Ruler size={14} />
                                Dimensions & Poids
                            </h3>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">H (cm)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500/50 outline-none"
                                        value={formData.dimensions_h_cm || ''}
                                        onChange={e => setFormData({ ...formData, dimensions_h_cm: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">L (cm)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500/50 outline-none"
                                        value={formData.dimensions_w_cm || ''}
                                        onChange={e => setFormData({ ...formData, dimensions_w_cm: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">P (cm)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500/50 outline-none"
                                        value={formData.dimensions_d_cm || ''}
                                        onChange={e => setFormData({ ...formData, dimensions_d_cm: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                                    <Weight size={12} />
                                    Poids (kg)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500/50 outline-none"
                                    value={formData.weight_kg || ''}
                                    onChange={e => setFormData({ ...formData, weight_kg: Number(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                                    <Tag size={12} />
                                    Valeur d'Assurance (€)
                                </label>
                                <input
                                    type="number"
                                    required
                                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-white focus:border-blue-500/50 outline-none"
                                    value={formData.insurance_value || ''}
                                    onChange={e => setFormData({ ...formData, insurance_value: Number(e.target.value) })}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleCalculateCrate}
                                disabled={loading}
                                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                {loading ? "Calcul en cours..." : "Calculer le Colisage"}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Calculation Results */}
                    <div className="space-y-6">
                        {showCalculation && formData.recommended_crate ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                    <Box size={14} />
                                    Résultat du Calcul
                                </h3>

                                <GlassCard className="p-5 border-emerald-500/20 bg-emerald-500/5">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Type de Caisse</span>
                                            <span className="text-sm font-bold text-white">{formData.recommended_crate}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Prix de Revient</span>
                                            <span className="text-sm font-mono text-zinc-400">{formData.crate_factory_cost} €</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Prix de Vente</span>
                                            <span className="text-2xl font-black text-emerald-400">{formData.crate_estimated_cost} €</span>
                                        </div>
                                    </div>
                                </GlassCard>

                                {formData.crate_calculation_details && (
                                    <details className="group">
                                        <summary className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider">
                                            Voir le Détail du Calcul
                                        </summary>
                                        <pre className="mt-3 p-4 rounded-xl bg-black/40 border border-white/5 text-[10px] text-zinc-400 font-mono overflow-x-auto">
                                            {formData.crate_calculation_details}
                                        </pre>
                                    </details>
                                )}

                                {formData.hasFragileFrame && (
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                        <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-yellow-200">
                                            <strong>Klébart requis</strong> : Un cadre de voyage interne a été ajouté pour protéger les moulures.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4">
                                <Sparkles size={48} className="opacity-20" />
                                <p className="text-sm text-center">Renseignez les dimensions et cliquez sur<br />"Calculer le Colisage"</p>
                            </div>
                        )}
                    </div>

                    {/* Footer: Submit */}
                    <div className="col-span-full flex justify-end gap-3 pt-6 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={!showCalculation}
                            className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Enregistrer l'Œuvre
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
