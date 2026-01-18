import { Project } from "@/types";
import { GlassCard } from "./ui/GlassCard";
import { Calendar, Building2, Tag, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProjectCardProps {
    project: Project;
    onEdit?: (project: Project) => void;
    onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
    const statusColors = {
        DRAFT: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
        IN_PROGRESS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        VALIDATION: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        FINALIZED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    };

    const statusLabels = {
        DRAFT: "BROUILLON",
        IN_PROGRESS: "EN COURS",
        VALIDATION: "VALIDATION",
        FINALIZED: "FINALISÉ",
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit?.(project);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Êtes-vous sûr de vouloir supprimer "${project.name}" ?`)) {
            onDelete?.(project.id);
        }
    };

    return (
        <Link href={`/projects/${project.id}`} className="block h-full">
            <GlassCard
                className="group cursor-pointer transition-all hover:-translate-y-1 hover:border-white/40 active:scale-[0.98] h-full relative"
            >
                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onEdit && (
                        <button
                            onClick={handleEdit}
                            className="p-2 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white backdrop-blur-sm transition-colors"
                            title="Modifier"
                        >
                            <Edit2 size={14} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white backdrop-blur-sm transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>

                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                            {project.reference_code}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {project.name}
                        </h3>
                    </div>
                    <span className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-tight",
                        statusColors[project.status]
                    )}>
                        {statusLabels[project.status]}
                    </span>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Building2 size={14} className="text-zinc-500" />
                        <span>{project.organizing_museum}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Calendar size={14} className="text-zinc-500" />
                        <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex items-center gap-1.5">
                        <Tag size={12} className="text-zinc-500" />
                        <span className="text-xs text-zinc-500">{project.currency}</span>
                    </div>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: project.status === 'FINALIZED' ? '100%' : project.status === 'VALIDATION' ? '75%' : '25%' }}
                        />
                    </div>
                </div>
            </GlassCard>
        </Link>
    );
}
