import React from 'react';
import * as XLSX from 'xlsx';
import { CheckCircle, AlertTriangle, XCircle, Download, X } from 'lucide-react';

export interface BudgetImportError {
    linha: number;
    campo: string;
    valor: string;
    motivo: string;
}

export interface BudgetImportResult {
    success: boolean;
    totalLinhas: number;
    valoresImportados: number;
    valoresComErro: number;
    errors: BudgetImportError[];
}

interface BudgetImportResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: BudgetImportResult | null;
}

const BudgetImportResultModal: React.FC<BudgetImportResultModalProps> = ({ isOpen, onClose, result }) => {
    if (!isOpen || !result) return null;

    const hasErrors = result.errors.length > 0;

    const exportToExcel = () => {
        if (result.errors.length === 0) return;

        const wsData = [
            ['Linha Excel', 'Campo', 'Valor', 'Motivo'],
            ...result.errors.map((error) => [
                error.linha,
                error.campo,
                error.valor,
                error.motivo
            ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        ws['!cols'] = [
            { wch: 12 },
            { wch: 25 },
            { wch: 30 },
            { wch: 60 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Erros de Importacao');
        
        const fileName = `erros_importacao_orcamento_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                    hasErrors ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
                }`}>
                    <div className="flex items-center gap-3">
                        {hasErrors ? (
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                        )}
                        <div>
                            <h2 className={`text-lg font-bold ${hasErrors ? 'text-amber-800' : 'text-emerald-800'}`}>
                                {hasErrors ? 'Importacao Concluida com Avisos' : 'Importacao Concluida com Sucesso'}
                            </h2>
                            <p className="text-sm text-slate-600">Resultado do processamento do arquivo de orcamento</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="text-2xl font-bold text-slate-800">{result.totalLinhas}</div>
                            <div className="text-sm text-slate-500">Linhas no Arquivo</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                            <div className="text-2xl font-bold text-emerald-700">{result.valoresImportados}</div>
                            <div className="text-sm text-emerald-600">Valores Importados</div>
                        </div>
                        <div className={`rounded-lg p-4 border ${result.valoresComErro > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className={`text-2xl font-bold ${result.valoresComErro > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                                {result.valoresComErro}
                            </div>
                            <div className={`text-sm ${result.valoresComErro > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                Valores com Erro
                            </div>
                        </div>
                    </div>

                    {hasErrors && (
                        <>
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-700">Detalhes dos Erros</h3>
                                <button
                                    onClick={exportToExcel}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    <Download size={14} />
                                    Exportar Erros
                                </button>
                            </div>
                            
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-600">Linha</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-600">Campo</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-600">Valor</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-600">Motivo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {result.errors.slice(0, 50).map((error, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-slate-600 font-mono">{error.linha}</td>
                                                    <td className="px-3 py-2 text-slate-600">{error.campo}</td>
                                                    <td className="px-3 py-2 text-slate-500 font-mono text-xs truncate max-w-[150px]" title={error.valor}>
                                                        {error.valor || '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-red-600">{error.motivo}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {result.errors.length > 50 && (
                                    <div className="px-3 py-2 bg-slate-50 text-center text-xs text-slate-500 border-t">
                                        Exibindo 50 de {result.errors.length} erros. Exporte para ver todos.
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {!hasErrors && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                            <p className="text-emerald-700 font-medium">Todos os valores foram importados com sucesso!</p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BudgetImportResultModal;
