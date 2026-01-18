import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import StyledSelect from './StyledSelect';
import { MonthlyBalanceEntry, Company } from '../types';
import { CALENDAR_MONTHS } from '../constants';
import { bulkSaveSaldosMensais } from '../utils/db';

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

const MonthlyBalanceImportModal: React.FC<MonthlyBalanceImportModalProps> = ({ isOpen, onClose, companies, onSuccess, tenantId }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Debug log to check companies data
    React.useEffect(() => {
        if (isOpen) {
            console.log("[v0-modal] MonthlyBalanceImportModal opened with companies:", {
                count: companies?.length,
                firstCompany: companies?.[0],
                tenantId
            });
        }
    }, [isOpen, companies, tenantId]);
    const [file, setFile] = useState<File | null>(null);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    
    // Core Mapping - only needs the account code column to match with plano_contas
    const [baseMapping, setBaseMapping] = useState({
        codigoConta: ''  // codigo_contabil from plano_contas
    });

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

    // Dynamic Period Mappings
    const [periodMappings, setPeriodMappings] = useState<PeriodMapping[]>([]);

    const rawSheetDataRef = useRef<any[][]>([]);
    const [previewData, setPreviewData] = useState<any[][]>([]);
    
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

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
                    
                    // Auto-detect account code column
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

        try {
            for (let i = 1; i <= total; i += BATCH_SIZE) {
                await new Promise(resolve => setTimeout(resolve, 0));
                const end = Math.min(i + BATCH_SIZE, allData.length);
                const chunkRaw = allData.slice(i, end);
                const chunkTransformed: MonthlyBalanceEntry[] = [];

                for (const row of chunkRaw) {
                    if (!row || row.length === 0) continue;
                    
                    const codigoConta = row[codigoContaIdx];
                    if (!codigoConta) continue;

                    // Create one entry per mapped period
                    for (const map of mappingIndices) {
                        if (map.colIdx === -1) continue;
                        
                        let valRaw = row[map.colIdx];
                        if (valRaw === undefined || valRaw === null) continue;

                        let val = 0;
                        if (typeof valRaw === 'number') val = valRaw;
                        else {
                            let vStr = String(valRaw).trim().replace(/[^\d.,-]/g, '');
                            if (vStr.indexOf(',') > -1 && vStr.indexOf('.') === -1) vStr = vStr.replace(',', '.');
                            else if (vStr.indexOf(',') > -1 && vStr.indexOf('.') > -1) vStr = vStr.replace(/\./g, '').replace(',', '.');
                            val = parseFloat(vStr);
                        }

                        if (isNaN(val)) continue;

                        // Note: conta_contabil_id will be resolved by the save function
                        // by matching codigoConta with plano_contas.codigo_contabil
                        chunkTransformed.push({
                            ano: map.year,
                            mes: map.month,
                            valor: val,
                            empresa_id: selectedCompanyId,
                            // Store codigo temporarily - will be resolved to UUID in save function
                            conta_contabil_id: String(codigoConta)
                        });
                    }
                }

                if (chunkTransformed.length > 0) {
                    await bulkSaveSaldosMensais(chunkTransformed, tenantId);
                }
                
                const currentProgress = Math.min(100, Math.round((end / total) * 100));
                setProgress(currentProgress);
                setStatusMessage(`Processando... ${currentProgress}%`);
            }

            setStatusMessage('Concluído!');
            setIsProcessing(false);
            setTimeout(() => { onSuccess(); onClose(); }, 1000);

        } catch (err) {
            console.error("Erro no processamento:", err);
            alert("Erro no processamento. Verifique o console para detalhes.");
            setIsProcessing(false);
            setStep(2);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-bold text-slate-800">Importar Balancetes Mensais</h3>
                    {!isProcessing && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">
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
                                        <StyledSelect value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} containerClassName="w-full" className="h-11 pl-4 text-sm font-medium border-slate-300 focus:border-primary">
                                            <option value="">Selecione a empresa...</option>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.nickname || c.name}</option>)}
                                        </StyledSelect>
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
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <div className="w-full max-w-md text-center bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                                <div className="mb-6">
                                    {progress < 100 ? (
                                        <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin mx-auto"></div>
                                    ) : (
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <div className="text-2xl font-bold text-slate-800 mb-2">{progress < 100 ? 'Importando...' : 'Sucesso!'}</div>
                                    <p className="text-slate-500 text-sm">{statusMessage}</p>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
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
