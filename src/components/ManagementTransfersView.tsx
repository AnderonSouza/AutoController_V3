import React, { useState, useEffect, useMemo } from 'react';
import { ManagementTransfer, Company, DreAccount, Brand, BalanceSheetAccount } from '../types';
import { CALENDAR_MONTHS } from '../constants';
import StyledSelect from './StyledSelect';
import SearchableSelect from './SearchableSelect';
import MultiSelectDropdown from './MultiSelectDropdown';
import { generateUUID } from '../utils/helpers';


interface ManagementTransfersViewProps {
  transfers?: ManagementTransfer[];
  onNavigateBack?: () => void;
  onSaveTransfers?: (transfers: ManagementTransfer[]) => Promise<void>;
  companies?: Company[];
  brands?: Brand[];
  dreAccounts?: DreAccount[];
  balanceSheetAccounts?: BalanceSheetAccount[];
  dreDepartmentOptions?: string[];
  tenantId?: string | null;
}

type TransferLine = Omit<ManagementTransfer, 'transactionId' | 'year' | 'month' | 'description' | 'createdAt'>;

interface EditingTransferTransaction {
    transactionId: string;
    year: number;
    month: string;
    description: string;
    origins: TransferLine[];
    destinations: TransferLine[];
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
        let val = e.target.value.replace(/[^\d.,]/g, '');
        setDisplayValue(val);
    };

    const handleBlur = () => {
        // Parse and commit on blur
        let val = displayValue.replace(/\./g, '').replace(',', '.');
        if (!val) {
            onChange(0);
            setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(0));
            return;
        }
        const numericValue = parseFloat(val); 
    };
    
    const handleExpensiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (!val) {
            setDisplayValue('');
            return;
        }
        const numericValue = parseFloat(val) / 100;
        setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(numericValue));
    };

    const commitChange = () => {
        if(!displayValue) {
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

const TransferEditModal: React.FC<{
    transaction: EditingTransferTransaction | null;
    onClose: () => void;
    onSave: (transaction: EditingTransferTransaction) => void;
    companies: Company[];
    dreAccounts: DreAccount[];
    balanceSheetAccounts: BalanceSheetAccount[];
    dreDepartmentOptions: string[];
}> = ({ transaction: initialTransaction, onClose, onSave, companies, dreAccounts, balanceSheetAccounts, dreDepartmentOptions }) => {
    const [transaction, setTransaction] = useState<EditingTransferTransaction | null>(initialTransaction);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i).reverse();

    // Prepare options for SearchableSelect
    const dreAccountOptions = useMemo(() => dreAccounts.map(opt => ({ id: opt.name, name: opt.name })), [dreAccounts]);
    const balanceSheetAccountOptions = useMemo(() => balanceSheetAccounts.map(opt => ({ id: opt.name, name: opt.name })), [balanceSheetAccounts]);

    useEffect(() => { setTransaction(initialTransaction); }, [initialTransaction]);
    if (!transaction) return null;

    const handleHeaderChange = (field: 'year' | 'month' | 'description', value: any) => setTransaction(prev => prev ? { ...prev, [field]: value } : null);
    
    const handleLineChange = (type: 'origins' | 'destinations', index: number, field: keyof Omit<TransferLine, 'id' | 'type'>, value: any) => {
        setTransaction(prev => {
            if (!prev) return null;
            const newLines = [...prev[type]];
            (newLines[index] as any)[field] = value;
            
            // If changing target report to CASH_FLOW, clear department
            if (field === 'targetReport') {
                if (value === 'CASH_FLOW') {
                    (newLines[index] as any)['department'] = 'N/A';
                    (newLines[index] as any)['dreAccountName'] = ''; // Reset account
                } else {
                    (newLines[index] as any)['department'] = '';
                    (newLines[index] as any)['dreAccountName'] = ''; // Reset account
                }
            }

            return { ...prev, [type]: newLines };
        });
    };
    
    const addLine = (type: 'origins' | 'destinations') => {
        setTransaction(prev => {
            if (!prev) return null;
            const newLine: TransferLine = {
                id: `new_line_${Date.now()}_${Math.random()}`, // Temporary ID for React key
                type: type === 'origins' ? 'origin' : 'destination',
                companyId: '', 
                department: '', 
                dreAccountName: '', 
                value: 0,
                targetReport: 'DRE'
            };
            return { ...prev, [type]: [...prev[type], newLine] };
        });
    };

    const removeLine = (type: 'origins' | 'destinations', index: number) => {
        setTransaction(prev => {
            if (!prev) return null;
            const newLines = prev[type].filter((_, i) => i !== index);
            return { ...prev, [type]: newLines };
        });
    };

    const { totalOrigins, totalDestinations } = useMemo(() => {
        const totalOrigins = transaction.origins.reduce((sum, line) => sum + (line.value || 0), 0);
        const totalDestinations = transaction.destinations.reduce((sum, line) => sum + (line.value || 0), 0);
        return { totalOrigins, totalDestinations };
    }, [transaction]);

    const isBalanced = totalOrigins > 0.001 && Math.abs(totalOrigins - totalDestinations) < 0.01;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) { alert('Os totais de débitos e créditos devem ser iguais e maiores que zero.'); return; }
        
        const hasEmpty = [...transaction.origins, ...transaction.destinations].some(l => 
            !l.companyId || !l.dreAccountName || (l.targetReport === 'DRE' && !l.department)
        );

        if (hasEmpty) { alert('Por favor, preencha todos os campos obrigatórios.'); return; }
        onSave(transaction);
    };
    
    const LineItem: React.FC<{ line: TransferLine, type: 'origins' | 'destinations', index: number }> = ({ line, type, index }) => {
        const isCashFlow = line.targetReport === 'CASH_FLOW';
        const accountOptions = isCashFlow ? balanceSheetAccountOptions : dreAccountOptions;

        return (
            <div className="relative bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Destino</label>
                        <StyledSelect containerClassName="w-full" value={line.targetReport || 'DRE'} onChange={e => handleLineChange(type, index, 'targetReport', e.target.value)}>
                            <option value="DRE">DRE</option>
                            <option value="CASH_FLOW">Fluxo de Caixa</option>
                        </StyledSelect>
                    </div>
                    <div className="lg:col-span-3">
                        <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Empresa</label>
                        <StyledSelect containerClassName="w-full" value={line.companyId} onChange={e => handleLineChange(type, index, 'companyId', e.target.value)}>
                            <option value="">Selecione...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.nickname || c.name}</option>)}
                        </StyledSelect>
                    </div>
                     <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Departamento</label>
                        <StyledSelect 
                            containerClassName="w-full" 
                            value={line.department} 
                            onChange={e => handleLineChange(type, index, 'department', e.target.value)}
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
                            onChange={(val) => handleLineChange(type, index, 'dreAccountName', val)}
                            placeholder="Selecione a conta..."
                            className="w-full"
                        />
                    </div>
                    <div className="lg:col-span-2">
                         <label className="text-xs font-bold text-slate-500 block mb-1 uppercase">Valor</label>
                         <CurrencyInput 
                            value={line.value} 
                            onChange={(val) => handleLineChange(type, index, 'value', val)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm text-right font-mono"
                            placeholder="0,00"
                         />
                    </div>
                </div>
                <button type="button" onClick={() => removeLine(type, index)} className="absolute -top-2 -right-2 p-1 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors border border-slate-200 shadow-sm" title="Remover linha">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
        )
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{transaction.transactionId.startsWith('new_') ? 'Nova Transferência Gerencial' : 'Editar Transferência'}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden bg-slate-50/30">
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="p-4 border rounded-lg bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="grid grid-cols-2 gap-2">
                             <div><label className="text-sm font-medium text-slate-600">Ano</label><StyledSelect containerClassName="w-full mt-1" value={transaction.year} onChange={e => handleHeaderChange('year', parseInt(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</StyledSelect></div>
                             <div><label className="text-sm font-medium text-slate-600">Mês</label><StyledSelect containerClassName="w-full mt-1" value={transaction.month} onChange={e => handleHeaderChange('month', e.target.value)}>{CALENDAR_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</StyledSelect></div>
                        </div>
                        <div className="md:col-span-2"><label className="text-sm font-medium text-slate-600">Histórico (Descrição)</label><input type="text" value={transaction.description} onChange={e => handleHeaderChange('description', e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-4 border rounded-lg space-y-3 bg-red-50/20 border-red-100"><div className="flex justify-between items-center border-b border-red-100 pb-2"><div><h3 className="font-bold text-red-800 text-sm">Origens (Débitos)</h3><p className="text-xs text-red-700 font-mono">Total: {totalOrigins.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div><button type="button" onClick={() => addLine('origins')} className="px-3 py-1 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 shadow-sm">+ Adicionar</button></div>{transaction.origins.map((line, i) => <LineItem key={line.id} line={line} type="origins" index={i} />)}</div>
                        <div className="p-4 border rounded-lg space-y-3 bg-emerald-50/30 border-emerald-100"><div className="flex justify-between items-center border-b border-emerald-100 pb-2"><div><h3 className="font-bold text-emerald-800 text-sm">Destinos (Créditos)</h3><p className="text-xs text-emerald-700 font-mono">Total: {totalDestinations.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div><button type="button" onClick={() => addLine('destinations')} className="px-3 py-1 bg-white border border-emerald-200 text-emerald-600 text-xs font-bold rounded-lg hover:bg-emerald-50 shadow-sm">+ Adicionar</button></div>{transaction.destinations.map((line, i) => <LineItem key={line.id} line={line} type="destinations" index={i} />)}</div>
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                    <div className={`font-bold text-sm flex items-center ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                         {isBalanced ? <><svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Balanceado</> : <><svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Desbalanceado</>}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-shadow shadow-sm">Cancelar</button>
                        <button type="submit" disabled={!isBalanced} className="px-6 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary-hover shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed transform active:scale-95 transition-all">Salvar Lançamento</button>
                    </div>
                </div>
            </form>
        </div>
      </div>
    );
};

const ManagementTransfersView: React.FC<ManagementTransfersViewProps> = ({ 
  transfers = [], 
  onNavigateBack, 
  onSaveTransfers, 
  companies = [], 
  brands = [], 
  dreAccounts = [], 
  balanceSheetAccounts = [], 
  dreDepartmentOptions = [],
  tenantId 
}) => {
    const [editingTransaction, setEditingTransaction] = useState<EditingTransferTransaction | null>(null);
    const [isFilterVisible, setIsFilterVisible] = useState(true);
    const [filters, setFilters] = useState({ years: [] as number[], months: [] as string[], brandIds: [] as string[], companyIds: [] as string[], departments: [] as string[] });
    const [filteredTransfers, setFilteredTransfers] = useState<ManagementTransfer[]>(transfers);

    const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c.nickname || c.name])), [companies]);
    
    const { yearOptions, brandOptions, companyOptions, departmentOptions } = useMemo(() => {
        const years = [...new Set(transfers.map(e => e.year))].sort((a, b) => Number(b) - Number(a));
        const filteredCompanies = filters.brandIds.length > 0 ? companies.filter(c => filters.brandIds.includes(c.brandId)) : companies;
        return {
            yearOptions: years.map(y => ({ id: String(y), name: String(y) })),
            brandOptions: brands.map(b => ({id: b.id, name: b.name })),
            companyOptions: filteredCompanies.map(c => ({ id: c.id, name: c.nickname || c.name })),
            departmentOptions: dreDepartmentOptions.map(d => ({ id: d, name: d }))
        };
    }, [transfers, companies, brands, dreDepartmentOptions, filters.brandIds]);
    
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
        if (!isFilterActive) { setFilteredTransfers(transfers); return; }
        
        const results = transfers.filter(entry => {
            if (years.length && !years.includes(entry.year)) return false;
            if (months.length && !months.includes(entry.month)) return false;
            const brandId = companyToBrandMap.get(entry.companyId);
            if (brandIds.length && (!brandId || !brandIds.includes(brandId))) return false;
            if (companyIds.length && !companyIds.includes(entry.companyId)) return false;
            if (departments.length && !departments.includes(entry.department)) return false;
            return true;
        });
        setFilteredTransfers(results);
    };
    
    const handleClearFilters = () => {
        setFilters({ years: [], months: [], brandIds: [], companyIds: [], departments: [] });
        setFilteredTransfers(transfers);
    };

    useEffect(() => { 
        if (JSON.stringify(filteredTransfers) !== JSON.stringify(transfers)) {
            setFilteredTransfers(transfers); 
        }
    }, [transfers]);

    const groupedTransfers = useMemo(() => {
        const groups: Record<string, ManagementTransfer[]> = {};
        filteredTransfers.forEach(t => {
            if (!groups[t.transactionId]) groups[t.transactionId] = [];
            groups[t.transactionId].push(t);
        });
        return Object.values(groups).sort((a, b) => (b[0]?.createdAt || '').localeCompare(a[0]?.createdAt || ''));
    }, [filteredTransfers]);
    
    const handleAddNew = () => {
        setEditingTransaction({
            transactionId: `new_tx_${Date.now()}`, year: new Date().getFullYear(), month: CALENDAR_MONTHS[new Date().getMonth()], description: '', origins: [], destinations: [],
        });
    };

    const handleEdit = (transactionLines: ManagementTransfer[]) => {
        const firstLine = transactionLines[0];
        setEditingTransaction({
            transactionId: firstLine.transactionId, year: firstLine.year, month: firstLine.month, description: firstLine.description,
            origins: transactionLines.filter(l => l.type === 'origin'),
            destinations: transactionLines.filter(l => l.type === 'destination'),
        });
    };

    const handleSave = async (transaction: EditingTransferTransaction) => {
        // Ensure we have a valid UUID for the transaction if it's new
        const isNewTx = transaction.transactionId.startsWith('new_');
        const finalTransactionId = isNewTx ? generateUUID() : transaction.transactionId;
        const now = new Date().toISOString();

        const flatLines: ManagementTransfer[] = [...transaction.origins, ...transaction.destinations].map(line => {
            // Ensure each line has a valid UUID (replace temp React key 'new_line_...')
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

        // Filter out existing lines for this transaction to replace them completely
        const otherTransfers = transfers.filter(t => t.transactionId !== transaction.transactionId);
        
        await onSaveTransfers([...otherTransfers, ...flatLines]);
        setEditingTransaction(null);
    };

    const handleDelete = (transactionId: string) => {
        if (confirm('Tem certeza que deseja excluir este lançamento? Todas as suas linhas serão removidas.')) {
            onSaveTransfers(transfers.filter(t => t.transactionId !== transactionId));
        }
    };

    return (
        <main className="flex-grow p-6 lg:p-8 flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-app)' }}>
          <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex-grow flex flex-col overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                      <div><h1 className="text-xl font-bold text-slate-800">Gerenciar Transferências Gerenciais</h1><p className="text-sm text-slate-500 mt-1">Adicione, edite ou remova lançamentos de múltiplas partidas.</p></div>
                       <div className="flex items-center gap-4">
                        <button onClick={() => setIsFilterVisible(!isFilterVisible)} className="flex items-center text-sm font-semibold text-primary hover:text-primary-hover">
                           {isFilterVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
                           <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-1 transition-transform ${isFilterVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onClick={handleAddNew} className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary-hover transition-all flex items-center shadow-md transform active:scale-95">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg> Nova Transferência
                      </button>
                      </div>
                  </div>
                  {isFilterVisible && (
                        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                                <MultiSelectDropdown label="Anos" options={yearOptions} selectedValues={filters.years.map(String)} onChange={(v) => handleFilterChange('years', v.map(Number))} />
                                <MultiSelectDropdown label="Meses" options={monthOptions} selectedValues={filters.months} onChange={(v) => handleFilterChange('months', v)} />
                                <MultiSelectDropdown label="Marcas" options={brandOptions} selectedValues={filters.brandIds} onChange={(v) => handleFilterChange('brandIds', v)} />
                                <MultiSelectDropdown label="Empresas" options={companyOptions} selectedValues={filters.companyIds} onChange={(v) => handleFilterChange('companyIds', v)} />
                                <MultiSelectDropdown label="Departamentos" options={departmentOptions} selectedValues={filters.departments} onChange={(v) => handleFilterChange('departments', v)} />
                                <div className="flex gap-2">
                                    <button onClick={handleApplyFilters} className="h-10 px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm">Aplicar</button>
                                    <button onClick={handleClearFilters} className="h-10 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Limpar</button>
                                </div>
                            </div>
                        </div>
                    )}
                  
                  <div className="overflow-auto flex-grow bg-white">
                      {groupedTransfers.length === 0 ? <p className="text-center p-12 text-slate-500 font-medium">Nenhum lançamento encontrado para os filtros selecionados.</p> :
                        <div className="divide-y divide-slate-100">
                          {groupedTransfers.map(transactionLines => {
                            const firstLine = transactionLines[0];
                            const origins = transactionLines.filter(l => l.type === 'origin');
                            const destinations = transactionLines.filter(l => l.type === 'destination');
                            const total = origins.reduce((sum, l) => sum + l.value, 0);

                            return (
                              <div key={firstLine.transactionId} className="p-6 hover:bg-slate-50 transition-colors group">
                                <div className="flex justify-between items-start mb-4">
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
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm bg-slate-50/60 p-4 rounded-lg border border-slate-100">
                                  <div>
                                    <strong className="text-xs font-bold text-red-700 mb-2 block border-b border-red-100 pb-1">Origens (Débitos)</strong>
                                    <div className="space-y-2">
                                        {origins.map(l => (
                                            <div key={l.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 last:border-0">
                                                <span className="text-slate-600 truncate mr-2 font-medium">
                                                    {companyMap.get(l.companyId)} / {l.targetReport === 'CASH_FLOW' ? 'Fluxo' : l.department} / {l.dreAccountName}
                                                </span>
                                                <span className="font-mono font-bold text-red-600 whitespace-nowrap">{l.value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                                            </div>
                                        ))}
                                    </div>
                                  </div>
                                  <div>
                                    <strong className="text-xs font-bold text-emerald-700 mb-2 block border-b border-emerald-100 pb-1">Destinos (Créditos)</strong>
                                    <div className="space-y-2">
                                        {destinations.map(l => (
                                            <div key={l.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 last:border-0">
                                                <span className="text-slate-600 truncate mr-2 font-medium">
                                                    {companyMap.get(l.companyId)} / {l.targetReport === 'CASH_FLOW' ? 'Fluxo' : l.department} / {l.dreAccountName}
                                                </span>
                                                <span className="font-mono font-bold text-emerald-600 whitespace-nowrap">{l.value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                                            </div>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      }
                  </div>
              </div>
          </div>
          {editingTransaction && <TransferEditModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleSave} companies={companies} dreAccounts={dreAccounts} balanceSheetAccounts={balanceSheetAccounts} dreDepartmentOptions={dreDepartmentOptions} />}
        </main>
    );
};

export default ManagementTransfersView;
