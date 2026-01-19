import React, { useState, useEffect, useMemo } from 'react';
import { User, EconomicGroup } from '../types';
import { CALENDAR_MONTHS } from '../constants';

interface ClosingLockViewProps {
    user?: User;
    economicGroup?: EconomicGroup;
    onSaveEconomicGroup?: (group: EconomicGroup) => Promise<void>;
    onNavigateBack?: () => void;
    tenantId?: string | null;
}

const ClosingLockView: React.FC<ClosingLockViewProps> = ({ user, economicGroup, onSaveEconomicGroup, onNavigateBack, tenantId }) => {
    // Formato interno combinado: "AAAA-MES" (ex: "2024-JANEIRO")
    const [selectedLockPeriod, setSelectedLockPeriod] = useState<string>("");
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Verificação robusta de permissão (Case insensitive e sem espaços)
    const isAdmin = useMemo(() => {
        if (!user || !user.role) return false;
        const role = user.role.trim().toLowerCase();
        return role === 'administrador' || role === 'gestor';
    }, [user]);

    // Gera as opções de data (Ex: de 2022 até o ano que vem)
    const periodOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = 2025;
        const endYear = currentYear + 1;
        const options: { label: string, value: string }[] = [];

        for (let y = endYear; y >= startYear; y--) {
            // Iterar invertido para meses mais recentes primeiro
            for (let i = CALENDAR_MONTHS.length - 1; i >= 0; i--) {
                const m = CALENDAR_MONTHS[i];
                // Capitalizar apenas a primeira letra para exibição (JANEIRO -> Janeiro)
                const labelMonth = m.charAt(0) + m.slice(1).toLowerCase();
                options.push({
                    label: `${labelMonth} ${y}`,
                    value: `${y}-${m}`
                });
            }
        }
        return options;
    }, []);

    useEffect(() => {
        if (economicGroup) {
            const y = economicGroup.lastClosedYear || new Date().getFullYear();
            const m = economicGroup.lastClosedMonth || CALENDAR_MONTHS[0];
            setSelectedLockPeriod(`${y}-${m}`);
        }
    }, [economicGroup]);

    const handleSaveConfig = async () => {
        if (!isAdmin) return;
        
        if (!selectedLockPeriod) {
            alert("Selecione um período para encerrar.");
            return;
        }

        const [yearStr, month] = selectedLockPeriod.split('-');
        const year = parseInt(yearStr);

        const confirmMsg = `Tem certeza que deseja encerrar o período até ${month}/${year}?\n\nUsuários (exceto Administradores) não poderão mais editar ou importar dados para datas anteriores ou iguais a este período.`;

        if (!window.confirm(confirmMsg)) return;

        setIsSavingConfig(true);
        setSuccessMessage(null);
        try {
            const updatedGroup = { 
                ...economicGroup, 
                lastClosedYear: year, 
                lastClosedMonth: month 
            };
            await onSaveEconomicGroup(updatedGroup);
            setSuccessMessage(`Período encerrado com sucesso em ${month}/${year}! As restrições de edição já estão em vigor.`);
            
            // Limpa a mensagem após 5 segundos
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar configuração.");
        } finally {
            setIsSavingConfig(false);
        }
    };

    return (
        <main className="flex-grow p-6 lg:p-8 flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-app)' }}>
            <div className="max-w-2xl mx-auto w-full">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Bloqueio de Período</h1>
                    <p className="text-slate-500">Defina a data limite para visualização e edição de dados.</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 transition-all">
                    
                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 animate-fadeIn">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-bold text-green-800">Sucesso</h3>
                                <p className="text-sm text-green-700">{successMessage}</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-red-100 rounded-lg text-red-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Data de Corte Contábil</h2>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    Selecione o último mês que foi <strong>totalmente fechado e auditado</strong>.
                                    <br/><br/>
                                    Usuários com perfil <em>Analista</em> ou <em>Leitor</em> <strong>não poderão alterar</strong> dados deste mês para trás, nem visualizar meses futuros (se ainda não abertos).
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-6 mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                Último Mês Fechado
                                {!isAdmin && <span className="ml-2 text-red-500 normal-case font-normal">(Somente Administradores podem alterar)</span>}
                            </label>
                            <div className="relative z-10">
                                <select
                                    value={selectedLockPeriod}
                                    onChange={(e) => setSelectedLockPeriod(e.target.value)}
                                    disabled={!isAdmin}
                                    className={`
                                        block w-full appearance-none rounded-lg border 
                                        py-3 pl-4 pr-10 text-slate-700 font-bold shadow-sm 
                                        focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary 
                                        disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300
                                        cursor-pointer transition-colors relative z-20
                                        ${isAdmin ? 'bg-white border-slate-300 hover:border-slate-400' : 'bg-slate-100'}
                                    `}
                                >
                                    {periodOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 z-30">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="flex justify-end pt-6 mt-2">
                                <button 
                                    onClick={handleSaveConfig}
                                    disabled={isSavingConfig}
                                    className={`
                                        px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-md 
                                        hover:bg-red-700 transition-all transform active:scale-95 disabled:opacity-50 
                                        disabled:transform-none flex items-center gap-2
                                    `}
                                >
                                    {isSavingConfig ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Encerrar Período
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        <p className="text-xs text-blue-800 leading-relaxed">
                            <strong>Dica:</strong> Mantenha esta data atualizada mensalmente após a conclusão de todas as tarefas de fechamento (DRE, Balanço, Fluxo de Caixa). Ao clicar em "Encerrar Período", você oficializa os números para toda a organização.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default ClosingLockView;
