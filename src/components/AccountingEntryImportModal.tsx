import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import StyledSelect from './StyledSelect';
import { excelSerialDateToJSDate } from '../utils/helpers';
import { bulkSaveLancamentos, getCadastroTenant } from '../utils/db';
import { TrialBalanceEntry, Company, CostCenter, FinancialAccount } from '../types';
import { CALENDAR_MONTHS } from '../constants';
import { Download, CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';

interface AccountingEntryImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantId: string;
}

interface FieldDefinition {
    key: string;
    label: string;
    required: boolean;
    alternativeKey?: string;
    description?: string;
}

interface ImportStats {
    totalFileRows: number;
    success: number;
    zeroValues: number;
    invalidData: number;
    companyNotFound: number;
    accountNotFound: number;
    costCenterNotFound: number;
}

interface AuditEntry {
    linha: number;
    status: 'success' | 'error' | 'warning';
    motivo: string;
    cnpj?: string;
    contaId?: string;
    siglaCr?: string;
    empresaEncontrada?: boolean;
    contaEncontrada?: boolean;
    crEncontrado?: boolean;
}

const REQUIRED_FIELDS: FieldDefinition[] = [
    { key: 'idconta', label: 'Conta Contábil (ID)', required: true, description: 'Código da conta no plano de contas' },
    { key: 'valor', label: 'Valor', required: true, description: 'Valor monetário do lançamento' },
    { key: 'natureza', label: 'Natureza (D/C)', required: true, description: 'D = Débito, C = Crédito' },
    { key: 'data', label: 'Data Lançamento', required: true, description: 'Data de competência' },
    { key: 'cnpj', label: 'CNPJ Empresa', required: true, alternativeKey: 'erpCode', description: 'CNPJ ou Cód. ERP (pelo menos um)' },
    { key: 'siglacr', label: 'Sigla CR', required: true, description: 'Código do Centro de Resultado' },
    { key: 'historico', label: 'Histórico / Observação', required: true, description: 'Descrição do lançamento' },
];

const OPTIONAL_FIELDS: FieldDefinition[] = [
    { key: 'erpCode', label: 'Cód. ERP (alternativo)', required: false, description: 'Código ERP da empresa (alternativo ao CNPJ)' },
];

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const AccountingEntryImportModal: React.FC<AccountingEntryImportModalProps> = ({ isOpen, onClose, onSuccess, tenantId }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [file, setFile] = useState<File | null>(null);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    
    const rawSheetDataRef = useRef<any[][]>([]);
    const [previewData, setPreviewData] = useState<any[][]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [totalRows, setTotalRows] = useState(0);

    const [stats, setStats] = useState<ImportStats>({ 
        totalFileRows: 0, 
        success: 0, 
        zeroValues: 0, 
        invalidData: 0,
        companyNotFound: 0,
        accountNotFound: 0,
        costCenterNotFound: 0
    });
    const auditEntriesRef = useRef<AuditEntry[]>([]);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFile(null);
            setExcelHeaders([]);
            rawSheetDataRef.current = [];
            setPreviewData([]);
            setMapping({});
            setProgress(0);
            setStatusMessage('');
            setIsProcessing(false);
            setStats({ totalFileRows: 0, success: 0, zeroValues: 0, invalidData: 0, companyNotFound: 0, accountNotFound: 0, costCenterNotFound: 0 });
            auditEntriesRef.current = [];
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
                    const fileRowCount = Math.max(0, jsonData.length - 1);
                    setTotalRows(fileRowCount);
                    setStats(prev => ({ ...prev, totalFileRows: fileRowCount }));
                    
                    const initialMapping: Record<string, string> = {};
                    ALL_FIELDS.forEach(field => {
                        const match = headers.find(h => 
                            h.toLowerCase() === field.key.toLowerCase() || 
                            h.toLowerCase().includes(field.label.toLowerCase().split(' ')[0]) ||
                            (field.key === 'historico' && (h.toLowerCase().includes('hist') || h.toLowerCase().includes('obs'))) ||
                            (field.key === 'idconta' && h.toLowerCase().includes('conta'))
                        );
                        if (match) initialMapping[field.key] = match;
                    });
                    setMapping(initialMapping);
                    setStep(2);
                }
            } catch (err) { alert("Erro ao ler arquivo."); }
        };
        reader.readAsArrayBuffer(file);
    };

    const validateMapping = (): boolean => {
        const hasCnpj = mapping.cnpj && mapping.cnpj !== '';
        const hasErpCode = mapping.erpCode && mapping.erpCode !== '';
        
        if (!hasCnpj && !hasErpCode) {
            alert('É necessário mapear pelo menos CNPJ Empresa ou Cód. ERP para identificar a empresa.');
            return false;
        }

        const requiredWithoutCompany = REQUIRED_FIELDS.filter(f => f.key !== 'cnpj');
        for (const field of requiredWithoutCompany) {
            if (!mapping[field.key]) {
                alert(`Campo obrigatório não mapeado: ${field.label}`);
                return false;
            }
        }
        return true;
    };

    const processInChunks = async () => {
        if (!validateMapping()) return;

        const BATCH_SIZE = 5000;
        const allData = rawSheetDataRef.current;
        const total = allData.length - 1; 
        const colIndices: Record<string, number> = {};
        Object.entries(mapping).forEach(([key, headerName]) => {
            colIndices[key] = excelHeaders.indexOf(headerName);
        });

        setStatusMessage('Carregando referências do sistema...');
        let localStats: ImportStats = { 
            totalFileRows: total, 
            success: 0, 
            zeroValues: 0, 
            invalidData: 0,
            companyNotFound: 0,
            accountNotFound: 0,
            costCenterNotFound: 0
        };
        auditEntriesRef.current = [];

        try {
            const [companies, accounts, costCenters] = await Promise.all([
                getCadastroTenant('companies', tenantId) as Promise<Company[]>,
                getCadastroTenant('chart_of_accounts', tenantId) as Promise<FinancialAccount[]>,
                getCadastroTenant('cost_centers', tenantId) as Promise<CostCenter[]>
            ]);

            console.log('[Import] Loaded reference data:', {
                companies: companies.length,
                accounts: accounts.length,
                costCenters: costCenters.length,
                tenantId
            });

            const companyByCnpjMap = new Map<string, string>();
            const companyByErpMap = new Map<string, string>();
            
            companies.forEach((c: any) => {
                const rawCnpj = c.cnpj || '';
                const normalizedCnpj = rawCnpj.replace(/\D/g, '');
                const erpCode = String(c.codigo_erp || c.erpCode || '').trim();
                
                if (normalizedCnpj) {
                    companyByCnpjMap.set(normalizedCnpj, c.id);
                }
                if (erpCode) {
                    companyByErpMap.set(erpCode, c.id);
                }
            });

            console.log('[Import] Company mappings:', {
                byCnpj: companyByCnpjMap.size,
                byErp: companyByErpMap.size,
                sampleCnpjs: Array.from(companyByCnpjMap.keys()).slice(0, 5),
                sampleErps: Array.from(companyByErpMap.keys()).slice(0, 5)
            });

            const accountByCodeMap = new Map<string, string>();
            accounts.forEach((a: any) => {
                const codigo = String(a.codigo || a.codigo_contabil || a.reducedCode || '').trim();
                if (codigo) {
                    accountByCodeMap.set(codigo, a.id);
                    // Add variant with leading zero removed
                    const noLeadingZeros = codigo.replace(/^0+/, '') || '0';
                    if (noLeadingZeros !== codigo) {
                        accountByCodeMap.set(noLeadingZeros, a.id);
                    }
                    // Add variant with extra zeros to handle Excel formats (up to 15 digits)
                    // Some Excel exports add trailing zeros to codes
                    for (let padLen = codigo.length + 1; padLen <= 15; padLen++) {
                        const padded = codigo.padEnd(padLen, '0');
                        accountByCodeMap.set(padded, a.id);
                    }
                }
            });

            // Check if specific problematic codes exist
            const testCodes = ['341101000001', '351001000007'];
            const foundTestCodes = testCodes.filter(c => accountByCodeMap.has(c));
            
            console.log('[Import] Account mappings:', {
                total: accountByCodeMap.size,
                rawAccountsLoaded: accounts.length,
                sampleCodes: Array.from(accountByCodeMap.keys()).slice(0, 15),
                testCodesFound: foundTestCodes,
                testCodesMissing: testCodes.filter(c => !accountByCodeMap.has(c))
            });

            const costCenterByCodeMap = new Map<string, string>();
            costCenters.forEach((cc: any) => { 
                const rawCode = String(cc.codigo || cc.sigla || '').trim();
                if (rawCode) {
                    costCenterByCodeMap.set(rawCode, cc.id);
                    const normalizedCode = rawCode.replace(/^0+/, '') || '0';
                    if (normalizedCode !== rawCode) {
                        costCenterByCodeMap.set(normalizedCode, cc.id);
                    }
                }
            });

            console.log('[Import] Cost center mappings:', {
                total: costCenterByCodeMap.size,
                sampleCodes: Array.from(costCenterByCodeMap.keys()).slice(0, 10)
            });

            for (let i = 1; i <= total; i += BATCH_SIZE) {
                await new Promise(resolve => setTimeout(resolve, 0));
                const end = Math.min(i + BATCH_SIZE, allData.length);
                const chunkRaw = allData.slice(i, end);
                const chunkTransformed: TrialBalanceEntry[] = [];

                chunkRaw.forEach((row, chunkIdx) => {
                    const globalIdx = i + chunkIdx + 1;
                    if (!row || row.length === 0 || row.every(cell => !cell)) {
                        localStats.invalidData++;
                        auditEntriesRef.current.push({
                            linha: globalIdx,
                            status: 'warning',
                            motivo: 'Linha vazia'
                        });
                        return;
                    }

                    try {
                        const getValue = (key: string) => {
                            const idx = colIndices[key];
                            return idx !== undefined && idx > -1 ? row[idx] : undefined;
                        };

                        const valorRaw = getValue('valor');
                        if (valorRaw === undefined || valorRaw === null || String(valorRaw).trim() === '') {
                            localStats.zeroValues++;
                            return;
                        }
                        
                        let valor = 0;
                        if (typeof valorRaw === 'number') valor = valorRaw;
                        else {
                            let vStr = String(valorRaw).trim().replace(/[^\d.,-]/g, ''); 
                            if (vStr.indexOf(',') > -1 && vStr.indexOf('.') === -1) vStr = vStr.replace(',', '.');
                            else if (vStr.indexOf(',') > -1 && vStr.indexOf('.') > -1) vStr = vStr.replace(/\./g, '').replace(',', '.');
                            valor = parseFloat(vStr);
                        }
                        
                        if (isNaN(valor)) {
                            localStats.invalidData++;
                            auditEntriesRef.current.push({
                                linha: globalIdx,
                                status: 'error',
                                motivo: `Valor inválido: "${valorRaw}"`
                            });
                            return;
                        }

                        if (Math.abs(valor) < 0.0001) {
                            localStats.zeroValues++;
                            return;
                        }

                        let finalDate = '';
                        let finalYear = 0;
                        let finalMonth = '';
                        const dataRaw = getValue('data');
                        
                        if (!dataRaw) {
                            localStats.invalidData++;
                            auditEntriesRef.current.push({
                                linha: globalIdx,
                                status: 'error',
                                motivo: 'Data ausente'
                            });
                            return;
                        }

                        if (typeof dataRaw === 'number') {
                            const jsDate = excelSerialDateToJSDate(dataRaw);
                            finalDate = jsDate.toISOString().split('T')[0];
                            finalYear = jsDate.getFullYear();
                            finalMonth = CALENDAR_MONTHS[jsDate.getMonth()];
                        } else {
                            const d = new Date(String(dataRaw).replace(/\//g, '-'));
                            if (!isNaN(d.getTime())) {
                                finalDate = d.toISOString().split('T')[0];
                                finalYear = d.getFullYear();
                                finalMonth = CALENDAR_MONTHS[d.getMonth()];
                            } else {
                                localStats.invalidData++;
                                auditEntriesRef.current.push({
                                    linha: globalIdx,
                                    status: 'error',
                                    motivo: `Data inválida: "${dataRaw}"`
                                });
                                return;
                            }
                        }

                        const idContaRaw = String(getValue('idconta') || '').trim();
                        if (!idContaRaw) {
                            localStats.invalidData++;
                            auditEntriesRef.current.push({
                                linha: globalIdx,
                                status: 'error',
                                motivo: 'ID Conta ausente'
                            });
                            return;
                        }

                        const excelCnpj = String(getValue('cnpj') || '').replace(/\D/g, '');
                        const excelErpCode = String(getValue('erpCode') || '').trim();
                        const siglaCrRaw = String(getValue('siglacr') || '').trim();
                        const siglaCrNormalized = siglaCrRaw.replace(/^0+/, '') || '0';
                        
                        const resolvedCompanyId = companyByCnpjMap.get(excelCnpj) || companyByErpMap.get(excelErpCode) || null;
                        const resolvedAccountId = accountByCodeMap.get(idContaRaw) || null;
                        const resolvedCostCenterId = costCenterByCodeMap.get(siglaCrRaw) || costCenterByCodeMap.get(siglaCrNormalized) || null;

                        const hasErrors = !resolvedCompanyId || !resolvedAccountId || !resolvedCostCenterId;
                        
                        if (!resolvedCompanyId) localStats.companyNotFound++;
                        if (!resolvedAccountId) localStats.accountNotFound++;
                        if (!resolvedCostCenterId) localStats.costCenterNotFound++;

                        if (hasErrors) {
                            const erros: string[] = [];
                            if (!resolvedCompanyId) erros.push(`Empresa não encontrada (CNPJ: ${excelCnpj || 'vazio'}, ERP: ${excelErpCode || 'vazio'})`);
                            if (!resolvedAccountId) erros.push(`Conta não encontrada (Código: ${idContaRaw})`);
                            if (!resolvedCostCenterId) erros.push(`CR não encontrado (Sigla: ${siglaCrRaw})`);
                            
                            auditEntriesRef.current.push({
                                linha: globalIdx,
                                status: 'error',
                                motivo: erros.join('; '),
                                cnpj: excelCnpj,
                                contaId: idContaRaw,
                                siglaCr: siglaCrRaw,
                                empresaEncontrada: !!resolvedCompanyId,
                                contaEncontrada: !!resolvedAccountId,
                                crEncontrado: !!resolvedCostCenterId
                            });
                            localStats.invalidData++;
                            return;
                        }

                        chunkTransformed.push({
                            empresa: String(getValue('empresa') || 'Indefinido'),
                            store: String(getValue('empresa') || 'Indefinido'), 
                            companyCnpj: excelCnpj,
                            companyErpCode: excelErpCode,
                            companyId: resolvedCompanyId, 
                            economicGroupId: tenantId,
                            contaContabilId: resolvedAccountId, 
                            centroResultadoId: resolvedCostCenterId, 
                            year: finalYear,
                            month: finalMonth,
                            data: finalDate,
                            idconta: idContaRaw, 
                            descricaoconta: String(getValue('descricaoconta') || ''),
                            historico: String(getValue('historico') || ''),
                            siglacr: siglaCrRaw,
                            descricaocr: String(getValue('descricaocr') || ''),
                            natureza: String(getValue('natureza') || 'D').trim().toUpperCase().charAt(0) as 'D' | 'C',
                            valor: valor
                        });
                        localStats.success++;

                    } catch (e) { 
                        localStats.invalidData++; 
                        auditEntriesRef.current.push({
                            linha: globalIdx,
                            status: 'error',
                            motivo: `Erro de processamento: ${e}`
                        });
                    }
                });

                if (chunkTransformed.length > 0) {
                    await bulkSaveLancamentos(chunkTransformed, tenantId);
                }
                setProgress(Math.min(100, Math.round((end / total) * 100)));
                setStatusMessage(`Processando... ${end.toLocaleString()} de ${total.toLocaleString()} linhas`);
            }

            setStats(localStats);
            setStep(3);

        } catch (err: any) {
            console.error('[Import] Error:', err);
            alert(`Erro ao importar: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadAuditLog = () => {
        const errors = auditEntriesRef.current.filter(e => e.status === 'error');
        
        const csvHeaders = ['Linha', 'Status', 'Motivo', 'CNPJ', 'Código Conta', 'Sigla CR', 'Empresa OK', 'Conta OK', 'CR OK'];
        const csvRows = errors.map(e => [
            e.linha,
            e.status,
            `"${e.motivo.replace(/"/g, '""')}"`,
            e.cnpj || '',
            e.contaId || '',
            e.siglaCr || '',
            e.empresaEncontrada ? 'SIM' : 'NÃO',
            e.contaEncontrada ? 'SIM' : 'NÃO',
            e.crEncontrado ? 'SIM' : 'NÃO'
        ].join(';'));
        
        const summaryLines = [
            `Relatório de Auditoria - Importação de Lançamentos`,
            `Data: ${new Date().toLocaleString('pt-BR')}`,
            `Arquivo: ${file?.name || 'Não identificado'}`,
            ``,
            `RESUMO:`,
            `Total de linhas no arquivo: ${stats.totalFileRows.toLocaleString()}`,
            `Importadas com sucesso: ${stats.success.toLocaleString()}`,
            `Ignoradas (valor zero/vazio): ${stats.zeroValues.toLocaleString()}`,
            `Erros de dados: ${stats.invalidData.toLocaleString()}`,
            ``,
            `DETALHAMENTO DE ERROS DE MAPEAMENTO:`,
            `Empresa não encontrada: ${stats.companyNotFound.toLocaleString()}`,
            `Conta contábil não encontrada: ${stats.accountNotFound.toLocaleString()}`,
            `Centro de resultado não encontrado: ${stats.costCenterNotFound.toLocaleString()}`,
            ``,
            `LINHAS COM ERRO:`,
            csvHeaders.join(';'),
            ...csvRows
        ];
        
        const blob = new Blob([summaryLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria_importacao_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleStartImport = async () => {
        setIsProcessing(true);
        setStatusMessage('Iniciando importação...');
        await processInChunks();
    };

    if (!isOpen) return null;

    const errorEntries = auditEntriesRef.current.filter(e => e.status === 'error');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800">Importar Lançamentos Contábeis</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {step === 1 && (
                        <div className="text-center py-8">
                            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 mb-4">Selecione um arquivo Excel (.xlsx) com os lançamentos</p>
                            <input 
                                type="file" 
                                accept=".xlsx,.xls" 
                                onChange={handleFileChange}
                                className="block mx-auto text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                                <p className="text-sm font-medium text-gray-700 mb-2">Campos obrigatórios:</p>
                                <ul className="text-xs text-gray-600 space-y-1">
                                    <li>• Conta Contábil (ID)</li>
                                    <li>• Valor</li>
                                    <li>• Natureza (D/C)</li>
                                    <li>• Data Lançamento</li>
                                    <li>• CNPJ Empresa <span className="text-gray-400">ou</span> Cód. ERP</li>
                                    <li>• Sigla CR</li>
                                    <li>• Histórico / Observação</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <div className="bg-blue-50 px-4 py-3 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>{file?.name}</strong> - {totalRows.toLocaleString()} linhas detectadas
                                </p>
                            </div>
                            
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Campos Obrigatórios</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {REQUIRED_FIELDS.map((field) => (
                                        <div key={field.key} className="bg-gray-50 p-3 rounded-lg">
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                {field.label} <span className="text-red-500">*</span>
                                            </label>
                                            <StyledSelect
                                                value={mapping[field.key] || ''}
                                                onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                            >
                                                <option value="">-- Selecione a Coluna --</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </StyledSelect>
                                            {field.description && (
                                                <p className="text-xs text-gray-500 mt-1.5">{field.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 mb-3">Campos Opcionais</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {OPTIONAL_FIELDS.map((field) => (
                                        <div key={field.key} className="bg-gray-50 p-3 rounded-lg opacity-80">
                                            <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                                {field.label}
                                            </label>
                                            <StyledSelect
                                                value={mapping[field.key] || ''}
                                                onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                            >
                                                <option value="">-- Selecione a Coluna --</option>
                                                {excelHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </StyledSelect>
                                            {field.description && (
                                                <p className="text-xs text-gray-500 mt-1.5">{field.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isProcessing && (
                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2 text-center">{statusMessage}</p>
                                </div>
                            )}

                            <div className="flex justify-between pt-4 border-t">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleStartImport}
                                    disabled={isProcessing}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isProcessing ? 'Processando...' : 'Iniciar Importação →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-2">
                            <div className="flex items-center justify-center gap-3 mb-3">
                                {stats.success > 0 ? (
                                    <CheckCircle size={32} className="text-green-500" />
                                ) : (
                                    <XCircle size={32} className="text-red-500" />
                                )}
                                <h3 className="text-xl font-bold text-gray-800">
                                    {stats.success > 0 ? 'Carga Finalizada!' : 'Nenhum registro importado'}
                                </h3>
                            </div>

                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <div className="bg-gray-100 p-2 rounded-lg">
                                    <p className="text-[10px] text-gray-500 uppercase">Total Arquivo</p>
                                    <p className="text-lg font-bold text-gray-800">{stats.totalFileRows.toLocaleString()}</p>
                                </div>
                                <div className="bg-green-50 p-2 rounded-lg">
                                    <p className="text-[10px] text-green-600 uppercase">Importadas</p>
                                    <p className="text-lg font-bold text-green-700">{stats.success.toLocaleString()}</p>
                                </div>
                                <div className="bg-yellow-50 p-2 rounded-lg">
                                    <p className="text-[10px] text-yellow-600 uppercase">Ignoradas</p>
                                    <p className="text-lg font-bold text-yellow-700">{stats.zeroValues.toLocaleString()}</p>
                                </div>
                                <div className="bg-red-50 p-2 rounded-lg">
                                    <p className="text-[10px] text-red-600 uppercase">Erros</p>
                                    <p className="text-lg font-bold text-red-700">{stats.invalidData.toLocaleString()}</p>
                                </div>
                            </div>

                            {stats.invalidData > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
                                    <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2 text-sm">
                                        <AlertTriangle size={14} />
                                        Detalhamento dos Erros
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="bg-white p-2 rounded border border-red-100">
                                            <p className="text-red-600 font-medium text-[10px]">Empresa não encontrada</p>
                                            <p className="text-lg font-bold text-red-800">{stats.companyNotFound.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-red-100">
                                            <p className="text-red-600 font-medium text-[10px]">Conta não encontrada</p>
                                            <p className="text-lg font-bold text-red-800">{stats.accountNotFound.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-red-100">
                                            <p className="text-red-600 font-medium text-[10px]">CR não encontrado</p>
                                            <p className="text-lg font-bold text-red-800">{stats.costCenterNotFound.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {errorEntries.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-red-700 mb-1">Primeiros 3 erros:</p>
                                            <div className="bg-white rounded border border-red-100 overflow-hidden">
                                                <table className="w-full text-[10px]">
                                                    <thead className="bg-red-100">
                                                        <tr>
                                                            <th className="p-1.5 text-left w-16">Linha</th>
                                                            <th className="p-1.5 text-left">Motivo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {errorEntries.slice(0, 3).map((e, i) => (
                                                            <tr key={i} className="border-t border-red-50">
                                                                <td className="p-1.5 font-mono">{e.linha}</td>
                                                                <td className="p-1.5 truncate max-w-[300px]">{e.motivo}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={downloadAuditLog}
                                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                    >
                                        <Download size={14} />
                                        Baixar Relatório de Erros (CSV)
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => { onSuccess(); onClose(); }}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                            >
                                Fechar e Concluir
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountingEntryImportModal;
