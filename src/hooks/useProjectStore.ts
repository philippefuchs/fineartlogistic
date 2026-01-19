import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project, Artwork, LogisticsFlow, QuoteLine, Task, Agent, LogisticsConfig } from '../types';
import { DEFAULT_LOGISTICS_CONFIG } from '../config/logistics';

interface ProjectState {
    projects: Project[];
    artworks: Artwork[];
    flows: LogisticsFlow[];
    quoteLines: QuoteLine[];
    tasks: Task[];
    agents: Agent[];
    addProject: (project: Project) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    addArtwork: (artwork: Artwork) => void;
    updateArtwork: (id: string, updates: Partial<Artwork>) => void;
    deleteArtwork: (id: string) => void;
    addFlow: (flow: LogisticsFlow) => void;
    updateFlow: (id: string, updates: Partial<LogisticsFlow>) => void;
    deleteFlow: (id: string) => void;
    addQuoteLines: (lines: QuoteLine[]) => void;
    updateQuoteLine: (id: string, updates: Partial<QuoteLine>) => void;
    deleteQuoteLine: (id: string) => void;
    addTask: (task: Task) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    addAgent: (agent: Agent) => void;
    updateAgent: (id: string, updates: Partial<Agent>) => void;
    deleteAgent: (id: string) => void;
    setProjects: (projects: Project[]) => void;
    setArtworks: (artworks: Artwork[]) => void;
    setFlows: (flows: LogisticsFlow[]) => void;
    setQuoteLines: (quoteLines: QuoteLine[]) => void;
    setTasks: (tasks: Task[]) => void;
    setAgents: (agents: Agent[]) => void;
    logisticsConfig: LogisticsConfig;
    updateLogisticsConfig: (config: Partial<LogisticsConfig>) => void;
    resetLogisticsConfig: () => void;
    clearAllData: () => void;
}

export const useProjectStore = create<ProjectState>()(
    persist(
        (set) => ({
            projects: [],
            artworks: [],
            flows: [],
            quoteLines: [],
            tasks: [],
            agents: [],
            addProject: (project) => set((state) => ({
                projects: [...state.projects, project]
            })),
            updateProject: (id, updates) => set((state) => ({
                projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
            })),
            deleteProject: (id) => set((state) => ({
                projects: state.projects.filter((p) => p.id !== id),
            })),
            addArtwork: (artwork) => {
                console.log("💾 addArtwork called for:", artwork.title, "flow_id:", artwork.flow_id);
                return set((state) => ({
                    artworks: [...state.artworks, artwork]
                }));
            },
            updateArtwork: (id, updates) => set((state) => {
                const newArtworks = state.artworks.map((a) => {
                    if (a.id === id) {
                        const updated = { ...a, ...updates };
                        // If dimensions changed, recalculate
                        if (updates.dimensions_h_cm || updates.dimensions_w_cm || updates.dimensions_d_cm || updates.typology || updates.weight_kg) {
                            const { calculatePacking, getCrateTypeLabel } = require("@/services/packingEngine");
                            const { calculateCost } = require("@/services/costCalculator");

                            const packingInput = {
                                h_cm: updated.dimensions_h_cm,
                                w_cm: updated.dimensions_w_cm,
                                d_cm: updated.dimensions_d_cm,
                                weight_kg: updated.weight_kg,
                                typology: updated.typology as any,
                                fragility: (updated.fragility || 2) as any,
                                hasFragileFrame: updated.hasFragileFrame
                            };

                            const packing = calculatePacking(packingInput);
                            const cost = calculateCost(packing);

                            updated.crate_specs = {
                                crate_type: packing.crateType === 'T2_MUSEE' ? 'MUSÉE' : 'VOYAGE',
                                internal_dimensions: { h: packing.internal_h_mm, w: packing.internal_w_mm, d: packing.internal_d_mm },
                                external_dimensions: { h: packing.external_h_mm, w: packing.external_w_mm, d: packing.external_d_mm }
                            };
                            updated.recommended_crate = getCrateTypeLabel(packing.crateType);
                            updated.crate_estimated_cost = Math.ceil(cost.sellingPrice_eur);
                        }
                        return updated;
                    }
                    return a;
                });
                return { artworks: newArtworks };
            }),
            deleteArtwork: (id) => set((state) => ({
                artworks: state.artworks.filter((a) => a.id !== id),
            })),
            addFlow: (flow) => set((state) => ({
                flows: [...state.flows, flow]
            })),
            updateFlow: (id, updates) => set((state) => ({
                flows: state.flows.map((f) => (f.id === id ? { ...f, ...updates } : f)),
            })),
            deleteFlow: (id) => set((state) => ({
                flows: state.flows.filter((f) => f.id !== id),
            })),
            addQuoteLines: (lines) => set((state) => ({
                quoteLines: [...state.quoteLines, ...lines]
            })),
            updateQuoteLine: (id, updates) => set((state) => ({
                quoteLines: state.quoteLines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
            })),
            deleteQuoteLine: (id) => set((state) => ({
                quoteLines: state.quoteLines.filter((l) => l.id !== id),
            })),
            addTask: (task) => set((state) => ({
                tasks: [...state.tasks, task]
            })),
            toggleTask: (id) => set((state) => ({
                tasks: state.tasks.map(t => t.id === id ? { ...t, status: t.status === 'DONE' ? 'PENDING' : 'DONE' } : t)
            })),
            deleteTask: (id) => set((state) => ({
                tasks: state.tasks.filter(t => t.id !== id)
            })),
            addAgent: (agent) => set((state) => ({
                agents: [...state.agents, agent]
            })),
            updateAgent: (id, updates) => set((state) => ({
                agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a)
            })),
            deleteAgent: (id) => set((state) => ({
                agents: state.agents.filter(a => a.id !== id)
            })),
            setProjects: (projects) => set({ projects }),
            setArtworks: (artworks) => set({ artworks }),
            setFlows: (flows) => set({ flows }),
            setQuoteLines: (quoteLines) => set({ quoteLines }),
            setTasks: (tasks) => set({ tasks }),
            setAgents: (agents) => set({ agents }),

            // Logistics Configuration
            logisticsConfig: DEFAULT_LOGISTICS_CONFIG,
            updateLogisticsConfig: (config) => set((state) => ({
                logisticsConfig: { ...state.logisticsConfig, ...config }
            })),
            resetLogisticsConfig: () => set({
                logisticsConfig: DEFAULT_LOGISTICS_CONFIG
            }),
            clearAllData: () => set({
                projects: [],
                artworks: [],
                flows: [],
                quoteLines: [],
                tasks: [],
                agents: []
            }),
        }),
        {
            name: 'grospiron-storage', // unique name for local storage
            storage: createJSONStorage(() => localStorage),
        }
    )
);
