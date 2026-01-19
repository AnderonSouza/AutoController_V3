import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import StyledSelect from './StyledSelect';
import SearchableSelect from './SearchableSelect';
import { MonthlyBalanceEntry, Company } from '../types';
import { CALENDAR_MONTHS } from '../constants';
import { bulkSaveSaldosMensais, SaldosMensaisImportStats } from '../utils/db';
import { Download, CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';

interface MonthlyBalanceImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    companies: Company[];
    onSuccess: () => void;
    tenantId: string;
}

interface PeriodMapping {
    id: string;
    year: number;
    month: string;
    excelColumn: string;
}

interface CumulativeStats {
    totalRows: number;
    success: number;
    accountNotFound: number;
    zeroValues: number;
    invalidData: number;
    deletedRecords: number;
    accountErrors: Array<{ codigo: string; count: number }>;
}

const MonthlyBalanceImportModal: React.FC<MonthlyBalanceImportModalProps> = ({ isOpen, onClose, companies, onSuccess, tenantId }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [file, setFile] = useState<File | null>(null);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    
    const [baseMapping, setBaseMapping] = useState({
        codigoConta: ''
    });

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [periodMappings, setPeriodMappings] = useState<PeriodMapping[]>([]);

    const rawSheetDataRef = useRef<any[][]>([]);
    const [previewData, setPreviewData] = useState<any[][]>([]);
    
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [importComplete, setImportComplete] = useState(false);

    const [stats, setStats] = useState<CumulativeStats>({
        totalRows: 0,
        success: 0,
        accountNotFound: 0,
        zeroValues: 0,
        invalidData: 0,
        deletedRecords: 0,
        accountErrors: []
    });

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    
    const ignoredRowsRef = useRef<Array<{ codigo: string; valor: string; motivo: string }>>([]);

    const sortedCompanyOptions = useMemo(() => {
        return companies
            .map(c => ({ id: c.id, name: c.nickname || c.name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }, [companies]);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFile(null);
            setExcelHeaders([]);
            rawSheetDataRef.current = [];
            setPreviewData([]);
            setBaseMapping({ codigoConta: '' });
            setPeriodMappings([]);
            setSelectedCompanyId('');
            setProgress(0);
            setStatusMessage('');
            setIsProcessing(false);
            setImportComplete(false);
            setStats({
                totalRows: 0,
                success: 0,
                accountNotFound: 0,
                zeroValues: 0,
                invalidData: 0,
                deletedRecords: 0,
                accountErrors: []
            });
            ignoredRowsRef.current = [];
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setTimeout(() => readFileHeaders(selectedFile), 100);
        }
    };

    const readFileHeaders = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                
                if (jsonData.length > 0) {
                    const headers = jsonData[0].map(h => String(h).trim());
                    setExcelHeaders(headers);
                    rawSheetDataRef.current = jsonData;
                    setPreviewData(jsonData.slice(1, 6)); 
                    
                    const newBaseMapping = { ...baseMapping };
                    headers.forEach(h => {
                        const lower = h.toLowerCase();
                        if (lower.includes('reduzido') || lower.includes('codigo') || (lower.includes('conta') && !lower.includes('descri'))) {
                            if (!newBaseMapping.codigoConta) newBaseMapping.codigoConta = h;
                        }
                    });
                    setBaseMapping(newBaseMapping);
                    setStep(2);
                } else {
                    alert("Arquivo vazio.");
                }
            } catch (err) {
                alert("Erro ao ler arquivo.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const addPeriodMapping = () => {
        setPeriodMappings([...periodMappings, { 
            id: Date.now().toString(), 
            year: currentYear, 
            month: 'JANEIRO', 
            excelColumn: '' 
        }]);
    };

    const updatePeriodMapping = (id: string, field: keyof PeriodMapping, value: any) => {
        setPeriodMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const removePeriodMapping = (id: string) => {
        setPeriodMappings(prev => prev.filter(m => m.id !== id));
    };

    const validateAndStart = () => {
        if (!selectedCompanyId) return alert("Selecione a empresa para vincular os saldos.");
        if (!baseMapping.codigoConta) return alert("Selecione a coluna de Código da Conta.");
        if (periodMappings.length === 0) return alert("Adicione pelo menos um período para importar.");
        if (periodMappings.some(m => !m.excelColumn)) return alert("Selecione a coluna do Excel para todos os períodos adicionados.");
        
        setStep(3);
        setIsProcessing(true);
        setTimeout(processInChunks, 100);
    };

    const processInChunks = async () => {
        const BATCH_SIZE = 3000;
        const allData = rawSheetDataRef.current;
        const total = allData.length - 1;
        
        const codigoContaIdx = excelHeaders.indexOf(baseMapping.codigoConta);

        const mappingIndices = periodMappings.map(m => ({
            year: m.year,
            month: m.month,
            colIdx: excelHeaders.indexOf(m.excelColumn)
        }));

        let cumulativeStats: CumulativeStats = {
            totalRows: 0,
            success: 0,
            accountNotFound: 0,
            zeroValues: 0,
            invalidData: 0,
            deletedRecords: 0,
            accountErrors: []
        };
        const allAccountErrors = new Map<string, number>();

        try {
            for (let i = 1; i <= total; i += BATCH_SIZE) {
                await new Promise(resolve => setTimeout(resolve, 0));
                const end = Math.min(i + BATCH_SIZE, allData.length);
                const chunkRaw = allData.slice(i, end);
                const chunkTransformed: MonthlyBalanceEntry[] = [];

                for (const row of chunkRaw) {
                    if (!row || row.length === 0) {
                        cumulativeStats.invalidData++;
                        ignoredRowsRef.current.push({ codigo: '-', valor: '-', motivo: 'Linha vazia' });
                        continue;
                    }
                    
                    const codigoConta = row[codigoContaIdx];
                    if (!codigoConta) {
                        cumulativeStats.invalidData++;
                        ignoredRowsRef.current.push({ codigo: '-', valor: '-', motivo: 'Código da conta vazio' });
                        continue;
                    }

                    for (const map of mappingIndices) {
                        if (map.colIdx === -1) continue;
                        
                        let valRaw = row[map.colIdx];
                        if (valRaw === undefined || valRaw === null) {
                            cumulativeStats.zeroValues++;
                            ignoredRowsRef.current.push({ 
                                codigo: String(codigoConta), 
                                valor: 'vazio', 
                                motivo: `Valor vazio para ${map.month}/${map.year}` 
                            });
                            continue;
                        }

                        let val = 0;
                        if (typeof valRaw === 'number') val = valRaw;
                        else {
                            let vStr = String(valRaw).trim().replace(/[^\d.,-]/g, '');
                            if (vStr.indexOf(',') > -1 && vStr.indexOf('.') === -1) vStr = vStr.replace(',', '.');
                            else if (vStr.indexOf(',') > -1 && vStr.indexOf('.') > -1) vStr = vStr.replace(/\./g, '').replace(',', '.');
                            val = parseFloat(vStr);
                        }

                        if (isNaN(val)) {
                            cumulativeStats.invalidData++;
                            ignoredRowsRef.current.push({ 
                                codigo: String(codigoConta), 
                                valor: String(valRaw), 
                                motivo: `Valor inválido para ${map.month}/${map.year}` 
                            });
                            continue;
                        }
                        
                        if (val === 0) {
                            cumulativeStats.zeroValues++;
                            ignoredRowsRef.current.push({ 
                                codigo: String(codigoConta), 
                                valor: '0', 
                                motivo: `Valor zero para ${map.month}/${map.year}` 
                            });
                            continue;
                        }

                        cumulativeStats.totalRows++;
                        chunkTransformed.push({
                            ano: map.year,
                            mes: map.month,
                            valor: val,
                            empresa_id: selectedCompanyId,
                            conta_contabil_id: String(codigoConta)
                        });
                    }
                }

                if (chunkTransformed.length > 0) {
                    const batchStats = await bulkSaveSaldosMensais(chunkTransformed, tenantId);
                    cumulativeStats.success += batchStats.success;
                    cumulativeStats.accountNotFound += batchStats.accountNotFound;
                    cumulativeStats.zeroValues += batchStats.zeroValues;
                    cumulativeStats.deletedRecords += batchStats.deletedRecords;
                    
                    batchStats.accountErrors.forEach(err => {
                        const current = allAccountErrors.get(err.codigo) || 0;
                        allAccountErrors.set(err.codigo, current + err.count);
                    });
                }
                
                const currentProgress = Math.min(100, Math.round((end / total) * 100));
                setProgress(currentProgress);
                setStatusMessage(`Processando... ${end.toLocaleString()} de ${total.toLocaleString()} linhas`);
            }

            cumulativeStats.accountErrors = Array.from(allAccountErrors.entries())
                .map(([codigo, count]) => ({ codigo, count }))
                .sort((a, b) => b.count - a.count);

            setStats(cumulativeStats);
            setStatusMessage('Importação concluída!');
            setIsProcessing(false);
            setImportComplete(true);

        } catch (err) {
            console.error("Erro no processamento:", err);
            alert("Erro no processamento. Verifique o console para detalhes.");
            setIsProcessing(false);
            setStep(2);
        }
    };

    const downloadAuditLog = () => {
        const summaryLines = [
            `Relatório de Auditoria - Importação de Saldos Mensais`,
            `Data: ${new Date().toLocaleString('pt-BR')}`,
            `Arquivo: ${file?.name || 'Não identificado'}`,
            `Empresa: ${companies.find(c => c.id === selectedCompanyId)?.nickname || companies.find(c => c.id === selectedCompanyId)?.name || 'N/A'}`,
            ``,
            `RESUMO:`,
            `Total de linhas processadas: ${stats.totalRows.toLocaleString()}`,
            `Importadas com sucesso: ${stats.success.toLocaleString()}`,
            `Registros substituídos (upsert): ${stats.deletedRecords.toLocaleString()}`,
            `Ignoradas (valor zero/vazio): ${stats.zeroValues.toLocaleString()}`,
            `Conta não encontrada: ${stats.accountNotFound.toLocaleString()}`,
            `Dados inválidos: ${stats.invalidData.toLocaleString()}`,
            ``,
            `CONTAS NÃO ENCONTRADAS NO PLANO DE CONTAS:`,
            `Código;Quantidade`,
            ...stats.accountErrors.map(e => `${e.codigo};${e.count}`),
            ``,
            `LINHAS IGNORADAS (${ignoredRowsRef.current.length} registros):`,
            `Código;Valor;Motivo`,
            ...ignoredRowsRef.current.slice(0, 5000).map(r => `${r.codigo};${r.valor};${r.motivo}`),
            ...(ignoredRowsRef.current.length > 5000 ? [`... e mais ${ignoredRowsRef.current.length - 5000} registros (limite de exportação)`] : [])
        ];
        
        const blob = new Blob([summaryLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria_saldos_mensais_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        if (importComplete && stats.success > 0) {
            onSuccess();
        }
        onClose();
    };

    if (!isOpen) return null;

    const hasErrors = stats.accountNotFound > 0 || stats.invalidData > 0;
    const successRate = stats.totalRows > 0 ? Math.round((stats.success / stats.totalRows) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-bold text-slate-800">Importar Balancetes Mensais</h3>
                    {!isProcessing && (
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50">
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center h-full py-10">
                            <div className="w-full max-w-lg border-2 border-dashed border-slate-300 rounded-xl bg-white hover:bg-blue-50 transition-all p-10 text-center relative cursor-pointer">
                                <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <div className="bg-blue-50 p-4 rounded-full inline-block mb-4"><svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                                <h4 className="text-lg font-bold text-slate-700">Carregar Arquivo Excel</h4>
                                <p className="text-sm text-slate-500 mt-2">Selecione o arquivo contendo os saldos mensais.</p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Mapeamento Básico</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase mb-2 block tracking-wide">Empresa Destino</label>
                                        <SearchableSelect 
                                            value={selectedCompanyId} 
                                            onChange={(val) => setSelectedCompanyId(val)} 
                                            options={sortedCompanyOptions}
                                            placeholder="Digite para buscar empresa..."
                                            className="h-11"
                                        />
                                        <p className="text-xs text-slate-400 mt-1.5">Todos os saldos importados serão atribuídos a esta empresa.</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase mb-2 block tracking-wide">Código da Conta (Obrigatório)</label>
                                        <StyledSelect value={baseMapping.codigoConta} onChange={e => setBaseMapping({...baseMapping, codigoConta: e.target.value})} containerClassName="w-full" className="h-11 pl-4 text-sm border-slate-300 focus:border-primary">
                                            <option value="">Selecione...</option>
                                            {excelHeaders.map((h, idx) => <option key={`header-${idx}-${h}`} value={h}>{h}</option>)}
                                        </StyledSelect>
                                        <p className="text-xs text-slate-400 mt-1.5">Coluna com o código reduzido da conta contábil.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                                    <h4 className="text-sm font-bold text-slate-800">Mapeamento de Períodos</h4>
                                    <button onClick={addPeriodMapping} className="px-4 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100 border border-green-200 transition-colors flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                        Adicionar Mês
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {periodMappings.map((map, index) => (
                                        <div key={map.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="col-span-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Ano</label>
                                                <StyledSelect value={map.year} onChange={e => updatePeriodMapping(map.id, 'year', parseInt(e.target.value))} containerClassName="w-full" className="py-2 text-sm h-11 pl-4">
                                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </StyledSelect>
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Mês</label>
                                                <StyledSelect value={map.month} onChange={e => updatePeriodMapping(map.id, 'month', e.target.value)} containerClassName="w-full" className="py-2 text-sm h-11 pl-4">
                                                    {CALENDAR_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                                </StyledSelect>
                                            </div>
                                            <div className="col-span-1 flex items-center justify-center pb-3 text-slate-400">
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                            </div>
                                            <div className="col-span-5">
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Coluna do Excel (Saldo)</label>
                                                <StyledSelect value={map.excelColumn} onChange={e => updatePeriodMapping(map.id, 'excelColumn', e.target.value)} containerClassName="w-full" className="py-2 text-sm h-11 pl-4">
                                                    <option value="">Selecione...</option>
                                                    {excelHeaders.map((h, idx) => <option key={`period-header-${idx}-${h}`} value={h}>{h}</option>)}
                                                </StyledSelect>
                                            </div>
                                            <div className="col-span-1 flex justify-end pb-2">
                                                <button onClick={() => removePeriodMapping(map.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors bg-white border border-red-100 shadow-sm"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                            </div>
                                        </div>
                                    ))}
                                    {periodMappings.length === 0 && (
                                        <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                                            <p className="text-sm text-slate-500">Nenhum período configurado.</p>
                                            <p className="text-xs text-slate-400 mt-1">Clique em "Adicionar Mês" para mapear as colunas de saldo do Excel.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center py-6">
                            {!importComplete ? (
                                <div className="w-full max-w-md text-center bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                                    <div className="mb-6">
                                        <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin mx-auto"></div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-2xl font-bold text-slate-800 mb-2">Importando...</div>
                                        <p className="text-slate-500 text-sm">{statusMessage}</p>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full max-w-2xl space-y-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                        <div className="flex items-center gap-4 mb-6">
                                            {hasErrors ? (
                                                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                                                    <AlertTriangle className="h-7 w-7" />
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                    <CheckCircle className="h-7 w-7" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-800">
                                                    {hasErrors ? 'Importação Concluída com Alertas' : 'Importação Concluída!'}
                                                </h3>
                                                <p className="text-slate-500 text-sm">
                                                    {stats.success.toLocaleString()} registros importados ({successRate}% de sucesso)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                    <span className="text-xs font-bold text-green-700 uppercase">Sucesso</span>
                                                </div>
                                                <div className="text-2xl font-bold text-green-700">{stats.success.toLocaleString()}</div>
                                                <p className="text-xs text-green-600 mt-1">registros importados</p>
                                            </div>

                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                    <span className="text-xs font-bold text-blue-700 uppercase">Substituídos</span>
                                                </div>
                                                <div className="text-2xl font-bold text-blue-700">{stats.deletedRecords.toLocaleString()}</div>
                                                <p className="text-xs text-blue-600 mt-1">registros atualizados</p>
                                            </div>

                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                                    <span className="text-xs font-bold text-amber-700 uppercase">Conta não encontrada</span>
                                                </div>
                                                <div className="text-2xl font-bold text-amber-700">{stats.accountNotFound.toLocaleString()}</div>
                                                <p className="text-xs text-amber-600 mt-1">não localizadas no plano</p>
                                            </div>

                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <XCircle className="h-4 w-4 text-slate-500" />
                                                    <span className="text-xs font-bold text-slate-600 uppercase">Ignorados</span>
                                                </div>
                                                <div className="text-2xl font-bold text-slate-600">{(stats.zeroValues + stats.invalidData).toLocaleString()}</div>
                                                <p className="text-xs text-slate-500 mt-1">valores vazios/inválidos</p>
                                            </div>
                                        </div>

                                        {stats.accountErrors.length > 0 && (
                                            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                                                <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    Contas não encontradas no Plano de Contas ({stats.accountErrors.length})
                                                </h4>
                                                <div className="max-h-40 overflow-y-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="text-left text-xs font-bold text-amber-700 uppercase">
                                                                <th className="pb-2">Código</th>
                                                                <th className="pb-2 text-right">Ocorrências</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {stats.accountErrors.slice(0, 20).map((err, idx) => (
                                                                <tr key={idx} className="border-t border-amber-200">
                                                                    <td className="py-1.5 font-mono text-amber-900">{err.codigo}</td>
                                                                    <td className="py-1.5 text-right text-amber-700">{err.count}</td>
                                                                </tr>
                                                            ))}
                                                            {stats.accountErrors.length > 20 && (
                                                                <tr className="border-t border-amber-200">
                                                                    <td colSpan={2} className="py-1.5 text-center text-amber-600 text-xs">
                                                                        ... e mais {stats.accountErrors.length - 20} contas
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-center gap-4">
                                        <button 
                                            onClick={downloadAuditLog}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                                        >
                                            <Download className="h-4 w-4" />
                                            Baixar Relatório
                                        </button>
                                        <button 
                                            onClick={handleClose}
                                            className="px-8 py-2.5 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary-hover transition-all"
                                        >
                                            Concluir
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between shrink-0">
                    {step === 2 ? <button onClick={() => setStep(1)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-lg transition-colors">Voltar</button> : <div></div>}
                    {step === 2 && <button onClick={validateAndStart} className="px-8 py-2.5 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary-hover hover:shadow-xl transform active:scale-95 transition-all">Iniciar Importação</button>}
                </div>
            </div>
        </div>
    );
};

export default MonthlyBalanceImportModal;
