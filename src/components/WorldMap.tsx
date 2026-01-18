"use client";

import { useMemo } from "react";
import { LogisticsFlow } from "@/types";
import { useProjectStore } from "@/hooks/useProjectStore";

// Simplified coordinates for major countries (approximate for visualization)
const COUNTRY_COORDS: Record<string, [number, number]> = {
    "FRANCE": [490, 160],
    "USA": [230, 200],
    "UK": [470, 150],
    "GERMANY": [510, 155],
    "ITALY": [520, 175],
    "JAPAN": [850, 200],
    "CHINA": [750, 200],
    "UAE": [600, 230],
    "BRAZIL": [320, 350],
    "AUSTRALIA": [850, 400],
    "CANADA": [200, 150],
    "RUSSIA": [650, 100],
    "SPAIN": [470, 180],
    "NETHERLANDS": [495, 150],
    "BELGIUM": [492, 152],
    "SWITZERLAND": [505, 165],
    "SINGAPORE": [780, 280],
    "HONG KONG": [790, 230],
    "SOUTH KOREA": [820, 190],
    "INDIA": [680, 240]
};

const WorldMapPath = "M 230 200 Q 150 150 200 150 Q 250 150 300 180 T 350 220 T 320 350 M 470 150 L 490 160 L 510 155 L 520 175 L 470 180 Z M 650 100 Q 750 100 850 200 L 750 200 Z M 850 400 Q 750 400 800 350 Z";
// Note: A real SVG path for the world is complex. I'll use a stylized abstract dots representation instead for a "Tech/Cyber" feel.

interface WorldMapProps {
    className?: string;
}

export function WorldMap({ className }: WorldMapProps) {
    const { flows } = useProjectStore();

    // Generate active routes based on flows
    const routes = useMemo(() => {
        return flows.map(flow => {
            const start = COUNTRY_COORDS[flow.origin_country.toUpperCase()] || COUNTRY_COORDS["FRANCE"]; // Default to France if unknown
            const end = COUNTRY_COORDS[flow.destination_country.toUpperCase()] || COUNTRY_COORDS["USA"]; // Default to USA if unknown

            // Calculate a curve point
            const midX = (start[0] + end[0]) / 2;
            const midY = (start[1] + end[1]) / 2 - 50; // Curve upwards

            return {
                id: flow.id,
                path: `M ${start[0]} ${start[1]} Q ${midX} ${midY} ${end[0]} ${end[1]}`,
                color: flow.status === 'VALIDATED' ? '#10b981' : flow.status === 'PENDING_QUOTE' ? '#ef4444' : '#f59e0b',
                start,
                end
            };
        });
    }, [flows]);

    return (
        <div className={`relative w-full aspect-[2/1] bg-[#09090b] rounded-3xl overflow-hidden border border-white/5 ${className}`}>

            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

            <svg viewBox="0 0 1000 500" className="w-full h-full">
                <defs>
                    <radialGradient id="mapGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* World Map Placeholder (Stylized Dots/Shape) */}
                {/* This is a simplified artistic representation since we don't have the heavy geojson */}
                <image href="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg" x="50" y="50" width="900" height="400" opacity="0.1" filter="invert(1)" />

                {/* Connection Lines */}
                {routes.map((route, i) => (
                    <g key={route.id}>
                        {/* Animated Path */}
                        <path
                            d={route.path}
                            fill="none"
                            stroke={route.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            opacity="0.4"
                        />
                        <path
                            d={route.path}
                            fill="none"
                            stroke={route.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="10,10"
                            className="animate-[dash_20s_linear_infinite]"
                        />

                        {/* End Points */}
                        <circle cx={route.start[0]} cy={route.start[1]} r="4" fill={route.color} filter="url(#glow)" />
                        <circle cx={route.end[0]} cy={route.end[1]} r="4" fill={route.color} filter="url(#glow)" >
                            <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                        </circle>
                    </g>
                ))}
            </svg>

            <div className="absolute bottom-4 right-4 flex gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Validé
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> En cours
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" /> Urgent
                </div>
            </div>
        </div>
    );
}
