import { cn } from "@/lib/utils";
import Link from "next/link";

export function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 selection:text-blue-200">
            {/* Dynamic Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
                <div className="absolute top-[20%] -right-[5%] h-[30%] w-[30%] rounded-full bg-indigo-600/10 blur-[100px]" />
                <div className="absolute -bottom-[10%] left-[20%] h-[40%] w-[40%] rounded-full bg-purple-600/10 blur-[120px]" />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]" />
            </div>

            <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 font-bold shadow-lg shadow-blue-500/20">
                            F
                        </div>
                        <span className="text-lg font-bold tracking-tight">
                            FACTORY <span className="font-light text-zinc-500 text-sm">Fine Art</span>
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                        <Link href="/" className="text-white hover:text-blue-400 transition-colors">Expositions</Link>
                        <Link href="/calendar" className="hover:text-blue-400 transition-colors">Calendrier</Link>
                        <Link href="/inventory" className="hover:text-blue-400 transition-colors">Inventaire</Link>
                        <Link href="/logistics" className="hover:text-blue-400 transition-colors">Logistique</Link>
                        <Link href="/agents" className="hover:text-blue-400 transition-colors">Partenaires</Link>
                        <Link href="/settings" className="hover:text-blue-400 transition-colors">Paramètres</Link>
                    </nav>

                    <div className="h-8 w-8 rounded-full border border-white/10 bg-zinc-900" />
                </div>
            </header>

            <main className="relative z-10 pt-24 pb-12">
                <div className="mx-auto max-w-7xl px-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
