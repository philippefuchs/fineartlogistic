"use client";

import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "./ui/GlassCard";
import { CheckCircle2, Circle, Plus, Trash2, ListTodo, Calendar, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Task } from "@/types";
import { cn } from "@/lib/utils";

interface TaskManagerProps {
    projectId: string;
}

export function TaskManager({ projectId }: TaskManagerProps) {
    const { tasks, addTask, toggleTask, deleteTask } = useProjectStore();
    const [newTask, setNewTask] = useState("");
    const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

    const projectTasks = tasks.filter(t => t.project_id === projectId);
    const pendingTasks = projectTasks.filter(t => t.status === 'PENDING');
    const completedTasks = projectTasks.filter(t => t.status === 'DONE');

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        const task: Task = {
            id: Math.random().toString(36).substr(2, 9),
            project_id: projectId,
            description: newTask,
            status: 'PENDING',
            priority: priority,
            created_at: new Date().toISOString()
        };

        addTask(task);
        setNewTask("");
    };

    return (
        <GlassCard className="p-6 border-white/10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ListTodo size={20} className="text-blue-400" />
                    Tâches & Rappels
                </h3>
                <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded text-zinc-400">
                    {pendingTasks.length} en attente
                </span>
            </div>

            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Nouvelle tâche..."
                    className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                />
                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="bg-zinc-900 border border-white/10 rounded-xl px-2 text-xs text-zinc-400 outline-none focus:border-blue-500"
                >
                    <option value="LOW">Bas</option>
                    <option value="MEDIUM">Moyen</option>
                    <option value="HIGH">Haut</option>
                </select>
                <button
                    type="submit"
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Plus size={20} />
                </button>
            </form>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {projectTasks.length > 0 ? (
                    projectTasks.sort((a, b) => (a.status === b.status ? 0 : a.status === 'PENDING' ? -1 : 1)).map(task => (
                        <div
                            key={task.id}
                            className={cn(
                                "group flex items-center gap-3 p-3 rounded-xl border transition-all",
                                task.status === 'DONE'
                                    ? "bg-zinc-900/50 border-white/5 opacity-50"
                                    : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                        >
                            <button
                                onClick={() => toggleTask(task.id)}
                                className={cn(
                                    "flex-shrink-0 transition-colors",
                                    task.status === 'DONE' ? "text-emerald-500" : "text-zinc-500 hover:text-white"
                                )}
                            >
                                {task.status === 'DONE' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </button>

                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm truncate transition-all",
                                    task.status === 'DONE' ? "text-zinc-500 line-through" : "text-white"
                                )}>
                                    {task.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={cn(
                                        "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                                        task.priority === 'HIGH' ? "bg-red-500/20 text-red-400" :
                                            task.priority === 'MEDIUM' ? "bg-amber-500/20 text-amber-400" :
                                                "bg-blue-500/20 text-blue-400"
                                    )}>
                                        {task.priority === 'HIGH' ? 'Urgent' : task.priority === 'MEDIUM' ? 'Normal' : 'Bas'}
                                    </span>
                                    <span className="text-[10px] text-zinc-600">
                                        {new Date(task.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => deleteTask(task.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                        <ListTodo size={32} className="mb-2 opacity-20" />
                        <p className="text-xs">Aucune tâche pour le moment.</p>
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
