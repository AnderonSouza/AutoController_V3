import React, { useState, useEffect, useMemo } from 'react';
import { CgEntry, Company, DreAccount, Brand, BalanceSheetAccount } from '../types';
import { CALENDAR_MONTHS } from '../constants';
import StyledSelect from './StyledSelect';
import SearchableSelect from './SearchableSelect';
import MultiSelectDropdown from './MultiSelectDropdown';
import { generateUUID } from '../utils/helpers';

interface CgEntriesViewProps {
  entries?: CgEntry[];
  onNavigateBack?: () => void;
  onSaveEntries?: (entries: CgEntry[]) => Promise<void>;
  companies?: Company[];
  brands?: Brand[];
  dreAccounts?: DreAccount[];
  balanceSheetAccounts?: BalanceSheetAccount[];
  dreDepartmentOptions?: string[];
  tenantId?: string | null;
}

type CgEntryLine = Omit<CgEntry, 'transactionId' | 'year' | 'month' | 'description' | 'createdAt'>;

interface EditingCgTransaction {
    transactionId: string;
    year: number;
    month: string;
    description: string;
    lines: CgEntryLine[];
}

const CurrencyInput: React.FC<{ value: number; onChange: (val: number) => void; className?: string; placeholder?: string }> = ({ value, onChange, className, placeholder }) => {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value !== undefined && value !== null) {
            setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(value));
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Just update local state to avoid lag
        let val = e.target.value.replace(/[^\d.,-]/g, '');
        setDisplayValue(val);
    };

    const handleBlur = () => {
        // Parse and commit on blur
        let val = displayValue.replace(/\./g, '').replace(',', '.');
        if (!val || val === '-') {
            onChange(0);
            setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(0));
            return;
        }
        onChange(parseFloat(val));
    };
    
    // Performance Optimization: Update display on change locally
    const handleExpensiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^\d-]/g, '');
        if (!val || val === '-') {
            setDisplayValue(val);
            return;
        }
        const numericValue = parseFloat(val) / 100;
        setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(numericValue));
    };

    const commitChange = () => {
        if(!displayValue || displayValue === '-') {
            onChange(0);
            return;
        }
        const raw = displayValue.replace(/\./g, '').replace(',', '.');
        onChange(parseFloat(raw));
    };

    return (
        <input 
            type="text" 
            className={className} 
            value={displayValue} 
            onChange={handleExpensiveChange} 
            onBlur={commitChange}
            placeholder={placeholder}
        />
    );
};

const CgEntryEditModal: React.FC<{
    transaction: EditingCgTransaction | null;
    onClose: () => void;
    onSave: (transaction: EditingCgTransaction) => void;
    companies: Company[];
    dreAccounts: DreAccount[];
    balanceSheetAccounts: BalanceSheetAccount[];
    dreDepartmentOptions: string[];
}> = ({ transaction: initialTransaction, onClose, onSave, companies, dreAccounts, balanceSheetAccounts, dreDepartmentOptions }) => {
    const [transaction, setTransaction] = useState<EditingCgTransaction | null>(initialTransaction);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i).reverse();

    // Prepare options for SearchableSelect
    const dreAccountOptions = useMemo(() => dreAccounts.map(opt => ({ id: opt.name, name: opt.name })), [dreAccounts]);
    const balanceSheetAccountOptions = useMemo(() => balanceSheetAccounts.map(opt => ({ id: opt.name, name: opt.name })), [balanceSheetAccounts]);

    useEffect(() => { setTransaction(initialTransaction); }, [initialTransaction]);
    if (!transaction) return null;

    const handleHeaderChange = (field: 'year' | 'month' | 'description', value: any) => setTransaction(prev => prev ? { ...prev, [field]: value } : null);
    
    const handleLineChange = (index: number, field: keyof Omit<CgEntryLine, 'id'>, value: any) => {
        setTransaction(prev => {
            if (!prev) return null;
            const newLines = [...prev.lines];
            (newLines[index] as any)[field] = value;

            // If changing target report to CASH_FLOW, clear department
            if (field === 'targetReport') {
                if (value === 'CASH_FLOW') {
                    (newLines[index] as any)['department'] = 'N/A';
                    (newLines[index] as any)['dreAccountName'] = '';
                } else {
                    (newLines[index] as any)['department'] = '';
                    (newLines[index] as any)['dreAccountName'] = '';
                }
            }

            return { ...prev, lines: newLines };
        });
    };
    const addLine = () => setTransaction(prev => prev ? { ...prev, lines: [...prev.lines, { id: `new_line_${Date.now()}_${Math.random()}`, companyId: '', department: '', dreAccountName: '', value: 0, targetReport: 'DRE' }] } : null);
    const removeLine = (index: number) => setTransaction(prev => prev ? { ...prev, lines: prev.lines.filter((_, i) => i !== index) } : null);
    const totalCg = useMemo(() => transaction.lines.reduce((sum, line) => sum + (line.value || 0), 0), [transaction]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const hasEmpty = transaction.lines.some(l => !l.companyId || !l.dreAccountName || (l.targetReport === 'DRE' && !l.department));
        if (hasEmpty) { alert('Por favor, preencha todos os campos.'); return; }
        onSave(transaction);
    };
    
    const LineItem: React.FC<{ line: CgEntryLine, index: number }> = ({ line, index }) => {
        const isCashFlow = line.targetReport === 'CASH_FLOW';
        const accountOptions = isCashFlow ? balanceSheetAccountOptions : dreAccountOptions;

        return (
            <div className="relative bg-white p-3 border border-slate-200 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Destino</label>
                        <StyledSelect containerClassName="w-full" value={line.targetReport || 'DRE'} onChange={e => handleLineChange(index, 'targetReport', e.target.value)}>
                            <option value="DRE">DRE</option>
                            <option value="CASH_FLOW">Fluxo</option>
                        </StyledSelect>
                    </div>
                    <div className="lg:col-span-3">
                        <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Empresa</label>
                        <StyledSelect containerClassName="w-full" value={line.companyId} onChange={e => handleLineChange(index, 'companyId', e.target.value)}>
                            <option value="">Selecione...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.nickname || c.name}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Departamento</label>
                        <StyledSelect 
                            containerClassName="w-full" 
                            value={line.department} 
                            onChange={e => handleLineChange(index, 'department', e.target.value)}
                            disabled={isCashFlow}
                            className={isCashFlow ? 'bg-slate-100 text-slate-400' : ''}
                        >
                            <option value="">{isCashFlow ? 'N/A' : 'Selecione...'}</option>
                            {dreDepartmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                        </StyledSelect>
                    </div>
                    <div className="lg:col-span-3">
                        <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Conta {isCashFlow ? 'Patrimonial' : 'DRE'}</label>
                        <SearchableSelect 
                            value={line.dreAccountName} 
                            options={accountOptions} 
                            onChange={(val) => handleLineChange(index, 'dreAccountName', val)}
                            placeholder="Selecione..."
                            className="w-full"
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Valor (+/-)</label>
                        <CurrencyInput 
                            value={line.value} 
                            onChange={val => handleLineChange(index, 'value', val)} 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm text-right font-mono" 
                            placeholder="0,00"
                        />
                    </div>
                </div>
                <button type="button" onClick={() => removeLine(index)} className="absolute -top-2 -right-2 p-1 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-full border border-slate-200 shadow-sm transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
        );
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{transaction.transactionId.startsWith('new_') ? 'Novo Ajuste de Caixa' : 'Editar Ajuste'}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden bg-slate-50/30">
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="p-4 border rounded-lg bg-slate-50 grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-2">
                             <label className="text-sm font-medium text-slate-600">Ano</label>
                             <StyledSelect containerClassName="w-full mt-1" value={transaction.year} onChange={e => handleHeaderChange('year', parseInt(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</StyledSelect>
                        </div>
                        <div className="md:col-span-3">
                             <label className="text-sm font-medium text-slate-600">Mês</label>
                             <StyledSelect containerClassName="w-full mt-1" value={transaction.month} onChange={e => handleHeaderChange('month', e.target.value)}>{CALENDAR_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</StyledSelect>
                        </div>
                        <div className="md:col-span-7">
                            <label className="text-sm font-medium text-slate-600">Histórico</label>
                            <input type="text" value={transaction.description} onChange={e => handleHeaderChange('description', e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3 bg-slate-50/50">
                        <div className="flex justify-between items-center">
                            <div><h3 className="font-semibold text-slate-800">Lançamentos</h3><p className="text-sm text-slate-700">Total: {totalCg.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div>
                            <button type="button" onClick={addLine} className="px-3 py-1 bg-primary text-on-primary text-xs font-semibold rounded-full hover:bg-primary-hover shadow-sm">+ Linha</button>
                        </div>
                        {transaction.lines.map((line, i) => <LineItem key={line.id} line={line} index={i} />)}
                    </div>
                </div>
                <div className="p-4 bg-white border-t flex justify-end items-center shrink-0 gap-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 shadow-sm">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary-hover shadow-md transform active:scale-95">Salvar</button>
                </div>
            </form>
        </div>
      </div>
    );
};

const CgEntriesView: React.FC<CgEntriesViewProps> = ({ 
  entries = [], 
  onNavigateBack, 
  onSaveEntries, 
  companies = [], 
  brands = [], 
  dreAccounts = [], 
  balanceSheetAccounts = [], 
  dreDepartmentOptions = [],
  tenantId 
}) => {
    const [editingTransaction, setEditingTransaction] = useState<EditingCgTransaction | null>(null);
    const [isFilterVisible, setIsFilterVisible] = useState(true);
    const [filters, setFilters] = useState({ years: [] as number[], months: [] as string[], brandIds: [] as string[], companyIds: [] as string[], departments: [] as string[] });
    const [filteredEntries, setFilteredEntries] = useState<CgEntry[]>(entries);

    const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c.nickname || c.name])), [companies]);
    const { yearOptions, brandOptions, companyOptions, departmentOptions } = useMemo(() => {
        const years = [...new Set(entries.map(e => e.year))].sort((a, b) => Number(b) - Number(a));
        const filteredCompanies = filters.brandIds.length > 0 ? companies.filter(c => filters.brandIds.includes(c.brandId)) : companies;
        return {
            yearOptions: years.map(y => ({ id: String(y), name: String(y) })),
            brandOptions: brands.map(b => ({id: b.id, name: b.name })),
            companyOptions: filteredCompanies.map(c => ({ id: c.id, name: c.nickname || c.name })),
            departmentOptions: dreDepartmentOptions.map(d => ({ id: d, name: d }))
        };
    }, [entries, companies, brands, dreDepartmentOptions, filters.brandIds]);
    const monthOptions = CALENDAR_MONTHS.map(m => ({ id: m, name: m }));

    const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
        const newFilters = { ...filters, [filterName]: value };
        if (filterName === 'brandIds') newFilters.companyIds = [];
        setFilters(newFilters);
    };
    const companyToBrandMap = useMemo(() => new Map(companies.map(c => [c.id, c.brandId])), [companies]);
    const handleApplyFilters = () => {
        const { years, months, brandIds, companyIds, departments } = filters;
        const isFilterActive = years.length || months.length || brandIds.length || companyIds.length || departments.length;
        if (!isFilterActive) { setFilteredEntries(entries); return; }
        const results = entries.filter(entry => {
            if (years.length && !years.includes(entry.year)) return false;
            if (months.length && !months.includes(entry.month)) return false;
            const brandId = companyToBrandMap.get(entry.companyId);
            if (brandIds.length && (!brandId || !brandIds.includes(brandId))) return false;
            if (companyIds.length && !companyIds.includes(entry.companyId)) return false;
            if (departments.length && !departments.includes(entry.department)) return false;
            return true;
        });
        setFilteredEntries(results);
    };
    const handleClearFilters = () => { setFilters({ years: [], months: [], brandIds: [], companyIds: [], departments: [] }); setFilteredEntries(entries); };
    useEffect(() => { setFilteredEntries(entries); }, [entries]);

    const groupedEntries = useMemo(() => {
        const groups: Record<string, CgEntry[]> = {};
        filteredEntries.forEach(t => { if (!groups[t.transactionId]) groups[t.transactionId] = []; groups[t.transactionId].push(t); });
        return Object.values(groups).sort((a, b) => (b[0]?.createdAt || '').localeCompare(a[0]?.createdAt || ''));
    }, [filteredEntries]);
    
    const handleAddNew = () => setEditingTransaction({ transactionId: `new_tx_${Date.now()}`, year: new Date().getFullYear(), month: CALENDAR_MONTHS[new Date().getMonth()], description: '', lines: [] });
    const handleEdit = (lines: CgEntry[]) => setEditingTransaction({ transactionId: lines[0].transactionId, year: lines[0].year, month: lines[0].month, description: lines[0].description, lines });
    
    const handleSave = async (transaction: EditingCgTransaction) => {
        // Ensure transactionId is valid
        const isNewTx = transaction.transactionId.startsWith('new_');
        const finalTransactionId = isNewTx ? generateUUID() : transaction.transactionId;
        const now = new Date().toISOString();

        const flatLines = transaction.lines.map(line => {
            const isNewLine = line.id.startsWith('new_line_');
            const finalId = isNewLine ? generateUUID() : line.id;
            
            return {
                ...line, 
                id: finalId,
                transactionId: finalTransactionId, 
                year: transaction.year, 
                month: transaction.month, 
                description: transaction.description,
                createdAt: (line as any).createdAt || now // Ensure createdAt exists
            };
        });

        await onSaveEntries([...entries.filter(t => t.transactionId !== transaction.transactionId), ...flatLines]);
        setEditingTransaction(null);
    };

    const handleDelete = (transactionId: string) => { if (confirm('Excluir este lançamento?')) onSaveEntries(entries.filter(t => t.transactionId !== transactionId)); };

    return (
        <div className="page-container">
          <div className="content-card">
            <div className="card-header">
              <div className="header-text">
                <h1 className="card-title">Gerenciar Ajustes de Caixa</h1>
                <p className="card-subtitle">Lançamentos manuais que afetam o Caixa Gerencial.</p>
              </div>
              <div className="header-actions">
                <button onClick={() => setIsFilterVisible(!isFilterVisible)} className={`btn ${isFilterVisible ? 'btn-primary-outline' : 'btn-secondary'}`}>
                  {isFilterVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isFilterVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={handleAddNew} className="btn btn-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                  Novo Ajuste de Caixa
                </button>
              </div>
            </div>
            {isFilterVisible && (
              <div className="filter-bar">
                <MultiSelectDropdown label="Anos" options={yearOptions} selectedValues={filters.years.map(String)} onChange={(v) => handleFilterChange('years', v.map(Number))} />
                <MultiSelectDropdown label="Meses" options={monthOptions} selectedValues={filters.months} onChange={(v) => handleFilterChange('months', v)} />
                <MultiSelectDropdown label="Marcas" options={brandOptions} selectedValues={filters.brandIds} onChange={(v) => handleFilterChange('brandIds', v)} />
                <MultiSelectDropdown label="Empresas" options={companyOptions} selectedValues={filters.companyIds} onChange={(v) => handleFilterChange('companyIds', v)} />
                <MultiSelectDropdown label="Departamentos" options={departmentOptions} selectedValues={filters.departments} onChange={(v) => handleFilterChange('departments', v)} />
                <div className="flex gap-2 items-end">
                  <button onClick={handleApplyFilters} className="btn btn-primary">Aplicar</button>
                  <button onClick={handleClearFilters} className="btn btn-secondary">Limpar</button>
                </div>
              </div>
            )}
            <div className="card-body">
              {groupedEntries.length === 0 ? (
                <div className="table-empty">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span>Nenhum lançamento encontrado.</span>
                </div>
              ) :
                        <div className="divide-y divide-slate-100">
                          {groupedEntries.map(transactionLines => {
                            const firstLine = transactionLines[0];
                            const total = transactionLines.reduce((sum, l) => sum + l.value, 0);
                            return (
                              <div key={firstLine.transactionId} className="p-6 hover:bg-slate-50 transition-colors group border-l-4 border-l-transparent hover:border-l-primary">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-slate-800 text-base">{firstLine.description}</p>
                                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold flex items-center gap-2">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{firstLine.month}/{firstLine.year}</span>
                                            <span>Total: <span className="text-slate-900 font-bold">{total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span></span>
                                        </p>
                                    </div>
                                    <div className="space-x-3 flex-shrink-0 ml-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(transactionLines)} className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-bold text-slate-600 hover:bg-white hover:border-primary hover:text-primary transition-all bg-slate-50">Editar</button>
                                        <button onClick={() => handleDelete(firstLine.transactionId)} className="px-3 py-1.5 border border-red-200 rounded-md text-sm font-bold text-red-600 hover:bg-red-50 transition-all bg-white">Excluir</button>
                                    </div>
                                </div>
                                <div className="space-y-1 bg-slate-50/60 p-3 rounded-lg border border-slate-100 text-sm">
                                    {transactionLines.map(l => (
                                        <div key={l.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 last:border-0">
                                            <span className="text-slate-600 truncate mr-2 font-medium">
                                                {companyMap.get(l.companyId)} / {l.targetReport === 'CASH_FLOW' ? 'Fluxo' : l.department} / {l.dreAccountName}
                                            </span>
                                            <span className={`font-mono font-bold ${l.value < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{l.value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                                        </div>
                                    ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
              }
            </div>
          </div>
          {editingTransaction && <CgEntryEditModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleSave} companies={companies} dreAccounts={dreAccounts} balanceSheetAccounts={balanceSheetAccounts} dreDepartmentOptions={dreDepartmentOptions} />}
        </div>
    );
};

export default CgEntriesView;
