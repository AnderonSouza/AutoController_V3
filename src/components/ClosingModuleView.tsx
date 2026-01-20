import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, ClosingTask, ClosingPeriod, TaskTemplate, Department, ClosingComment, ClosingAttachment, ChecklistItem } from '../types';
import StyledSelect from './StyledSelect';
import DurationInput from './DurationInput';
import MultiSelectDropdown from './MultiSelectDropdown';
import { supabase } from '../utils/supabaseClient';
import { getCadastro, saveCadastro, deleteById } from '../utils/db';
import { generateUUID } from '../utils/helpers';
import { CALENDAR_MONTHS } from '../constants';

interface ClosingModuleViewProps {
    user: User;
    users?: User[];
    onNavigateBack?: () => void;
    tenantId?: string | null;
}

const statusLists = [
    { id: 'pendente', label: 'A fazer', color: 'bg-slate-400' },
    { id: 'em_andamento', label: 'Em andamento', color: 'bg-blue-50' },
    { id: 'bloqueado', label: 'Bloqueios', color: 'bg-red-500' },
    { id: 'reports', label: 'Reports', color: 'bg-purple-500' },
    { id: 'concluido', label: 'Concluído', color: 'bg-green-500' },
];

const ClosingModuleView: React.FC<ClosingModuleViewProps> = ({ user, users = [], onNavigateBack, tenantId }) => {
    const [viewMode, setViewMode] = useState<'execution' | 'template' | 'history'>('execution');
    const [periods, setPeriods] = useState<ClosingPeriod[]>([]);
    const [activePeriodId, setActivePeriodId] = useState<string>('');
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
    const [tasks, setTasks] = useState<ClosingTask[]>([]);
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Task Detail States
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<ClosingTask | null>(null);
    const [comments, setComments] = useState<ClosingComment[]>([]);
    const [attachments, setAttachments] = useState<ClosingAttachment[]>([]);
    const [newComment, setNewComment] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Management Modals
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
    const [newDeptName, setNewDeptName] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false);

    // Confirmation Modals
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

    const [newPeriodMonth, setNewPeriodMonth] = useState(CALENDAR_MONTHS[new Date().getMonth()]);
    const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear());

    // Perfil Operacional check
    const isOperacional = user.role === 'Operacional';

    useEffect(() => {
        loadBaseData();
    }, []);

    const loadBaseData = async () => {
        setIsLoading(true);
        try {
            const { data: pData } = await supabase.from('ciclos_fechamento').select('*');
            const dData = await getCadastro<Department>('departments');
            const tData = await getCadastro<TaskTemplate>('task_templates');
            
            if (pData) {
                const mapped = pData.map(p => ({
                    id: p.id, year: p.ano, month: p.mes, status: p.status, 
                    openedAt: p.criado_em, progress: p.progresso
                })).sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return CALENDAR_MONTHS.indexOf(b.month) - CALENDAR_MONTHS.indexOf(a.month);
                });
                setPeriods(mapped);
                if (mapped.length > 0 && !activePeriodId) {
                    const active = mapped.find(p => p.status === 'aberto') || mapped[0];
                    setActivePeriodId(active.id);
                    loadTasksForPeriod(active.id);
                }
            }
            if (dData) setDepartments(dData.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            if (tData) setTemplates(tData);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const loadTasksForPeriod = async (periodId: string) => {
        if (!periodId) return;
        try {
            const data = await getCadastro<ClosingTask>('closing_tasks');
            setTasks(data.filter(t => t.ciclo_id === periodId));
        } catch (e) { console.error(e); }
    };

    // --- Department Logic ---
    const handleAddDepartment = async () => {
        if (!newDeptName.trim()) return;
        const result = await saveCadastro('departments', [{ id: `new_${Date.now()}`, name: newDeptName }]);
        if (result.length > 0) {
            setDepartments(prev => [...prev, result[0]].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            setNewDeptName('');
        }
    };

    const handleConfirmDeleteDept = async () => {
        if (!deptToDelete) return;
        try {
            await deleteById('departments', deptToDelete.id);
            setDepartments(prev => prev.filter(d => d.id !== deptToDelete.id));
            setDeptToDelete(null);
        } catch (error) {
            alert("Não foi possível excluir o departamento.");
        }
    };

    // --- Template Logic ---
    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;

        setIsSaving(true);
        try {
            const templateToSave = {
                ...editingTemplate,
                responsavel_ids: editingTemplate.responsavel_ids || []
            };
            
            const result = await saveCadastro('task_templates', [templateToSave]);
            
            if (result.length > 0) {
                const saved = result[0];
                setTemplates(prev => {
                    const exists = prev.find(t => t.id === saved.id);
                    if (exists) return prev.map(t => t.id === saved.id ? saved : t);
                    return [...prev, saved];
                });
            }
            setIsTemplateModalOpen(false);
            setEditingTemplate(null);
        } catch (error) {
            console.error("Erro ao salvar modelo:", error);
            alert("Erro ao salvar o modelo. Verifique se as colunas no Supabase estão criadas conforme o script fornecido.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Excluir este modelo permanentemente?')) return;
        setIsSaving(true);
        try {
            await deleteById('task_templates', id);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } finally {
            setIsSaving(false);
        }
    };

    const handleTaskClick = async (task: ClosingTask) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
        const { data: cData } = await supabase.from('comentarios_fechamento').select('*').eq('tarefa_id', task.id).order('criado_em', { ascending: false });
        if (cData) setComments(cData);
    };

    const handleUpdateTask = async (updates: Partial<ClosingTask>) => {
        if (!editingTask) return;
        const updatedTask = { ...editingTask, ...updates };
        setEditingTask(updatedTask);
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        await saveCadastro('closing_tasks', [updatedTask]);
    };

    const handleToggleChecklist = async (itemId: string) => {
        if (!editingTask) return;
        const updatedChecklist = editingTask.checklist.map(item => 
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        await handleUpdateTask({ checklist: updatedChecklist });
    };

    const handleAddChecklistItem = async (text: string) => {
        if (!editingTask || !text.trim()) return;
        const newItem: ChecklistItem = { id: generateUUID(), text, completed: false };
        const updatedChecklist = [...editingTask.checklist, newItem];
        await handleUpdateTask({ checklist: updatedChecklist });
    };

    const filteredTasks = useMemo(() => {
        let list = tasks;
        
        // REGRA PARA PERFIL OPERACIONAL: Vê apenas o que é responsável
        if (isOperacional) {
            list = list.filter(t => t.responsavel_ids && t.responsavel_ids.includes(user.id));
        }

        if (selectedDeptId !== 'all') {
            list = list.filter(t => t.departmentId === selectedDeptId);
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(t => t.description.toLowerCase().includes(term));
        }
        return list;
    }, [tasks, selectedDeptId, searchTerm, isOperacional, user.id]);

    const formatTimeDisplay = (time: string | undefined) => {
        if (!time || !time.includes(':')) return '-';
        const [h, m] = time.split(':');
        return `${h}h ${m}m`;
    };

    // Opções de usuários filtradas (Administrador e Gestor)
    const filteredUserOptions = useMemo(() => {
        return (users || [])
            .filter(u => u.role === 'Administrador' || u.role === 'Gestor')
            .map(u => ({ id: u.id, name: u.name }));
    }, [users]);

    return (
        <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
            <div className="w-full flex flex-col h-full">
                
                <div className="mb-6 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                    <div className="flex items-center gap-6 flex-wrap">
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fechamento Mensal</h1>
                        
                        <div className="relative group">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input 
                                type="text"
                                placeholder="Filtrar quadro..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-12 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-80 shadow-sm"
                            />
                        </div>

                        {!isOperacional && (
                            <div className="flex items-center gap-2 h-12 bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Quadro</span>
                                <StyledSelect 
                                    value={selectedDeptId} 
                                    onChange={(e) => setSelectedDeptId(e.target.value)}
                                    className="h-8 py-0 pl-4 pr-10 text-sm font-bold border-none bg-transparent text-slate-700 focus:ring-0"
                                >
                                    <option value="all">Visão Consolidada</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </StyledSelect>
                            </div>
                        )}
                    </div>

                    {!isOperacional && (
                        <div className="flex items-center gap-4">
                            <nav className="bg-slate-200/50 rounded-xl p-1.5 flex h-14 items-center">
                                <button onClick={() => setViewMode('execution')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'execution' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Execução</button>
                                <button onClick={() => setViewMode('template')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'template' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Modelos</button>
                            </nav>
                            <button onClick={() => setIsNewPeriodModalOpen(true)} className="px-7 py-3.5 bg-primary text-white text-sm font-bold rounded-xl hover:brightness-110 shadow-lg flex items-center gap-2 transition-all transform active:scale-95">
                                Abrir Período
                            </button>
                        </div>
                    )}
                </div>

                {viewMode === 'execution' ? (
                    <div className="flex-grow flex gap-5 overflow-x-auto pb-6 custom-scrollbar items-start">
                        {statusLists.map(column => (
                            <div key={column.id} className="flex-shrink-0 w-80 bg-slate-100/50 rounded-2xl flex flex-col max-h-full border border-slate-200/50">
                                <div className="p-5 flex justify-between items-center shrink-0 border-b border-slate-200/20">
                                    <h3 className="font-bold text-slate-500 uppercase text-[12px] tracking-[0.2em] flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${column.color}`}></span>
                                        {column.label}
                                    </h3>
                                    <span className="bg-white border border-slate-200 text-slate-400 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        {filteredTasks.filter(t => t.status === column.id).length}
                                    </span>
                                </div>

                                <div className="flex-grow overflow-y-auto p-3 space-y-4 custom-scrollbar">
                                    {filteredTasks.filter(t => t.status === column.id).map(task => (
                                        <div key={task.id} onClick={() => handleTaskClick(task)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/40 transition-all cursor-pointer group">
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold uppercase tracking-wider">{task.demonstrativo}</span>
                                            <h4 className="text-[15px] font-bold text-slate-700 mt-2">{task.description}</h4>
                                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                                <div className="text-[11px] font-bold text-slate-400 uppercase">
                                                    {departments.find(d => d.id === task.departmentId)?.name || 'Geral'}
                                                </div>
                                                <div className="text-[11px] font-mono text-slate-400">
                                                    {formatTimeDisplay(task.tempo_estimado)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Modelos de Rotina Mensal</h2>
                                <p className="text-sm text-slate-500">Defina as tarefas que serão geradas automaticamente ao abrir um novo período.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsDeptModalOpen(true)} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50">Gerenciar Departamentos</button>
                                <button onClick={() => { setEditingTemplate({ id: `new_${Date.now()}`, description: '', demonstrativo: 'DRE', dia_referencia: 1, tipo_data: 'util', prioridade: 'media', responsavel_ids: [], departmentId: '', tempo_estimado: '', passo_a_passo: '' }); setIsTemplateModalOpen(true); }} className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:brightness-110 shadow-md transition-all">+ Novo Modelo de Tarefa</button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto p-8">
                             <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Descrição</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Departamento</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Estimativa</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {templates.map(tpl => (
                                        <tr key={tpl.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 text-sm font-bold text-slate-700">{tpl.description}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{departments.find(d => d.id === tpl.departmentId)?.name || 'Geral'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                                {formatTimeDisplay(tpl.tempo_estimado)}
                                            </td>
                                            <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingTemplate(tpl); setIsTemplateModalOpen(true); }} className="text-primary hover:underline font-bold text-sm mr-4">Editar</button>
                                                <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-red-500 hover:underline font-bold text-sm">Excluir</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {templates.length === 0 && <tr><td colSpan={4} className="py-20 text-center text-slate-400 italic">Nenhum modelo cadastrado.</td></tr>}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}
            </div>

            {isDeptModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                            <h3 className="text-xl font-bold text-slate-800">Gerenciar Departamentos</h3>
                            <button onClick={() => setIsDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-8 space-y-6 flex-grow overflow-y-auto">
                            <div className="flex gap-2">
                                <input type="text" placeholder="Novo departamento..." className="flex-grow h-12 border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none border" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}/>
                                <button onClick={handleAddDepartment} className="px-6 bg-primary text-white font-bold rounded-xl h-12">Adicionar</button>
                            </div>
                            <div className="space-y-2">
                                {departments.map(d => (
                                    <div key={d.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                        <span className="font-bold text-slate-700">{d.name}</span>
                                        <button onClick={() => setDeptToDelete(d)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isTemplateModalOpen && editingTemplate && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleSaveTemplate} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleIn">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <h3 className="text-xl font-bold text-slate-800">{editingTemplate.id.startsWith('new_') ? 'Novo Modelo de Tarefa' : 'Editar Modelo'}</h3>
                            <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto bg-slate-50/30">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Descrição (Título)</label>
                                    <input type="text" required placeholder="Ex: Validação do Resultado" className="w-full h-12 border-slate-200 rounded-xl px-4 text-sm font-medium focus:border-primary outline-none border shadow-sm bg-white" value={editingTemplate.description} onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Departamento</label>
                                        <StyledSelect value={editingTemplate.departmentId || ''} onChange={e => setEditingTemplate({...editingTemplate, departmentId: e.target.value})} containerClassName="w-full" className="h-12 pl-4 bg-white border-slate-200">
                                            <option value="">Selecione...</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </StyledSelect>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tempo Estimado</label>
                                        <DurationInput 
                                            value={editingTemplate.tempo_estimado || ''} 
                                            onChange={val => setEditingTemplate({...editingTemplate, tempo_estimado: val})} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <MultiSelectDropdown 
                                        label="Responsáveis Sugeridos" 
                                        placeholder="Filtrar Administradores/Gestores..."
                                        options={filteredUserOptions}
                                        selectedValues={editingTemplate.responsavel_ids || []}
                                        onChange={(vals) => setEditingTemplate({...editingTemplate, responsavel_ids: vals})}
                                        className="w-full"
                                    />
                                    <p className="text-[10px] text-slate-400 ml-1 mt-1 font-medium">Apenas usuários Admin ou Gestores podem ser responsáveis.</p>
                                </div>
                            </div>
                            <div className="space-y-1 pt-4 border-t border-slate-100">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Manual / Passo a Passo</label>
                                <textarea rows={6} placeholder="Descreva o procedimento detalhado para esta tarefa..." className="w-full border-slate-200 rounded-xl p-4 text-sm font-medium focus:border-primary outline-none border shadow-sm bg-white resize-none" value={editingTemplate.passo_a_passo || ''} onChange={e => setEditingTemplate({...editingTemplate, passo_a_passo: e.target.value})} />
                            </div>
                        </div>
                        <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-6 h-12 bg-white border border-slate-300 rounded-xl font-bold text-slate-600">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="px-10 h-12 bg-primary text-white font-bold rounded-xl shadow-lg hover:brightness-110 transform active:scale-95 transition-all">{isSaving ? 'Salvando...' : 'Confirmar e Salvar'}</button>
                        </div>
                    </form>
                </div>
            )}

            {deptToDelete && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl p-10 max-w-md w-full text-center border border-slate-200">
                        <h3 className="text-2xl font-black text-slate-800 mb-3">Excluir Departamento?</h3>
                        <p className="text-slate-500 mb-8 font-medium">Você está excluindo o departamento <strong>{deptToDelete.name}</strong>.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setDeptToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                            <button onClick={handleConfirmDeleteDept} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg transition-all transform active:scale-95">Sim, Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ClosingModuleView;
