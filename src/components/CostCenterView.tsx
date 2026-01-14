import React, { useState, useEffect } from 'react';
import { CostCenter, Department } from '../types';
import StyledSelect from './StyledSelect';
import { generateUUID } from '../utils/helpers';

interface CostCenterViewProps {
  costCenters: CostCenter[];
  departments: Department[];
  onNavigateBack: () => void;
  onSaveCostCenters: (data: CostCenter[]) => Promise<void>;
  onSaveDepartments: (data: Department[]) => Promise<void>;
  onDeleteDepartment: (id: string) => Promise<void>;
  onDeleteCostCenter: (id: string) => Promise<void>;
  tenantId: string; // Added tenantId prop
}

const CostCenterView: React.FC<CostCenterViewProps> = ({ 
    costCenters, 
    departments, 
    onNavigateBack, 
    onSaveCostCenters, 
    onSaveDepartments,
    onDeleteDepartment,
    onDeleteCostCenter,
    tenantId
}) => {
    const [activeTab, setActiveTab] = useState<'cost_centers' | 'departments'>('departments');
    const [editableCostCenters, setEditableCostCenters] = useState<CostCenter[]>([]);
    const [editableDepartments, setEditableDepartments] = useState<Department[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Drag and Drop State for Departments
    const [draggedDeptIndex, setDraggedDeptIndex] = useState<number | null>(null);

    // Confirmation Modal State
    const [costCenterToDelete, setCostCenterToDelete] = useState<string | null>(null);

    useEffect(() => {
        setEditableCostCenters(JSON.parse(JSON.stringify(costCenters)));
    }, [costCenters]);

    useEffect(() => {
        setEditableDepartments(JSON.parse(JSON.stringify(departments)));
    }, [departments]);

    // Cost Center Handlers
    const handleCostCenterChange = (id: string, field: keyof CostCenter, value: any) => {
        setEditableCostCenters(prev => prev.map(cc => cc.id === id ? { ...cc, [field]: value } : cc));
    };

    // Handler específico para mudança de departamento que atualiza ID e Nome
    const handleDepartmentSelection = (costCenterId: string, departmentId: string) => {
        const selectedDept = departments.find(d => d.id === departmentId);
        setEditableCostCenters(prev => prev.map(cc => {
            if (cc.id === costCenterId) {
                return {
                    ...cc,
                    departmentId: departmentId, // Salva o ID para o Banco de Dados (Foreign Key)
                    departamento: selectedDept ? selectedDept.name : '' // Atualiza o nome visualmente
                };
            }
            return cc;
        }));
    };

    const handleAddCostCenter = () => {
        // Fix: Use correct properties and add economicGroupId
        const newCC: CostCenter = {
            id: `new_${Date.now()}`,
            sigla: '',
            descricao: '',
            departmentId: '',
            departamento: '',
            economicGroupId: tenantId
        };
        setEditableCostCenters(prev => [newCC, ...prev]);
    };

    const handleSaveCostCenters = async () => {
        setIsSaving(true);
        try {
            await onSaveCostCenters(editableCostCenters);
            alert('Centros de Resultado salvos com sucesso!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setCostCenterToDelete(id);
    };

    const confirmDeleteCostCenter = async () => {
        if (costCenterToDelete) {
            await onDeleteCostCenter(costCenterToDelete);
            setCostCenterToDelete(null);
        }
    };

    // Department Handlers
    const handleDepartmentChange = (id: string, value: string) => {
        setEditableDepartments(prev => prev.map(d => d.id === id ? { ...d, name: value } : d));
    };

    const handleAddDepartment = () => {
        // Fix: add missing economicGroupId
        const newDept: Department = {
            id: `new_${Date.now()}`,
            name: '',
            economicGroupId: tenantId
        };
        setEditableDepartments(prev => [...prev, newDept]);
    };

    const handleSaveDepartments = async () => {
        setIsSaving(true);
        try {
            await onSaveDepartments(editableDepartments);
            alert('Departamentos salvos com sucesso!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Drag and Drop Logic for Departments ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedDeptIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Ghost image tweaks if needed
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedDeptIndex === null || draggedDeptIndex === targetIndex) return;

        const updatedList = [...editableDepartments];
        const itemToMove = updatedList[draggedDeptIndex];
        
        // Remove from old position
        updatedList.splice(draggedDeptIndex, 1);
        // Insert at new position
        updatedList.splice(targetIndex, 0, itemToMove);

        setEditableDepartments(updatedList);
        setDraggedDeptIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedDeptIndex(null);
    };

    const filteredCostCenters = editableCostCenters.filter(cc => 
        (cc.sigla || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cc.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cc.departamento || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const inputClasses = "w-full bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition";

    return (
        <main className="flex-grow p-6 lg:p-8 flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-app)' }}>
            <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
                <button onClick={onNavigateBack} className="mb-6 text-sm text-slate-600 hover:text-slate-900 font-semibold flex items-center self-start shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Voltar para Parâmetros de Apuração
                </button>

                <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden flex-grow">
                    <div className="px-6 py-5 border-b border-slate-100 shrink-0 flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Plano de Centro de Resultado</h1>
                        </div>
                    </div>

                    <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex gap-4 shrink-0">
                        <button 
                            onClick={() => setActiveTab('departments')} 
                            className={`py-2 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'departments' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            1. Cadastro de Departamentos
                        </button>
                        <button 
                            onClick={() => setActiveTab('cost_centers')} 
                            className={`py-2 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'cost_centers' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            2. Centros de Resultado
                        </button>
                    </div>

                    <div className="flex-grow overflow-hidden flex flex-col p-6 bg-white">
                        {activeTab === 'cost_centers' && (
                            <div className="flex flex-col h-full">
                                <div className="flex justify-between items-center mb-4 shrink-0">
                                    <div className="relative w-64">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar Sigla ou Descrição..." 
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddCostCenter} className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm hover:bg-primary-hover shadow-sm transition-colors">+ Adicionar C.R.</button>
                                        <button onClick={handleSaveCostCenters} disabled={isSaving} className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm hover:bg-primary-hover shadow-sm disabled:opacity-50 transition-colors">
                                            {isSaving ? 'Salvando...' : 'Salvar Tudo'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-grow overflow-auto border border-slate-200 rounded-lg">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase w-32">Sigla CR</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Descrição CR</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase w-[500px]">
                                                    Departamento Destino
                                                    <span className="text-[10px] font-normal text-slate-400 normal-case block mt-0.5">(Vínculo para DRE)</span>
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase w-16">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {filteredCostCenters.map(cc => (
                                                <tr key={cc.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-2">
                                                        <input 
                                                            type="text" 
                                                            value={cc.sigla} 
                                                            onChange={e => handleCostCenterChange(cc.id, 'sigla', e.target.value)}
                                                            className={inputClasses}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input 
                                                            type="text" 
                                                            value={cc.descricao} 
                                                            onChange={e => handleCostCenterChange(cc.id, 'descricao', e.target.value)}
                                                            className={inputClasses}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 pl-4">
                                                        <StyledSelect 
                                                            value={cc.departmentId || ''} 
                                                            onChange={e => handleDepartmentSelection(cc.id, e.target.value)}
                                                            containerClassName="w-full"
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {departments.map(d => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </StyledSelect>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button 
                                                            onClick={() => handleDeleteClick(cc.id)} 
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'departments' && (
                            <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6 flex flex-col items-start gap-3">
                                    <div className="flex justify-between items-center w-full">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">Departamentos</h3>
                                            <p className="text-xs text-slate-500">Arraste para reordenar. A ordem define a sequência das abas na DRE.</p>
                                        </div>
                                        <button onClick={handleAddDepartment} className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm hover:bg-primary-hover shadow-sm transition-colors">+ Adicionar</button>
                                    </div>
                                </div>

                                <div className="flex-grow overflow-auto border border-slate-200 rounded-lg shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="w-10 px-2 py-3"></th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase w-20">Ordem</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Nome do Departamento</th>
                                                <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase w-20">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {editableDepartments.map((dept, index) => (
                                                <tr 
                                                    key={dept.id} 
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, index)}
                                                    onDragOver={(e) => handleDragOver(e, index)}
                                                    onDrop={(e) => handleDrop(e, index)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`hover:bg-slate-50 transition-colors ${draggedDeptIndex === index ? 'opacity-50 bg-blue-50' : ''}`}
                                                >
                                                    <td className="px-2 py-3 text-center cursor-move text-slate-400 hover:text-primary">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                                                        </svg>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-xs font-bold text-slate-500 border border-slate-200">
                                                            #{index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input 
                                                            type="text" 
                                                            value={dept.name} 
                                                            onChange={e => handleDepartmentChange(dept.id, e.target.value)}
                                                            className={inputClasses}
                                                            placeholder="Ex: Veículos Novos"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <button 
                                                            onClick={() => onDeleteDepartment(dept.id)} 
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="mt-4 flex justify-end">
                                    <button onClick={handleSaveDepartments} disabled={isSaving} className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-hover shadow-md disabled:opacity-50 transition-colors">
                                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação de Exclusão */}
            {costCenterToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Centro de Resultado?</h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Esta ação é irreversível. O Centro de Resultado será removido permanentemente.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button 
                                onClick={() => setCostCenterToDelete(null)}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDeleteCostCenter}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-sm"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default CostCenterView;
