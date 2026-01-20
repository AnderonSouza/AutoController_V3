import React, { useState, useEffect } from 'react';
import { MonthlyBalanceEntry, Company } from '../types';
import { getSaldosMensais } from '../utils/db';
import StyledSelect from './StyledSelect';
import { CALENDAR_MONTHS } from '../constants';
import { useTenant } from '../context/TenantContext';

interface MonthlyBalancesViewProps {
  onNavigateBack?: () => void;
  companies?: Company[];
  tenantId?: string | null;
}

const formatCurrency = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const MonthlyBalancesView: React.FC<MonthlyBalancesViewProps> = ({ onNavigateBack, companies }) => {
    const { effectiveTenantId } = useTenant();
    
    // State for Data
    const [entries, setEntries] = useState<MonthlyBalanceEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(1);
    
    // State for Filters
    const currentYear = new Date().getFullYear();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState<number>(currentYear);
    const [filterMonth, setFilterMonth] = useState<string>(CALENDAR_MONTHS[0]);
    const [filterCompanyId, setFilterCompanyId] = useState<string>('');
    
    const PAGE_SIZE = 100;

    // Fetch Data Effect
    useEffect(() => {
        const fetchData = async () => {
            if (!effectiveTenantId) return;
            
            setIsLoading(true);
            try {
                // Fetch from saldos_mensais table
                const { data, total } = await getSaldosMensais(
                    filterYear, 
                    [filterMonth], 
                    filterCompanyId, 
                    page, 
                    PAGE_SIZE, 
                    searchTerm,
                    effectiveTenantId
                );
                
                if (page === 1) {
                    setEntries(data);
                } else {
                    setEntries(prev => [...prev, ...data]);
                }
                setTotalRows(total);
            } catch (error) {
                console.error("Failed to load monthly balances:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [page, searchTerm, filterYear, filterMonth, filterCompanyId, effectiveTenantId]);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [searchTerm, filterYear, filterMonth, filterCompanyId]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100 && !isLoading && entries.length < totalRows) {
            setPage(prev => prev + 1);
        }
    };

    const headers = [
        'Ano', 'Mês', 'Conta ID', 'Descrição da Conta', 'Valor', 'CNPJ Empresa'
    ];

    return (
        <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
            <div className="w-full flex flex-col h-full">
                <div className="flex flex-col overflow-hidden flex-grow p-6">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h1 className="text-2xl font-bold text-gray-800">Balancetes Mensais Importados</h1>
                        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            Exibindo {entries.length} de {totalRows.toLocaleString()} registros
                        </span>
                    </div>
                    
                    <div className="my-4 shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                             <StyledSelect 
                                value={filterYear} 
                                onChange={(e) => setFilterYear(Number(e.target.value))}
                                className="h-10 pl-3 border-slate-300"
                                containerClassName="w-full"
                             >
                                {Array.from({length: 5}, (_, i) => currentYear - i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                             </StyledSelect>
                        </div>
                        <div>
                             <StyledSelect 
                                value={filterMonth} 
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="h-10 pl-3 border-slate-300"
                                containerClassName="w-full"
                             >
                                {CALENDAR_MONTHS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                             </StyledSelect>
                        </div>
                        <div>
                             <StyledSelect 
                                value={filterCompanyId} 
                                onChange={(e) => setFilterCompanyId(e.target.value)}
                                className="h-10 pl-3 border-slate-300"
                                containerClassName="w-full"
                             >
                                <option value="">Todas as Empresas</option>
                                {(companies || []).map(c => (
                                    <option key={c.id} value={c.id}>{c.nickname || c.name}</option>
                                ))}
                             </StyledSelect>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar conta..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full h-10 pl-3 pr-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-auto border rounded-lg flex-grow relative" onScroll={handleScroll}>
                        <table className="min-w-full sticky-header-table">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {headers.map(header => (
                                        <th key={header} className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {entries.length > 0 ? (
                                    entries.map((entry, index) => (
                                        <tr key={entry.id || index} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-2 px-4 text-sm text-gray-600 whitespace-nowrap">{entry.ano}</td>
                                            <td className="py-2 px-4 text-sm text-gray-600 whitespace-nowrap">{entry.mes}</td>
                                            <td className="py-2 px-4 text-sm text-gray-800 font-mono font-medium whitespace-nowrap bg-slate-50/50">{entry.conta_id}</td>
                                            <td className="py-2 px-4 text-sm text-gray-800 whitespace-nowrap" title={entry.conta_descricao}>{entry.conta_descricao}</td>
                                            <td className={`py-2 px-4 text-sm font-semibold text-right whitespace-nowrap ${entry.valor < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(entry.valor)}</td>
                                            <td className="py-2 px-4 text-sm text-gray-500 font-mono whitespace-nowrap">{entry.empresa_cnpj || '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    !isLoading && (
                                        <tr>
                                            <td colSpan={headers.length} className="text-center py-12 text-gray-500">
                                                {entries.length === 0 ? `Nenhum resultado encontrado.` : ''}
                                            </td>
                                        </tr>
                                    )
                                )}
                                {isLoading && (
                                    <tr>
                                        <td colSpan={headers.length} className="text-center py-4 text-xs text-slate-500 bg-slate-50 font-medium animate-pulse">
                                            Carregando dados...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default MonthlyBalancesView;
