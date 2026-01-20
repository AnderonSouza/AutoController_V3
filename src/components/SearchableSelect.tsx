import React, { useState, useEffect, useRef } from 'react';

interface Option {
    id: string;
    name: string;
    disabled?: boolean;
    suffix?: string;
    description?: string;
    group?: string;
}

interface SearchableSelectProps {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
    value, 
    options, 
    onChange, 
    placeholder = "Selecione...", 
    className,
    disabled = false,
    size = 'sm'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Find selected option
    const selectedOption = options.find(o => o.id === value);

    // Size classes
    const sizeClasses = {
        sm: 'pl-3 pr-8 py-1.5 text-sm',
        md: 'pl-4 pr-10 py-2 text-sm',
        lg: 'pl-4 pr-10 py-2.5 text-base'
    };

    const dropdownSizeClasses = {
        sm: 'max-h-60 min-w-[280px]',
        md: 'max-h-72 min-w-[320px]',
        lg: 'max-h-80 min-w-[360px]'
    };

    // Sync input value with external prop, but handle "Unmapped" gracefully
    useEffect(() => {
        if (selectedOption) {
            // If the ID is empty (representing "Not Mapped"), keep input blank to show placeholder
            if (selectedOption.id === '') {
                setInputValue('');
            } else {
                setInputValue(selectedOption.name);
            }
        } else if (!value) {
            setInputValue('');
        }
    }, [value, selectedOption]);

    // Filter options - with safety check for undefined names
    const filteredOptions = options.filter(option => 
        option.name && option.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                handleBlur();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, inputValue, selectedOption]);

    const handleBlur = () => {
        setIsOpen(false);
        // Reset to selected name on blur if no new selection made
        // Unless it was "Unmapped" (empty ID), then keep it empty
        if (selectedOption && inputValue !== selectedOption.name) {
             if (selectedOption.id === '') {
                 setInputValue('');
             } else {
                 setInputValue(selectedOption.name);
             }
        } else if (!selectedOption && inputValue !== '') {
            setInputValue(''); 
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setIsOpen(true); // Always open on type
    };

    const handleSelect = (option: Option) => {
        if (option.disabled) return;
        onChange(option.id);
        // If unmapped option selected, clear input to show placeholder
        if (option.id === '') {
            setInputValue('');
        } else {
            setInputValue(option.name);
        }
        setIsOpen(false);
    };

    const handleFocus = () => {
        if (disabled) return;
        setIsOpen(true);
        // Optional: Select all text to easily replace
        // inputRef.current?.select();
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(''); // Set to empty ID (Unmapped)
        setInputValue('');
        inputRef.current?.focus();
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative group">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={`
                        w-full ${sizeClasses[size]} border rounded-lg outline-none transition-all shadow-sm
                        ${isOpen ? 'border-primary ring-1 ring-primary' : 'border-slate-300 group-hover:border-slate-400'}
                        ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white text-slate-800'}
                    `}
                />
                
                {/* Clear / Chevron Icon */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    {inputValue && !disabled ? (
                        <button 
                            onClick={handleClear}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-slate-100"
                            tabIndex={-1}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 pointer-events-none transition-transform ${isOpen ? 'rotate-180 text-primary' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && !disabled && (
                <div 
                    ref={dropdownRef}
                    className={`absolute z-[9999] mt-1 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl ${dropdownSizeClasses[size]} overflow-hidden animate-fadeIn`}
                    style={{ minWidth: Math.max(wrapperRef.current?.offsetWidth || 0, size === 'sm' ? 280 : size === 'md' ? 320 : 360) }}
                >
                    {/* Search hint */}
                    {filteredOptions.length > 5 && (
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Digite para filtrar ({filteredOptions.length} itens)
                        </div>
                    )}
                    
                    <ul className="overflow-y-auto max-h-56 py-1 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => {
                                // Check if this is start of a new group
                                const showGroupHeader = option.group && 
                                    (index === 0 || filteredOptions[index - 1]?.group !== option.group);
                                
                                return (
                                    <React.Fragment key={option.id}>
                                        {showGroupHeader && (
                                            <li className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 bg-slate-50 border-y border-slate-100 tracking-wider sticky top-0">
                                                {option.group}
                                            </li>
                                        )}
                                        <li 
                                            onClick={() => handleSelect(option)}
                                            className={`
                                                px-3 py-2.5 cursor-pointer transition-all flex flex-col gap-0.5
                                                ${option.id === value ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-slate-50 border-l-2 border-transparent'}
                                                ${option.disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}
                                            `}
                                        >
                                            <div className="flex justify-between items-center gap-2">
                                                <span className={`text-sm ${option.id === value ? 'font-semibold text-primary' : 'text-slate-700'}`}>
                                                    {option.name}
                                                </span>
                                                {option.suffix && (
                                                    <span className={`shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                                        option.suffix.includes('Indicador') ? 'text-blue-600 bg-blue-50 border border-blue-100' :
                                                        option.suffix.includes('Fórmula') ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' :
                                                        'text-slate-500 bg-slate-100 border border-slate-200'
                                                    }`}>
                                                        {option.suffix}
                                                    </span>
                                                )}
                                            </div>
                                            {option.description && (
                                                <span className="text-xs text-slate-400 truncate">
                                                    {option.description}
                                                </span>
                                            )}
                                        </li>
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <li className="px-4 py-6 text-center">
                                <div className="text-slate-400 text-sm">Nenhuma opção encontrada</div>
                                <div className="text-slate-300 text-xs mt-1">Tente outro termo de busca</div>
                            </li>
                        )}
                    </ul>
                    
                    {/* Footer with count */}
                    {filteredOptions.length > 0 && (
                        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-right">
                            {filteredOptions.length === options.length 
                                ? `${options.length} itens disponíveis`
                                : `${filteredOptions.length} de ${options.length} itens`
                            }
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
