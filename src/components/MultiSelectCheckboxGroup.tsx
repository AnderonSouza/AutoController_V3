import React, { useMemo, useRef, useEffect } from 'react';

interface Option {
    id: string;
    name: string;
}

interface MultiSelectCheckboxGroupProps {
    label: string;
    options: Option[];
    selectedValues: string[] | ['*'];
    onChange: (newValues: string[] | ['*']) => void;
    isDisabled?: boolean;
}

const MultiSelectCheckboxGroup: React.FC<MultiSelectCheckboxGroupProps> = ({ label, options, selectedValues, onChange, isDisabled = false }) => {
    const selectAllRef = useRef<HTMLInputElement>(null);
    const isSelectAll = useMemo(() => selectedValues.includes('*'), [selectedValues]);
    
    useEffect(() => {
        if (selectAllRef.current) {
            if (isSelectAll) {
                selectAllRef.current.checked = true;
                selectAllRef.current.indeterminate = false;
            } else if (selectedValues.length === 0) {
                selectAllRef.current.checked = false;
                selectAllRef.current.indeterminate = false;
            } else {
                selectAllRef.current.checked = false;
                selectAllRef.current.indeterminate = true;
            }
        }
    }, [selectedValues, options.length, isSelectAll]);
    
    const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.checked ? ['*'] : []);
    };

    const handleOptionChange = (optionId: string) => {
        const currentSelection = isSelectAll ? options.map(o => o.id) : (selectedValues as string[]);
        const newSelection = currentSelection.includes(optionId)
            ? currentSelection.filter(id => id !== optionId)
            : [...currentSelection, optionId];

        if (newSelection.length === options.length && options.length > 0) {
            onChange(['*']);
        } else {
            onChange(newSelection);
        }
    };

    return (
        <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">{label}</label>
            <div className={`w-full h-64 border border-slate-300 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col ${isDisabled ? 'bg-slate-100 opacity-60 cursor-not-allowed' : ''}`}>
                <div className="px-4 py-3 border-b bg-slate-50 shrink-0">
                     <label className={`flex items-center space-x-3 text-sm text-slate-700 font-bold ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                            ref={selectAllRef}
                            type="checkbox"
                            onChange={handleSelectAllChange}
                            disabled={isDisabled}
                            className="custom-checkbox w-5 h-5 rounded border-slate-400 text-primary focus:ring-primary"
                        />
                        <span>Selecionar Todos</span>
                    </label>
                </div>
                <div className="flex-grow overflow-y-auto p-2 space-y-1">
                    {options.map(option => (
                        <label key={option.id} className={`flex items-center space-x-3 text-sm text-slate-800 p-2 rounded transition-colors ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50'}`}>
                            <input
                                type="checkbox"
                                checked={isSelectAll || (selectedValues as string[]).includes(option.id)}
                                onChange={() => handleOptionChange(option.id)}
                                disabled={isDisabled}
                                className="custom-checkbox w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="truncate font-medium leading-relaxed" title={option.name}>{option.name}</span>
                        </label>
                    ))}
                    {options.length === 0 && !isDisabled && (
                         <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
                             Nenhuma opção disponível
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MultiSelectCheckboxGroup;
