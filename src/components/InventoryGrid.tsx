"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    RowSelectionState,
} from "@tanstack/react-table";
import { Artwork } from "@/types";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Check,
    Box,
    AlertCircle,
    Trash2,
    Package,
    ChevronRight,
    ChevronLeft,
    Layers,
    ArrowUpRight,
    Edit3,
    Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryGridProps {
    artworks: Artwork[];
    onUpdate?: (id: string, updates: Partial<Artwork>) => void;
    onDelete?: (id: string) => void;
    onViewDetail?: (artwork: Artwork) => void;
    readOnly?: boolean;
}

const columnHelper = createColumnHelper<Artwork>();

// Editable Cell Component
const EditableCell = ({
    value: initialValue,
    row,
    column,
    onUpdate,
    type = "text"
}: any) => {
    const [value, setValue] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const onBlur = () => {
        setIsEditing(false);
        if (value !== initialValue && onUpdate) {
            onUpdate(row.original.id, { [column.id]: type === "number" ? parseFloat(value) : value });
        }
    };

    if (isEditing) {
        return (
            <input
                autoFocus
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={onBlur}
                onKeyDown={e => {
                    if (e.key === 'Enter') onBlur();
                    if (e.key === 'Escape') {
                        setValue(initialValue);
                        setIsEditing(false);
                    }
                }}
                className="w-full bg-blue-500/20 border border-blue-500 text-white px-2 py-1 rounded outline-none font-mono text-xs"
                type={type}
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="w-full h-full min-h-[32px] flex items-center px-2 cursor-text hover:bg-white/5 rounded transition-colors"
        >
            <span className={cn(type === "number" ? "font-mono" : "")}>
                {type === "number" ? value?.toLocaleString() : value}
            </span>
        </div>
    );
};

export function InventoryGrid({ artworks, onUpdate, onDelete, onViewDetail }: InventoryGridProps) {
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const columns = useMemo(() => [
        columnHelper.display({
            id: 'select',
            header: ({ table }) => (
                <div className="px-1">
                    <input
                        type="checkbox"
                        checked={table.getIsAllRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        className="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="px-1">
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                    />
                </div>
            ),
            size: 40,
        }),
        columnHelper.accessor("title", {
            header: "Œuvre",
            cell: info => (
                <div className="flex items-center gap-3 py-1">
                    <div className="h-8 w-8 rounded bg-zinc-800 flex flex-shrink-0 items-center justify-center text-[10px] text-zinc-600 font-bold border border-white/5">
                        {info.getValue().slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate text-xs">{info.getValue()}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{info.row.original.artist}</p>
                    </div>
                </div>
            ),
            size: 250,
        }),
        columnHelper.accessor("artist", {
            header: "Artiste",
            cell: info => <EditableCell value={info.getValue()} row={info.row} column={info.column} onUpdate={onUpdate} />,
            size: 150,
        }),
        columnHelper.accessor("typology", {
            header: "Type",
            cell: info => (
                <select
                    disabled={!onUpdate}
                    value={info.getValue()}
                    onChange={e => onUpdate && onUpdate(info.row.original.id, { typology: e.target.value })}
                    className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider text-zinc-400 focus:ring-0 cursor-pointer hover:text-white disabled:cursor-default"
                >
                    <option value="TABLEAU">Tableau</option>
                    <option value="SCULPTURE">Sculpture</option>
                    <option value="OBJET">Objet</option>
                    <option value="INSTALLATION">Installation</option>
                </select>
            ),
            size: 120,
        }),
        columnHelper.accessor("dimensions_h_cm", {
            header: "H (cm)",
            cell: info => <EditableCell value={info.getValue()} row={info.row} column={info.column} onUpdate={onUpdate} type="number" />,
            size: 80,
        }),
        columnHelper.accessor("dimensions_w_cm", {
            header: "L (cm)",
            cell: info => <EditableCell value={info.getValue()} row={info.row} column={info.column} onUpdate={onUpdate} type="number" />,
            size: 80,
        }),
        columnHelper.accessor("dimensions_d_cm", {
            header: "P (cm)",
            cell: info => <EditableCell value={info.getValue()} row={info.row} column={info.column} onUpdate={onUpdate} type="number" />,
            size: 80,
        }),
        columnHelper.accessor("insurance_value", {
            header: "Valeur (€)",
            cell: info => <EditableCell value={info.getValue()} row={info.row} column={info.column} onUpdate={onUpdate} type="number" />,
            size: 100,
        }),
        columnHelper.accessor("recommended_crate", {
            header: "Caisse",
            cell: info => (
                <div className="flex flex-col gap-0.5">
                    <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block w-fit whitespace-nowrap",
                        info.getValue()?.includes("T2") || info.getValue()?.includes("Musée")
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            : "bg-zinc-800 border-white/5 text-zinc-400"
                    )}>
                        {info.getValue() || "À définir"}
                    </span>
                    {info.row.original.crate_specs && info.row.original.crate_specs.external_dimensions && (
                        <span className="text-[8px] text-zinc-600 font-mono">
                            {info.row.original.crate_specs.external_dimensions.h / 10}×{info.row.original.crate_specs.external_dimensions.w / 10}×{info.row.original.crate_specs.external_dimensions.d / 10} cm
                        </span>
                    )}
                </div>
            ),
            size: 140,
        }),
        columnHelper.accessor("crate_estimated_cost", {
            header: "Prix Estimé",
            cell: info => (
                <div className="flex flex-col items-end px-2">
                    <span className="text-sm font-black text-white">
                        {info.getValue() ? `${info.getValue()?.toLocaleString()} €` : "€ --"}
                    </span>
                    <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-tighter">HT Facture</span>
                </div>
            ),
            size: 110,
        }),
        columnHelper.display({
            id: 'actions',
            header: "",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    {onViewDetail && (
                        <button
                            onClick={() => onViewDetail(row.original)}
                            className="p-1.5 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                            title="Voir les détails"
                        >
                            <Maximize2 size={14} />
                        </button>
                    )}
                    {onUpdate && (
                        <button
                            onClick={() => onDelete && onDelete(row.original.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            ),
            size: 80,
        }),
    ], [onUpdate, onDelete, onViewDetail]);

    const table = useReactTable({
        data: artworks,
        columns,
        state: {
            rowSelection,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
    });

    // Bulk Actions
    const handleBulkCrateT2 = () => {
        if (!onUpdate) return;
        const selectedIds = Object.keys(rowSelection);
        selectedIds.forEach(id => {
            const artwork = artworks.find(a => a.id === id);
            if (artwork) {
                onUpdate(id, { recommended_crate: "CAISSE T2 (Renforcée)" });
            }
        });
        setRowSelection({});
    };

    const [activeCell, setActiveCell] = useState<{ row: number, col: number } | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeCell || !gridRef.current) return;

            const { row, col } = activeCell;
            const rowCount = artworks.length;
            const colCount = columns.length;

            if (e.key === 'ArrowUp' && row > 0) setActiveCell({ row: row - 1, col });
            if (e.key === 'ArrowDown' && row < rowCount - 1) setActiveCell({ row: row + 1, col });
            if (e.key === 'ArrowLeft' && col > 0) setActiveCell({ row, col: col - 1 });
            if (e.key === 'ArrowRight' && col < colCount - 1) setActiveCell({ row, col: col + 1 });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeCell, artworks.length, columns.length]);

    return (
        <div className="flex flex-col gap-4" ref={gridRef}>
            {/* Bulk Actions Bar */}
            {Object.keys(rowSelection).length > 0 && (
                <div className="sticky top-4 z-50 flex items-center justify-between bg-zinc-900 border border-blue-500/30 text-white p-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1 rounded-lg border border-blue-500/30">
                            <Layers size={14} className="text-blue-400" />
                            <span className="text-sm font-bold">{Object.keys(rowSelection).length} Sélectionnés</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleBulkCrateT2}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-white/5"
                        >
                            <Package size={14} className="text-blue-400" />
                            Passer en Caisse T2
                        </button>
                        <button
                            onClick={() => {
                                if (!onDelete) return;
                                Object.keys(rowSelection).forEach(id => onDelete(id));
                                setRowSelection({});
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-2 rounded-lg border border-red-500/20 transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Grid Table */}
            <div className="relative overflow-x-auto rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left table-fixed min-w-[1000px]">
                    <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-white/10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className={cn(
                                            "p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500",
                                            header.id === 'title' ? "sticky left-0 z-20 bg-zinc-900 shadow-[2px_0_5px_rgba(0,0,0,0.3)]" : ""
                                        )}
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {table.getRowModel().rows.map((row, rowIndex) => (
                            <tr
                                key={row.id}
                                className={cn(
                                    "group transition-colors",
                                    row.getIsSelected() ? "bg-blue-500/5" : "hover:bg-white/[0.02]"
                                )}
                            >
                                {row.getVisibleCells().map((cell, colIndex) => (
                                    <td
                                        key={cell.id}
                                        onClick={() => setActiveCell({ row: rowIndex, col: colIndex })}
                                        className={cn(
                                            "p-1 text-sm text-zinc-400 overflow-hidden relative",
                                            cell.column.id === 'title' ? "sticky left-0 z-10 bg-zinc-900/95 group-hover:bg-zinc-800 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.3)]" : "",
                                            activeCell?.row === rowIndex && activeCell?.col === colIndex ? "ring-1 ring-inset ring-blue-500 bg-blue-500/10" : ""
                                        )}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {artworks.length === 0 && (
                <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-dashed border-white/5">
                    <Box size={40} className="mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500 text-sm italic">Aucune œuvre dans cet inventaire.</p>
                </div>
            )}
        </div>
    );
}
