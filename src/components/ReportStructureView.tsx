import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ReportTemplate, ReportLine, DreAccount, BalanceSheetAccount } from '../types';
import StyledSelect from './StyledSelect';
import SearchableSelect from './SearchableSelect';
import { generateUUID } from '../utils/helpers';
import { getCadastroTenant } from '../utils/db';

interface OperationalFormulaOption {
    id: string;
    codigo: string;
    nome: string;
    unidadeMedida?: string;
    tipo?: 'indicator' | 'formula';
}

interface ReportStructureViewProps {
    reportTemplate: ReportTemplate;
    lines: ReportLine[];
    dreAccounts: DreAccount[];
    balanceSheetAccounts: BalanceSheetAccount[]; 
    tenantId?: string;
    onSaveStructure: (lines: ReportLine[]) => Promise<void>;
    onDeleteLine: (id: string) => Promise<void>;
    onNavigateBack: () => void;
}

interface FormulaItem {
    lineId: string;
    sign: 1 | -1;
}

// Componente Interno para Botões de Movimento com Tooltip
const MoveButton: React.FC<{
    onClick: () => void;
    disabled: boolean;
    icon: React.ReactNode;
    tooltip: string;
    tooltipAlign?: 'center' | 'left';
}> = ({ onClick, disabled, icon, tooltip, tooltipAlign = 'center' }) => (
    <div className="relative group flex items-center justify-center">
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }} 
            disabled={disabled}
            className={`
                p-1.5 rounded-md transition-all duration-200 border border-transparent outline-none
                ${disabled 
                    ? 'opacity-30 cursor-not-allowed text-slate-300' 
                    : 'text-slate-400 hover:text-primary hover:bg-primary-50 active:scale-95'
                }
            `}
            type="button"
            aria-label={tooltip}
        >
            {icon}
        </button>
        {/* Tooltip Customizado (CSS) - Só renderiza se não estiver desabilitado */}
        {!disabled && (
            <div 
                className={`
                    absolute bottom-full mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg
                    ${tooltipAlign === 'left' ? 'left-0' : 'left-1/2 transform -translate-x-1/2'}
                `}
            >
                {tooltip}
                {/* Seta do Tooltip */}
                <div 
                    className={`
                        absolute top-full border-4 border-transparent border-t-slate-800
                        ${tooltipAlign === 'left' ? 'left-2' : 'left-1/2 transform -translate-x-1/2'}
                    `}
                ></div>
            </div>
        )}
    </div>
);

// Componente para Botões de Ação da Linha
const ActionButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    active?: boolean;
    title: string;
    variant?: 'default' | 'danger';
}> = ({ onClick, icon, active, title, variant = 'default' }) => (
    <div className="relative group">
        <button 
            onClick={onClick} 
            className={`
                w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 shadow-sm
                ${variant === 'danger' 
                    ? 'border-slate-300 text-slate-400 hover:border-red-500 hover:bg-red-500 hover:text-white' 
                    : active
                        ? 'bg-primary text-white border-primary hover:opacity-90'
                        : 'bg-white border-slate-300 text-slate-400 hover:border-primary hover:bg-primary hover:text-white'
                }
            `}
            aria-label={title}
        >
            {icon}
        </button>
        {/* Tooltip simples ao passar o mouse - aparece para baixo */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-lg">
            {title}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
        </div>
    </div>
);

// Helper para calcular códigos de exibição (1, 1.1, 1.1.1)
const calculateDisplayCodes = (lines: ReportLine[]): Map<string, string> => {
    const codeMap = new Map<string, string>();
    const build = (parentId: string | null, prefix: string) => {
        const children = lines
            .filter(l => l.parentId === parentId)
            .sort((a, b) => a.order - b.order);
        
        children.forEach((child, index) => {
            const code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
            codeMap.set(child.id, code);
            build(child.id, code);
        });
    };
    build(null, '');
    return codeMap;
};

const StructureItemInput: React.FC<{ 
    value: string; 
    onChange: (val: string) => void; 
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}> = ({ value, onChange, className, placeholder, disabled }) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => { setLocalValue(value); }, [value]);

    const handleBlur = () => {
        if (localValue !== value) onChange(localValue);
    };

    return (
        <input 
            type="text" 
            value={localValue} 
            onChange={e => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            className={className}
            placeholder={placeholder}
            disabled={disabled}
        />
    );
};

const ReportStructureView: React.FC<ReportStructureViewProps> = ({ 
    reportTemplate, 
    lines: initialLines, 
    dreAccounts, 
    balanceSheetAccounts,
    tenantId,
    onSaveStructure,
    onDeleteLine,
    onNavigateBack 
}) => {
    const [lines, setLines] = useState<ReportLine[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [operationalOptions, setOperationalOptions] = useState<OperationalFormulaOption[]>([]);
    
    // Modals
    const [lineToDelete, setLineToDelete] = useState<ReportLine | null>(null);
    const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);

    const listContainerRef = useRef<HTMLDivElement>(null);

    const loadOperationalOptions = useCallback(async () => {
        if (!tenantId) return;
        try {
            // Load both operational indicators and formulas
            const [indicatorsData, formulasData] = await Promise.all([
                getCadastroTenant("operational_indicators", tenantId),
                getCadastroTenant("operational_formulas", tenantId)
            ]);
            
            // Map indicators with prefix OPE
            const mappedIndicators: OperationalFormulaOption[] = (indicatorsData || [])
                .filter((row: any) => row.ativo !== false)
                .map((row: any) => ({
                    id: `OPE:${row.id}`,
                    codigo: row.codigo,
                    nome: row.nome,
                    unidadeMedida: row.unidade_medida,
                    tipo: 'indicator' as const
                }));
            
            // Map formulas with prefix FORM
            const mappedFormulas: OperationalFormulaOption[] = (formulasData || [])
                .filter((row: any) => row.ativo !== false)
                .map((row: any) => ({
                    id: `FORM:${row.id}`,
                    codigo: row.codigo,
                    nome: row.nome,
                    unidadeMedida: row.unidade_medida,
                    tipo: 'formula' as const
                }));
            
            // Combine and sort by code
            const combined = [...mappedIndicators, ...mappedFormulas].sort((a, b) => 
                a.codigo.localeCompare(b.codigo)
            );
            
            setOperationalOptions(combined);
        } catch (err) {
            console.error("Error loading operational options:", err);
        }
    }, [tenantId]);

    useEffect(() => {
        loadOperationalOptions();
    }, [loadOperationalOptions]);

    useEffect(() => {
        // Ordena inicial
        const sorted = [...initialLines].sort((a, b) => a.order - b.order);
        setLines(JSON.parse(JSON.stringify(sorted)));
        
        // Auto-expandir tudo
        if (sorted.length < 500) {
            setExpandedItems(new Set(sorted.map(l => l.id)));
        }
    }, [initialLines]);

    const displayCodes = useMemo(() => calculateDisplayCodes(lines), [lines]);

    const sourceAccountsList = useMemo(() => {
        if (reportTemplate.type === 'CASH_FLOW' || reportTemplate.type === 'BALANCE_SHEET') {
            return balanceSheetAccounts;
        }
        return dreAccounts;
    }, [reportTemplate.type, dreAccounts, balanceSheetAccounts]);

    // Calcular IDs de contas já usadas no relatório (para evitar duplicação)
    const usedAccountIds = useMemo(() => {
        const usedIds = new Set<string>();
        lines.forEach(line => {
            if (line.type === 'data_bucket' && line.dreAccountId) {
                usedIds.add(line.dreAccountId);
            }
        });
        return usedIds;
    }, [lines]);

    // Função para obter lista de contas com marcação de "já usada"
    const getAccountOptionsForLine = (currentLineId: string) => {
        const currentLine = lines.find(l => l.id === currentLineId);
        const currentAccountId = currentLine?.dreAccountId;
        
        return sourceAccountsList.map(a => ({
            id: a.id,
            name: a.name,
            // Conta está desabilitada se já estiver em uso E não for a conta da linha atual
            disabled: usedAccountIds.has(a.id) && a.id !== currentAccountId,
            suffix: usedAccountIds.has(a.id) && a.id !== currentAccountId ? 'Em uso' : undefined
        }));
    };

    // --- FLATTEN TREE LOGIC ---
    // Cria uma lista plana visual, mas mantém a referência de profundidade e parentesco
    const flatList = useMemo(() => {
        const result: Array<ReportLine & { level: number; hasChildren: boolean; isLastChild: boolean; isFirstChild: boolean }> = [];
        
        const process = (parentId: string | null, level: number) => {
            const children = lines
                .filter(l => l.parentId === parentId)
                .sort((a, b) => a.order - b.order);
            
            children.forEach((child, index) => {
                const grandChildren = lines.filter(l => l.parentId === child.id);
                result.push({ 
                    ...child, 
                    level, 
                    hasChildren: grandChildren.length > 0,
                    isFirstChild: index === 0,
                    isLastChild: index === children.length - 1
                });
                
                if (expandedItems.has(child.id)) {
                    process(child.id, level + 1);
                }
            });
        };
        
        process(null, 0);
        return result;
    }, [lines, expandedItems]);

    // --- CORE LOGIC: NORMALIZE ORDERS ---
    // Garante que a ordem seja sempre sequencial (0, 1, 2) para evitar buracos
    const normalizeOrders = (items: ReportLine[]) => {
        const groups = new Map<string | null, ReportLine[]>();
        
        // Group
        items.forEach(item => {
            const pid = item.parentId || 'root';
            if (!groups.has(pid)) groups.set(pid, []);
            groups.get(pid)!.push(item);
        });

        // Sort and re-index
        groups.forEach(group => {
            group.sort((a, b) => a.order - b.order);
            group.forEach((item, index) => {
                item.order = index;
            });
        });
        
        return items;
    };

    // --- MOVEMENT HANDLERS ---

    const handleMove = (id: string, direction: 'up' | 'down' | 'left' | 'right') => {
        let currentLines = JSON.parse(JSON.stringify(lines)) as ReportLine[];
        const targetItem = currentLines.find(l => l.id === id);
        if (!targetItem) return;

        const siblings = currentLines
            .filter(l => l.parentId === targetItem.parentId)
            .sort((a, b) => a.order - b.order);
        
        const currentIndex = siblings.findIndex(l => l.id === id);

        if (direction === 'up') {
            if (currentIndex > 0) {
                const siblingAbove = siblings[currentIndex - 1];
                // Swap orders
                const tempOrder = targetItem.order;
                targetItem.order = siblingAbove.order;
                siblingAbove.order = tempOrder;
            }
        } 
        else if (direction === 'down') {
            if (currentIndex < siblings.length - 1) {
                const siblingBelow = siblings[currentIndex + 1];
                // Swap orders
                const tempOrder = targetItem.order;
                targetItem.order = siblingBelow.order;
                siblingBelow.order = tempOrder;
            }
        }
        else if (direction === 'right') { // Indent (Make Child)
            if (currentIndex > 0) {
                const siblingAbove = siblings[currentIndex - 1];
                
                targetItem.parentId = siblingAbove.id;
                
                // Set order to be the last of new parent
                const newSiblings = currentLines.filter(l => l.parentId === siblingAbove.id);
                targetItem.order = newSiblings.length; // Append to end
                
                // Auto expand the new parent
                setExpandedItems(prev => new Set(prev).add(siblingAbove.id));
            }
        }
        else if (direction === 'left') { // Outdent (Make Parent/Uncle)
            if (targetItem.parentId) {
                const currentParent = currentLines.find(l => l.id === targetItem.parentId);
                if (currentParent) {
                    targetItem.parentId = currentParent.parentId; // Move to grandparent
                    targetItem.order = currentParent.order + 1;   // Insert directly after old parent
                    
                    // Shift items below currentParent down to make space
                    const newSiblings = currentLines.filter(l => l.parentId === currentParent.parentId);
                    newSiblings.forEach(l => {
                        if (l.order > currentParent.order && l.id !== targetItem.id) {
                            l.order += 1;
                        }
                    });
                }
            }
        }

        const normalized = normalizeOrders(currentLines);
        setLines(normalized);
    };

    // --- CRUD ACTIONS ---

    const handleAddLine = (parentId: string | null = null) => {
        const siblings = lines.filter(l => l.parentId === parentId);
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) : -1;
        const now = new Date().toISOString();

        const newLine: ReportLine = {
            id: generateUUID(),
            reportId: reportTemplate.id,
            parentId: parentId,
            name: 'Nova Linha',
            code: '', 
            order: maxOrder + 1,
            type: 'data_bucket', 
            sign: 1,
            sourceAccounts: [],
            style: {},
            createdAt: now,
            updatedAt: now
        };
        
        const updatedLines = [...lines, newLine];
        setLines(updatedLines);
        if (parentId) {
            setExpandedItems(prev => new Set(prev).add(parentId));
        }
    };

    const confirmDeleteLine = async () => {
        if (!lineToDelete) return;
        setIsSaving(true);
        try {
            const idsToDelete = new Set<string>();
            const collectIds = (targetId: string) => {
                idsToDelete.add(targetId);
                lines.filter(l => l.parentId === targetId).forEach(child => collectIds(child.id));
            };
            collectIds(lineToDelete.id);
            
            const promises = Array.from(idsToDelete).map(id => onDeleteLine(id));
            await Promise.all(promises);

            setLines(prev => prev.filter(l => !idsToDelete.has(l.id)));
            setLineToDelete(null);
        } catch (error) {
            console.error("Erro ao excluir linha:", error);
            alert("Erro ao excluir linha.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateLine = (id: string, field: keyof ReportLine, value: any) => {
        setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value, updatedAt: new Date().toISOString() } : l));
    };

    const handleUpdateStyle = (id: string, styleField: keyof NonNullable<ReportLine['style']>, value: any) => {
        setLines(prev => prev.map(l => {
            if (l.id === id) {
                let newStyle = { ...l.style, [styleField]: value };
                return { ...l, style: newStyle, updatedAt: new Date().toISOString() };
            } else if (styleField === 'isVerticalAnalysisBase' && value === true) {
                return { ...l, style: { ...l.style, isVerticalAnalysisBase: false } };
            }
            return l;
        }));
    };

    const handleFormulaChange = (id: string, newItems: FormulaItem[]) => {
        const json = JSON.stringify(newItems);
        handleUpdateLine(id, 'formula', json);
    };

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        // Validar duplicatas antes de salvar
        const analyticalLines = lines.filter(l => l.type === 'data_bucket' && l.dreAccountId);
        const accountIdCounts = new Map<string, number>();
        analyticalLines.forEach(l => {
            const count = accountIdCounts.get(l.dreAccountId!) || 0;
            accountIdCounts.set(l.dreAccountId!, count + 1);
        });
        
        const duplicates = Array.from(accountIdCounts.entries()).filter(([_, count]) => count > 1);
        if (duplicates.length > 0) {
            const duplicateNames = duplicates.map(([accountId, _]) => {
                const acc = sourceAccountsList.find(a => a.id === accountId);
                return acc?.name || accountId;
            });
            alert(`Erro: As seguintes contas estão vinculadas a mais de uma linha:\n\n${duplicateNames.join('\n')}\n\nCada conta analítica só pode ser vinculada a uma única linha.`);
            return;
        }

        setIsSaving(true);
        try {
            await onSaveStructure(lines);
            alert('Estrutura salva com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar estrutura.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className="flex-grow p-6 lg:p-8 flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-app)' }}>
            <div className="max-w-[1600px] mx-auto w-full flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <button onClick={onNavigateBack} className="text-sm text-slate-600 hover:text-slate-900 font-semibold flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Voltar para Modelos
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden flex-grow">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Editor de estrutura: {reportTemplate.name}</h1>
                            <p className="text-sm text-slate-500">Use as setas para organizar a hierarquia e ordem das linhas.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleAddLine(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center">
                                + Nova linha raiz
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover disabled:bg-slate-400 transition-colors shadow-sm flex items-center">
                                {isSaving ? 'Salvando...' : 'Salvar estrutura'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
                        {/* ADICIONADO mr-4 para alinhar com as linhas abaixo */}
                        <div className="w-36 shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mr-4">Organização</div>
                        <div className="flex-grow grid grid-cols-12 gap-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <div className="col-span-2">Tipo de Linha</div>
                            <div className="col-span-1 text-center">Sinal</div>
                            <div className="col-span-5">Código e Nome</div>
                            <div className="col-span-3">Mapeamento / Fórmula / Opções</div>
                            {/* ALINHADO À DIREITA COM PADDING */}
                            <div className="col-span-1 text-right pr-4">Ações</div>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto bg-white custom-scrollbar" ref={listContainerRef}>
                        {flatList.map((line) => {
                            const isAnalytical = line.type === 'data_bucket';
                            const isFormula = line.type === 'formula';
                            const isOperational = line.type === 'operational';
                            const canNest = line.type === 'total' || line.type === 'header';
                            
                            const linkedAccount = isAnalytical && line.dreAccountId 
                                ? sourceAccountsList.find(a => a.id === line.dreAccountId) 
                                : null;
                            const displayName = linkedAccount ? linkedAccount.name : line.name;
                            const formulaCount = line.formula ? (JSON.parse(line.formula) as any[]).length : 0;

                            return (
                                <div 
                                    key={line.id}
                                    className={`
                                        flex items-center px-4 py-2 transition-all
                                        bg-white hover:bg-slate-50
                                        border-b border-slate-100
                                    `}
                                >
                                    {/* CONTROLES DE MOVIMENTO REVISADOS - Widened to w-36 */}
                                    <div className="w-36 shrink-0 flex items-center justify-center pr-3 border-r border-slate-100 mr-4">
                                        
                                        {/* Grupo: Hierarquia (Indentação) */}
                                        <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                                            <MoveButton 
                                                onClick={() => handleMove(line.id, 'left')} 
                                                disabled={!line.parentId}
                                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                                                tooltip="Recuar Nível"
                                                tooltipAlign="left" // Alinha à esquerda para não cortar
                                            />
                                            <MoveButton 
                                                onClick={() => handleMove(line.id, 'right')} 
                                                disabled={line.isFirstChild}
                                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>}
                                                tooltip="Avançar Nível"
                                            />
                                        </div>

                                        {/* Divider with extra margin */}
                                        <div className="w-px h-5 bg-slate-200 mx-2"></div>

                                        {/* Grupo: Ordem (Sequência) */}
                                        <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                                            <MoveButton 
                                                onClick={() => handleMove(line.id, 'up')} 
                                                disabled={line.isFirstChild}
                                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>}
                                                tooltip="Mover p/ Cima"
                                            />
                                            <MoveButton 
                                                onClick={() => handleMove(line.id, 'down')} 
                                                disabled={line.isLastChild}
                                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                                                tooltip="Mover p/ Baixo"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-grow grid grid-cols-12 gap-4 items-center">
                                        {/* Type Selector */}
                                        <div className="col-span-2">
                                            <StyledSelect 
                                                value={line.type} 
                                                onChange={e => handleUpdateLine(line.id, 'type', e.target.value)}
                                                className="py-1 pl-2 text-xs h-8 font-medium bg-transparent border-transparent hover:border-slate-300 focus:bg-white focus:border-primary rounded"
                                                containerClassName="w-full"
                                            >
                                                <option value="header">Grupo/Cabeçalho</option>
                                                <option value="total">Totalizador</option>
                                                <option value="data_bucket">Conta Analítica</option>
                                                <option value="formula">Fórmula</option>
                                                <option value="operational">Operacional</option>
                                            </StyledSelect>
                                        </div>

                                        {/* Sign Selector */}
                                        <div className="col-span-1">
                                            <select 
                                                value={line.sign} 
                                                onChange={e => handleUpdateLine(line.id, 'sign', parseInt(e.target.value))}
                                                className={`w-full rounded px-1 py-0.5 text-xs h-8 font-bold text-center border-transparent hover:border-slate-300 focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer ${line.sign === 1 ? 'text-green-600 bg-green-50/50' : 'text-red-600 bg-red-50/50'}`}
                                            >
                                                <option value={1}>( + )</option>
                                                <option value={-1}>( - )</option>
                                            </select>
                                        </div>

                                        {/* Name & Indentation */}
                                        <div className="col-span-5 flex items-center overflow-hidden">
                                            <div style={{ width: `${line.level * 20}px` }} className="shrink-0 transition-all duration-300 border-l border-slate-200 h-full mr-2"></div>

                                            <button 
                                                onClick={() => toggleExpand(line.id)}
                                                className={`w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 mr-1 shrink-0 ${line.hasChildren ? 'visible hover:bg-slate-200' : 'invisible'}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${expandedItems.has(line.id) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>

                                            <span className="text-[10px] font-mono text-slate-400 mr-2 shrink-0 select-none w-8 text-right truncate">
                                                {displayCodes.get(line.id)}
                                            </span>
                                            
                                            <StructureItemInput
                                                value={displayName}
                                                onChange={val => handleUpdateLine(line.id, 'name', val)}
                                                className={`w-full text-sm rounded px-2 py-1.5 focus:ring-1 focus:ring-primary focus:border-primary bg-transparent border border-transparent hover:border-slate-300 focus:bg-white truncate ${line.style?.bold ? 'font-bold' : ''} ${isAnalytical ? 'text-slate-600 italic' : 'text-slate-800'}`}
                                                placeholder="Nome da Linha"
                                                disabled={isAnalytical}
                                            />
                                        </div>

                                        {/* Mapping / Formula */}
                                        <div className="col-span-3 relative">
                                            {isAnalytical && (
                                                <SearchableSelect 
                                                    value={line.dreAccountId || ''} 
                                                    options={getAccountOptionsForLine(line.id)} 
                                                    onChange={(val) => {
                                                        // Validação extra: verificar se já está em uso
                                                        const currentAccountId = line.dreAccountId;
                                                        if (val && val !== currentAccountId && usedAccountIds.has(val)) {
                                                            alert('Esta conta já está vinculada a outra linha. Selecione uma conta diferente.');
                                                            return;
                                                        }
                                                        handleUpdateLine(line.id, 'dreAccountId', val);
                                                        const acc = sourceAccountsList.find(a => a.id === val);
                                                        if (acc) {
                                                            handleUpdateLine(line.id, 'name', acc.name);
                                                            handleUpdateLine(line.id, 'sourceAccounts', [val]); // Legacy compat
                                                        }
                                                    }}
                                                    placeholder="Vincular conta..."
                                                    className="w-full text-xs"
                                                />
                                            )}
                                            {isFormula && (
                                                <button 
                                                    onClick={() => setEditingFormulaId(line.id)}
                                                    className="w-full text-left px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-600 hover:border-primary hover:text-primary transition-colors flex justify-between items-center h-8"
                                                >
                                                    <span>{formulaCount > 0 ? `${formulaCount} itens na fórmula` : 'Configurar Fórmula'}</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            )}
                                            {isOperational && operationalOptions.length > 0 && (
                                                <SearchableSelect 
                                                    value={line.operationalFormulaId || ''} 
                                                    options={operationalOptions.map(f => ({
                                                        id: f.id,
                                                        name: `${f.codigo} - ${f.nome}`,
                                                        suffix: f.tipo === 'indicator' ? '📊 Indicador' : '🔢 Fórmula'
                                                    }))} 
                                                    onChange={(val) => {
                                                        handleUpdateLine(line.id, 'operationalFormulaId', val);
                                                        const option = operationalOptions.find(f => f.id === val);
                                                        if (option) {
                                                            handleUpdateLine(line.id, 'name', option.nome);
                                                        }
                                                    }}
                                                    placeholder="Selecionar indicador ou fórmula..."
                                                    className="w-full text-xs"
                                                />
                                            )}
                                            {isOperational && operationalOptions.length === 0 && (
                                                <span className="text-xs text-slate-400 italic">Nenhum indicador ou fórmula disponível</span>
                                            )}
                                            {!isAnalytical && !isFormula && !isOperational && line.type === 'total' && (
                                                // AUMENTADO mr-6 para mr-12 para dar mais espaço
                                                <div className="flex items-center justify-end h-8 mr-12"> 
                                                    <label className="flex items-center cursor-pointer select-none bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!line.style?.isVerticalAnalysisBase} 
                                                            onChange={(e) => handleUpdateStyle(line.id, 'isVerticalAnalysisBase', e.target.checked)}
                                                            className="custom-checkbox w-3.5 h-3.5 text-primary border-slate-300 rounded focus:ring-primary"
                                                        />
                                                        <span className={`ml-2 text-[10px] font-bold ${line.style?.isVerticalAnalysisBase ? 'text-primary' : 'text-slate-400'}`}>Base AV (100%)</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions - Aligned Right with Padding to avoid Scrollbar issues */}
                                        <div className="col-span-1 flex justify-end gap-1 pr-2">
                                            <ActionButton 
                                                onClick={() => handleUpdateStyle(line.id, 'bold', !line.style?.bold)}
                                                icon={<span className="font-serif font-bold text-sm">B</span>}
                                                active={line.style?.bold}
                                                title="Negrito"
                                            />
                                            {canNest && (
                                                <ActionButton 
                                                    onClick={() => handleAddLine(line.id)}
                                                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>}
                                                    title="Adicionar Filha"
                                                />
                                            )}
                                            <ActionButton 
                                                onClick={() => setLineToDelete(line)}
                                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}
                                                title="Excluir"
                                                variant="danger"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {flatList.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <p>Estrutura vazia.</p>
                                <button onClick={() => handleAddLine(null)} className="mt-2 text-primary hover:underline">Adicionar primeira linha</button>
                            </div>
                        )}
                        <div className="h-32"></div>
                    </div>
                </div>
            </div>

            {/* Formula Editor Modal */}
            {editingFormulaId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingFormulaId(null)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg border border-slate-200" onClick={e => e.stopPropagation()}>
                        {(() => {
                            const line = lines.find(l => l.id === editingFormulaId);
                            if (!line) return null;
                            const items: FormulaItem[] = line.formula ? JSON.parse(line.formula) : [];
                            const available = lines.filter(l => l.id !== line.id && (l.type === 'total' || l.type === 'header' || l.type === 'data_bucket')).map(l => ({
                                id: l.id,
                                name: `${displayCodes.get(l.id)} - ${l.name}`
                            }));

                            return (
                                <>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Editar Fórmula: {line.name}</h3>
                                    <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <select 
                                                    value={item.sign} 
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[idx].sign = parseInt(e.target.value) as 1 | -1;
                                                        handleFormulaChange(line.id, newItems);
                                                    }}
                                                    className="border border-slate-300 rounded px-2 py-1 text-xs font-bold"
                                                >
                                                    <option value={1}>Somar (+)</option>
                                                    <option value={-1}>Subtrair (-)</option>
                                                </select>
                                                <div className="flex-grow text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                                                    {lines.find(l => l.id === item.lineId)?.name || 'Linha removida'}
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newItems = items.filter((_, i) => i !== idx);
                                                        handleFormulaChange(line.id, newItems);
                                                    }}
                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        {items.length === 0 && <p className="text-slate-400 text-sm italic">Nenhum item na fórmula.</p>}
                                    </div>
                                    <div className="border-t border-slate-100 pt-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Adicionar Linha</label>
                                        <SearchableSelect 
                                            value="" 
                                            options={available} 
                                            onChange={(val) => {
                                                if (val) handleFormulaChange(line.id, [...items, { lineId: val, sign: 1 }]);
                                            }}
                                            placeholder="Selecione uma linha..."
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button onClick={() => setEditingFormulaId(null)} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover">Concluir</button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {lineToDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 transform transition-all scale-100">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Excluir linha?</h3>
                        <p className="text-sm text-center text-slate-600 mb-6">
                            Você tem certeza que deseja excluir a linha <strong>{lineToDelete.name}</strong>?<br/><br/>
                            <span className="font-medium text-red-600">Atenção:</span> Esta ação é irreversível e excluirá também todas as linhas filhas.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setLineToDelete(null)} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
                            <button onClick={confirmDeleteLine} disabled={isSaving} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">{isSaving ? 'Excluindo...' : 'Sim, Excluir'}</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ReportStructureView;
