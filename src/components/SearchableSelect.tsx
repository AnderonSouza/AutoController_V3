import React, { useState, useEffect, useRef } from 'react';

interface Option {
    id: string;
    name: string;
    disabled?: boolean;
    suffix?: string;
}

interface SearchableSelectProps {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
    value, 
    options, 
    onChange, 
    placeholder = "Selecione...", 
    className,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Find selected option
    const selectedOption = options.find(o => o.id === value);

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
                        w-full pl-3 pr-8 py-1.5 text-sm border rounded-lg outline-none transition-all shadow-sm
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
                <ul className="absolute z-[9999] mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1 custom-scrollbar animate-fadeIn">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <li 
                                key={option.id}
                                onClick={() => handleSelect(option)}
                                className={`
                                    px-3 py-2 text-sm cursor-pointer transition-colors flex justify-between items-center
                                    ${option.id === value ? 'bg-blue-50 text-primary font-bold' : 'text-slate-700 hover:bg-slate-100'}
                                    ${option.disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}
                                `}
                            >
                                <span className="truncate">{option.name}</span>
                                {option.suffix && (
                                    <span className="ml-2 text-[10px] uppercase font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap">
                                        {option.suffix}
                                    </span>
                                )}
                            </li>
                        ))
                    ) : (
                        <li className="px-3 py-3 text-xs text-slate-400 text-center italic">
                            Nenhuma opção encontrada
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchableSelect;
