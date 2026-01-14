import React, { useState, useEffect, useMemo } from 'react';
import { AdjustmentEntry, Company, DreAccount, Brand, BalanceSheetAccount } from '../types';
import { CALENDAR_MONTHS } from '../constants';
import StyledSelect from './StyledSelect';
import SearchableSelect from './SearchableSelect';
import { generateUUID } from '../utils/helpers';

type SortableKeys = 'date' | 'company' | 'department' | 'description' | 'provisioned' | 'reversed' | 'balance';

interface SortableHeaderProps {
  label: string;
  sortKey: SortableKeys;
  sortConfig: { key: SortableKeys; direction: 'asc' | 'desc' } | null;
  onSort: (key: SortableKeys) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ label, sortKey, sortConfig, onSort, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    const directionIcon = isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '';
    return (
        <th 
          onClick={() => onSort(sortKey)} 
          className={`py-4 px-6 text-left text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap border-b-2 border-slate-300 ${className}`}
        >
            {label} <span className="text-slate-400 ml-1">{directionIcon}</span>
        </th>
    );
};


interface AjustesContabeisViewProps {
  entries?: AdjustmentEntry[];
  adjustments?: AdjustmentEntry[];
  onNavigateBack?: () => void;
  onSaveEntries?: (entries: AdjustmentEntry[]) => Promise<void>;
  companies?: Company[];
  brands?: Brand[];
  dreAccounts?: DreAccount[];
  balanceSheetAccounts?: BalanceSheetAccount[];
  dreDepartmentOptions?: string[];
  tenantId?: string | null;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CurrencyInput: React.FC<{ value: number; onChange: (val: number) => void; className?: string; placeholder?: string }> = ({ value, onChange, className, placeholder }) => {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value !== undefined && value !== null) {
            setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(value));
        } else {
            setDisplayValue('');
        }
    }, [value]);

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
    
    // Performance Optimization: Update display on change locally but proper formatting
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

const AjustesContabeisView: React.FC<AjustesContabeisViewProps> = ({ 
  entries = [], 
  adjustments = [],
  onNavigateBack, 
  onSaveEntries, 
  companies = [], 
  brands = [], 
  dreAccounts = [], 
  balanceSheetAccounts = [], 
  dreDepartmentOptions = [], 
  tenantId 
}) => {
  const effectiveEntries = entries.length > 0 ? entries : adjustments;
    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
    const [editingProvision, setEditingProvision] = useState<AdjustmentEntry | null>(null);
    const [targetProvisionForReversal, setTargetProvisionForReversal] = useState<AdjustmentEntry | null>(null);
    const [isFilterVisible, setIsFilterVisible] = useState(true);
    const [filters, setFilters] = useState({ brandId: 'all', companyId: 'all', department: 'all', showOnlyWithBalance: true });
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
    
    // Checkbox for Reversal in Edit Modal (mapped to requiresReversal)
    const [isReversalChecked, setIsReversalChecked] = useState(false);

    const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c.nickname || c.name])), [companies]);
    const companyToBrandMap = useMemo(() => new Map(companies.map(c => [c.id, c.brandId])), [companies]);
    
    // Prepare options for SearchableSelect
    const dreAccountOptions = useMemo(() => dreAccounts.map(opt => ({ id: opt.name, name: opt.name })), [dreAccounts]);
    const balanceSheetAccountOptions = useMemo(() => balanceSheetAccounts.map(opt => ({ id: opt.name, name: opt.name })), [balanceSheetAccounts]);

    const { provisions, reversalsByProvisionId } = useMemo(() => {
        const provisions: AdjustmentEntry[] = [];
        const reversalsByProvisionId = new Map<string, AdjustmentEntry[]>();
        for (const entry of entries) {
            // Fix: Property access on AdjustmentEntry
            if (entry.provisionId) {
                if (!reversalsByProvisionId.has(entry.provisionId)) reversalsByProvisionId.set(entry.provisionId, []);
                reversalsByProvisionId.get(entry.provisionId)!.push(entry);
            } else {
                provisions.push(entry);
            }
        }
        return { provisions, reversalsByProvisionId };
    }, [entries]);

    const { brandOptions, companyOptions } = useMemo(() => {
        const brandOpts = brands.map(b => ({ id: b.id, name: b.name }));
        const filteredCompanies = filters.brandId === 'all' ? companies : companies.filter(c => c.brandId === filters.brandId);
        const companyOpts = filteredCompanies.map(c => ({ id: c.id, name: c.nickname || c.name }));
        return { brandOptions: brandOpts, companyOptions: companyOpts };
    }, [brands, companies, filters.brandId]);
    
    const filteredAndSortedProvisions = useMemo(() => {
        const provisionsWithBalance = provisions.map(p => {
            const revs = reversalsByProvisionId.get(p.id) || [];
            const totalReversed = revs.reduce((s, r) => s + r.value, 0);
            const balance = p.value + totalReversed;
            return { ...p, totalReversed, balance };
        });

        let filtered = provisionsWithBalance.filter(p => 
            (!filters.showOnlyWithBalance || Math.abs(p.balance) >= 0.01) &&
            (filters.department === 'all' || p.department === filters.department) &&
            (filters.companyId === 'all' || p.companyId === filters.companyId) &&
            (filters.brandId === 'all' || companyToBrandMap.get(p.companyId) === filters.brandId)
        );

        if (sortConfig) {
            filtered.sort((a, b) => {
                let aValue: any, bValue: any;
                switch (sortConfig.key) {
                    case 'date':
                        aValue = new Date(a.year, CALENDAR_MONTHS.indexOf(a.month)).getTime();
                        bValue = new Date(b.year, CALENDAR_MONTHS.indexOf(b.month)).getTime();
                        break;
                    case 'company': aValue = companyMap.get(a.companyId) || ''; bValue = companyMap.get(b.companyId) || ''; break;
                    case 'balance': aValue = a.balance; bValue = b.balance; break;
                    case 'provisioned': aValue = a.value; bValue = b.value; break;
                    case 'reversed': aValue = a.totalReversed; bValue = b.totalReversed; break;
                    default: aValue = a[sortConfig.key]; bValue = b[sortConfig.key];
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [provisions, reversalsByProvisionId, filters, sortConfig, companyToBrandMap, companyMap]);

    const handleSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };
    
    const handleFilterChange = (field: keyof typeof filters, value: string | boolean) => {
        setFilters(prev => ({...prev, [field]: value, ...(field === 'brandId' && { companyId: 'all' })}));
    };
    
    const handleAddNewProvision = () => { 
        // Fix: Add economicGroupId and createdAt
        setEditingProvision({ 
            id: `new_${Date.now()}`, 
            transactionId: `new_tx_${Date.now()}`, 
            economicGroupId: tenantId,
            year: new Date().getFullYear(), 
            month: CALENDAR_MONTHS[new Date().getMonth()], 
            description: '', 
            companyId: '', 
            department: '', 
            dreAccountName: '', 
            value: 0, 
            targetReport: 'DRE',
            requiresReversal: false,
            createdAt: new Date().toISOString()
        }); 
        setIsReversalChecked(false);
        setIsProvisionModalOpen(true); 
    };

    const handleEditProvision = (p: AdjustmentEntry) => { 
        setEditingProvision(p); 
        setIsReversalChecked(!!p.requiresReversal); 
        setIsProvisionModalOpen(true); 
    };
    const handleOpenReversalModal = (p: AdjustmentEntry) => { setTargetProvisionForReversal(p); setIsReversalModalOpen(true); };
    
    const handleSaveEntry = async (entry: AdjustmentEntry) => { 
        if (!entry.companyId || !entry.dreAccountName || (entry.targetReport === 'DRE' && !entry.department)) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        // Convert temp IDs to valid UUIDs
        const isNew = entry.id.startsWith('new_');
        const finalId = isNew ? generateUUID() : entry.id;
        const isNewTx = entry.transactionId.startsWith('new_');
        const finalTxId = isNewTx ? generateUUID() : entry.transactionId;

        const entryToSave = { 
            ...entry, 
            id: finalId,
            transactionId: finalTxId,
            requiresReversal: isReversalChecked,
            createdAt: entry.createdAt || new Date().toISOString() // Ensure createdAt exists
        };

        const updated = [...entries.filter(e => e.id !== entry.id), entryToSave]; 
        await onSaveEntries(updated); 
        setIsProvisionModalOpen(false); 
        setIsReversalModalOpen(false); 
        setEditingProvision(null); 
        setTargetProvisionForReversal(null); 
    };
    
    const handleDeleteProvision = async (id: string) => { 
        // Fix: Property access on AdjustmentEntry
        if (confirm('Excluir este lançamento e TODOS os seus estornos associados?')) await onSaveEntries(entries.filter(e => e.id !== id && e.provisionId !== id)); 
    };

    return (
        <main className="flex-grow p-6 lg:p-8 flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-app)' }}>
            <div className="max-w-full mx-auto w-full flex flex-col h-full">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex-grow flex flex-col overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                        <div> <h1 className="text-xl font-bold text-slate-800">Gerenciar Ajustes Contábeis</h1> <p className="text-sm text-slate-500 mt-1">Gerencie provisões, estornos e reclassificações.</p> </div>
                        <button onClick={handleAddNewProvision} className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary-hover transition-all flex items-center shadow-md transform active:scale-95"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg> Novo Ajuste Contábil </button>
                    </div>
                    <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                        <button onClick={() => setIsFilterVisible(!isFilterVisible)} className="flex items-center text-sm font-semibold text-primary hover:text-primary-hover mb-3"> {isFilterVisible ? 'Ocultar filtros' : 'Mostrar filtros'} <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-1 transition-transform ${isFilterVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> </button>
                        {isFilterVisible && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Marca</label><StyledSelect containerClassName="w-full" value={filters.brandId} onChange={e => handleFilterChange('brandId', e.target.value)}><option value="all">Todas as Marcas</option>{brandOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</StyledSelect></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Empresa</label><StyledSelect containerClassName="w-full" value={filters.companyId} onChange={e => handleFilterChange('companyId', e.target.value)}><option value="all">Todas as Empresas</option>{companyOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</StyledSelect></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Departamento</label><StyledSelect containerClassName="w-full" value={filters.department} onChange={e => handleFilterChange('department', e.target.value)}><option value="all">Todos os Departamentos</option>{dreDepartmentOptions.map(d => <option key={d} value={d}>{d}</option>)}</StyledSelect></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Status</label><StyledSelect containerClassName="w-full" value={String(filters.showOnlyWithBalance)} onChange={e => handleFilterChange('showOnlyWithBalance', e.target.value === 'true')}><option value="true">Apenas com Saldo</option><option value="false">Mostrar Todos</option></StyledSelect></div>
                            </div>
                        )}
                    </div>
                    
                    <div className="overflow-auto flex-grow bg-white">
                        <table className="min-w-full text-sm divide-y divide-slate-100">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-700 border-b-2 border-slate-300">Status</th>
                                    <SortableHeader label="Data" sortKey="date" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortableHeader label="Empresa" sortKey="company" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortableHeader label="Destino" sortKey="department" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortableHeader label="Histórico" sortKey="description" sortConfig={sortConfig} onSort={handleSort} />
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-700 border-b-2 border-slate-300">Conta</th>
                                    <SortableHeader label="Provisionado" sortKey="provisioned" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                                    <SortableHeader label="Estornado" sortKey="reversed" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                                    <SortableHeader label="Saldo" sortKey="balance" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-700 border-b-2 border-slate-300">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredAndSortedProvisions.length > 0 ? filteredAndSortedProvisions.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${Math.abs(p.balance) < 0.01 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {Math.abs(p.balance) < 0.01 ? 'Baixado' : 'Aberto'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">{p.month.substring(0, 3)}/{p.year}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">{companyMap.get(p.companyId)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            {p.targetReport === 'CASH_FLOW' ? <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-bold">Fluxo</span> : p.department}
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 max-w-xs truncate font-medium" title={p.description}>{p.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs">{p.dreAccountName}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-800 font-medium">{formatCurrency(p.value)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-600">{formatCurrency(p.totalReversed)}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${p.balance > 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(p.balance)}</td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div className="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Fix: balance check for reversal modal */}
                                                {Math.abs(p.balance || 0) >= 0.01 && (
                                                    <button onClick={() => handleOpenReversalModal(p)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors" title="Realizar Baixa (Estorno)">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </button>
                                                )}
                                                <button onClick={() => handleEditProvision(p)} className="p-1.5 text-primary hover:bg-blue-50 rounded border border-blue-200 transition-colors" title="Editar">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={() => handleDeleteProvision(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded border border-red-200 transition-colors" title="Excluir">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={10} className="text-center py-12 text-slate-500 font-medium">
                                            Nenhum ajuste contábil encontrado para os filtros selecionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isProvisionModalOpen && editingProvision && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">Novo Ajuste Contábil</h3>
                            <button onClick={() => setIsProvisionModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-6 space-y-4 bg-slate-50/30 overflow-y-auto">
                            {/* Standardized Grid Layout */}
                            <div className="p-4 border rounded-lg bg-slate-50 grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Ano</label>
                                    <StyledSelect containerClassName="w-full mt-1" value={editingProvision.year} onChange={e => setEditingProvision({...editingProvision, year: parseInt(e.target.value)})}>
                                        {Array.from({length: 5}, (_, i) => new Date().getFullYear() + 1 - i).reverse().map(y => <option key={y} value={y}>{y}</option>)}
                                    </StyledSelect>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Mês</label>
                                    <StyledSelect containerClassName="w-full mt-1" value={editingProvision.month} onChange={e => setEditingProvision({...editingProvision, month: e.target.value})}>
                                        {CALENDAR_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </StyledSelect>
                                </div>
                                <div className="md:col-span-7">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Histórico</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary mt-1" value={editingProvision.description} onChange={e => setEditingProvision({...editingProvision, description: e.target.value})} />
                                </div>
                            </div>

                            <div className="p-4 border rounded-lg space-y-3 bg-slate-50/50 grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Destino</label>
                                    <StyledSelect 
                                        containerClassName="w-full" 
                                        value={editingProvision.targetReport || 'DRE'} 
                                        onChange={e => {
                                            const val = e.target.value as 'DRE' | 'CASH_FLOW';
                                            setEditingProvision({
                                                ...editingProvision, 
                                                targetReport: val,
                                                department: val === 'CASH_FLOW' ? 'N/A' : '',
                                                dreAccountName: '' // Reset account
                                            });
                                        }}
                                    >
                                        <option value="DRE">DRE</option>
                                        <option value="CASH_FLOW">Fluxo</option>
                                    </StyledSelect>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Empresa</label>
                                    <StyledSelect containerClassName="w-full" value={editingProvision.companyId} onChange={e => setEditingProvision({...editingProvision, companyId: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {companyOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </StyledSelect>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Departamento</label>
                                    <StyledSelect 
                                        containerClassName="w-full" 
                                        value={editingProvision.department} 
                                        onChange={e => setEditingProvision({...editingProvision, department: e.target.value})}
                                        disabled={editingProvision.targetReport === 'CASH_FLOW'}
                                        className={editingProvision.targetReport === 'CASH_FLOW' ? 'bg-slate-100 text-slate-400' : ''}
                                    >
                                        <option value="">{editingProvision.targetReport === 'CASH_FLOW' ? 'N/A' : 'Selecione...'}</option>
                                        {dreDepartmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                                    </StyledSelect>
                                </div>
                                <div className="md:col-span-4">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Conta {editingProvision.targetReport === 'CASH_FLOW' ? 'Patrimonial' : 'DRE'}</label>
                                    <SearchableSelect 
                                        value={editingProvision.dreAccountName} 
                                        options={editingProvision.targetReport === 'CASH_FLOW' 
                                            ? balanceSheetAccountOptions.map(a => ({ id: a.name, name: a.name })) 
                                            : dreAccountOptions.map(a => ({ id: a.name, name: a.name }))
                                        } 
                                        onChange={(val) => setEditingProvision({...editingProvision, dreAccountName: val})}
                                        placeholder="Selecione..."
                                        className="w-full"
                                    />
                                </div>
                                <div className="md:col-span-2 md:col-start-11">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Valor</label>
                                    <CurrencyInput 
                                        value={editingProvision.value} 
                                        onChange={val => setEditingProvision({...editingProvision, value: val})} 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                            </div>
                            
                            {/* Checkbox Reverter */}
                            <div className="flex items-center space-x-2 mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                                <input 
                                    type="checkbox" 
                                    id="reversalCheck"
                                    checked={isReversalChecked} 
                                    onChange={(e) => setIsReversalChecked(e.target.checked)} 
                                    className="custom-checkbox w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                />
                                <div>
                                    <label htmlFor="reversalCheck" className="text-sm font-bold text-slate-700 cursor-pointer">Reverter Provisão?</label>
                                    <p className="text-xs text-slate-500">Se marcado, este ajuste ficará pendente de baixa futura.</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button onClick={() => setIsProvisionModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={() => handleSaveEntry(editingProvision)} className="px-6 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary-hover shadow-md transform active:scale-95 transition-all">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isReversalModalOpen && targetProvisionForReversal && (
                <ReversalModal 
                    provision={targetProvisionForReversal} 
                    onClose={() => setIsReversalModalOpen(false)} 
                    onSave={handleSaveEntry}
                    tenantId={tenantId}
                />
            )}
        </main>
    );
};

const ReversalModal: React.FC<{ provision: AdjustmentEntry, onClose: () => void, onSave: (entry: AdjustmentEntry) => void, tenantId: string }> = ({ provision, onClose, onSave, tenantId }) => {
    // Fix: State initialization with all required AdjustmentEntry properties
    const [reversal, setReversal] = useState<AdjustmentEntry>(() => ({
        id: generateUUID(),
        transactionId: generateUUID(),
        economicGroupId: tenantId,
        provisionId: provision.id,
        year: new Date().getFullYear(),
        month: CALENDAR_MONTHS[new Date().getMonth()],
        description: `Baixa: ${provision.description}`,
        companyId: provision.companyId,
        department: provision.department,
        dreAccountName: provision.dreAccountName,
        targetReport: provision.targetReport, // Maintain report type
        value: 0,
        createdAt: new Date().toISOString()
    }));

    const handleSave = () => {
        if (reversal.value === 0) return alert("Informe o valor da baixa.");
        onSave(reversal);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Realizar baixa (estorno)</h3>
                     <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4 bg-slate-50/30">
                    <p className="text-sm text-slate-600">
                        Esta ação criará um lançamento de ajuste reverso para "<strong>{provision.description}</strong>".
                    </p>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Valor da Baixa</label>
                        <CurrencyInput 
                            value={reversal.value}
                            onChange={(val) => setReversal(prev => ({...prev, value: val}))}
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            placeholder="R$ 0,00"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Data da Baixa</label>
                        <div className="grid grid-cols-2 gap-2">
                             <StyledSelect 
                                value={reversal.year} 
                                onChange={e => setReversal(prev => ({...prev, year: parseInt(e.target.value)}))}
                                className="py-2"
                                containerClassName="w-full"
                             >
                                {Array.from({length: 5}, (_, i) => new Date().getFullYear() + 1 - i).reverse().map(y => <option key={y} value={y}>{y}</option>)}
                             </StyledSelect>
                             <StyledSelect 
                                value={reversal.month} 
                                onChange={e => setReversal(prev => ({...prev, month: e.target.value}))}
                                className="py-2"
                                containerClassName="w-full"
                             >
                                {CALENDAR_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                             </StyledSelect>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-md transform active:scale-95 transition-all">Confirmar Baixa</button>
                </div>
            </div>
        </div>
    );
};

export default AjustesContabeisView;
