import React from 'react';
import { Brand, ReportTemplate } from '../types';
import StyledSelect from './StyledSelect';
import PeriodSelector from './PeriodSelector';

interface StoreOption {
    label: string;
    value: string;
}

interface ToolbarProps {
  storeOptions: StoreOption[]; 
  currentStore: string;
  onStoreChange: (store: string) => void;
  brands: Brand[];
  currentBrand: string;
  onBrandChange: (brand: string) => void;
  selectedPeriod: { years: number[], months: string[] };
  onPeriodChange: (period: { years: number[], months: string[] }) => void;
  isBudgetMode?: boolean;
  onBudgetModeChange?: (isBudgetMode: boolean) => void;
  showCalculationDetails?: boolean;
  onShowCalculationDetailsChange?: (show: boolean) => void;
  showVerticalAnalysis?: boolean;
  onShowVerticalAnalysisChange?: (show: boolean) => void;
  showHorizontalAnalysis?: boolean;
  onShowHorizontalAnalysisChange?: (show: boolean) => void;
  showBenchmark?: boolean;
  onShowBenchmarkChange?: (show: boolean) => void;
  isLoading: boolean;
  reportTemplates?: ReportTemplate[];
  currentReportTemplateId?: string | null;
  onReportTemplateChange?: (templateId: string) => void;
  showReportSelector?: boolean;
  hideBrandFilter?: boolean;
  hideStoreFilter?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
    storeOptions, currentStore, onStoreChange,
    brands, currentBrand, onBrandChange,
    selectedPeriod, onPeriodChange,
    isBudgetMode, onBudgetModeChange,
    showCalculationDetails, onShowCalculationDetailsChange,
    showVerticalAnalysis, onShowVerticalAnalysisChange,
    showHorizontalAnalysis, onShowHorizontalAnalysisChange,
    showBenchmark, onShowBenchmarkChange,
    isLoading,
    reportTemplates,
    currentReportTemplateId,
    onReportTemplateChange,
    showReportSelector = false,
    hideBrandFilter = false,
    hideStoreFilter = false
}) => {
  const currentYear = new Date().getFullYear();
  const startYear = 2022;
  const years = Array.from({ length: currentYear - startYear + 2 }, (_, i) => currentYear + 1 - i);

  const showViewControls = isBudgetMode !== undefined && onBudgetModeChange && 
                           showCalculationDetails !== undefined && onShowCalculationDetailsChange &&
                           showVerticalAnalysis !== undefined && onShowVerticalAnalysisChange &&
                           showHorizontalAnalysis !== undefined && onShowHorizontalAnalysisChange;

  // Unified styling for inputs to match the rounded toggle container
  // Using rounded-lg for inputs to be softer, matching the toggle container's aesthetic
  const selectClassName = "h-10 text-sm py-0 pl-3 pr-8 border-slate-300 bg-white shadow-sm rounded-lg";

  return (
    <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
      <div className="flex items-center gap-3 flex-wrap">
            {/* Report Template Selector */}
            {showReportSelector && reportTemplates && onReportTemplateChange && (
                <StyledSelect 
                    value={currentReportTemplateId || ''} 
                    onChange={(e) => onReportTemplateChange(e.target.value)}
                    containerClassName="w-56"
                    className={`${selectClassName} border-blue-200 text-blue-800 font-bold`}
                >
                    <option value="" disabled>Selecione o Modelo...</option>
                    {reportTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </StyledSelect>
            )}

            {!hideBrandFilter && (
                <StyledSelect value={currentBrand} onChange={(e) => onBrandChange(e.target.value)} className={selectClassName} containerClassName="w-44">
                    <option value="Todas as Marcas">Todas as Marcas</option>
                    {brands.map(brand => <option key={brand.id} value={brand.name}>{brand.name}</option>)}
                </StyledSelect>
            )}
            
            {!hideStoreFilter && (
                <StyledSelect value={currentStore} onChange={(e) => onStoreChange(e.target.value)} className={selectClassName} containerClassName="w-48">
                    {storeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </StyledSelect>
            )}
            
            <PeriodSelector
                selectedPeriod={selectedPeriod}
                onPeriodChange={onPeriodChange}
                availableYears={years}
                className={selectClassName}
            />
      </div>

      {showViewControls && (
        // Matched rounded-lg here to align with inputs
        <div className="flex items-center gap-5 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm h-10">
          <div className="flex items-center gap-2">
            <label htmlFor="details-toggle" className="text-xs font-bold text-slate-600 cursor-pointer whitespace-nowrap">Detalhes</label>
            <button
                id="details-toggle"
                role="switch"
                aria-checked={showCalculationDetails}
                onClick={() => onShowCalculationDetailsChange(!showCalculationDetails)}
                className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none ${showCalculationDetails ? 'bg-primary' : 'bg-slate-300'}`}
            >
                <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${showCalculationDetails ? 'translate-x-4.5' : 'translate-x-0.5'}`}/>
            </button>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <label htmlFor="vertical-toggle" className="text-xs font-bold text-slate-600 cursor-pointer whitespace-nowrap">Anál. Vert.</label>
            <button
                id="vertical-toggle"
                role="switch"
                aria-checked={showVerticalAnalysis}
                onClick={() => onShowVerticalAnalysisChange(!showVerticalAnalysis)}
                className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none ${showVerticalAnalysis ? 'bg-primary' : 'bg-slate-300'}`}
            >
                <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${showVerticalAnalysis ? 'translate-x-4.5' : 'translate-x-0.5'}`}/>
            </button>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <label htmlFor="horizontal-toggle" className="text-xs font-bold text-slate-600 cursor-pointer whitespace-nowrap">Anál. Horiz.</label>
            <button
                id="horizontal-toggle"
                role="switch"
                aria-checked={showHorizontalAnalysis}
                onClick={() => onShowHorizontalAnalysisChange(!showHorizontalAnalysis)}
                className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none ${showHorizontalAnalysis ? 'bg-primary' : 'bg-slate-300'}`}
            >
                <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${showHorizontalAnalysis ? 'translate-x-4.5' : 'translate-x-0.5'}`}/>
            </button>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <label htmlFor="benchmark-toggle" className="text-xs font-bold text-slate-600 cursor-pointer whitespace-nowrap">Metas</label>
            <button
                id="benchmark-toggle"
                role="switch"
                aria-checked={showBenchmark}
                onClick={() => onShowBenchmarkChange && onShowBenchmarkChange(!showBenchmark)}
                className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none ${showBenchmark ? 'bg-primary' : 'bg-slate-300'}`}
            >
                <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${showBenchmark ? 'translate-x-4.5' : 'translate-x-0.5'}`}/>
            </button>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-2">
              <label htmlFor="budget-toggle" className="text-xs font-bold text-slate-800 cursor-pointer">Orçamento</label>
              <button
                  id="budget-toggle"
                  role="switch"
                  aria-checked={isBudgetMode}
                  onClick={() => onBudgetModeChange(!isBudgetMode)}
                  className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none ${isBudgetMode ? 'bg-orange-500' : 'bg-slate-300'}`}
              >
                  <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${isBudgetMode ? 'translate-x-4.5' : 'translate-x-0.5'}`}/>
              </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Toolbar;
