import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import StyledSelect from './StyledSelect';

export interface ImportFieldDefinition {
    key: string;
    label: string;
    required: boolean;
    description?: string;
}

interface FileImportModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any[]) => Promise<void>;
    fields: ImportFieldDefinition[];
}

const FileImportModal: React.FC<FileImportModalProps> = ({ title, isOpen, onClose, onImport, fields }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [file, setFile] = useState<File | null>(null);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFile(null);
            setExcelHeaders([]);
            setExcelData([]);
            setMapping({});
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            readFileHeaders(selectedFile);
        }
    };

    const readFileHeaders = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (jsonData.length > 0) {
                const headers = jsonData[0] as string[];
                setExcelHeaders(headers);
                setExcelData(jsonData.slice(1));
                const initialMapping: Record<string, string> = {};
                fields.forEach(field => {
                    const match = headers.find(h => 
                        h.toLowerCase().includes(field.label.toLowerCase()) || 
                        h.toLowerCase().includes(field.key.toLowerCase())
                    );
                    if (match) initialMapping[field.key] = match;
                });
                setMapping(initialMapping);
                setStep(2);
            } else {
                alert("O arquivo parece estar vazio ou sem cabeçalho.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleMappingChange = (systemKey: string, excelHeader: string) => {
        setMapping(prev => ({ ...prev, [systemKey]: excelHeader }));
    };

    const getPreviewData = () => {
        return excelData.slice(0, 3).map((row, rowIndex) => {
            const mappedRow: any = {};
            fields.forEach(field => {
                const header = mapping[field.key];
                if (header) {
                    const colIndex = excelHeaders.indexOf(header);
                    mappedRow[field.key] = row[colIndex];
                }
            });
            return mappedRow;
        });
    };

    const handleConfirmMapping = () => {
        const missingRequired = fields.filter(f => f.required && !mapping[f.key]);
        if (missingRequired.length > 0) {
            alert(`Por favor, mapeie os seguintes campos obrigatórios: ${missingRequired.map(f => f.label).join(', ')}`);
            return;
        }
        setStep(3);
    };

    const handleFinalImport = async () => {
        setIsProcessing(true);
        try {
            const processedData = excelData.map(row => {
                const mappedRow: any = {};
                fields.forEach(field => {
                    const header = mapping[field.key];
                    if (header) {
                        const colIndex = excelHeaders.indexOf(header);
                        let value = row[colIndex];
                        if (typeof value === 'string') value = value.trim();
                        mappedRow[field.key] = value;
                    }
                });
                return mappedRow;
            });

            await onImport(processedData);
            onClose();
        } catch (error) {
            console.error("Erro na importação:", error);
            alert("Ocorreu um erro ao processar os dados.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-grow overflow-y-auto p-6 bg-white">
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all relative p-10 text-center cursor-pointer group">
                            <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                            <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4 group-hover:scale-110 transition-transform">
                                <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <h4 className="text-lg font-semibold text-slate-700">Clique para selecionar o arquivo</h4>
                            <p className="text-sm text-slate-500 mt-2">Suporta arquivos grandes (.xlsx) até 1M linhas</p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded border border-blue-100">
                                Identificamos as colunas abaixo. Por favor, relacione as colunas do seu arquivo com os campos do sistema.
                            </p>
                            <div className="space-y-3">
                                {fields.map(field => (
                                    <div key={field.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b border-slate-100 pb-3 last:border-0">
                                        <div className="md:col-span-5">
                                            <label className="block text-sm font-medium text-slate-800">
                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            {field.description && <p className="text-xs text-slate-400">{field.description}</p>}
                                        </div>
                                        <div className="md:col-span-1 text-center text-slate-300 hidden md:block">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </div>
                                        <div className="md:col-span-6">
                                            <StyledSelect 
                                                value={mapping[field.key] || ''}
                                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                containerClassName="w-full"
                                            >
                                                <option value="">-- Selecione a coluna do Excel --</option>
                                                {excelHeaders.map(header => (
                                                    <option key={header} value={header}>{header}</option>
                                                ))}
                                            </StyledSelect>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h4 className="text-md font-bold text-slate-800">Pré-visualização dos Dados</h4>
                            <p className="text-sm text-slate-500">Confira se os dados das primeiras linhas foram mapeados corretamente.</p>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {fields.map(f => (
                                                <th key={f.key} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    {f.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {getPreviewData().map((row, idx) => (
                                            <tr key={idx}>
                                                {fields.map(f => (
                                                    <td key={f.key} className="px-3 py-2 text-sm text-slate-700 whitespace-nowrap">
                                                        {row[f.key] !== undefined ? String(row[f.key]) : <span className="text-slate-300 italic">Vazio</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-slate-400 text-center mt-4">Total de linhas a importar: {excelData.length}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between shrink-0">
                    {step > 1 ? (
                        <button onClick={() => setStep(prev => (prev - 1) as any)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                            Voltar
                        </button>
                    ) : <div></div>}
                    
                    {step === 1 && <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>}
                    {step === 2 && <button onClick={handleConfirmMapping} className="px-6 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover shadow-sm transition-colors">Continuar</button>}
                    {step === 3 && (
                        <button onClick={handleFinalImport} disabled={isProcessing} className="px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 shadow-sm transition-colors disabled:bg-slate-300 flex items-center">
                            {isProcessing ? 'Processando...' : 'Confirmar Importação'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileImportModal;
