import React, { useState, useEffect, useMemo } from 'react';
import { BudgetAssumption, BudgetFormula, BudgetMapping, FinancialAccount, DreAccount, OperationalIndicator } from '../types';
import StyledSelect from './StyledSelect';
import { generateUUID } from '../utils/helpers';

interface BudgetAssumptionsViewProps {
  assumptions: BudgetAssumption[];
  onSaveAssumptions: (updatedAssumptions: BudgetAssumption[]) => Promise<void>;
  onNavigateBack: () => void;
  formulas?: BudgetFormula[];
  financialAccounts?: FinancialAccount[];
  onSaveFormula?: (formula: BudgetFormula) => Promise<void>;
  onDeleteFormula?: (id: string) => Promise<void>;
  availableDepartments?: string[];
  dreAccounts?: DreAccount[];
  operationalIndicators?: OperationalIndicator[];
  budgetMappings?: BudgetMapping[];
  onSaveMapping?: (mapping: BudgetMapping) => Promise<void>;
  onDeleteMapping?: (id: string) => Promise<void>;
}

const BudgetAssumptionsView: React.FC<BudgetAssumptionsViewProps> = ({ 
    assumptions, 
    onSaveAssumptions, 
    onNavigateBack,
    formulas = [],
    financialAccounts = [],
    onSaveFormula,
    onDeleteFormula,
    availableDepartments = [],
    dreAccounts = [],
    operationalIndicators = [],
    budgetMappings = [],
    onSaveMapping,
    onDeleteMapping,
}) => {
    const [activeTab, setActiveTab] = useState<'definitions' | 'mappings' | 'formulas'>('definitions');
    
    const [editableAssumptions, setEditableAssumptions] = useState<BudgetAssumption[]>([]);
    const [isSavingDefinitions, setIsSavingDefinitions] = useState(false);

    const [editableMappings, setEditableMappings] = useState<BudgetMapping[]>([]);
    const [isSavingMappings, setIsSavingMappings] = useState(false);

    const [editableFormulas, setEditableFormulas] = useState<BudgetFormula[]>([]);
    const [isSavingFormulas, setIsSavingFormulas] = useState(false);

    useEffect(() => {
        setEditableAssumptions(JSON.parse(JSON.stringify(assumptions)));
    }, [assumptions]);

    useEffect(() => {
        setEditableMappings(JSON.parse(JSON.stringify(budgetMappings)));
    }, [budgetMappings]);

    useEffect(() => {
        setEditableFormulas(JSON.parse(JSON.stringify(formulas)));
    }, [formulas]);

    const handleFieldChange = (id: string, field: keyof BudgetAssumption, value: string) => {
        setEditableAssumptions(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const handleRemoveDefinition = (id: string) => {
        if (confirm('Tem certeza que deseja remover esta premissa? Mapeamentos que a utilizam serão afetados.')) {
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

    const handleAddMapping = () => {
        const newMapping: BudgetMapping = {
            id: generateUUID(),
            premissaId: assumptions[0]?.id || '',
            tipoDestino: 'conta_dre',
            contaDreId: '',
            indicadorId: undefined,
            departamentoId: undefined,
            fatorMultiplicador: 1,
            tipoCalculo: 'direto',
            formula: '',
            ativo: true,
        };
        setEditableMappings(prev => [...prev, newMapping]);
    };

    const handleMappingChange = (id: string, field: keyof BudgetMapping, value: any) => {
        setEditableMappings(prev => prev.map(m => {
            if (m.id !== id) return m;
            const updated = { ...m, [field]: value };
            if (field === 'tipoDestino') {
                updated.contaDreId = undefined;
                updated.indicadorId = undefined;
            }
            return updated;
        }));
    };

    const handleSaveMapping = async (mapping: BudgetMapping) => {
        const hasDestino = mapping.tipoDestino === 'conta_dre' 
            ? !!mapping.contaDreId 
            : !!mapping.indicadorId;
        
        if (!mapping.premissaId || !hasDestino) {
            alert('Selecione a Premissa e o Destino (Conta DRE ou Operacional).');
            return;
        }
        if (onSaveMapping) {
            setIsSavingMappings(true);
            await onSaveMapping(mapping);
            setIsSavingMappings(false);
        }
    };

    const handleDeleteMapping = async (id: string) => {
        if (onDeleteMapping && confirm('Excluir este mapeamento?')) {
            setIsSavingMappings(true);
            await onDeleteMapping(id);
            setEditableMappings(prev => prev.filter(m => m.id !== id));
            setIsSavingMappings(false);
        }
    };

    // --- FORMULA HANDLERS ---
    const handleAddFormula = () => {
        const newFormula: BudgetFormula = {
            id: generateUUID(),
            dreAccountId: dreAccounts[0]?.id || '',
            department: availableDepartments[0] || '',
            expression: '',
            description: '',
        };
        setEditableFormulas(prev => [...prev, newFormula]);
    };

    const handleFormulaChange = (id: string, field: keyof BudgetFormula, value: string) => {
        setEditableFormulas(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const handleSaveFormula = async (formula: BudgetFormula) => {
        if (!formula.dreAccountId || !formula.expression) {
            alert('Selecione a Conta DRE e defina a expressão.');
            return;
        }
        if (onSaveFormula) {
            setIsSavingFormulas(true);
            await onSaveFormula(formula);
            setIsSavingFormulas(false);
        }
    };

    const handleDeleteFormula = async (id: string) => {
        if (onDeleteFormula && confirm('Excluir esta fórmula?')) {
            setIsSavingFormulas(true);
            await onDeleteFormula(id);
            setEditableFormulas(prev => prev.filter(f => f.id !== id));
            setIsSavingFormulas(false);
        }
    };

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

    const dreAccountsList = useMemo(() => {
        if (dreAccounts.length > 0) return dreAccounts;
        return flatAccounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            economicGroupId: '',
        }));
    }, [dreAccounts, flatAccounts]);

    const getAssumptionName = (id: string) => {
        return assumptions.find(a => a.id === id)?.name || 'Premissa não encontrada';
    };

    const getDreAccountName = (id: string) => {
        const dre = dreAccountsList.find(a => a.id === id);
        if (dre) return dre.name;
        const flat = flatAccounts.find(a => a.id === id);
        return flat?.name || 'Conta não encontrada';
    };

    const inputClasses = "w-full bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition";

    return (
        <main className="flex-grow flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-app)' }}>
            <div className="bg-white px-6 py-4 border-b border-slate-200 shrink-0 flex justify-between items-center">
                <div className="flex space-x-4">
                    <button 
                        onClick={() => setActiveTab('definitions')}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'definitions' ? 'text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        style={activeTab === 'definitions' ? { backgroundColor: 'var(--color-primary)' } : {}}
                    >
                        1. Cadastro de Premissas
                    </button>
                    <button 
                        onClick={() => setActiveTab('mappings')}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'mappings' ? 'text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        style={activeTab === 'mappings' ? { backgroundColor: 'var(--color-primary)' } : {}}
                    >
                        2. Vincular às Contas DRE
                    </button>
                    <button 
                        onClick={() => setActiveTab('formulas')}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'formulas' ? 'text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        style={activeTab === 'formulas' ? { backgroundColor: 'var(--color-primary)' } : {}}
                    >
                        3. Fórmulas de Cálculo
                    </button>
                </div>
                <button onClick={onNavigateBack} className="text-sm text-slate-500 hover:text-slate-800 font-semibold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Voltar
                </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 lg:p-8">
                
                {activeTab === 'definitions' && (
                    <div className="max-w-4xl mx-auto bg-white p-6 border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Cadastro de Premissas</h2>
                                <p className="text-sm text-slate-500">Defina as variáveis do seu negócio (ex: Qtde Vendas, Ticket Médio, Taxa Imposto).</p>
                            </div>
                            <button onClick={handleAddDefinition} className="px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-sm hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)' }}>+ Nova Premissa</button>
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
                            <button onClick={handleSaveDefinitions} disabled={isSavingDefinitions} className="px-6 py-2 text-white font-semibold rounded-lg shadow-sm hover:opacity-90 disabled:bg-slate-400" style={{ backgroundColor: isSavingDefinitions ? undefined : 'var(--color-primary)' }}>{isSavingDefinitions ? 'Salvando...' : 'Salvar Definições'}</button>
                        </div>
                    </div>
                )}

                {activeTab === 'mappings' && (
                    <div className="max-w-6xl mx-auto bg-white p-6 border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Vincular Premissas ao DRE</h2>
                                <p className="text-sm text-slate-500">Defina como cada premissa afeta as linhas do seu DRE orçamentário (contas financeiras ou indicadores operacionais).</p>
                            </div>
                            <button 
                                onClick={handleAddMapping} 
                                disabled={assumptions.length === 0}
                                className="px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-sm hover:opacity-90 disabled:bg-slate-400" 
                                style={{ backgroundColor: assumptions.length > 0 ? 'var(--color-primary)' : undefined }}
                            >
                                + Novo Vínculo
                            </button>
                        </div>

                        {assumptions.length === 0 && (
                            <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-yellow-700 font-medium">Cadastre premissas primeiro na aba anterior.</p>
                            </div>
                        )}

                        {assumptions.length > 0 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-14 gap-2 px-4 py-2 bg-slate-100 text-xs font-semibold text-slate-600 uppercase">
                                    <div className="col-span-3">Premissa</div>
                                    <div className="col-span-2">Tipo Destino</div>
                                    <div className="col-span-4">Destino</div>
                                    <div className="col-span-2">Tipo Cálculo</div>
                                    <div className="col-span-2">Fator</div>
                                    <div className="col-span-1 text-center">Ações</div>
                                </div>

                                {editableMappings.map((mapping) => (
                                    <div key={mapping.id} className="grid grid-cols-14 gap-2 items-center p-4 bg-slate-50 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="col-span-3">
                                            <StyledSelect 
                                                value={mapping.premissaId} 
                                                onChange={(e) => handleMappingChange(mapping.id, 'premissaId', e.target.value)}
                                                containerClassName="w-full"
                                            >
                                                <option value="">Selecione...</option>
                                                {assumptions.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </StyledSelect>
                                        </div>
                                        <div className="col-span-2">
                                            <StyledSelect 
                                                value={mapping.tipoDestino || 'conta_dre'} 
                                                onChange={(e) => handleMappingChange(mapping.id, 'tipoDestino', e.target.value)}
                                                containerClassName="w-full"
                                            >
                                                <option value="conta_dre">Conta DRE</option>
                                                <option value="indicador_operacional">Operacional</option>
                                            </StyledSelect>
                                        </div>
                                        <div className="col-span-4">
                                            {(mapping.tipoDestino || 'conta_dre') === 'conta_dre' ? (
                                                <StyledSelect 
                                                    value={mapping.contaDreId || ''} 
                                                    onChange={(e) => handleMappingChange(mapping.id, 'contaDreId', e.target.value)}
                                                    containerClassName="w-full"
                                                >
                                                    <option value="">Selecione a Conta DRE...</option>
                                                    {dreAccountsList.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                    ))}
                                                </StyledSelect>
                                            ) : (
                                                <StyledSelect 
                                                    value={mapping.indicadorId || ''} 
                                                    onChange={(e) => handleMappingChange(mapping.id, 'indicadorId', e.target.value)}
                                                    containerClassName="w-full"
                                                >
                                                    <option value="">Selecione o Operacional...</option>
                                                    {operationalIndicators.map(ind => (
                                                        <option key={ind.id} value={ind.id}>{ind.nome} ({ind.unidadeMedida})</option>
                                                    ))}
                                                </StyledSelect>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <StyledSelect 
                                                value={mapping.tipoCalculo} 
                                                onChange={(e) => handleMappingChange(mapping.id, 'tipoCalculo', e.target.value)}
                                                containerClassName="w-full"
                                            >
                                                <option value="direto">Direto</option>
                                                <option value="formula">Fórmula</option>
                                                <option value="percentual">Percentual</option>
                                            </StyledSelect>
                                        </div>
                                        <div className="col-span-2">
                                            {mapping.tipoCalculo === 'direto' && (
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={mapping.fatorMultiplicador} 
                                                    onChange={(e) => handleMappingChange(mapping.id, 'fatorMultiplicador', parseFloat(e.target.value) || 1)}
                                                    className={inputClasses}
                                                    placeholder="Fator (ex: 1)"
                                                />
                                            )}
                                            {mapping.tipoCalculo === 'percentual' && (
                                                <div className="flex items-center">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={mapping.fatorMultiplicador} 
                                                        onChange={(e) => handleMappingChange(mapping.id, 'fatorMultiplicador', parseFloat(e.target.value) || 0)}
                                                        className={inputClasses}
                                                        placeholder="%"
                                                    />
                                                    <span className="ml-1 text-slate-500">%</span>
                                                </div>
                                            )}
                                            {mapping.tipoCalculo === 'formula' && (
                                                <input 
                                                    type="text" 
                                                    value={mapping.formula || ''} 
                                                    onChange={(e) => handleMappingChange(mapping.id, 'formula', e.target.value)}
                                                    className={inputClasses}
                                                    placeholder="volume * preco"
                                                />
                                            )}
                                        </div>
                                        <div className="col-span-1 flex justify-center gap-1">
                                            <button 
                                                onClick={() => handleSaveMapping(mapping)} 
                                                disabled={isSavingMappings}
                                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full"
                                                title="Salvar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteMapping(mapping.id)} 
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                title="Excluir"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {editableMappings.length === 0 && (
                                    <p className="text-center text-slate-400 py-8">Nenhum vínculo criado. Clique em "+ Novo Vínculo" para começar.</p>
                                )}
                            </div>
                        )}

                        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="text-sm font-semibold text-blue-800 mb-2">Como funciona o vínculo?</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h5 className="text-xs font-semibold text-blue-700 mb-1">Tipos de Destino:</h5>
                                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                                        <li><strong>Conta DRE:</strong> Vincula a uma conta financeira (Receita, Custo, etc.)</li>
                                        <li><strong>Operacional:</strong> Vincula a um indicador operacional (Volume de Vendas, etc.)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-xs font-semibold text-blue-700 mb-1">Tipos de Cálculo:</h5>
                                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                                        <li><strong>Direto:</strong> O valor × fator vai para o destino</li>
                                        <li><strong>Percentual:</strong> Calcula X% do valor</li>
                                        <li><strong>Fórmula:</strong> Expressões como <code className="bg-blue-100 px-1 rounded">volume * preco</code></li>
                                    </ul>
                                </div>
                            </div>
                            <p className="text-xs text-blue-600 mt-3 border-t border-blue-200 pt-2">
                                <strong>Exemplo:</strong> A premissa "Volume de Vendas" pode ter 2 vínculos: 
                                (1) Para o indicador "Volume de Vendas" como Direto×1, 
                                (2) Para a conta "Receita de Veículos" como Fórmula = volume × preço_médio
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'formulas' && (
                    <div className="max-w-6xl mx-auto bg-white p-6 border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Fórmulas de Cálculo</h2>
                                <p className="text-sm text-slate-500">Defina expressões para calcular linhas do DRE automaticamente (ex: Faturamento = Volume × Ticket Médio).</p>
                            </div>
                            <button 
                                onClick={handleAddFormula} 
                                disabled={dreAccounts.length === 0}
                                className="px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-sm hover:opacity-90 disabled:bg-slate-400" 
                                style={{ backgroundColor: dreAccounts.length > 0 ? 'var(--color-primary)' : undefined }}
                            >
                                + Nova Fórmula
                            </button>
                        </div>

                        {dreAccounts.length === 0 && (
                            <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-yellow-700 font-medium">Configure as contas DRE primeiro.</p>
                            </div>
                        )}

                        {dreAccounts.length > 0 && (
                            <div className="space-y-4">
                                {editableFormulas.map((formula) => (
                                    <div key={formula.id} className="p-4 bg-slate-50 rounded-lg border grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Conta DRE (Destino)</label>
                                            <StyledSelect 
                                                value={formula.dreAccountId} 
                                                onChange={(e) => handleFormulaChange(formula.id, 'dreAccountId', e.target.value)}
                                            >
                                                <option value="">Selecione...</option>
                                                {dreAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                ))}
                                            </StyledSelect>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
                                            <StyledSelect 
                                                value={formula.department} 
                                                onChange={(e) => handleFormulaChange(formula.id, 'department', e.target.value)}
                                            >
                                                <option value="">Todos</option>
                                                {availableDepartments.map(dep => (
                                                    <option key={dep} value={dep}>{dep}</option>
                                                ))}
                                            </StyledSelect>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Expressão</label>
                                            <input 
                                                type="text" 
                                                value={formula.expression} 
                                                onChange={(e) => handleFormulaChange(formula.id, 'expression', e.target.value)}
                                                className={inputClasses}
                                                placeholder="OPE[VOLUME] * OPE[TICKET_MEDIO]"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleSaveFormula(formula)}
                                                disabled={isSavingFormulas}
                                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full"
                                                title="Salvar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteFormula(formula.id)}
                                                disabled={isSavingFormulas}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                title="Excluir"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {editableFormulas.length === 0 && (
                                    <p className="text-center text-slate-400 py-8">Nenhuma fórmula criada. Clique em "+ Nova Fórmula" para começar.</p>
                                )}
                            </div>
                        )}

                        <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <h4 className="text-sm font-semibold text-emerald-800 mb-2">Como usar as fórmulas?</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h5 className="text-xs font-semibold text-emerald-700 mb-1">Sintaxe:</h5>
                                    <ul className="text-xs text-emerald-700 space-y-1 list-disc list-inside">
                                        <li><code className="bg-emerald-100 px-1 rounded">OPE[CODIGO]</code> - Indicador operacional pelo código</li>
                                        <li><code className="bg-emerald-100 px-1 rounded">DRE[CODIGO]</code> - Valor de outra linha DRE</li>
                                        <li>Operadores: <code className="bg-emerald-100 px-1 rounded">+ - * / ( )</code></li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="text-xs font-semibold text-emerald-700 mb-1">Exemplos:</h5>
                                    <ul className="text-xs text-emerald-700 space-y-1 list-disc list-inside">
                                        <li><code className="bg-emerald-100 px-1 rounded">OPE[VOLUME] * OPE[TICKET_MEDIO]</code> → Faturamento</li>
                                        <li><code className="bg-emerald-100 px-1 rounded">DRE[FATURAMENTO] * OPE[MARGEM_BRUTA]</code> → Lucro Bruto</li>
                                        <li><code className="bg-emerald-100 px-1 rounded">DRE[RECEITA] - DRE[CUSTO]</code> → Resultado</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default BudgetAssumptionsView;
