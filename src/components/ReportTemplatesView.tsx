import React, { useState, useEffect, DragEvent } from 'react';
import { ReportTemplate } from '../types';
import StyledSelect from './StyledSelect';
import { generateUUID } from '../utils/helpers';
import { duplicateReportTemplate } from '../utils/db';

interface ReportTemplatesViewProps {
  templates: ReportTemplate[];
  onSaveTemplates: (templates: ReportTemplate[]) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onNavigateBack: () => void;
  onEditStructure: (template: ReportTemplate) => void;
  tenantId: string;
}

const ReportTemplatesView: React.FC<ReportTemplatesViewProps> = ({ 
    templates, 
    onSaveTemplates, 
    onDeleteTemplate,
    onNavigateBack,
    onEditStructure,
    tenantId
}) => {
    const [editableTemplates, setEditableTemplates] = useState<ReportTemplate[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    // Drag and Drop State
    const [draggedTemplateIndex, setDraggedTemplateIndex] = useState<number | null>(null);

    // Delete Modal State
    const [templateToDelete, setTemplateToDelete] = useState<ReportTemplate | null>(null);

    useEffect(() => {
        // Sort by orderIndex on load to ensure correct visual order
        const sorted = [...templates].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        setEditableTemplates(JSON.parse(JSON.stringify(sorted)));
    }, [templates]);

    const handleFieldChange = (id: string, field: keyof ReportTemplate, value: any) => {
        setEditableTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value, updatedAt: new Date().toISOString() } : t));
    };

    // Updated: Triggers the Modal instead of window.confirm
    const handleRemoveTemplate = (template: ReportTemplate) => {
        setTemplateToDelete(template);
    };

    // Actual Deletion Logic called by Modal
    const confirmDelete = async () => {
        if (!templateToDelete) return;

        setIsSaving(true);
        try {
            // 1. Delete from DB explicitly
            await onDeleteTemplate(templateToDelete.id);

            // 2. Remove from local state
            const newList = editableTemplates.filter(t => t.id !== templateToDelete.id);
            setEditableTemplates(newList);
            
            // Close modal
            setTemplateToDelete(null);
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Erro ao excluir o relatório. Por favor, tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDuplicateTemplate = async (template: ReportTemplate) => {
        const newName = prompt("Nome para o novo relatório:", `Cópia de ${template.name}`);
        if (!newName) return;

        setIsSaving(true);
        try {
            const newTemplate = await duplicateReportTemplate(template.id, newName, tenantId);
            if (newTemplate) {
                const mappedTemplate: ReportTemplate = {
                    id: newTemplate.id,
                    name: newTemplate.nome,
                    description: newTemplate.descricao,
                    type: newTemplate.tipo,
                    isActive: newTemplate.ativo,
                    orderIndex: newTemplate.ordem,
                    createdAt: newTemplate.criado_em,
                    updatedAt: newTemplate.atualizado_em
                };
                setEditableTemplates(prev => [...prev, mappedTemplate]);
                alert("Relatório duplicado com sucesso!");
            }
        } catch (error) {
            console.error("Failed to duplicate:", error);
            alert("Erro ao duplicar o relatório.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddTemplate = () => {
        const now = new Date().toISOString();
        const newTemplate: ReportTemplate = {
            id: generateUUID(),
            name: 'Novo Relatório',
            description: '',
            type: 'DRE',
            isActive: true,
            orderIndex: editableTemplates.length + 1,
            createdAt: now,
            updatedAt: now
        };
        setEditableTemplates(prev => [...prev, newTemplate]);
    };

    // --- Drag and Drop Handlers ---

    const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
        setDraggedTemplateIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        if (draggedTemplateIndex === null || draggedTemplateIndex === targetIndex) return;

        const updatedList = [...editableTemplates];
        const itemToMove = updatedList[draggedTemplateIndex];
        
        // Remove from old position
        updatedList.splice(draggedTemplateIndex, 1);
        // Insert at new position
        updatedList.splice(targetIndex, 0, itemToMove);

        // Reassign orderIndex based on new array position
        const reindexedList = updatedList.map((item, index) => ({
            ...item,
            orderIndex: index + 1,
            updatedAt: new Date().toISOString()
        }));

        setEditableTemplates(reindexedList);
        setDraggedTemplateIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedTemplateIndex(null);
    };

    const handleSave = async () => {
        if (editableTemplates.some(t => !t.name.trim())) {
            alert('O nome do relatório é obrigatório.');
            return;
        }
        setIsSaving(true);
        await onSaveTemplates(editableTemplates);
        setIsSaving(false);
    };

    const inputClasses = "w-full bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition";

    return (
        <main className="flex-grow p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
                <div className="bg-white rounded-custom shadow-lg border border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Modelos de Demonstrações</h1>
                            <p className="text-sm text-slate-500 mt-1">Crie e personalize a estrutura das suas Demonstrações Contábeis, Gerenciais e Análises de Balanço Patrimonial. Arraste para reordenar o menu.</p>
                        </div>
                        <button onClick={handleAddTemplate} className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover shadow-sm">
                           + Novo Modelo
                        </button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50">
                        <div className="space-y-3">
                            {editableTemplates.map((template, index) => (
                                <div 
                                    key={template.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`
                                        p-4 bg-white rounded-lg border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end relative transition-all duration-200 shadow-sm
                                        ${draggedTemplateIndex === index ? 'opacity-50 border-dashed border-primary bg-blue-50' : 'hover:border-primary/30 hover:shadow-md'}
                                    `}
                                >
                                    {/* Drag Handle & Order Badge */}
                                    <div className="lg:col-span-1 flex items-center gap-2 h-full pb-2">
                                        <div className="cursor-move text-slate-400 hover:text-slate-600" title="Arraste para reordenar">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                                            </svg>
                                        </div>
                                        <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold rounded-full select-none">
                                            #{index + 1}
                                        </div>
                                    </div>

                                    <div className="lg:col-span-3">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome do Relatório</label>
                                        <input 
                                            type="text" 
                                            value={template.name} 
                                            onChange={(e) => handleFieldChange(template.id, 'name', e.target.value)} 
                                            className={inputClasses} 
                                            placeholder="Ex: DRE Gerencial"
                                        />
                                    </div>
                                    <div className="lg:col-span-3">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descrição</label>
                                        <input 
                                            type="text" 
                                            value={template.description || ''} 
                                            onChange={(e) => handleFieldChange(template.id, 'description', e.target.value)} 
                                            className={inputClasses} 
                                            placeholder="Descrição opcional"
                                        />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo Base</label>
                                        <StyledSelect 
                                            value={template.type} 
                                            onChange={(e) => handleFieldChange(template.id, 'type', e.target.value)}
                                            containerClassName="w-full"
                                        >
                                            <option value="DRE">DRE (Resultado)</option>
                                            <option value="CASH_FLOW">Fluxo de Caixa</option>
                                            <option value="BALANCE_SHEET">Balanço Patrimonial</option>
                                            <option value="OTHER">Outros Indicadores</option>
                                        </StyledSelect>
                                    </div>
                                    <div className="lg:col-span-1 flex flex-col justify-end h-full pb-3">
                                         <label className="flex items-center space-x-2 cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={template.isActive} 
                                                onChange={(e) => handleFieldChange(template.id, 'isActive', e.target.checked)}
                                                className="custom-checkbox"
                                            />
                                            <span className="text-sm text-slate-700 font-medium">Ativo</span>
                                        </label>
                                    </div>
                                    <div className="lg:col-span-2 flex justify-end pb-1 gap-2">
                                        <button 
                                            onClick={() => onEditStructure(template)}
                                            className="p-2 text-slate-500 hover:text-primary hover:bg-blue-50 rounded-full transition-colors" 
                                            title="Editar Estrutura"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => handleDuplicateTemplate(template)} 
                                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" 
                                            title="Duplicar Relatório"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleRemoveTemplate(template)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Excluir">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {editableTemplates.length === 0 && (
                                <p className="text-center text-slate-500 py-10 bg-white rounded-lg border border-dashed border-slate-300">
                                    Nenhum modelo cadastrado. Clique em "+ Novo Modelo" para começar.
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-hover disabled:bg-slate-300 transition-colors duration-200 flex items-center shadow-sm"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {templateToDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 transform transition-all scale-100">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-center text-slate-900 mb-2">
                            Excluir Modelo?
                        </h3>
                        <p className="text-sm text-center text-slate-600 mb-6">
                            Você tem certeza que deseja excluir o modelo <strong>{templateToDelete.name}</strong>?<br/><br/>
                            <span className="font-medium text-red-600">Atenção:</span> Isso removerá permanentemente o modelo e toda a sua estrutura de contas e configurações. Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button 
                                onClick={() => setTemplateToDelete(null)} 
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition-colors flex items-center"
                            >
                                {isSaving ? 'Excluindo...' : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ReportTemplatesView;
