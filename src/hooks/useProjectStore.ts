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
            addArtwork: (artwork) => set((state) => ({
                artworks: [...state.artworks, artwork]
            })),
            updateArtwork: (id, updates) => set((state) => ({
                artworks: state.artworks.map((a) => (a.id === id ? { ...a, ...updates } : a)),
            })),
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
