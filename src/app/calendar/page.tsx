"use client";

import { AppLayout } from "@/components/AppLayout";
import { useProjectStore } from "@/hooks/useProjectStore";
import { GlassCard } from "@/components/ui/GlassCard";
import { ChevronLeft, ChevronRight, Truck, Flag, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
    const { flows, tasks, projects } = useProjectStore();
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        // Adjust for Monday start (French system)
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
        return { days, firstDay: adjustedFirstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);

    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const today = () => setCurrentDate(new Date());

    const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || "Projet Inconnu";

    // Prepare events
    const events = useMemo(() => {
        const list: { date: string, type: 'PICKUP' | 'DELIVERY' | 'TASK', title: string, projectId: string, id: string }[] = [];

        flows.filter(f => f.status === 'VALIDATED').forEach(f => {
            if (f.pickup_date) {
                list.push({
                    date: f.pickup_date,
                    type: 'PICKUP',
                    title: `Enlèvement ${f.origin_country}`,
                    projectId: f.project_id,
                    id: f.id + '_p'
                });
            }
            if (f.delivery_date) {
                list.push({
                    date: f.delivery_date,
                    type: 'DELIVERY',
                    title: `Livraison ${f.destination_country}`,
                    projectId: f.project_id,
                    id: f.id + '_d'
                });
            }
        });

        tasks.filter(t => t.status !== 'DONE' && t.due_date).forEach(t => {
            if (t.due_date) {
                list.push({
                    date: t.due_date,
                    type: 'TASK',
                    title: t.description,
                    projectId: t.project_id,
                    id: t.id
                });
            }
        });

        return list;
    }, [flows, tasks]);

    const getEventsForDay = (day: number) => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;
        return events.filter(e => e.date === dateStr);
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                            Calendrier Opérationnel
                        </h1>
                        <p className="mt-2 text-zinc-400">
                            Vue consolidée des mouvements et échéances.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-white/10">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors">
                            <ChevronLeft />
                        </button>
                        <span className="text-lg font-bold w-40 text-center uppercase tracking-widest text-white">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors">
                            <ChevronRight />
                        </button>
                    </div>
                    <button onClick={today} className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5">
                        Aujourd'hui
                    </button>
                </div>

                {/* Calendar Grid */}
                <GlassCard className="flex-1 p-0 overflow-hidden flex flex-col border-white/10 bg-black/40">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-900/30">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                            <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days Cells */}
                    <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-5">
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-zinc-950/30 border-r border-b border-white/5" />
                        ))}

                        {Array.from({ length: days }).map((_, i) => {
                            const day = i + 1;
                            const dayEvents = getEventsForDay(day);
                            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                            return (
                                <div key={day} className={cn(
                                    "relative p-2 border-r border-b border-white/5 transition-colors hover:bg-white/[0.02] flex flex-col gap-1 min-h-[100px]",
                                    isToday && "bg-blue-500/5"
                                )}>
                                    <span className={cn(
                                        "text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                                        isToday ? "bg-blue-500 text-white" : "text-zinc-500"
                                    )}>
                                        {day}
                                    </span>

                                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                        {dayEvents.map(event => (
                                            <Link href={`/projects/${event.projectId}`} key={event.id} className="block">
                                                <div className={cn(
                                                    "px-2 py-1.5 rounded text-[9px] font-bold truncate flex items-center gap-1.5 border backdrop-blur-md transition-all hover:scale-[1.02]",
                                                    event.type === 'PICKUP' ? "bg-amber-500/10 text-amber-200 border-amber-500/20 hover:border-amber-500/50" :
                                                        event.type === 'DELIVERY' ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/20 hover:border-emerald-500/50" :
                                                            "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                                                )}>
                                                    {event.type === 'PICKUP' && <Truck size={8} className="shrink-0 text-amber-500" />}
                                                    {event.type === 'DELIVERY' && <Flag size={8} className="shrink-0 text-emerald-500" />}
                                                    {event.type === 'TASK' && <AlertTriangle size={8} className="shrink-0 text-zinc-500" />}
                                                    <span className="truncate">{event.title}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 0px;
                }
            `}</style>
        </AppLayout>
    );
}
