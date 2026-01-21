import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { BudgetAssumption, BudgetAssumptionValue, Brand, Company } from '../types';
import StyledSelect from './StyledSelect';
import EditableCell from './EditableCell';
import MultiSelectDropdown from './MultiSelectDropdown';
import { CALENDAR_MONTHS } from '../constants';
import { generateUUID } from '../utils/helpers';
import { saveCadastroTenant } from '../utils/db';
import * as XLSX from 'xlsx';
import BudgetImportResultModal, { BudgetImportResult, BudgetImportError } from './BudgetImportResultModal';

interface BudgetValuesViewProps {
  assumptions: BudgetAssumption[];
  assumptionValues: BudgetAssumptionValue[];
  onSaveAssumptionValue: (val: BudgetAssumptionValue) => void;
  onNavigateBack: () => void;
  availableBrands: Brand[];
  availableCompanies: Company[];
  availableDepartments: string[];
  tenantId: string;
  onRefreshData?: () => void;
}

const BudgetValuesView: React.FC<BudgetValuesViewProps> = ({
  assumptions,
  assumptionValues,
  onSaveAssumptionValue,
  onNavigateBack,
  availableBrands,
  availableCompanies,
  availableDepartments,
  tenantId,
  onRefreshData
}) => {
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i).sort((a, b) => b - a);

  // --- FILTERS STATE ---
  const [selectedAssumptionIds, setSelectedAssumptionIds] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

  // --- LOCAL EDIT STATE (BUFFER) ---
  // Key format: `${assumptionId}|${storeName}|${month}`
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- IMPORT RESULT MODAL STATE ---
  const [importResultModalOpen, setImportResultModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<BudgetImportResult | null>(null);

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
  // Get all effective companies for the selected brand (for dropdown)
  // Treat undefined tipo as 'efetiva' for legacy data compatibility
  const effectiveCompaniesForBrand = useMemo(() => {
    if (!selectedBrandId) return [];
    return availableCompanies.filter(c => c.brandId === selectedBrandId && (c.tipo === 'efetiva' || !c.tipo));
  }, [selectedBrandId, availableCompanies]);

  // Filtered companies based on selected filters (only Efetiva - treat undefined as efetiva)
  const filteredCompanies = useMemo(() => {
    if (!selectedBrandId) return [];
    let companies = availableCompanies.filter(c => c.brandId === selectedBrandId && (c.tipo === 'efetiva' || !c.tipo));
    if (selectedCompanyId !== 'all') {
      companies = companies.filter(c => c.id === selectedCompanyId);
    }
    return companies;
  }, [selectedBrandId, selectedCompanyId, availableCompanies]);

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

  const handleExportTemplate = () => {
    const templateData: any[] = [];

    filteredAssumptions.forEach(assumption => {
      filteredCompanies.forEach(company => {
        CALENDAR_MONTHS.forEach(month => {
          templateData.push({
            "Código Premissa": assumption.id,
            "Nome Premissa": assumption.name,
            "Tipo": assumption.type === 'currency' ? 'R$' : assumption.type === 'percentage' ? '%' : '#',
            "Ano": selectedYear,
            "Mês": month,
            "CNPJ": company.cnpj || "",
            "Loja": company.nickname || company.name,
            "Departamento": selectedDepartment,
            "Valor": getAssumptionValue(assumption.id, company.id, month) || ""
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 40 }, { wch: 40 }, { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados Orçamento");
    XLSX.writeFile(wb, `dados_orcamento_${selectedYear}.xlsx`);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          const valuesToImport: { record: any; rowIndex: number }[] = [];
          const errors: BudgetImportError[] = [];
          const totalLinhas = jsonData.length;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const rowNumber = i + 2;

            const premissaId = row["Codigo Premissa"]?.toString().trim() || row["Código Premissa"]?.toString().trim();
            const anoStr = row["Ano"]?.toString().trim();
            const mes = row["Mes"]?.toString().trim().toUpperCase() || row["Mês"]?.toString().trim().toUpperCase();
            const valorStr = row["Valor"]?.toString().trim();
            const cnpj = row["CNPJ"]?.toString().replace(/\D/g, '').trim();
            const departamento = row["Departamento"]?.toString().trim();

            if (!premissaId) {
              errors.push({ linha: rowNumber, campo: 'Codigo Premissa', valor: '', motivo: 'Codigo da premissa nao informado' });
              continue;
            }

            if (!anoStr) {
              errors.push({ linha: rowNumber, campo: 'Ano', valor: '', motivo: 'Ano nao informado' });
              continue;
            }

            const ano = parseInt(anoStr);
            if (isNaN(ano)) {
              errors.push({ linha: rowNumber, campo: 'Ano', valor: anoStr, motivo: 'Ano invalido' });
              continue;
            }

            if (!mes) {
              errors.push({ linha: rowNumber, campo: 'Mes', valor: '', motivo: 'Mes nao informado' });
              continue;
            }

            if (!valorStr) {
              errors.push({ linha: rowNumber, campo: 'Valor', valor: '', motivo: 'Valor nao informado' });
              continue;
            }

            const valor = parseFloat(valorStr.replace(",", "."));
            if (isNaN(valor)) {
              errors.push({ linha: rowNumber, campo: 'Valor', valor: valorStr, motivo: 'Valor invalido (nao e um numero)' });
              continue;
            }

            if (!cnpj) {
              errors.push({ linha: rowNumber, campo: 'CNPJ', valor: '', motivo: 'CNPJ nao informado' });
              continue;
            }

            const assumption = assumptions.find(a => a.id === premissaId);
            if (!assumption) {
              errors.push({ linha: rowNumber, campo: 'Codigo Premissa', valor: premissaId, motivo: 'Premissa nao encontrada no sistema' });
              continue;
            }

            const empresa = availableCompanies.find(c => c.cnpj?.replace(/\D/g, '') === cnpj);
            if (!empresa) {
              errors.push({ linha: rowNumber, campo: 'CNPJ', valor: cnpj, motivo: 'Empresa nao encontrada com este CNPJ' });
              continue;
            }

            const dept = departamento || selectedDepartment;
            
            const existingRecord = assumptionValues.find(v =>
              v.assumptionId === premissaId &&
              v.store === empresa.id &&
              v.year === ano &&
              v.month === mes &&
              v.department === dept
            );

            valuesToImport.push({
              record: {
                organizacao_id: tenantId,
                premissa_id: premissaId,
                ano: ano,
                mes: mes,
                empresa_id: empresa.id,
                departamento: dept,
                valor: valor,
              },
              rowIndex: rowNumber
            });
          }

          let successCount = 0;

          if (valuesToImport.length > 0) {
            for (const item of valuesToImport) {
              try {
                await saveCadastroTenant("budget_values", [item.record], tenantId);
                successCount++;
              } catch (err: any) {
                const errorMsg = err?.message || 'Erro ao salvar no banco de dados';
                errors.push({ 
                  linha: item.rowIndex, 
                  campo: 'Banco de Dados', 
                  valor: '', 
                  motivo: errorMsg 
                });
              }
            }
            
            if (successCount > 0) {
              onRefreshData?.();
            }
          }

          const result: BudgetImportResult = {
            success: errors.length === 0,
            totalLinhas,
            valoresImportados: successCount,
            valoresComErro: errors.length,
            errors
          };

          setImportResult(result);
          setImportResultModalOpen(true);

        } catch (err) {
          console.error("Erro ao processar arquivo:", err);
          const result: BudgetImportResult = {
            success: false,
            totalLinhas: 0,
            valoresImportados: 0,
            valoresComErro: 1,
            errors: [{ linha: 0, campo: 'Arquivo', valor: '', motivo: 'Erro ao processar arquivo Excel' }]
          };
          setImportResult(result);
          setImportResultModalOpen(true);
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Erro na importação.");
      setImporting(false);
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportTemplate}
                    disabled={filteredAssumptions.length === 0 || filteredCompanies.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Planilha Modelo
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {importing ? 'Importando...' : 'Importar'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Filter Bar */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0 relative z-40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-2">
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
                            className="h-10 py-2.5 pl-4 pr-10 text-sm"
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Marca</label>
                        <StyledSelect
                            value={selectedBrandId}
                            onChange={(e) => {
                              setSelectedBrandId(e.target.value);
                              setSelectedCompanyId('all');
                            }}
                            containerClassName="w-full"
                            className="h-10 py-2.5 pl-4 pr-10 text-sm"
                        >
                            {availableBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Loja</label>
                        <StyledSelect
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            containerClassName="w-full"
                            className="h-10 py-2.5 pl-4 pr-10 text-sm"
                        >
                            <option value="all">Todas as Lojas</option>
                            {effectiveCompaniesForBrand.map(c => <option key={c.id} value={c.id}>{c.nickname || c.name}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Departamento</label>
                        <StyledSelect
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            containerClassName="w-full"
                            className="h-10 py-2.5 pl-4 pr-10 text-sm"
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
                            <thead className="sticky top-0 z-30 shadow-sm table-header">
                                <tr>
                                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider border-b border-r border-white/20 min-w-[300px] w-[300px] sticky left-0 z-40 shadow-[1px_0_0_rgba(0,0,0,0.05)] table-header">
                                        Premissa
                                    </th>
                                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider border-b border-r border-white/20 min-w-[220px] w-[220px] sticky left-[300px] z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] table-header">
                                        Loja
                                    </th>
                                    {CALENDAR_MONTHS.map(month => (
                                        <th key={month} className="p-2 text-center text-xs font-bold uppercase tracking-wider border-b border-r border-white/20 min-w-[100px] table-header">
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
                                                    const hasValue = val !== 0 && val !== null && val !== undefined;
                                                    
                                                    return (
                                                        <td key={month} className={`p-0 border-r border-b h-10 relative ${isModified ? 'bg-yellow-50' : hasValue ? 'bg-emerald-50' : ''}`}>
                                                            <EditableCell
                                                                value={val}
                                                                onChange={(v) => handleValueChange(assumption.id, company.id, month, v)}
                                                                type={assumption.type}
                                                                className={`text-center font-medium h-full w-full ${isModified ? 'text-yellow-700 font-bold' : hasValue ? 'text-emerald-700' : 'text-slate-700'}`}
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

      <BudgetImportResultModal
        isOpen={importResultModalOpen}
        onClose={() => setImportResultModalOpen(false)}
        result={importResult}
      />
    </main>
  );
};

export default BudgetValuesView;
