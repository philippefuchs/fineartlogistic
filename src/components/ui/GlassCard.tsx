import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-black/20",
                className
            )}
            {...props}
        >
            {/* Subtle glow effect */}
            <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative z-10">{children}</div>
        </div>
    );
}
