import React, { useState, useRef, useEffect } from 'react';

interface Option {
    id: string;
    name: string;
}

interface MultiSelectDropdownProps {
    label: string;
    options: Option[];
    selectedValues: string[];
    onChange: (newValues: string[]) => void;
    className?: string;
    placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ 
    label, 
    options, 
    selectedValues, 
    onChange, 
    className,
    placeholder = "Selecionar..."
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = options.filter(option => 
        String(option.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOptions = options.filter(o => selectedValues.includes(o.id));

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
        if (!isOpen) setSearchTerm('');
    }, [isOpen]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleOptionToggle = (optionId: string) => {
        const newSelection = selectedValues.includes(optionId)
            ? selectedValues.filter(id => id !== optionId)
            : [...selectedValues, optionId];
        onChange(newSelection);
    };

    const removeValue = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onChange(selectedValues.filter(v => v !== id));
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {label && <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">{label}</label>}
            
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex flex-wrap items-center gap-1.5 min-h-[42px] w-full bg-white border rounded-xl px-3 py-1.5 transition-all cursor-pointer shadow-sm
                    ${isOpen ? 'border-primary ring-2 ring-primary/5' : 'border-slate-200 hover:border-slate-300'}
                `}
            >
                {selectedOptions.length > 0 ? (
                    selectedOptions.map(opt => (
                        <span key={opt.id} className="inline-flex items-center bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                            {opt.name.split(' ')[0]}
                            <button onClick={(e) => removeValue(e, opt.id)} className="ml-1.5 hover:text-red-500">
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
                            </button>
                        </span>
                    ))
                ) : (
                    <span className="text-sm text-slate-400 font-medium">{placeholder}</span>
                )}
                
                <div className="ml-auto flex items-center text-slate-400">
                    <div className="w-px h-4 bg-slate-200 mx-2" />
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-[150] mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col w-full min-w-[280px] animate-scaleIn overflow-hidden">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary transition-colors"
                                placeholder="Filtrar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <svg className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    
                    <div className="max-h-[220px] overflow-y-auto p-2 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => {
                                const isSelected = selectedValues.includes(option.id);
                                return (
                                    <div 
                                        key={option.id} 
                                        onClick={(e) => { e.stopPropagation(); handleOptionToggle(option.id); }}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-1
                                            ${isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-slate-50 text-slate-600'}
                                        `}
                                    >
                                        <div className={`
                                            w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0
                                            ${isSelected ? 'bg-primary border-primary' : 'bg-white border-slate-300'}
                                        `}>
                                            {isSelected && <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                                        </div>
                                        <span className="text-xs font-semibold leading-tight">{option.name}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-6 text-center text-[11px] text-slate-400 italic">Nenhum resultado</div>
                        )}
                    </div>

                    <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between">
                         <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(options.map(o => o.id)); }}
                            className="text-[10px] font-bold text-primary hover:underline uppercase"
                         >
                            Todos
                         </button>
                         <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                            className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase"
                         >
                            Limpar
                         </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
