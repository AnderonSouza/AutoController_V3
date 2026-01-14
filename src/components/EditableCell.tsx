import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
  value: number | undefined;
  onChange: (newValue: number) => void;
  className?: string;
  disabled?: boolean;
  type?: 'number' | 'currency' | 'percentage';
}

const EditableCell: React.FC<EditableCellProps> = ({ value, onChange, className, disabled = false, type = 'number' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Format function for Display (pt-BR standard: 1.000,00)
  const formatDisplay = (val: number | undefined): string => {
    if (val === undefined || val === null) return '';
    return new Intl.NumberFormat('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(val);
  };

  // Update local value when prop changes (only if not editing)
  useEffect(() => {
    if (!isEditing) {
        setInputValue(formatDisplay(value));
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    if (disabled) return;
    setIsEditing(true);
    // When focusing, we can keep the formatted string to make it easier to read, 
    // OR strip it down. Users often prefer seeing the raw number, but 
    // consistent formatting (keeping commas) is usually better for financial apps.
    // We will keep the current formatted string in input.
    setInputValue(formatDisplay(value || 0));
    
    // Optional: Select all text on focus
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers, commas, dots and minus
    const raw = e.target.value;
    // Simplistic filter to prevent non-numeric chars (except control chars)
    if (/^[0-9.,-]*$/.test(raw)) {
        setInputValue(raw);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    
    // Parse Logic:
    // 1. Remove all dots (thousands separators)
    // 2. Replace comma with dot (decimal separator)
    let cleanString = inputValue.replace(/\./g, '').replace(',', '.');
    
    // Handle edge case: user types just "-"
    if (cleanString === '-' || cleanString === '') cleanString = '0';

    let numValue = parseFloat(cleanString);

    if (isNaN(numValue)) {
        numValue = 0;
    }

    // Always fire change, parent handles if it's different
    if (numValue !== value) {
        onChange(numValue);
    }
    
    // Re-format immediately to look clean
    setInputValue(formatDisplay(numValue));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`w-full h-full min-w-[80px] text-right bg-transparent focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none px-2 text-sm transition-colors ${className} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-text'}`}
      placeholder="0,00"
    />
  );
};

export default EditableCell;
