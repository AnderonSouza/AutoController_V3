import React, { useState, useRef, useEffect } from 'react';
import { CALENDAR_MONTHS } from '../constants';

interface PeriodSelectorProps {
  selectedPeriod: { years: number[]; months: string[] };
  onPeriodChange: (period: { years: number[]; months: string[] }) => void;
  availableYears: number[];
  className?: string;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ selectedPeriod, onPeriodChange, availableYears, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isAllYearsSelected = selectedPeriod.years.length === availableYears.length;
  const isAllMonthsSelected = selectedPeriod.months.length === CALENDAR_MONTHS.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleSelectAllYears = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPeriodChange({ ...selectedPeriod, years: e.target.checked ? availableYears : [] });
  };
  
  const handleYearChange = (year: number) => {
    const newYears = selectedPeriod.years.includes(year)
      ? selectedPeriod.years.filter(y => y !== year)
      : [...selectedPeriod.years, year];
    onPeriodChange({ ...selectedPeriod, years: newYears.sort((a,b) => b-a) });
  };

  const handleSelectAllMonths = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPeriodChange({ ...selectedPeriod, months: e.target.checked ? CALENDAR_MONTHS : [] });
  };

  const handleMonthChange = (month: string) => {
    const newMonths = selectedPeriod.months.includes(month)
      ? selectedPeriod.months.filter(m => m !== month)
      : [...selectedPeriod.months, month];
      
    // Re-sort to calendar order
    const sortedMonths = CALENDAR_MONTHS.filter(m => newMonths.includes(m));
    onPeriodChange({ ...selectedPeriod, months: sortedMonths });
  };

  const yearText = isAllYearsSelected ? 'Todos os Anos' : `${selectedPeriod.years.length} Ano(s)`;
  const monthText = isAllMonthsSelected ? 'Todos os Meses' : `${selectedPeriod.months.length} Meses`;
  const displayText = `${yearText}, ${monthText}`;

  return (
    <div className="relative min-w-[200px]" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between
          w-full
          bg-white 
          border border-slate-300
          hover:border-slate-400
          focus:ring-1 
          focus:ring-primary
          focus:border-primary
          focus:outline-none
          rounded-lg
          text-slate-700 font-medium
          transition
          shadow-sm
          group
          ${className || 'py-2 pl-4 pr-3 text-sm'}
        `}
      >
        <span className="truncate">{displayText}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-2 transition-transform duration-200 text-slate-400 group-hover:text-primary ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-96 bg-white border border-slate-200 rounded-lg shadow-xl grid grid-cols-2 divide-x animate-fadeIn">
            <div className="flex flex-col">
                 <div className="p-3 border-b bg-slate-50 rounded-tl-lg">
                    <label className="flex items-center space-x-2 text-xs text-slate-600 font-bold uppercase tracking-wider cursor-pointer">
                        <input type="checkbox" onChange={handleSelectAllYears} checked={isAllYearsSelected} className="custom-checkbox"/>
                        <span>Anos</span>
                    </label>
                 </div>
                 <div className="p-2 max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                    {availableYears.map(year => (
                        <label key={year} className="flex items-center space-x-2 text-xs text-slate-700 hover:bg-slate-50 p-1.5 rounded cursor-pointer">
                            <input type="checkbox" checked={selectedPeriod.years.includes(year)} onChange={() => handleYearChange(year)} className="custom-checkbox"/>
                            <span>{year}</span>
                        </label>
                    ))}
                 </div>
            </div>
             <div className="flex flex-col">
                 <div className="p-3 border-b bg-slate-50 rounded-tr-lg">
                    <label className="flex items-center space-x-2 text-xs text-slate-600 font-bold uppercase tracking-wider cursor-pointer">
                        <input type="checkbox" onChange={handleSelectAllMonths} checked={isAllMonthsSelected} className="custom-checkbox"/>
                        <span>Meses</span>
                    </label>
                 </div>
                 <div className="p-2 max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                    {CALENDAR_MONTHS.map(month => (
                    <label key={month} className="flex items-center space-x-2 text-xs text-slate-700 hover:bg-slate-50 p-1.5 rounded cursor-pointer">
                        <input type="checkbox" checked={selectedPeriod.months.includes(month)} onChange={() => handleMonthChange(month)} className="custom-checkbox"/>
                        <span>{month.charAt(0).toUpperCase() + month.slice(1).toLowerCase()}</span>
                    </label>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PeriodSelector;
