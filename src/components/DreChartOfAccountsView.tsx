import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DreAccount, FinancialAccount, AccountCostCenterMapping, NaturezaConta } from '../types';
import StyledSelect from './StyledSelect';
import SearchableSelect from './SearchableSelect';
import FileImportModal, { ImportFieldDefinition } from './FileImportModal';
import { generateUUID } from '../utils/helpers';
import { getCadastro, saveCadastroTenant } from '../utils/db';

const NATUREZAS_CONTA: NaturezaConta[] = ['Receita', 'Despesa', 'Custo', 'Outros'];

interface DreChartOfAccountsViewProps {
  accounts: DreAccount[];
  accountingAccounts: FinancialAccount[]; 
  currentMappings: AccountCostCenterMapping[]; 
  onNavigateBack: () => void;
  onSave: (accounts: DreAccount[]) => Promise<void>;
  onSaveMappings: (newMappings: AccountCostCenterMapping[]) => Promise<void>;
  onDeleteMappings: (dreAccountName: string) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>; 
  onUnmapAccounts: (idsToUnmap: string[]) => Promise<void>;
  onRename: (oldName: string, newName: string) => Promise<void>;
  onUploadClick: () => void; 
  autoOpenImport?: boolean; 
  tenantId: string; // Added tenantId prop
}

const DeleteConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
    isLoading: boolean;
}> = ({ isOpen, onClose, onConfirm, itemName, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 transform transition-all scale-100">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Excluir Conta Gerencial?
                    </h3>
                    <div className="text-sm text-slate-600 mb-6">
                        <p className="mb-2">Você está prestes a excluir a conta <strong>{itemName}</strong>.</p>
                        <p className="text-slate-500">Esta ação removerá a conta e todos os seus vínculos contábeis permanentemente.</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirm} 
                        disabled={isLoading}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 shadow-lg shadow-red-200 transition-all flex items-center disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Excluindo...
                            </>
                        ) : (
                            'Sim, Excluir'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal para Seleção Múltipla de Contas Contábeis (QLIK STYLE)
const MappingModal: React.FC<{
    dreAccount: DreAccount;
    allAccountingAccounts: FinancialAccount[];
    initialSelectedIds: string[];
    onClose: () => void;
    onSave: (selectedIds: string[]) => void;
}> = ({ dreAccount, allAccountingAccounts, initialSelectedIds, onClose, onSave }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
    const [viewMode, setViewMode] = useState<'all' | 'selected'>('all'); 
    const [visibleCount, setVisibleCount] = useState(100);
    const BATCH_SIZE = 100;

    const filteredAccounts = useMemo(() => {
        let result = allAccountingAccounts;
        if (viewMode === 'selected') {
            result = result.filter(acc => selectedIds.has(acc.id));
        }
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(acc => 
                acc.id.toLowerCase().includes(lower) || 
                acc.name.toLowerCase().includes(lower) ||
                (acc.reducedCode && acc.reducedCode.toLowerCase().includes(lower))
            );
        }
        return result;
    }, [allAccountingAccounts, searchTerm, viewMode, selectedIds]);

    useEffect(() => { setVisibleCount(BATCH_SIZE); }, [searchTerm, viewMode]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            if (visibleCount < filteredAccounts.length) {
                setVisibleCount(prev => Math.min(prev + BATCH_SIZE, filteredAccounts.length));
            }
        }
    };

    const displayedAccounts = filteredAccounts.slice(0, visibleCount);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAllFiltered = () => {
        const newSet = new Set(selectedIds);
        filteredAccounts.forEach(acc => newSet.add(acc.id));
        setSelectedIds(newSet);
    };

    const handleDeselectAllFiltered = () => {
        const newSet = new Set(selectedIds);
        filteredAccounts.forEach(acc => newSet.delete(acc.id));
        setSelectedIds(newSet);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col h-[85vh] border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Vincular Contas Contábeis</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Conta Gerencial: <span className="font-semibold text-primary">{dreAccount.name}</span></p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="bg-slate-50/50 border-b border-slate-100 shrink-0">
                    <div className="flex px-6 pt-4 gap-4 border-b border-slate-200">
                        <button onClick={() => setViewMode('all')} className={`pb-3 text-sm font-bold transition-colors border-b-2 ${viewMode === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Todas as Contas</button>
                        <button onClick={() => setViewMode('selected')} className={`pb-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${viewMode === 'selected' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            Vinculadas <span className={`px-2 py-0.5 rounded-full text-[10px] ${viewMode === 'selected' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>{selectedIds.size}</span>
                        </button>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                            <input type="text" placeholder={viewMode === 'all' ? "Buscar em todo o plano de contas..." : "Buscar nas contas vinculadas..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-shadow shadow-sm" />
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-slate-500 font-medium">Exibindo <strong>{filteredAccounts.length}</strong> {viewMode === 'selected' ? 'vinculadas' : 'contas'}.</div>
                            {filteredAccounts.length > 0 && (<div className="space-x-3"><button onClick={handleSelectAllFiltered} className="text-xs text-primary hover:underline font-bold uppercase tracking-wide">Marcar visíveis</button><span className="text-slate-300">|</span><button onClick={handleDeselectAllFiltered} className="text-xs text-slate-500 hover:text-slate-700 hover:underline font-medium uppercase tracking-wide">Desmarcar visíveis</button></div>)}
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 bg-white" onScroll={handleScroll}>
                    {displayedAccounts.length > 0 ? (
                        <div className="space-y-1 pb-4">
                            {displayedAccounts.map(acc => {
                                const isSelected = selectedIds.has(acc.id);
                                return (
                                    <label key={acc.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-blue-50 border-primary/30 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(acc.id)} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer" />
                                        <div className="ml-3 flex-grow">
                                            <div className="flex justify-between">
                                                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-slate-700 group-hover:text-slate-900'}`}>{acc.reducedCode || acc.id} - {acc.name}</span>
                                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ID: {acc.id.substring(0,6)}...</span>
                                            </div>
                                            <div className="flex gap-2 mt-0.5">
                                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{acc.accountType}</span>
                                                <span className={`text-[10px] uppercase tracking-wider font-bold ${acc.nature === 'C' ? 'text-green-600' : 'text-red-500'}`}>{acc.nature}</span>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                            {visibleCount < filteredAccounts.length && <p className="text-center text-xs text-slate-400 py-2 animate-pulse">Carregando mais...</p>}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[200px]">
                            <p>Nenhuma conta encontrada para a busca.</p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">Cancelar</button>
                    <button onClick={() => onSave(Array.from(selectedIds))} className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-all shadow-md transform active:scale-95">Confirmar Vínculo ({selectedIds.size})</button>
                </div>
            </div>
        </div>
    );
};

const DreChartOfAccountsView: React.FC<DreChartOfAccountsViewProps> = ({ accounts, accountingAccounts: propAccountingAccounts, currentMappings: propCurrentMappings, onNavigateBack, onSave, onSaveMappings, onDeleteMappings, onDeleteAccount, onUnmapAccounts, onRename, onUploadClick: legacyOnUploadClick, autoOpenImport, tenantId }) => {
    const [editableAccounts, setEditableAccounts] = useState<DreAccount[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [mappingModalOpen, setMappingModalOpen] = useState(false);
    const [targetAccountForMapping, setTargetAccountForMapping] = useState<DreAccount | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<DreAccount | null>(null);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    
    // Ref for scrolling
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setEditableAccounts(JSON.parse(JSON.stringify(accounts))); }, [accounts]);

    useEffect(() => {
        if (autoOpenImport) {
            setImportModalOpen(true);
        }
    }, [autoOpenImport]);

    const importFields: ImportFieldDefinition[] = [
        { key: 'dre_name', label: 'Conta Gerencial (DRE)', required: true, description: 'Nome da conta no DRE (Agrupador)' },
        { key: 'accounting_id', label: 'Conta ID (Contábil)', required: false, description: 'Código da conta contábil para vínculo (Opcional)' },
        { key: 'accounting_name', label: 'Conta Contábil (Nome)', required: false, description: 'Nome da conta contábil para vínculo (Opcional)' }
    ];

    const handleAddAccount = () => {
        setSearchTerm(''); // Clear search so the new item is visible
        const newId = `new_${Date.now()}`;
        // Fix: add economicGroupId
        const newAccount: DreAccount = {
            id: newId,
            name: 'Nova Conta',
            economicGroupId: tenantId
        };
        // Add to top of list
        setEditableAccounts(prev => [newAccount, ...prev]);
        setEditingAccountId(newId);
        setEditName(newAccount.name);
        
        // Scroll to top
        setTimeout(() => {
            if (listRef.current) {
                listRef.current.scrollTop = 0;
            }
        }, 50);
    };

    const handleImportData = async (data: any[]) => {
        setIsSaving(true);
        try {
            // REFRESH DATA FROM DB TO ENSURE WE HAVE LATEST ACCOUNTS
            const [freshAccountingAccounts, freshMappings] = await Promise.all([
                getCadastro('chart_of_accounts') as Promise<FinancialAccount[]>,
                getCadastro('account_cost_center_mapping') as Promise<AccountCostCenterMapping[]>
            ]);

            const codeToUuidMap = new Map<string, string>();
            const accountingIdToNameMap = new Map<string, string>();

            const normalizeCode = (code: string | undefined | null) => {
                if (!code) return '';
                return String(code).replace(/[^0-9]/g, '');
            };

            freshAccountingAccounts.forEach(acc => {
                const uuid = acc.id;
                codeToUuidMap.set(uuid, uuid); 
                
                // ADDED: Normalize ID itself (critical if ID is the code)
                const normalizedId = normalizeCode(uuid);
                if (normalizedId) {
                    codeToUuidMap.set(normalizedId, uuid);
                }

                if (acc.reducedCode) {
                    const cleanCode = normalizeCode(acc.reducedCode);
                    if (cleanCode) {
                        codeToUuidMap.set(cleanCode, uuid);
                        codeToUuidMap.set(String(acc.reducedCode).trim(), uuid);
                    }
                }
                
                if (acc.name) {
                    const match = acc.name.match(/^([\d.]+)/);
                    if (match) {
                        codeToUuidMap.set(normalizeCode(match[1]), uuid);
                    }
                }

                accountingIdToNameMap.set(uuid, acc.name);
            });

            const newMappingsMap = new Map<string, AccountCostCenterMapping>();
            const newAccountsMap = new Map<string, DreAccount>();
            const errors: string[] = [];
            
            data.forEach((row, index) => {
                if (row.dre_name) {
                    const dreName = String(row.dre_name).trim();
                    if (!dreName) return;

                    // 1. Prepare DRE Account (Deduped)
                    if (!newAccountsMap.has(dreName)) {
                        const existing = accounts.find(a => a.name === dreName);
                        if (existing) {
                            newAccountsMap.set(dreName, existing);
                        } else {
                            // Fix: include economicGroupId
                            newAccountsMap.set(dreName, { id: generateUUID(), name: dreName, economicGroupId: tenantId });
                        }
                    }
                    
                    const targetDreAccount = newAccountsMap.get(dreName);

                    // 2. Prepare Mapping
                    if (row.accounting_id && targetDreAccount) {
                        const rawCode = String(row.accounting_id).trim();
                        const normalizedInputCode = normalizeCode(rawCode);
                        
                        let accountingId = codeToUuidMap.get(rawCode) || codeToUuidMap.get(normalizedInputCode);

                        if (!accountingId) {
                             errors.push(`Linha ${index + 2}: Conta Contábil "${rawCode}" não encontrada no Plano de Contas.`);
                        } else {
                            let accountingName = row.accounting_name ? String(row.accounting_name).trim() : '';
                            if (!accountingName) {
                                accountingName = accountingIdToNameMap.get(accountingId) || 'Importado via Excel';
                            }
                            
                            const existingMapping = freshMappings.find(m => m.idconta === accountingId);

                            // Fix: include economicGroupId
                            newMappingsMap.set(accountingId, { 
                                id: existingMapping?.id || generateUUID(),
                                idconta: accountingId, 
                                conta: accountingName, 
                                contasintetica: dreName,
                                dreAccountId: targetDreAccount.id,
                                economicGroupId: tenantId
                            });
                        }
                    }
                }
            });

            // STEP 1: Save ALL unique DRE Accounts
            const uniqueNewAccounts = Array.from(newAccountsMap.values());
            if (uniqueNewAccounts.length > 0) {
                const combinedAccounts = [...editableAccounts];
                uniqueNewAccounts.forEach(newAcc => {
                    if (!combinedAccounts.find(a => a.id === newAcc.id)) {
                        combinedAccounts.push(newAcc);
                    }
                });
                await onSave(combinedAccounts);
                setEditableAccounts(combinedAccounts);
            }

            // STEP 2: Save Mappings
            const uniqueNewMappings = Array.from(newMappingsMap.values());
            if (uniqueNewMappings.length > 0) { 
                await onSaveMappings(uniqueNewMappings); 
            }

            let msg = `Importação concluída!\n- ${uniqueNewAccounts.length} contas DRE processadas.\n- ${uniqueNewMappings.length} vínculos contábeis criados/atualizados.`;
            if (errors.length > 0) {
                msg += `\n\nATENÇÃO: ${errors.length} vínculos falharam porque o ID da conta não foi encontrado (verifique se o Plano de Contas foi importado):\n` + errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...' : '');
            }
            alert(msg);

        } catch (error) {
            console.error("Erro na importação:", error);
            alert("Erro ao processar o arquivo. Verifique se as colunas estão mapeadas corretamente.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveAccount = (id: string) => {
        const account = editableAccounts.find(a => a.id === id);
        if (!account) return;
        setAccountToDelete(account);
    };

    const confirmDeleteAccount = async () => {
        if (!accountToDelete) return;
        setIsSaving(true);
        try {
            await onDeleteMappings(accountToDelete.name);
            await onDeleteAccount(accountToDelete.id);
            
            const updatedList = editableAccounts.filter(a => a.id !== accountToDelete.id);
            setEditableAccounts(updatedList);
            await onSave(updatedList); 

            setAccountToDelete(null);
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir conta.');
        } finally {
            setIsSaving(false);
        }
    };

    const openMappingModal = (account: DreAccount) => { setTargetAccountForMapping(account); setMappingModalOpen(true); };
    
    const handleSaveMappings = async (selectedAccountingIds: string[]) => {
        if (!targetAccountForMapping) return;
        const accountName = targetAccountForMapping.name;
        
        const newMappingsForAccount: AccountCostCenterMapping[] = selectedAccountingIds.map(id => {
            const acc = propAccountingAccounts.find(a => a.id === id);
            const existing = propCurrentMappings.find(m => m.idconta === id);
            
            // Fix: include economicGroupId
            return { 
                id: existing?.id || generateUUID(), 
                idconta: id, 
                conta: acc?.name || 'Desconhecida', 
                contasintetica: accountName,
                dreAccountId: targetAccountForMapping.id,
                economicGroupId: tenantId
            };
        });
        
        const currentMappedIds = propCurrentMappings.filter(m => m.contasintetica?.trim() === accountName.trim()).map(m => m.idconta);
        const idsToUnmap = currentMappedIds.filter(id => !selectedAccountingIds.includes(id));
        
        setIsSaving(true);
        try {
            if (idsToUnmap.length > 0) await onUnmapAccounts(idsToUnmap);
            if (newMappingsForAccount.length > 0) await onSaveMappings(newMappingsForAccount);
            setMappingModalOpen(false); 
            setTargetAccountForMapping(null);
        } catch (error) {
            console.error("Erro ao salvar vínculos:", error);
            alert("Erro ao salvar alterações. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (acc: DreAccount) => { setEditingAccountId(acc.id); setEditName(acc.name); };
    const cancelEditing = () => { setEditingAccountId(null); setEditName(''); };
    
    const saveRename = async (oldName: string) => {
        const trimmed = editName.trim();
        if (!trimmed) {
            alert("O nome da conta não pode estar vazio.");
            return;
        }

        const isNew = editingAccountId?.startsWith('new_');
        const targetAccount = editableAccounts.find(a => a.name.toLowerCase() === trimmed.toLowerCase() && a.id !== editingAccountId);

        if (targetAccount) {
             if (!confirm(`A conta "${trimmed}" já existe.\n\nDeseja UNIFICAR a conta "${oldName}" com ela?\n\nIsso transferirá todos os vínculos para "${trimmed}" e excluirá a conta antiga.`)) {
                 return;
             }

             setIsSaving(true);
             try {
                 await onRename(oldName, trimmed);
                 const updatedList = editableAccounts.filter(a => a.id !== editingAccountId);
                 setEditableAccounts(updatedList);
                 await onSave(updatedList); 
                 setEditingAccountId(null);
                 setEditName('');
             } catch (e) {
                 console.error("Erro ao unificar:", e);
                 alert("Erro ao unificar contas.");
             } finally {
                 setIsSaving(false);
             }
             return;
        }

        if (trimmed !== oldName || isNew) {
            setIsSaving(true);
            try { 
                const updatedList = editableAccounts.map(a => 
                    a.id === editingAccountId ? { ...a, name: trimmed } : a
                );
                setEditableAccounts(updatedList);
                await onSave(updatedList); 
                if (!isNew) {
                    await onRename(oldName, trimmed);
                }
                setEditingAccountId(null); 
                setEditName('');
            } catch (e) { 
                console.error("Erro ao salvar conta:", e); 
                alert("Erro ao salvar alterações.");
            } finally { 
                setIsSaving(false); 
            }
        } else { 
            cancelEditing(); 
        }
    };

    const getLinkedCount = (accountName: string) => propCurrentMappings.filter(m => m.contasintetica?.trim() === accountName?.trim()).length;
    const filteredAccounts = useMemo(() => !searchTerm.trim() ? editableAccounts : editableAccounts.filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase())), [editableAccounts, searchTerm]);

    const handleNaturezaChange = async (accountId: string, natureza: NaturezaConta | '') => {
        const account = editableAccounts.find(a => a.id === accountId);
        if (!account) return;
        
        const updatedAccount = { ...account, naturezaConta: natureza || undefined };
        setEditableAccounts(prev => prev.map(a => a.id === accountId ? updatedAccount : a));
        
        try {
            await saveCadastroTenant('plano_contas_dre', [updatedAccount], tenantId);
        } catch (err) {
            console.error('Erro ao salvar natureza:', err);
        }
    };

    // FILTER ACCOUNTING ACCOUNTS FOR MODAL (RESULT ONLY)
    // Filtra apenas contas analíticas (tipo = "A") que começam com 3 (contas de resultado)
    const resultAccountingAccounts = useMemo(() => {
        return propAccountingAccounts.filter(acc => {
            const isAnalytical = acc.accountType?.toUpperCase() === 'A';
            const startsWithThree = acc.reducedCode?.startsWith('3');
            return isAnalytical && startsWithThree;
        });
    }, [propAccountingAccounts]);

    return (
        <main className="flex-grow p-6 lg:p-8 flex flex-col h-full overflow-hidden bg-slate-50">
            <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
                <button onClick={onNavigateBack} className="mb-6 text-sm text-slate-600 hover:text-slate-900 font-semibold flex items-center self-start shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg> Voltar para Parâmetros de Apuração
                </button>
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden flex-grow">
                    <div className="px-6 py-5 border-b border-slate-100 shrink-0">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div><h1 className="text-2xl font-bold text-slate-800">Plano de Contas de Resultado (DRE) & Mapeamento</h1><p className="text-sm text-slate-500 mt-1">Gerencie os vínculos entre contas contábeis oficiais e contas de resultado (DRE).</p></div>
                            <div className="flex items-center gap-2">
                                 <button onClick={handleAddAccount} className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-200 flex items-center shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    Nova Conta
                                 </button>
                                 <button onClick={() => setImportModalOpen(true)} className="px-4 py-2 bg-slate-600 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors duration-200 flex items-center shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Importar Mapeamento</button>
                            </div>
                        </div>
                        <div className="mt-6 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                            <input type="text" placeholder="Pesquisar conta gerencial..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all" />
                        </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50 pb-24" ref={listRef}>
                        <div className="space-y-3">
                            {filteredAccounts.map((account) => {
                                const linkedCount = getLinkedCount(account.name);
                                const isEditing = editingAccountId === account.id;

                                return (
                                   <div key={account.id} className="relative flex items-center gap-3 group bg-white p-3 rounded-lg border border-slate-200 hover:border-primary/30 hover:shadow-sm transition-all">
                                        <div className="flex-grow">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        autoFocus
                                                        type="text" 
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        className="border border-blue-300 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 w-full max-w-sm"
                                                        onKeyDown={e => e.key === 'Enter' && saveRename(account.name)}
                                                    />
                                                    <button onClick={() => saveRename(account.name)} className="text-green-600 hover:bg-green-100 p-1.5 rounded transition-colors" title="Salvar">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                    <button onClick={cancelEditing} className="text-red-500 hover:bg-red-100 p-1.5 rounded transition-colors" title="Cancelar">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/title">
                                                    <span className="block text-sm font-bold text-slate-700">{account.name}</span>
                                                    <button onClick={() => startEditing(account)} className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-primary p-1 transition-opacity" title="Renomear Conta">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                </div>
                                            )}
                                            {!isEditing && <span className="text-xs text-slate-400 block mt-0.5 font-mono">{account.id.startsWith('new_') ? 'Novo' : `ID: ${account.id.substring(0,8)}...`}</span>}
                                        </div>
                                        <select
                                            value={account.naturezaConta || ''}
                                            onChange={(e) => handleNaturezaChange(account.id, e.target.value as NaturezaConta | '')}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                                                account.naturezaConta 
                                                    ? account.naturezaConta === 'Receita' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : account.naturezaConta === 'Despesa' ? 'bg-red-50 text-red-700 border-red-200'
                                                    : account.naturezaConta === 'Custo' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                            }`}
                                            title="Natureza da conta"
                                        >
                                            <option value="">Natureza...</option>
                                            {NATUREZAS_CONTA.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                        <button onClick={() => openMappingModal(account)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${linkedCount > 0 ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white hover:border-primary hover:text-primary'}`} title="Gerenciar vínculos"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> {linkedCount > 0 ? `${linkedCount} Vinculada(s)` : 'Vincular'}</button>
                                        <button type="button" onClick={() => handleRemoveAccount(account.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Excluir conta e vínculos"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                    </div>
                                )
                            })}
                             {filteredAccounts.length === 0 && <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><p className="text-center text-sm">{editableAccounts.length === 0 ? 'Nenhuma conta gerencial identificada.\nImporte a estrutura ou mapeamento para começar.' : 'Nenhuma conta encontrada para a pesquisa.'}</p></div>}
                        </div>
                    </div>
                </div>
            </div>
            {mappingModalOpen && targetAccountForMapping && <MappingModal dreAccount={targetAccountForMapping} allAccountingAccounts={resultAccountingAccounts} initialSelectedIds={propCurrentMappings.filter(m => m.contasintetica?.trim() === targetAccountForMapping.name.trim()).map(m => m.idconta)} onClose={() => setMappingModalOpen(false)} onSave={handleSaveMappings} />}
            <FileImportModal title="Importar Mapeamento Contábil" isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportData} fields={importFields} />
            
            <DeleteConfirmationModal 
                isOpen={!!accountToDelete} 
                onClose={() => setAccountToDelete(null)} 
                onConfirm={confirmDeleteAccount} 
                itemName={accountToDelete?.name || ''} 
                isLoading={isSaving} 
            />
        </main>
    );
};

export default DreChartOfAccountsView;
