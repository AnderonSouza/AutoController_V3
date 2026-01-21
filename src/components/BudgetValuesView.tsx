import React, { useState, useEffect, useMemo } from 'react';
import { BudgetAssumption, BudgetAssumptionValue, Brand, Company } from '../types';
import StyledSelect from './StyledSelect';
import EditableCell from './EditableCell';
import MultiSelectDropdown from './MultiSelectDropdown';
import { CALENDAR_MONTHS } from '../constants';

interface BudgetValuesViewProps {
  assumptions: BudgetAssumption[];
  assumptionValues: BudgetAssumptionValue[];
  onSaveAssumptionValue: (val: BudgetAssumptionValue) => void;
  onNavigateBack: () => void;
  availableBrands: Brand[];
  availableCompanies: Company[];
  availableDepartments: string[];
}

const BudgetValuesView: React.FC<BudgetValuesViewProps> = ({
  assumptions,
  assumptionValues,
  onSaveAssumptionValue,
  onNavigateBack,
  availableBrands,
  availableCompanies,
  availableDepartments
}) => {
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i).sort((a, b) => b - a);

  // --- FILTERS STATE ---
  const [selectedAssumptionIds, setSelectedAssumptionIds] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  // --- LOCAL EDIT STATE (BUFFER) ---
  // Key format: `${assumptionId}|${storeName}|${month}`
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Defaults
  useEffect(() => {
    if (availableBrands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(availableBrands[0].id); // Default to first brand
    }
    if (availableDepartments.length > 0 && !selectedDepartment) {
      setSelectedDepartment(availableDepartments[0]);
    }
    if (assumptions.length > 0 && selectedAssumptionIds.length === 0) {
       setSelectedAssumptionIds([assumptions[0].id]); // Default select first assumption
    }
  }, [availableBrands, availableDepartments, assumptions]);

  // --- DERIVED DATA ---
  const filteredCompanies = useMemo(() => {
    if (!selectedBrandId) return [];
    // If a specific brand is selected, show all stores for that brand
    return availableCompanies.filter(c => c.brandId === selectedBrandId);
  }, [selectedBrandId, availableCompanies]);

  const filteredAssumptions = useMemo(() => {
      if (selectedAssumptionIds.length === 0) return [];
      return assumptions.filter(a => selectedAssumptionIds.includes(a.id));
  }, [assumptions, selectedAssumptionIds]);

  // --- HANDLERS ---
  const handleValueChange = (assumptionId: string, companyId: string, month: string, value: number) => {
    const key = `${assumptionId}|${companyId}|${month}`;
    setPendingChanges(prev => ({
        ...prev,
        [key]: value
    }));
  };

  const getAssumptionValue = (assumptionId: string, companyId: string, month: string) => {
    // Check pending changes first
    const key = `${assumptionId}|${companyId}|${month}`;
    if (pendingChanges.hasOwnProperty(key)) {
        return pendingChanges[key];
    }

    // Fallback to DB values - match by company ID
    const found = assumptionValues.find(v =>
      v.assumptionId === assumptionId &&
      v.year === selectedYear &&
      v.month === month &&
      v.store === companyId &&
      v.department === selectedDepartment
    );
    return found ? found.value : 0;
  };

  const handleSaveAll = async () => {
      setIsSaving(true);
      try {
          // Iterate over pending changes and save them
          // Note: In a real backend, we would send a bulk update array.
          // Here we simulate by calling the prop multiple times or if the prop supports bulk, use that.
          // Assuming onSaveAssumptionValue saves one by one for now based on existing App structure.
          
          const promises = Object.entries(pendingChanges).map(async ([key, value]) => {
              const [assumptionId, store, month] = key.split('|');
              if (selectedYear && selectedDepartment) {
                  return onSaveAssumptionValue({
                      assumptionId,
                      year: selectedYear,
                      month,
                      store,
                      department: selectedDepartment,
                      value
                  });
              }
          });

          await Promise.all(promises);
          setPendingChanges({}); // Clear changes after save
          alert('Dados salvos com sucesso!');
      } catch (error) {
          console.error(error);
          alert('Erro ao salvar alguns dados.');
      } finally {
          setIsSaving(false);
      }
  };

  const handleCancelChanges = () => {
      if (confirm('Deseja descartar todas as alterações não salvas?')) {
          setPendingChanges({});
      }
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Format assumptions for dropdown
  const assumptionOptions = useMemo(() => assumptions.map(a => ({ id: a.id, name: a.name })), [assumptions]);

  return (
    <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
      <div className="w-full flex flex-col h-full">
          <div className="flex flex-col overflow-hidden flex-grow">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Dados do Orçamento</h1>
                    <p className="text-sm text-slate-500 mt-1">Insira os valores calculados das premissas para cada loja.</p>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0 relative z-40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                        <MultiSelectDropdown
                            label="Premissas"
                            options={assumptionOptions}
                            selectedValues={selectedAssumptionIds}
                            onChange={setSelectedAssumptionIds}
                            className="w-full"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Ano</label>
                        <StyledSelect
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            containerClassName="w-full"
                            className="h-10"
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Marca</label>
                        <StyledSelect
                            value={selectedBrandId}
                            onChange={(e) => setSelectedBrandId(e.target.value)}
                            containerClassName="w-full"
                            className="h-10"
                        >
                            {availableBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Departamento</label>
                        <StyledSelect
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            containerClassName="w-full"
                            className="h-10"
                        >
                            {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                        </StyledSelect>
                    </div>
                </div>
              </div>

              {/* Grid Area */}
              <div className="flex-grow overflow-auto bg-white">
                    {filteredCompanies.length > 0 && filteredAssumptions.length > 0 ? (
                        <table className="min-w-full border-separate border-spacing-0">
                            <thead className="bg-slate-50 sticky top-0 z-30 shadow-sm">
                                <tr>
                                    <th className="p-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-r min-w-[300px] w-[300px] sticky left-0 bg-slate-50 z-40 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                                        Premissa
                                    </th>
                                    <th className="p-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-r min-w-[220px] w-[220px] sticky left-[300px] bg-slate-50 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        Loja
                                    </th>
                                    {CALENDAR_MONTHS.map(month => (
                                        <th key={month} className="p-2 text-center text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-r min-w-[100px]">
                                            {month.slice(0, 3)}/{selectedYear}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredAssumptions.map(assumption => (
                                    <React.Fragment key={assumption.id}>
                                        {filteredCompanies.map((company, index) => (
                                            <tr key={`${assumption.id}-${company.id}`} className="hover:bg-slate-50 group">
                                                <td className="p-3 text-sm font-medium text-slate-800 border-r border-b sticky left-0 bg-white z-20 whitespace-nowrap overflow-hidden shadow-[1px_0_0_rgba(0,0,0,0.05)] group-hover:bg-slate-50">
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="truncate pr-2" title={assumption.name}>{assumption.name}</span>
                                                        <span className="shrink-0 text-[10px] uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                                                            {assumption.type === 'currency' ? 'R$' : assumption.type === 'percentage' ? '%' : '#'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-sm text-slate-600 border-r border-b sticky left-[300px] bg-white z-20 whitespace-nowrap overflow-hidden shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-slate-50">
                                                    <span className="truncate" title={company.nickname || company.name}>{company.nickname || company.name}</span>
                                                </td>
                                                {CALENDAR_MONTHS.map(month => {
                                                    const val = getAssumptionValue(assumption.id, company.id, month);
                                                    const isModified = pendingChanges.hasOwnProperty(`${assumption.id}|${company.id}|${month}`);
                                                    
                                                    return (
                                                        <td key={month} className={`p-0 border-r border-b h-10 relative ${isModified ? 'bg-yellow-50' : ''}`}>
                                                            <EditableCell
                                                                value={val}
                                                                onChange={(v) => handleValueChange(assumption.id, company.id, month, v)}
                                                                type={assumption.type}
                                                                className={`text-center font-medium h-full w-full ${isModified ? 'text-yellow-700 font-bold' : 'text-slate-700'}`}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <p className="text-lg font-medium">Nenhum dado para exibir.</p>
                            <p className="text-sm mt-2">Certifique-se de selecionar Premissas, Marca e Departamento.</p>
                        </div>
                    )}
              </div>
          </div>
      </div>

      {/* Floating Save Bar */}
      {hasPendingChanges && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-fadeIn border border-slate-700">
              <span className="text-sm font-medium">
                  {Object.keys(pendingChanges).length} alteração(ões) pendente(s)
              </span>
              <div className="flex gap-3">
                  <button 
                      onClick={handleCancelChanges}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  >
                      Descartar
                  </button>
                  <button 
                      onClick={handleSaveAll}
                      disabled={isSaving}
                      className="px-4 py-1.5 text-xs font-bold bg-primary text-white rounded-full hover:bg-primary-hover shadow-lg transition-all transform hover:scale-105 flex items-center"
                  >
                      {isSaving ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Salvando...
                          </>
                      ) : 'Salvar Alterações'}
                  </button>
              </div>
          </div>
      )}
    </main>
  );
};

export default BudgetValuesView;
