"use client";

import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { GlassCard } from "./GlassCard";

interface ImageUploadProps {
    value?: string;
    onChange: (base64: string | undefined) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onChange(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="w-full">
            {value ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden group">
                    <img src={value} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => onChange(undefined)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`
                        relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all
                        ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'}
                    `}
                >
                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3 text-zinc-500">
                        <Upload size={20} />
                    </div>
                    <p className="text-sm font-medium text-zinc-300">Cliquez ou Déposez une image</p>
                    <p className="text-xs text-zinc-500 mt-1">PNG, JPG jusqu'à 5MB</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                </div>
            )}
        </div>
    );
}
