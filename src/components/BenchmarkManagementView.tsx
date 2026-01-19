import React, { useState, useEffect } from 'react';
import { Benchmark, Brand, Department, ReportLine, ReportTemplate } from '../types';
import StyledSelect from './StyledSelect';
import { generateUUID } from '../utils/helpers';
import { ChevronLeft, Trash2, Plus } from 'lucide-react';

interface BenchmarkManagementViewProps {
  benchmarks: Benchmark[];
  onSaveBenchmarks: (benchmarks: Benchmark[]) => Promise<void>;
  onNavigateBack: () => void;
  brands: Brand[];
  departments: Department[];
  reportLines: ReportLine[];
  reportTemplates: ReportTemplate[];
}

const BenchmarkManagementView: React.FC<BenchmarkManagementViewProps> = ({ 
    benchmarks, 
    onSaveBenchmarks, 
    onNavigateBack,
    brands,
    departments,
    reportLines,
    reportTemplates
}) => {
    const [editableBenchmarks, setEditableBenchmarks] = useState<Benchmark[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (benchmarks && Array.isArray(benchmarks)) {
            setEditableBenchmarks(JSON.parse(JSON.stringify(benchmarks)));
        } else {
            setEditableBenchmarks([]);
        }
    }, [benchmarks]);

    const totalizerAccounts = React.useMemo(() => {
        const list: { id: string; name: string; templateName: string }[] = [];
        if (!reportLines || !Array.isArray(reportLines)) {
            return list;
        }
        
        for (const line of reportLines) {
            if (line.type === 'total' || line.type === 'header') {
                const template = reportTemplates.find(t => t.id === line.reportId);
                const templateName = template?.name || 'Modelo';
                list.push({ 
                    id: line.id, 
                    name: line.name,
                    templateName 
                });
            }
        }
        
        list.sort((a, b) => {
            if (a.templateName !== b.templateName) {
                return a.templateName.localeCompare(b.templateName);
            }
            return a.name.localeCompare(b.name);
        });
        
        return list;
    }, [reportLines, reportTemplates]);

    const handleFieldChange = (id: string, field: keyof Benchmark, value: any) => {
        setEditableBenchmarks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const handleRemoveBenchmark = (id: string) => {
        if (confirm('Tem certeza que deseja remover este benchmark?')) {
            setEditableBenchmarks(prev => prev.filter(b => b.id !== id));
        }
    };

    const handleAddBenchmark = () => {
        const newBenchmark: Benchmark = {
            id: generateUUID(),
            description: '',
            type: 'percentage',
            dreAccountId: '',
            brandId: 'all',
            departmentId: 'all',
            value: 0
        };
        setEditableBenchmarks(prev => [...prev, newBenchmark]);
    };

    const handleSave = async () => {
        if (editableBenchmarks.some(b => !b.description.trim() || !b.dreAccountId)) {
            alert('Preencha a descrição e selecione a conta totalizadora para todos os benchmarks.');
            return;
        }
        setIsSaving(true);
        await onSaveBenchmarks(editableBenchmarks);
        setIsSaving(false);
    };

    const inputClasses = "w-full bg-white border border-[var(--color-border)] rounded-lg py-2 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-50)] focus:border-[var(--color-primary)] transition";

    const groupedAccounts = React.useMemo(() => {
        const groups: Record<string, { id: string; name: string }[]> = {};
        for (const acc of totalizerAccounts) {
            if (!groups[acc.templateName]) {
                groups[acc.templateName] = [];
            }
            groups[acc.templateName].push({ id: acc.id, name: acc.name });
        }
        return groups;
    }, [totalizerAccounts]);

    return (
        <div className="page-container">
            <button onClick={onNavigateBack} className="back-button">
                <ChevronLeft className="w-4 h-4" />
                Voltar para Parâmetros de Apuração
            </button>

            <div className="content-card">
                <div className="card-header">
                    <div className="header-text">
                        <h1 className="card-title">Definição de Benchmarks</h1>
                        <p className="card-subtitle">Configure as boas práticas e metas para os indicadores de desempenho.</p>
                    </div>
                    <div className="header-actions">
                        <button onClick={handleAddBenchmark} className="btn btn-primary">
                            <Plus className="w-4 h-4" />
                            Adicionar Benchmark
                        </button>
                    </div>
                </div>
                
                <div className="card-body">
                    <div className="space-y-4">
                        {editableBenchmarks.map((bench) => (
                            <div key={bench.id} className="list-item !p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                                <div className="lg:col-span-2">
                                    <label className="filter-label">Descrição (Indicador)</label>
                                    <input 
                                        type="text" 
                                        value={bench.description} 
                                        onChange={(e) => handleFieldChange(bench.id, 'description', e.target.value)} 
                                        className={inputClasses} 
                                        placeholder="Ex: Margem EBITDA Ideal"
                                    />
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="filter-label">Conta Totalizadora</label>
                                    <StyledSelect 
                                        value={bench.dreAccountId} 
                                        onChange={(e) => handleFieldChange(bench.id, 'dreAccountId', e.target.value)}
                                        containerClassName="w-full"
                                    >
                                        <option value="" disabled>Selecione a conta...</option>
                                        {Object.entries(groupedAccounts).map(([templateName, accounts]) => (
                                            <optgroup key={templateName} label={templateName}>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </StyledSelect>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="filter-label">Marca</label>
                                    <StyledSelect 
                                        value={bench.brandId} 
                                        onChange={(e) => handleFieldChange(bench.id, 'brandId', e.target.value)}
                                        containerClassName="w-full"
                                    >
                                        <option value="all">Todas as Marcas</option>
                                        {brands.map(brand => (
                                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                                        ))}
                                    </StyledSelect>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="filter-label">Departamento</label>
                                    <StyledSelect 
                                        value={bench.departmentId || 'all'} 
                                        onChange={(e) => handleFieldChange(bench.id, 'departmentId', e.target.value)}
                                        containerClassName="w-full"
                                    >
                                        <option value="all">Todos os Departamentos</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </StyledSelect>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="filter-label">Tipo de Dado</label>
                                    <StyledSelect 
                                        value={bench.type} 
                                        onChange={(e) => handleFieldChange(bench.id, 'type', e.target.value)}
                                        containerClassName="w-full"
                                    >
                                        <option value="percentage">Percentual (%)</option>
                                        <option value="currency">Valor (R$)</option>
                                        <option value="number">Número</option>
                                    </StyledSelect>
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="filter-label">Meta</label>
                                    <input 
                                        type="number" 
                                        value={bench.value} 
                                        onChange={(e) => handleFieldChange(bench.id, 'value', parseFloat(e.target.value))} 
                                        className={inputClasses} 
                                    />
                                </div>
                                <div className="lg:col-span-1 flex justify-end pb-1">
                                    <button 
                                        onClick={() => handleRemoveBenchmark(bench.id)} 
                                        className="icon-btn icon-btn-ghost text-slate-400 hover:text-[var(--color-error)] hover:bg-[var(--color-error-50)]"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {editableBenchmarks.length === 0 && (
                            <div className="empty-state">
                                <p className="empty-state-description">
                                    Nenhum benchmark definido. Clique em "+ Adicionar Benchmark" para começar.
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 border-t border-[var(--color-border-light)] pt-6 flex justify-end">
                        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BenchmarkManagementView;
