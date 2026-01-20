import React, { useState, useEffect, useMemo } from 'react';
import { Company, Brand } from '../types';
import StyledSelect from './StyledSelect';
import { getCadastroTenant } from '../utils/db'; // Fix: Use getCadastroTenant
import { generateUUID } from '../utils/helpers';
import FileImportModal, { ImportFieldDefinition } from './FileImportModal';

interface CompaniesViewProps {
  companies: Company[];
  brands: Brand[];
  onNavigateBack: () => void;
  onSaveCompanies: (updatedCompanies: Company[]) => Promise<void>;
  tenantId: string; // Added tenantId prop
}

// Helper for formatting CNPJ - formato: XX.XXX.XXX/XXXX-XX
const formatCNPJ = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '').substring(0, 14);
    
    // Aplica a máscara progressivamente
    let formatted = digits;
    if (digits.length > 2) {
        formatted = digits.substring(0, 2) + '.' + digits.substring(2);
    }
    if (digits.length > 5) {
        formatted = digits.substring(0, 2) + '.' + digits.substring(2, 5) + '.' + digits.substring(5);
    }
    if (digits.length > 8) {
        formatted = digits.substring(0, 2) + '.' + digits.substring(2, 5) + '.' + digits.substring(5, 8) + '/' + digits.substring(8);
    }
    if (digits.length > 12) {
        formatted = digits.substring(0, 2) + '.' + digits.substring(2, 5) + '.' + digits.substring(5, 8) + '/' + digits.substring(8, 12) + '-' + digits.substring(12);
    }
    
    return formatted;
};

// Helper Component for Sortable Headers
interface SortableHeaderProps {
    label: string;
    sortKey: string;
    currentSort: { key: string; direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
    className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ label, sortKey, currentSort, onSort, className = '' }) => {
    const isSorted = currentSort?.key === sortKey;
    const isAsc = isSorted && currentSort.direction === 'asc';
    const isDesc = isSorted && currentSort.direction === 'desc';
    
    return (
        <th 
            className={`px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b-2 border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-1 group">
                {label}
                <div className="flex flex-col items-center justify-center ml-1">
                    {/* Up Arrow */}
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-2.5 w-2.5 -mb-0.5 transition-colors ${isAsc ? 'text-primary' : 'text-slate-300 group-hover:text-slate-400'}`} 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                    >
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    {/* Down Arrow */}
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-2.5 w-2.5 -mt-0.5 transition-colors ${isDesc ? 'text-primary' : 'text-slate-300 group-hover:text-slate-400'}`} 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                    >
                         <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
        </th>
    );
};

// Modal Component for Editing/Deleting a Company (QLIK STYLE)
const CompanyEditModal: React.FC<{
    company: Company;
    allCompanies: Company[];
    brands: Brand[];
    onClose: () => void;
    onSave: (updatedCompany: Company) => void;
    onDelete: (companyId: string) => void;
}> = ({ company, allCompanies, brands, onClose, onSave, onDelete }) => {
    const [editedCompany, setEditedCompany] = useState<Company>(...[{ ...company }]);
    const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

    const handleChange = (field: keyof Company, value: string) => {
        let finalValue = value;
        if (field === 'cnpj') finalValue = formatCNPJ(value);
        setEditedCompany(prev => ({ ...prev, [field]: finalValue }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(editedCompany);
    };

    const handleConfirmDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(editedCompany.id);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">Editar Empresa</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <form onSubmit={handleSave} className="flex-grow overflow-y-auto p-6 bg-slate-50/30">
                    <div className="space-y-6">
                        {/* Identification Section */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wide border-b border-slate-100 pb-2">Identificação Única</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">CNPJ</label>
                                    <input
                                        type="text"
                                        value={editedCompany.cnpj || ''}
                                        onChange={(e) => handleChange('cnpj', e.target.value)}
                                        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2.5 border font-mono"
                                        placeholder="00.000.000/0000-00"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Chave primária para importação.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Cód. ERP</label>
                                    <input
                                        type="text"
                                        value={editedCompany.erpCode || ''}
                                        onChange={(e) => handleChange('erpCode', e.target.value)}
                                        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2.5 border font-mono"
                                        placeholder="Ex: 101, LOC01"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Nome (Razão Social)</label>
                                    <input
                                        type="text"
                                        value={editedCompany.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2.5 border"
                                        placeholder="Ex: Viamar Veiculos Ltda"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Apelido (Relatórios)</label>
                                    <input
                                        type="text"
                                        value={editedCompany.nickname || ''}
                                        onChange={(e) => handleChange('nickname', e.target.value)}
                                        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2.5 border"
                                        placeholder="Ex: Viamar Morumbi"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Marca</label>
                                    <StyledSelect
                                        value={editedCompany.brandId || ''}
                                        onChange={(e) => handleChange('brandId', e.target.value)}
                                        required
                                        className="h-11 pl-4 text-sm"
                                        containerClassName="w-full"
                                    >
                                        <option value="" disabled>Selecione</option>
                                        {brands.map(brand => (
                                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                                        ))}
                                    </StyledSelect>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Consolidação</label>
                                    <StyledSelect
                                        value={editedCompany.parentCompanyId || ''}
                                        onChange={(e) => handleChange('parentCompanyId', e.target.value)}
                                        className="h-11 pl-4 text-sm"
                                        containerClassName="w-full"
                                    >
                                        <option value="">Independente (Não consolida)</option>
                                        {allCompanies
                                            .filter(c => c.id !== editedCompany.id)
                                            .map(c => (
                                            <option key={c.id} value={c.id}>
                                                Em {c.nickname || c.name}
                                            </option>
                                        ))}
                                    </StyledSelect>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="mt-6 pt-6 border-t border-slate-200">
                             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg border border-red-100 bg-red-50">
                                <div>
                                    <p className="text-sm font-bold text-red-800">Excluir Empresa</p>
                                    <p className="text-xs text-red-600 mt-0.5">Ação irreversível.</p>
                                </div>
                                
                                {!isDeleteConfirming ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteConfirming(true)}
                                        className="px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-600 hover:text-white transition-colors shadow-sm"
                                    >
                                        Excluir
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsDeleteConfirming(false)}
                                            className="px-3 py-2 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmDelete}
                                            className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                        >
                                            Confirmar Exclusão
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary-hover transition-all shadow-md transform active:scale-95"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

const CompaniesView: React.FC<CompaniesViewProps> = ({ companies, brands, onNavigateBack, onSaveCompanies, tenantId }) => {
    const [editableCompanies, setEditableCompanies] = useState<Company[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'erpCode', direction: 'asc' });

    useEffect(() => {
        if (companies.length > 0) {
            setEditableCompanies(JSON.parse(JSON.stringify(companies)));
        } else {
            // Fix: include tenantId and use getCadastroTenant
            getCadastroTenant<Company>('companies', tenantId).then(data => {
                if (data) setEditableCompanies(data);
            }).catch(err => console.error("Error self-healing companies:", err));
        }
    }, [companies, tenantId]);

    const handleAddCompany = () => {
        // Fix: Add missing economicGroupId
        const newCompany: Company = {
            id: generateUUID(), 
            name: '', nickname: '', cnpj: '', erpCode: '',
            brandId: brands[0]?.id || '', economicGroupId: tenantId, parentCompanyId: undefined 
        };
        setCompanyToEdit(newCompany);
    };

    const handleModalSave = async (updatedCompany: Company) => {
        // Normaliza CNPJ para armazenar apenas dígitos (14 caracteres)
        const normalizeCnpj = (cnpj: string | undefined) => cnpj?.replace(/\D/g, '').substring(0, 14) || '';
        const updatedCnpjNormalized = normalizeCnpj(updatedCompany.cnpj);
        
        const isDuplicate = editableCompanies.some(c => {
            if (c.id === updatedCompany.id) return false;
            
            // Compara CNPJs normalizados (apenas dígitos)
            const existingCnpjNormalized = normalizeCnpj(c.cnpj);
            const cnpjMatch = updatedCnpjNormalized && existingCnpjNormalized && 
                              updatedCnpjNormalized === existingCnpjNormalized;
            
            // Compara códigos ERP
            const erpMatch = c.erpCode && updatedCompany.erpCode && 
                             c.erpCode === updatedCompany.erpCode;
            
            return cnpjMatch || erpMatch;
        });
        if (isDuplicate) { alert("Erro: Já existe uma empresa com este CNPJ ou Código ERP."); return; }

        // Normaliza o CNPJ antes de salvar (apenas números)
        const companyToSave = {
            ...updatedCompany,
            cnpj: updatedCnpjNormalized
        };

        setEditableCompanies(prev => {
            const exists = prev.find(c => c.id === companyToSave.id);
            return exists ? prev.map(c => c.id === companyToSave.id ? companyToSave : c) : [...prev, companyToSave];
        });
        setCompanyToEdit(null);
        setIsSaving(true);
        const currentList = editableCompanies.map(c => c.id === companyToSave.id ? companyToSave : c);
        if (!editableCompanies.find(c => c.id === companyToSave.id)) currentList.push(companyToSave);
        await onSaveCompanies(currentList);
        setIsSaving(false);
    };

    const handleModalDelete = async (companyId: string) => {
        const remaining = editableCompanies.filter(c => c.id !== companyId);
        const cleaned = remaining.map(c => c.parentCompanyId === companyId ? { ...c, parentCompanyId: '' } : c);
        setEditableCompanies(cleaned);
        setCompanyToEdit(null);
        setIsSaving(true);
        await onSaveCompanies(cleaned);
        setIsSaving(false);
    };

    // --- Sorting Logic ---
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- Import Logic ---
    const importFields: ImportFieldDefinition[] = [
        { key: 'name', label: 'Razão Social', required: true, description: 'Nome jurídico da empresa.' },
        { key: 'nickname', label: 'Nome Fantasia', required: false, description: 'Nome utilizado nos relatórios.' },
        { key: 'cnpj', label: 'CNPJ', required: true, description: 'Apenas números (14 dígitos). Pontos, barras e hífens serão removidos automaticamente.' },
        { key: 'erpCode', label: 'Cód. ERP', required: true, description: 'Código do sistema de origem.' },
        { key: 'brandName', label: 'Marca', required: false, description: 'Nome exato da marca (Ex: Chevrolet). Se vazio ou não encontrada, a empresa será importada sem marca.' },
        { key: 'parentName', label: 'Empresa Mãe', required: false, description: 'Nome da empresa consolidadora.' }
    ];

    const handleImportCompanies = async (data: any[]) => {
        setIsSaving(true);
        try {
            const newCompanies: Company[] = [];
            const errors: string[] = [];
            let unbrandedCount = 0;

            data.forEach((row, index) => {
                const name = row.name ? String(row.name).trim() : '';
                if (!name) {
                    errors.push(`Linha ${index + 1}: Razão Social (Nome) é obrigatória.`);
                    return;
                }

                // Normaliza CNPJ para armazenar apenas números (14 dígitos)
                const cnpj = row.cnpj ? String(row.cnpj).replace(/\D/g, '').substring(0, 14) : '';
                const erpCode = row.erpCode ? String(row.erpCode).trim() : '';

                if (!cnpj && !erpCode) {
                     errors.push(`Linha ${index + 1}: É necessário CNPJ ou Código ERP.`);
                     return;
                }

                const brandName = row.brandName?.trim();
                let brandId = '';
                
                if (brandName) {
                    const brand = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
                    if (brand) {
                        brandId = brand.id;
                    } else {
                         unbrandedCount++;
                    }
                } else {
                    unbrandedCount++;
                }

                // Fix: Add missing economicGroupId
                const company: Company = {
                    id: generateUUID(),
                    name: name,
                    nickname: row.nickname?.trim() || name,
                    cnpj: cnpj,
                    erpCode: erpCode,
                    brandId: brandId,
                    economicGroupId: tenantId
                };
                newCompanies.push(company);
            });

            if (errors.length > 0) {
                alert(`Erros críticos impediram a importação de algumas linhas:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n...' : ''}`);
            }

            if (newCompanies.length === 0) {
                setIsSaving(false);
                return;
            }

            const allAvailable = [...editableCompanies, ...newCompanies];
            const companiesWithParents = newCompanies.map((c, i) => {
                const parentName = data[i].parentName?.trim();
                if (parentName) {
                    const parent = allAvailable.find(p => p.name.toLowerCase() === parentName.toLowerCase() || p.nickname?.toLowerCase() === parentName.toLowerCase());
                    if (parent) {
                        return { ...c, parentCompanyId: parent.id };
                    }
                }
                return c;
            });

            const finalList = [...editableCompanies, ...companiesWithParents];
            setEditableCompanies(finalList);
            await onSaveCompanies(finalList);
            
            let successMsg = `${companiesWithParents.length} empresas importadas com sucesso!`;
            if (unbrandedCount > 0) {
                successMsg += `\n\nAtenção: ${unbrandedCount} empresas foram importadas sem marca vinculada (marca não encontrada ou vazia no arquivo). Edite-as manualmente para corrigir.`;
            }
            alert(successMsg);
            
            setIsImportModalOpen(false);

        } catch (error) {
            console.error("Import error:", error);
            alert("Erro ao processar importação.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredAndSortedCompanies = useMemo(() => {
        // 1. Filtering
        let result = editableCompanies;
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(c => 
                c.name.toLowerCase().includes(lowerTerm) || c.nickname?.toLowerCase().includes(lowerTerm) ||
                c.cnpj?.includes(lowerTerm) || c.erpCode?.toLowerCase().includes(lowerTerm)
            );
        }

        // 2. Sorting
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Company];
                let bValue: any = b[sortConfig.key as keyof Company];

                // Handle special columns logic
                if (sortConfig.key === 'brandName') {
                    aValue = brands.find(brand => brand.id === a.brandId)?.name || '';
                    bValue = brands.find(brand => brand.id === b.brandId)?.name || '';
                }

                // Handle nulls
                if (aValue === undefined || aValue === null) aValue = '';
                if (bValue === undefined || bValue === null) bValue = '';
                
                // Case insensitive string comparison
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                    
                    // Numeric String Handling for ERP Codes
                    if (sortConfig.key === 'erpCode') {
                        const aNum = parseFloat(aValue);
                        const bNum = parseFloat(bValue);
                        if (!isNaN(aNum) && !isNaN(bNum)) {
                            return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
                        }
                    }
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return result;
    }, [editableCompanies, searchTerm, sortConfig, brands]);

    return (
        <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
            <div className="w-full flex flex-col h-full">
                <div className="flex flex-col overflow-hidden flex-grow">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white shrink-0">
                        <div><h1 className="text-xl font-bold text-slate-800">Gerenciamento de Empresas</h1><p className="text-sm text-slate-500 mt-1">Cadastre suas lojas com CNPJ e Código ERP para garantir a importação correta.</p></div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-grow sm:flex-grow-0">
                                <input type="text" placeholder="Buscar por nome, CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-sm placeholder-slate-400" />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <button onClick={() => setIsImportModalOpen(true)} disabled={brands.length === 0} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center shadow-sm disabled:opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Importar Excel
                            </button>
                            <button onClick={handleAddCompany} disabled={brands.length === 0} className="px-4 py-2 bg-primary text-on-primary border border-transparent text-sm font-semibold rounded-lg hover:bg-primary-hover transition-all flex items-center shadow-sm whitespace-nowrap" title={brands.length === 0 ? "Cadastre uma marca primeiro" : ""}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg> Adicionar
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-auto bg-slate-50/50 pb-12">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <SortableHeader label="Cód. ERP" sortKey="erpCode" currentSort={sortConfig} onSort={handleSort} className="w-[8%]" />
                                    <SortableHeader label="Marca" sortKey="brandName" currentSort={sortConfig} onSort={handleSort} className="w-[12%]" />
                                    <SortableHeader label="CNPJ" sortKey="cnpj" currentSort={sortConfig} onSort={handleSort} className="w-[14%]" />
                                    <SortableHeader label="Nome / Razão Social" sortKey="name" currentSort={sortConfig} onSort={handleSort} className="w-[20%]" />
                                    <SortableHeader label="Apelido" sortKey="nickname" currentSort={sortConfig} onSort={handleSort} className="w-[15%]" />
                                    <SortableHeader label="Consolida em" sortKey="parentCompanyId" currentSort={sortConfig} onSort={handleSort} className="w-[18%]" />
                                    <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-[13%] border-b-2 border-slate-200">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filteredAndSortedCompanies.map((company) => {
                                    const brandName = brands.find(b => b.id === company.brandId)?.name || '-';
                                    const parentCompany = company.parentCompanyId ? editableCompanies.find(c => c.id === company.parentCompanyId) : null;
                                    const parentDisplay = parentCompany ? (parentCompany.nickname || parentCompany.name) : '-';
                                    return (
                                        <tr key={company.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-slate-600 font-mono">{company.erpCode || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 font-medium">{brandName}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600 font-mono">{company.cnpj || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-800 font-medium">{company.name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{company.nickname || company.name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{parentDisplay}</td>
                                            <td className="px-4 py-3 align-middle text-center"><button type="button" onClick={() => setCompanyToEdit(company)} className="text-primary hover:text-primary-hover text-sm font-semibold hover:underline">Editar</button></td>
                                        </tr>
                                    );
                                })}
                                {filteredAndSortedCompanies.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">Nenhuma empresa encontrada.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {companyToEdit && (
                <CompanyEditModal company={companyToEdit} allCompanies={editableCompanies} brands={brands} onClose={() => setCompanyToEdit(null)} onSave={handleModalSave} onDelete={handleModalDelete} />
            )}

            <FileImportModal
                title="Importar Empresas"
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportCompanies}
                fields={importFields}
            />
        </main>
    );
};

export default CompaniesView;
