"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { X, Send, Mail, Paperclip, Check, ChevronRight, User } from "lucide-react";
import { Artwork, Agent, Project, LogisticsFlow } from "@/types";
import { cn } from "@/lib/utils";

interface AgentRequestModalProps {
    project: Project;
    artworks: Artwork[];
    agents: Agent[];
    flows: LogisticsFlow[];
    onClose: () => void;
    onSend: (flowId: string, agentId: string) => void;
}

export function AgentRequestModal({ project, artworks, agents, flows, onClose, onSend }: AgentRequestModalProps) {
    const [selectedFlowId, setSelectedFlowId] = useState(flows[0]?.id || "");
    const [selectedAgentId, setSelectedAgentId] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [sending, setSending] = useState(false);
    const [step, setStep] = useState<1 | 2>(1); // 1 = Select Flow/Agent, 2 = Composer

    const selectedFlow = flows.find(f => f.id === selectedFlowId);
    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    // AI Template Generation
    const generateTemplate = (agent: Agent | undefined, flow: LogisticsFlow | undefined) => {
        if (!agent || !flow) return;

        const subject = `Request for Quote - ${project.name} - ${flow.origin_country} to ${flow.destination_country}`;
        const body = `Dear ${agent.name},

Please find attached the packing list for our upcoming project "${project.name}".

Scope of Work:
- Origin: ${flow.origin_country}
- Destination: ${flow.destination_country}
- Pickup Date: ${flow.pickup_date || "TBD"}
- Delivery Date: ${flow.delivery_date || "TBD"}
- Volume: ${artworks.length} items (See attached list)

Could you please provide a quote for:
- Fine Art Packing (Museum Standard)
- Transport (${flow.flow_type.replace('_', ' ')})
- All risks insurance

Best regards,

Factory Fine Art Team
`;
        setEmailSubject(subject);
        setEmailBody(body);
        setStep(2);
    };

    const handleSend = () => {
        setSending(true);
        // Simulate API call
        setTimeout(() => {
            onSend(selectedFlowId, selectedAgentId);
            setSending(false);
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <GlassCard className="max-w-6xl w-full h-[85vh] overflow-hidden p-0 border-white/10 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-black/40 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Mail className="text-blue-500" />
                            Workflow Demande de Devis
                        </h2>
                        <p className="text-sm text-zinc-500">Envoyez vos demandes aux partenaires en quelques clics.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-12">
                    {/* Left Panel: Context & Selection */}
                    <div className="col-span-4 border-r border-white/5 bg-zinc-900/50 p-6 flex flex-col gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">1. Choisir le Flux</label>
                                <select
                                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500"
                                    value={selectedFlowId}
                                    onChange={(e) => setSelectedFlowId(e.target.value)}
                                >
                                    {flows.map(f => (
                                        <option key={f.id} value={f.id}>{f.origin_country} → {f.destination_country} ({f.flow_type})</option>
                                    ))}
                                </select>
                            </div>

                            {selectedFlow && (
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-xs text-blue-200 font-bold mb-1">Résumé du Flux</p>
                                    <p className="text-sm text-white">{artworks.length} Œuvres à transporter</p>
                                    <p className="text-sm text-zinc-400">Total Valeur: {artworks.reduce((acc, a) => acc + a.insurance_value, 0).toLocaleString()} €</p>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">2. Choisir le Partenaire</label>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {agents.length > 0 ? agents.map(agent => (
                                        <button
                                            key={agent.id}
                                            onClick={() => {
                                                setSelectedAgentId(agent.id);
                                                generateTemplate(agent, selectedFlow);
                                            }}
                                            className={cn(
                                                "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group",
                                                selectedAgentId === agent.id
                                                    ? "bg-emerald-500/20 border-emerald-500/50 text-white"
                                                    : "bg-zinc-800/50 border-transparent hover:bg-zinc-800 text-zinc-400"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold group-hover:bg-zinc-600">
                                                    {agent.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{agent.name}</p>
                                                    <p className="text-[10px] opacity-70">{agent.country}</p>
                                                </div>
                                            </div>
                                            {selectedAgentId === agent.id && <Check size={16} className="text-emerald-500" />}
                                            {selectedAgentId !== agent.id && <ChevronRight size={16} className="opacity-0 group-hover:opacity-100" />}
                                        </button>
                                    )) : (
                                        <p className="text-xs text-zinc-500 italic p-2">Aucun agent dans l'annuaire.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mini Packing List Preview */}
                        <div className="mt-auto pt-6 border-t border-white/5">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Aperçu Packing List</p>
                            <div className="space-y-2">
                                {artworks.slice(0, 3).map(a => (
                                    <div key={a.id} className="flex justify-between text-xs text-zinc-400">
                                        <span className="truncate max-w-[150px]">{a.title}</span>
                                        <span className="font-mono">{a.dimensions_h_cm}x{a.dimensions_w_cm}</span>
                                    </div>
                                ))}
                                {artworks.length > 3 && <p className="text-xs text-zinc-600 italic">...et {artworks.length - 3} autres.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Email Composer (Split Screen) */}
                    <div className="col-span-8 bg-black/40 p-8 flex flex-col relative">
                        {step === 2 ? (
                            <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        <label className="col-span-1 text-xs font-bold text-zinc-500 text-right uppercase">To:</label>
                                        <div className="col-span-11 flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2">
                                            <User size={14} className="text-zinc-500" />
                                            <span className="text-sm text-white">{selectedAgent?.email}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        <label className="col-span-1 text-xs font-bold text-zinc-500 text-right uppercase">About:</label>
                                        <input
                                            value={emailSubject}
                                            onChange={e => setEmailSubject(e.target.value)}
                                            className="col-span-11 bg-transparent border-b border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 mt-4 relative">
                                    <textarea
                                        value={emailBody}
                                        onChange={e => setEmailBody(e.target.value)}
                                        className="w-full h-full bg-zinc-900/30 border border-white/5 rounded-xl p-6 text-sm text-zinc-300 font-mono leading-relaxed outline-none focus:border-blue-500/30 resize-none"
                                    />
                                    {/* Attachment Badge */}
                                    <div className="absolute bottom-4 left-4 bg-white/10 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-blue-300">
                                        <Paperclip size={14} />
                                        <span>Packing_List_{project.reference_code}.pdf</span>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handleSend}
                                        disabled={sending}
                                        className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {sending ? "Envoi..." : "Envoyer la Demande"}
                                        {!sending && <Send size={18} />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4">
                                <Mail size={48} className="opacity-20" />
                                <p>Sélectionnez un flux et un agent à gauche pour générer l'email.</p>
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
