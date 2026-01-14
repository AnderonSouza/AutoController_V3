import React, { useState, useEffect } from 'react';
import { Benchmark, Brand, FinancialAccount } from '../types';
import StyledSelect from './StyledSelect';
import { generateUUID } from '../utils/helpers';

interface BenchmarkManagementViewProps {
  benchmarks: Benchmark[];
  onSaveBenchmarks: (benchmarks: Benchmark[]) => Promise<void>;
  onNavigateBack: () => void;
  brands: Brand[];
  financialAccounts: FinancialAccount[]; // Structure to select totalizers
}

const BenchmarkManagementView: React.FC<BenchmarkManagementViewProps> = ({ 
    benchmarks, 
    onSaveBenchmarks, 
    onNavigateBack,
    brands,
    financialAccounts
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

    // Flatten accounts to get only totals/subtotals for the dropdown
    const totalizerAccounts = React.useMemo(() => {
        const list: { id: string; name: string }[] = [];
        if (!financialAccounts || !Array.isArray(financialAccounts)) {
            return list;
        }
        const traverse = (nodes: FinancialAccount[]) => {
            if (!nodes || !Array.isArray(nodes)) return;
            for(const node of nodes) {
                if (node.isTotal || node.isSubTotal) {
                    list.push({ id: node.id, name: node.name });
                }
                if(node.children) traverse(node.children);
            }
        }
        traverse(financialAccounts);
        return list;
    }, [financialAccounts]);

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

    const inputClasses = "w-full bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition";

    return (
        <main className="flex-grow p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <button onClick={onNavigateBack} className="mb-6 text-sm text-slate-600 hover:text-slate-900 font-semibold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Voltar para Parâmetros de Apuração
                </button>
                <div className="bg-white p-6 rounded-custom shadow-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Definição de Benchmarks</h1>
                            <p className="text-sm text-slate-500 mt-1">Configure as boas práticas e metas para os indicadores de desempenho.</p>
                        </div>
                        <button onClick={handleAddBenchmark} className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover shadow-sm">
                           + Adicionar Benchmark
                        </button>
                    </div>
                    
                    <div className="space-y-4 mt-6">
                        {editableBenchmarks.map((bench) => (
                            <div key={bench.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                                <div className="lg:col-span-3">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descrição (Indicador)</label>
                                    <input 
                                        type="text" 
                                        value={bench.description} 
                                        onChange={(e) => handleFieldChange(bench.id, 'description', e.target.value)} 
                                        className={inputClasses} 
                                        placeholder="Ex: Margem EBITDA Ideal"
                                    />
                                </div>
                                <div className="lg:col-span-3">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Conta Totalizadora (DRE)</label>
                                    <StyledSelect 
                                        value={bench.dreAccountId} 
                                        onChange={(e) => handleFieldChange(bench.id, 'dreAccountId', e.target.value)}
                                        containerClassName="w-full"
                                    >
                                        <option value="" disabled>Selecione a conta...</option>
                                        {totalizerAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </StyledSelect>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Marca</label>
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
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo de Dado</label>
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
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Meta</label>
                                    <input 
                                        type="number" 
                                        value={bench.value} 
                                        onChange={(e) => handleFieldChange(bench.id, 'value', parseFloat(e.target.value))} 
                                        className={inputClasses} 
                                    />
                                </div>
                                <div className="lg:col-span-1 flex justify-end pb-1">
                                    <button onClick={() => handleRemoveBenchmark(bench.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {editableBenchmarks.length === 0 && (
                            <p className="text-center text-slate-500 py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                Nenhum benchmark definido. Clique em "+ Adicionar Benchmark" para começar.
                            </p>
                        )}
                    </div>
                    
                    <div className="mt-8 border-t pt-6 flex justify-end">
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
        </main>
    );
};

export default BenchmarkManagementView;
