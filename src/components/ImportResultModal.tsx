import React from 'react';
import * as XLSX from 'xlsx';

export interface ImportError {
    linha: number;
    campo: string;
    valor: string;
    motivo: string;
}

export interface ImportResult {
    success: boolean;
    contasProcessadas: number;
    vinculosCriados: number;
    errors: ImportError[];
    warnings: ImportError[];
}

interface ImportResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: ImportResult | null;
}

const ImportResultModal: React.FC<ImportResultModalProps> = ({ isOpen, onClose, result }) => {
    if (!isOpen || !result) return null;

    const hasErrors = result.errors.length > 0;
    const hasWarnings = result.warnings.length > 0;
    const allIssues = [...result.errors, ...result.warnings];

    const exportToExcel = () => {
        if (allIssues.length === 0) return;

        const wsData = [
            ['Linha Excel', 'Campo', 'Valor', 'Motivo', 'Tipo'],
            ...allIssues.map((issue, idx) => [
                issue.linha,
                issue.campo,
                issue.valor,
                issue.motivo,
                result.errors.includes(issue) ? 'Erro' : 'Aviso'
            ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        ws['!cols'] = [
            { wch: 12 },
            { wch: 25 },
            { wch: 30 },
            { wch: 50 },
            { wch: 10 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Erros de Importação');
        
        const fileName = `erros_importacao_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                    hasErrors ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'
                }`}>
                    <div className="flex items-center gap-3">
                        {hasErrors ? (
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                        <div>
                            <h2 className={`text-lg font-bold ${hasErrors ? 'text-red-800' : 'text-emerald-800'}`}>
                                {hasErrors ? 'Importação Concluída com Avisos' : 'Importação Concluída'}
                            </h2>
                            <p className="text-sm text-slate-600">Resultado do processamento do arquivo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="text-2xl font-bold text-slate-800">{result.contasProcessadas}</div>
                            <div className="text-sm text-slate-500">Contas DRE processadas</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="text-2xl font-bold text-slate-800">{result.vinculosCriados}</div>
                            <div className="text-sm text-slate-500">Vínculos contábeis criados</div>
                        </div>
                    </div>

                    {(hasErrors || hasWarnings) && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-700">
                                    {hasErrors ? `${result.errors.length} erro(s)` : ''} 
                                    {hasErrors && hasWarnings ? ' e ' : ''}
                                    {hasWarnings ? `${result.warnings.length} aviso(s)` : ''}
                                </h3>
                                <button 
                                    onClick={exportToExcel}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Exportar para Excel
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100 text-slate-600">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium w-20">Linha</th>
                                            <th className="px-3 py-2 text-left font-medium">Campo</th>
                                            <th className="px-3 py-2 text-left font-medium">Valor</th>
                                            <th className="px-3 py-2 text-left font-medium">Motivo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {allIssues.slice(0, 50).map((issue, idx) => (
                                            <tr key={idx} className={result.errors.includes(issue) ? 'bg-red-50/50' : 'bg-amber-50/50'}>
                                                <td className="px-3 py-2 font-mono text-slate-700">{issue.linha}</td>
                                                <td className="px-3 py-2 text-slate-600">{issue.campo}</td>
                                                <td className="px-3 py-2 text-slate-600 font-mono text-xs truncate max-w-[120px]" title={issue.valor}>{issue.valor}</td>
                                                <td className="px-3 py-2 text-slate-600">{issue.motivo}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {allIssues.length > 50 && (
                                    <div className="bg-slate-50 px-3 py-2 text-center text-sm text-slate-500 border-t">
                                        Mostrando 50 de {allIssues.length} registros. Exporte para Excel para ver todos.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!hasErrors && !hasWarnings && (
                        <div className="text-center py-6 text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>Todas as linhas foram processadas com sucesso!</p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportResultModal;
