import React, { useState, useEffect } from 'react';

interface DurationInputProps {
  value: string; // Formato esperado: "HH:mm"
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Componente de entrada formatada para Duração (Tempo Estimado).
 * Converte entradas numéricas em formato HHh mmm (ex: 02h 30m).
 * Internamente trabalha com o formato "HH:mm" para persistência no banco.
 */
const DurationInput: React.FC<DurationInputProps> = ({ value, onChange, className, placeholder }) => {
  const [displayValue, setDisplayValue] = useState('');

  // Converte "HH:mm" (banco) para "00h 00m" (exibição)
  const formatToDisplay = (val: string) => {
    if (!val || !val.includes(':')) return '';
    const [h, m] = val.split(':');
    return `${h.padStart(2, '0')}h ${m.padStart(2, '0')}m`;
  };

  useEffect(() => {
    setDisplayValue(formatToDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não for número
    const digits = e.target.value.replace(/\D/g, '');
    
    if (digits.length === 0) {
      onChange('');
      return;
    }

    // Pega os últimos 4 dígitos (limite de 99h 59m)
    const limitedDigits = digits.slice(-4).padStart(4, '0');
    const hours = limitedDigits.slice(0, 2);
    let minutes = parseInt(limitedDigits.slice(2, 4));

    // Valida minutos (máximo 59)
    if (minutes > 59) minutes = 59;
    const minutesStr = minutes.toString().padStart(2, '0');

    // Atualiza o estado visual
    setDisplayValue(`${hours}h ${minutesStr}m`);
    
    // Envia para o pai no formato persistível "HH:mm"
    onChange(`${hours}:${minutesStr}`);
  };

  return (
    <div className="relative group">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder || "00h 00m"}
        className={`
          block w-full rounded-xl border border-slate-200 py-3 px-4 
          text-sm font-mono font-bold text-slate-700 shadow-sm
          focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none
          placeholder:text-slate-300 transition-all
          ${className}
        `}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none group-focus-within:text-primary transition-colors">
        Duração
      </div>
    </div>
  );
};

export default DurationInput;
