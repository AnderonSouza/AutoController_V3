import React, { useState, useEffect, useMemo } from 'react';
import { BudgetAssumption, BudgetFormula, FinancialAccount } from '../types';
import StyledSelect from './StyledSelect';
import { generateUUID } from '../utils/helpers';

interface BudgetAssumptionsViewProps {
  assumptions: BudgetAssumption[];
  onSaveAssumptions: (updatedAssumptions: BudgetAssumption[]) => Promise<void>;
  onNavigateBack: () => void;
  // New props for Formulas
  formulas?: BudgetFormula[];
  financialAccounts?: FinancialAccount[]; // For dropdown in formula builder
  onSaveFormula?: (formula: BudgetFormula) => Promise<void>;
  onDeleteFormula?: (id: string) => Promise<void>;
  availableDepartments?: string[];
}

const BudgetAssumptionsView: React.FC<BudgetAssumptionsViewProps> = ({ 
    assumptions, 
    onSaveAssumptions, 
    onNavigateBack,
    formulas = [],
    financialAccounts = [],
    onSaveFormula,
    onDeleteFormula,
    availableDepartments = []
}) => {
    const [activeTab, setActiveTab] = useState<'definitions' | 'formulas'>('definitions');
    
    // Definitions State
    const [editableAssumptions, setEditableAssumptions] = useState<BudgetAssumption[]>([]);
    const [isSavingDefinitions, setIsSavingDefinitions] = useState(false);

    // Formulas State
    const [editableFormulas, setEditableFormulas] = useState<BudgetFormula[]>([]);
    const [isSavingFormulas, setIsSavingFormulas] = useState(false);

    useEffect(() => {
        setEditableAssumptions(JSON.parse(JSON.stringify(assumptions)));
    }, [assumptions]);

    useEffect(() => {
        setEditableFormulas(JSON.parse(JSON.stringify(formulas)));
    }, [formulas]);

    // --- DEFINITIONS HANDLERS ---
    const handleFieldChange = (id: string, field: keyof BudgetAssumption, value: string) => {
        setEditableAssumptions(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const handleRemoveDefinition = (id: string) => {
        if (confirm('Tem certeza que deseja remover esta premissa? Fórmulas que a utilizam quebrarão.')) {
            setEditableAssumptions(prev => prev.filter(a => a.id !== id));
        }
    };

    const handleAddDefinition = () => {
        const newAssumption: BudgetAssumption = {
            id: generateUUID(),
            name: '',
            type: 'number',
        };
        setEditableAssumptions(prev => [...prev, newAssumption]);
    };

    const handleSaveDefinitions = async () => {
        if (editableAssumptions.some(a => !a.name.trim())) {
            alert('O nome da premissa não pode estar em branco.');
            return;
        }
        setIsSavingDefinitions(true);
        await onSaveAssumptions(editableAssumptions);
        setIsSavingDefinitions(false);
    };

    // --- FORMULAS HANDLERS ---
    const handleAddFormula = () => {
        setEditableFormulas(prev => [...prev, {
            id: `new_formula_${Date.now()}`,
            dreAccountId: '',
            department: availableDepartments[0] || 'Todos',
            expression: ''
        }]);
    };

    const handleFormulaChange = (index: number, field: keyof BudgetFormula, value: string) => {
        setEditableFormulas(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSaveSingleFormula = async (formula: BudgetFormula) => {
        if (!formula.dreAccountId || !formula.expression.trim()) {
            alert("Preencha a Conta DRE e a Fórmula.");
            return;
        }
        if (onSaveFormula) {
            setIsSavingFormulas(true);
            await onSaveFormula(formula);
            setIsSavingFormulas(false);
            alert("Fórmula salva!");
        }
    };

    const handleDeleteSingleFormula = async (id: string) => {
        if (onDeleteFormula && confirm("Excluir esta fórmula?")) {
            setIsSavingFormulas(true);
            await onDeleteFormula(id);
            setEditableFormulas(prev => prev.filter(f => f.id !== id));
            setIsSavingFormulas(false);
        }
    };

    const insertTagIntoExpression = (index: number, assumptionId: string) => {
        const currentExpr = editableFormulas[index].expression || '';
        const tag = `[${assumptionId}]`; 
        handleFormulaChange(index, 'expression', currentExpr + tag);
    };

    // Flatten accounts for dropdown
    const flatAccounts = useMemo(() => {
        const list: FinancialAccount[] = [];
        const traverse = (nodes: FinancialAccount[]) => {
            for(const node of nodes) {
                list.push(node);
                if(node.children) traverse(node.children);
            }
        }
        traverse(financialAccounts);
        return list;
    }, [financialAccounts]);

    const inputClasses = "w-full bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition";

    return (
        <main className="flex-grow flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-app)' }}>
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 shrink-0 flex justify-between items-center">
                <div className="flex space-x-4">
                    <button 
                        onClick={() => setActiveTab('definitions')}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'definitions' ? 'bg-primary text-on-primary' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        1. Cadastro de Premissas
                    </button>
                    <button 
                        onClick={() => setActiveTab('formulas')}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'formulas' ? 'bg-primary text-on-primary' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        2. Criação de Fórmulas
                    </button>
                </div>
                <button onClick={onNavigateBack} className="text-sm text-slate-500 hover:text-slate-800 font-semibold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Voltar
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto p-6 lg:p-8">
                
                {/* TAB 1: DEFINITIONS */}
                {activeTab === 'definitions' && (
                    <div className="max-w-4xl mx-auto bg-white p-6 rounded-custom shadow-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Cadastro de Premissas</h2>
                                <p className="text-sm text-slate-500">Defina as variáveis do seu negócio (ex: Qtde Vendas, Ticket Médio, Taxa Imposto).</p>
                            </div>
                            <button onClick={handleAddDefinition} className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover shadow-sm">+ Nova Premissa</button>
                        </div>
                        <div className="space-y-4">
                            {editableAssumptions.map((assumption) => (
                                <div key={assumption.id} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 p-4 bg-slate-50 rounded-lg border">
                                    <div className="md:col-span-2">
                                        <label className="sr-only">Nome</label>
                                        <input type="text" value={assumption.name} onChange={(e) => handleFieldChange(assumption.id, 'name', e.target.value)} className={inputClasses} placeholder="Nome da premissa (ex: Volume de Vendas)" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StyledSelect value={assumption.type} onChange={(e) => handleFieldChange(assumption.id, 'type', e.target.value as any)} containerClassName="flex-grow">
                                            <option value="number">Número (1, 20, 500)</option>
                                            <option value="percentage">Percentual (%)</option>
                                            <option value="currency">Moeda (R$)</option>
                                        </StyledSelect>
                                        <button onClick={() => handleRemoveDefinition(assumption.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            ))}
                            {editableAssumptions.length === 0 && <p className="text-center text-slate-400 py-8">Nenhuma premissa cadastrada.</p>}
                        </div>
                        <div className="mt-6 flex justify-end border-t pt-4">
                            <button onClick={handleSaveDefinitions} disabled={isSavingDefinitions} className="px-6 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-hover shadow-sm disabled:bg-slate-400">{isSavingDefinitions ? 'Salvando...' : 'Salvar Definições'}</button>
                        </div>
                    </div>
                )}

                {/* TAB 2: FORMULAS */}
                {activeTab === 'formulas' && (
                    <div className="max-w-5xl mx-auto bg-white p-6 rounded-custom shadow-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Fórmulas de Cálculo</h2>
                                <p className="text-sm text-slate-500">Vincule contas do DRE a cálculos baseados em premissas.</p>
                            </div>
                            <button onClick={handleAddFormula} className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover shadow-sm">+ Nova Fórmula</button>
                        </div>

                        <div className="space-y-6">
                            {editableFormulas.map((formula, index) => (
                                <div key={formula.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                        {/* Target Account */}
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Conta DRE (Destino)</label>
                                            <StyledSelect 
                                                value={formula.dreAccountId} 
                                                onChange={(e) => handleFormulaChange(index, 'dreAccountId', e.target.value)}
                                                containerClassName="w-full"
                                            >
                                                <option value="">Selecione a Conta...</option>
                                                {flatAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id} disabled={acc.isTotal || acc.isSubTotal}>
                                                        {acc.name}
                                                    </option>
                                                ))}
                                            </StyledSelect>
                                        </div>
                                        
                                        {/* Scope */}
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Escopo (Depto)</label>
                                            <StyledSelect 
                                                value={formula.department} 
                                                onChange={(e) => handleFormulaChange(index, 'department', e.target.value)}
                                                containerClassName="w-full"
                                            >
                                                <option value="Todos">Todos os Departamentos</option>
                                                {availableDepartments.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </StyledSelect>
                                        </div>

                                        {/* Expression Builder */}
                                        <div className="md:col-span-12">
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fórmula Matemática</label>
                                            <div className="flex gap-2 mb-2 flex-wrap">
                                                {assumptions.map(asm => (
                                                    <button 
                                                        key={asm.id}
                                                        onClick={() => insertTagIntoExpression(index, asm.id)}
                                                        className="px-2 py-1 text-xs bg-white border border-slate-300 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                                        title="Clique para adicionar à fórmula"
                                                    >
                                                        {asm.name}
                                                    </button>
                                                ))}
                                                <span className="text-xs text-slate-400 self-center">| Operadores: + - * / ( )</span>
                                            </div>
                                            <textarea
                                                rows={2}
                                                value={formula.expression}
                                                onChange={(e) => handleFormulaChange(index, 'expression', e.target.value)}
                                                className="w-full p-3 border border-slate-300 rounded-lg font-mono text-sm text-slate-800 focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                                                placeholder="Ex: [assumption_id_1] * [assumption_id_2] * 0.10"
                                            />
                                            <div className="flex justify-between mt-2">
                                                <p className="text-[10px] text-slate-400">Use os botões acima para inserir as referências corretas das premissas.</p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleSaveSingleFormula(formula)} className="text-xs font-semibold text-green-600 hover:text-green-800 flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Salvar
                                                    </button>
                                                    <button onClick={() => handleDeleteSingleFormula(formula.id)} className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center ml-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {editableFormulas.length === 0 && <p className="text-center text-slate-400 py-8">Nenhuma fórmula criada.</p>}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default BudgetAssumptionsView;
