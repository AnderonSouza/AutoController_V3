import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AccountCostCenterMapping, CostCenter, DreAccount, FinancialAccount } from '../types';
import SearchableSelect from './SearchableSelect';
import { generateUUID } from '../utils/helpers';

interface AccountCostCenterMappingViewProps {
  mappings: AccountCostCenterMapping[];
  onNavigateBack: () => void;
  onSaveMappings: (mappings: AccountCostCenterMapping[]) => Promise<void>;
  dreAccounts: DreAccount[];
  dreDepartmentOptions: string[]; // Deprecated visually, kept for type compatibility
  costCenters: CostCenter[]; // Deprecated visually
  chartOfAccounts: FinancialAccount[];
  tenantId: string; // Added tenantId prop
}

const AccountCostCenterMappingView: React.FC<AccountCostCenterMappingViewProps> = ({ 
    mappings, 
    onNavigateBack,
    onSaveMappings,
    dreAccounts,
    chartOfAccounts,
    tenantId
}) => {
    
    const [mappedAccounts, setMappedAccounts] = useState<AccountCostCenterMapping[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyUnmapped, setShowOnlyUnmapped] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // New States for Separation and Infinite Scroll
    const [activeTab, setActiveTab] = useState<'RESULT' | 'BALANCE'| 'ALL'>('RESULT');
    const [visibleCount, setVisibleCount] = useState(100);
    const BATCH_SIZE = 100;
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 1. Get all analytical accounts from Chart of Accounts
        const analyticalAccounts = chartOfAccounts.filter(acc => {
             const type = (acc.accountType || '').toLowerCase();
             return type.startsWith('a') || type.includes('analitica') || type.includes('analítica');
        });

        // 2. Create a map of existing mappings for quick lookup
        const existingMap = new Map<string, AccountCostCenterMapping>();
        mappings.forEach(m => {
            if (m.idconta) {
                existingMap.set(m.idconta, m);
            }
        });

        // 3. Merge Chart of Accounts with Existing Mappings
        const mergedData: AccountCostCenterMapping[] = analyticalAccounts.map(acc => {
            const existing = existingMap.get(acc.id);
            // Extract account code for filtering (first digit determines DRE vs Balance)
            const accountCode = acc.reducedCode || acc.name?.match(/^(\d+)/)?.[1] || '';
            // Fix: include economicGroupId
            return {
                id: existing?.id || `new_${generateUUID()}`, 
                idconta: acc.id,
                conta: acc.name,
                codigoContabil: accountCode,
                contasintetica: existing?.contasintetica || '',
                dreAccountId: existing?.dreAccountId, 
                economicGroupId: tenantId,
                isNew: !existing
            };
        });

        // Also add any mappings that might exist but aren't in the chart of accounts (orphan mappings)
        const chartIds = new Set(analyticalAccounts.map(a => a.id));
        const orphanMappings = mappings.filter(m => !chartIds.has(m.idconta)).reduce((acc, curr) => {
            if (!acc.find(x => x.idconta === curr.idconta)) {
                // Fix: include economicGroupId
                acc.push({
                    id: curr.id,
                    idconta: curr.idconta,
                    conta: curr.conta,
                    contasintetica: curr.contasintetica,
                    dreAccountId: curr.dreAccountId,
                    economicGroupId: tenantId
                });
            }
            return acc;
        }, [] as AccountCostCenterMapping[]);

        setMappedAccounts([...mergedData, ...orphanMappings].sort((a, b) => (a.idconta || '').localeCompare(b.idconta || '')));

    }, [chartOfAccounts, mappings, tenantId]);
    
    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(BATCH_SIZE);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [searchTerm, showOnlyUnmapped, activeTab]);

    const handleMappingChange = (idconta: string, dreAccountName: string) => {
        const dreAccount = dreAccounts.find(d => d.name === dreAccountName);
        const dreAccountId = dreAccount?.id;

        setMappedAccounts(prev => prev.map(m => 
            m.idconta === idconta ? { ...m, contasintetica: dreAccountName, dreAccountId: dreAccountId } : m
        ));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Fix: ensure economicGroupId is present
            const toSave = mappedAccounts.filter(m => m.idconta).map(m => ({
                id: m.id, 
                idconta: m.idconta,
                conta: m.conta,
                contasintetica: m.contasintetica,
                dreAccountId: m.dreAccountId,
                economicGroupId: tenantId
            }));
            
            await onSaveMappings(toSave);
            alert('Mapeamento Global salvo com sucesso!');
        } catch (error) {
            alert('Erro ao salvar os mapeamentos.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredMappings = useMemo(() => {
        return mappedAccounts.filter(m => {
            // Filter by Type (Balance vs Result) based on first digit of account code
            // 1=Assets, 2=Liabilities (Balance Sheet). 3+ = Result (DRE).
            const accountCode = (m as any).codigoContabil || m.conta || '';
            const firstDigit = accountCode.charAt(0);
            const isBalanceSheet = firstDigit === '1' || firstDigit === '2';
            
            if (activeTab === 'BALANCE' && !isBalanceSheet) return false;
            if (activeTab === 'RESULT' && isBalanceSheet) return false;

            if (showOnlyUnmapped && m.contasintetica) {
                return false;
            }
            if (searchTerm.trim()) {
                const lowercasedFilter = searchTerm.toLowerCase().trim();
                return (
                    m.idconta?.toLowerCase().includes(lowercasedFilter) ||
                    m.conta?.toLowerCase().includes(lowercasedFilter) ||
                    m.contasintetica?.toLowerCase().includes(lowercasedFilter)
                );
            }
            return true;
        });
    }, [mappedAccounts, searchTerm, showOnlyUnmapped, activeTab]);
    
    // Calculate total pending strictly for the current context (Tab)
    const pendingCount = useMemo(() => {
        return mappedAccounts.filter(m => {
            const accountCode = (m as any).codigoContabil || m.conta || '';
            const firstDigit = accountCode.charAt(0);
            const isBalanceSheet = firstDigit === '1' || firstDigit === '2';
            const belongsToTab = activeTab === 'BALANCE' ? isBalanceSheet : !isBalanceSheet;
            return belongsToTab && !m.contasintetica;
        }).length;
    }, [mappedAccounts, activeTab]);

    const displayedMappings = filteredMappings.slice(0, visibleCount);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            if (visibleCount < filteredMappings.length) {
                setVisibleCount(prev => Math.min(prev + BATCH_SIZE, filteredMappings.length));
            }
        }
    };

    const dreAccountOptions = useMemo(() => {
        const opts = dreAccounts.map(opt => ({ id: opt.name, name: opt.name }));
        opts.unshift({ id: '', name: '-- Não Mapeado (Ignorar) --' });
        return opts;
    }, [dreAccounts]);

    return (
        <main className="flex-grow p-6 lg:p-8 flex flex-col h-full overflow-hidden bg-slate-50">
            <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
                {/* Header Padronizado */}
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <button onClick={onNavigateBack} className="text-sm text-slate-600 hover:text-slate-900 font-semibold flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Voltar para Parâmetros de Apuração
                    </button>
                    <div className="flex justify-end">
                         <h1 className="text-xl font-bold text-slate-800">Mapeamento Contábil Global</h1>
                    </div>
                </div>
                
                <div className="bg-white rounded-custom shadow-md border border-gray-200 flex flex-col overflow-hidden flex-grow">
                    
                    {/* Alert Section - Standardized Size */}
                    {pendingCount > 0 && (
                        <div className="mx-6 mt-6 mb-2 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg flex flex-row items-center justify-between shadow-sm shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-orange-800 font-bold text-sm">Atenção Necessária</p>
                                    <p className="text-orange-700 text-sm mt-0.5">
                                        Existem <strong>{pendingCount}</strong> contas de {activeTab === 'RESULT' ? 'Resultado' : 'Balanço'} sem vínculo. 
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowOnlyUnmapped(prev => !prev)}
                                className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all shadow-sm ${showOnlyUnmapped ? 'bg-orange-200 text-orange-900 border-orange-300' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'}`}
                            >
                                {showOnlyUnmapped ? 'Mostrar Todas' : 'Filtrar Pendentes'}
                            </button>
                        </div>
                    )}

                    {/* Controls Bar - Standardized Spacing */}
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white shrink-0">
                        {/* Tabs as Segmented Control */}
                        <div className="flex bg-slate-100 p-1.5 rounded-lg w-full md:w-auto">
                            <button
                                onClick={() => setActiveTab('RESULT')}
                                className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-md transition-all ${
                                    activeTab === 'RESULT' 
                                    ? 'bg-white text-primary shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                DRE (Resultado)
                            </button>
                            <button
                                onClick={() => setActiveTab('BALANCE')}
                                className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-md transition-all ${
                                    activeTab === 'BALANCE' 
                                    ? 'bg-white text-primary shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Balanço (Patrimonial)
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-grow md:w-80">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar conta..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-shadow"
                                />
                            </div>
                            <span className="text-xs text-slate-500 font-medium whitespace-nowrap bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                {displayedMappings.length} / {filteredMappings.length}
                            </span>
                        </div>
                    </div>
                    
                    <div 
                        className="overflow-auto flex-grow bg-white relative" 
                        onScroll={handleScroll}
                        ref={scrollContainerRef}
                    >
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-40 border-b border-slate-200">Código Contábil</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Conta Contábil</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-1/3 border-b border-slate-200">Destino (Gerencial)</th>
                                    <th className="py-4 px-6 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-24 border-b border-slate-200">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {displayedMappings.length > 0 ? (
                                    displayedMappings.map((mapping) => {
                                        const isUnmapped = !mapping.contasintetica;
                                        return (
                                            <tr key={mapping.idconta} className={`hover:bg-slate-50 transition-colors ${isUnmapped ? 'bg-orange-50/30' : ''}`}>
                                                <td className="py-3 px-6 text-xs font-mono text-slate-600 whitespace-nowrap font-bold">
                                                    {(mapping as any).codigoContabil || '--'}
                                                </td>
                                                <td className="py-3 px-6 text-sm text-slate-800 font-medium">
                                                    {mapping.conta}
                                                </td>
                                                <td className="py-3 px-6">
                                                    <SearchableSelect
                                                      value={mapping.contasintetica || ''}
                                                      options={dreAccountOptions}
                                                      onChange={(val) => handleMappingChange(mapping.idconta, val)}
                                                      placeholder="-- Não Mapeado --"
                                                      className="w-full text-sm"
                                                    />
                                                </td>
                                                <td className="py-3 px-6 text-center align-middle">
                                                    {isUnmapped ? (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600" title="Pendente">
                                                            <span className="font-bold text-sm">!</span>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600" title="OK">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-16 text-slate-400 text-sm">
                                            {mappings.length > 0 ? `Nenhuma conta encontrada.` : 'Carregando...'}
                                        </td>
                                    </tr>
                                )}
                                {visibleCount < filteredMappings.length && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-4 text-xs text-slate-400 bg-slate-50 italic">
                                            Carregando mais...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end items-center shrink-0">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-8 py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-hover disabled:bg-slate-300 transition-all duration-200 shadow-md transform active:scale-95 flex items-center text-sm"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Mapeamento'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default AccountCostCenterMappingView;
