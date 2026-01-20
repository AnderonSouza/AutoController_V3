import React, { useState, useEffect } from 'react';
import FileImportModal, { ImportFieldDefinition } from './FileImportModal';
import { generateUUID } from '../utils/helpers';

interface ManagementViewProps {
  onUploadCostCenterClick: () => void;
  onNavigateToCostCenters: () => void;
  hasCostCenters: boolean;
  onNavigateToCompanies: () => void;
  onNavigateToBrands: () => void;
  onNavigateToEconomicGroups: () => void;
  onNavigateToUserManagement: () => void;
  onNavigateToDreChartOfAccounts: () => void;
  onUploadDreChartOfAccountsClick: () => void;
  onNavigateToBenchmarks: () => void;
  onNavigateToReportTemplates: () => void;
  isLoading: boolean;
  mode?: 'structure' | 'parameters' | 'both'; 
  onUploadChartOfAccountsClick?: () => void; 
  onNavigateToChartOfAccounts?: () => void;
  hasChartOfAccounts?: boolean;
  onNavigateToBalanceSheetStructure?: () => void; 
  onUploadBalanceSheetStructureClick?: () => void; 
  
  // Specific Audit Props
  dreUnmappedCount?: number;
  bsUnmappedCount?: number;
  
  // Legacy/Global mapping nav
  onNavigateToMapping?: () => void;
}

const ManagementView: React.FC<ManagementViewProps> = ({ 
    onUploadCostCenterClick,
    onNavigateToCostCenters,
    hasCostCenters,
    onNavigateToCompanies,
    onNavigateToBrands,
    onNavigateToEconomicGroups,
    onNavigateToUserManagement,
    onNavigateToDreChartOfAccounts,
    onUploadDreChartOfAccountsClick,
    onNavigateToBenchmarks,
    onNavigateToReportTemplates,
    isLoading,
    mode = 'both',
    onUploadChartOfAccountsClick,
    onNavigateToChartOfAccounts,
    hasChartOfAccounts,
    onNavigateToBalanceSheetStructure,
    onUploadBalanceSheetStructureClick,
    dreUnmappedCount = 0,
    bsUnmappedCount = 0,
    onNavigateToMapping
}) => {
  const [activeTab, setActiveTab] = useState(mode === 'parameters' ? 'parameters' : 'structure');

  useEffect(() => {
      if (mode === 'structure') setActiveTab('structure');
      else if (mode === 'parameters') setActiveTab('parameters');
  }, [mode]);

  const tabs = [
    { id: 'structure', label: 'Estrutura Organizacional' },
    { id: 'parameters', label: 'Parâmetros de Apuração' },
  ];

  // Qlik Cloud Style Card
  const Card = ({ 
      title, 
      description, 
      icon, 
      actions,
      warning
  }: { 
      title: string; 
      description: string; 
      icon: React.ReactNode; 
      actions: React.ReactNode;
      warning?: number;
  }) => (
    <div className={`bg-white p-6 rounded-xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full group relative overflow-hidden ${warning && warning > 0 ? 'border-orange-200' : 'border-slate-200'}`}>
        {/* Decorative Top Line */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${warning && warning > 0 ? 'via-orange-400' : 'via-slate-200'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>

        {warning && warning > 0 ? (
            <div className="absolute top-4 right-4 animate-pulse">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 border border-red-200 text-xs font-bold" title={`${warning} contas pendentes de mapeamento`}>
                    !
                </span>
            </div>
        ) : null}

        <div>
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-colors duration-300 ${warning && warning > 0 ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-slate-50 border-slate-100 text-slate-500 group-hover:bg-primary group-hover:text-white group-hover:border-primary'}`}>
                    {icon}
                </div>
            </div>
            
            <h2 className="text-lg font-bold text-slate-800 group-hover:text-primary transition-colors mb-2">{title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">{description}</p>
            
            {warning && warning > 0 ? (
                <div className="mb-4 bg-red-50 border border-red-100 rounded-lg p-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span className="text-xs font-bold text-red-700">{warning} contas sem vínculo.</span>
                </div>
            ) : null}
        </div>

        <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-50">
            {actions}
        </div>
    </div>
  );

  const ActionButton = ({ onClick, disabled, icon, label, primary = false, alert = false }: any) => (
      <button 
        onClick={onClick} 
        disabled={disabled}
        className={`
            px-4 py-2 text-xs font-bold rounded-lg flex items-center transition-all duration-200
            ${primary 
                ? 'bg-slate-800 text-white hover:bg-primary shadow-sm' 
                : alert 
                    ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {label}
      </button>
  );

  // --- Import Handlers ---

    const handleImportCostCenters = () => {
        setImportModalConfig({
            isOpen: true,
            title: 'Importar Centros de Resultado',
            fields: [
                { key: 'sigla', label: 'Sigla CR', required: true, description: 'Código único (ex: 101)' },
                { key: 'descricao', label: 'Descrição CR', required: true, description: 'Nome do Centro de Custo' },
                { key: 'departamento', label: 'Departamento', required: false, description: 'Vínculo de agrupamento' }
            ],
            onImport: async (data: any[]) => {
                const cleanData = data.map((row: any) => ({
                    id: `new_${Date.now()}_${Math.random()}`, 
                    sigla: String(row.sigla || '').trim(),
                    descricao: String(row.descricao || '').trim(),
                    departamento: String(row.departamento || '').trim()
                })).filter((c: any) => c.sigla && c.descricao);

                if (cleanData.length > 0) {
                    await import('../utils/db').then(mod => mod.saveCadastro('cost_centers', cleanData));
                    if (onNavigateToCostCenters) onNavigateToCostCenters();
                    alert(`${cleanData.length} Centros de Resultado importados com sucesso!`);
                } else {
                    alert("Nenhum dado válido encontrado para importação.");
                }
            }
        });
    };

    const handleImportChartOfAccounts = () => {
        setImportModalConfig({
            isOpen: true,
            title: 'Importar Plano de Contas (Contábil)',
            fields: [
                { key: 'id', label: 'Conta Contábil (ID)', required: true, description: 'Código da conta (ex: 1.1.01)' },
                { key: 'name', label: 'Descrição', required: true, description: 'Nome da conta' },
                { key: 'reducedCode', label: 'Código Reduzido', required: false, description: 'Código curto do ERP' },
                { key: 'accountType', label: 'Tipo (Analítica/Sintética)', required: false, description: 'A=Analítica, S=Sintética' },
                { key: 'nature', label: 'Natureza (D/C)', required: false, description: 'D=Devedora, C=Credora' }
            ],
            onImport: async (data: any[]) => {
                const cleanData = data.map((row: any) => {
                    const excelCode = String(row.id || '').trim();
                    const explicitReducedCode = row.reducedCode ? String(row.reducedCode).trim() : null;
                    
                    return {
                        id: `new_${generateUUID()}`, 
                        reducedCode: explicitReducedCode || excelCode, 
                        name: String(row.name || '').trim(),
                        accountType: row.accountType ? String(row.accountType).charAt(0).toUpperCase() : 'A',
                        nature: row.nature ? String(row.nature).charAt(0).toUpperCase() : 'D',
                        monthlyData: {}
                    };
                }).filter((a: any) => a.reducedCode && a.name);

                if (cleanData.length > 0) {
                    const db = await import('../utils/db');
                    await db.saveCadastro('chart_of_accounts', cleanData);
                    if (onNavigateToChartOfAccounts) onNavigateToChartOfAccounts();
                    alert(`${cleanData.length} contas importadas com sucesso!`);
                } else {
                    alert("Nenhum dado válido encontrado.");
                }
            }
        });
    };

    // --- State for Import Modal ---
    const [importModalConfig, setImportModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        fields: ImportFieldDefinition[];
        onImport: (data: any[]) => Promise<void>;
    }>({ isOpen: false, title: '', fields: [], onImport: async () => {} });


  return (
    <main className="flex-grow flex flex-col h-full overflow-y-auto bg-white">
      <div className="w-full p-6">
        <div className="mb-8 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">
                    {mode === 'structure' ? 'Estrutura Organizacional' : mode === 'parameters' ? 'Parâmetros de Apuração' : 'Gerenciamento'}
                </h1>
                <p className="text-slate-500 text-lg">
                    {mode === 'structure' ? 'Configure as entidades e hierarquia da empresa.' : 
                    mode === 'parameters' ? 'Centralize planos de contas, mapeamentos, centros de custo e metas para a apuração dos resultados.' : 
                    'Administração geral do sistema.'}
                </p>
            </div>
        </div>
            
        {mode === 'both' && (
            <div className="mb-8 border-b border-slate-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map(tab => (
                    <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                        ${activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }
                    `}
                    >
                    {tab.label}
                    </button>
                ))}
                </nav>
            </div>
        )}

        <div className="animate-fadeIn">
            {activeTab === 'structure' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card 
                    title="Grupo Econômico"
                    description="Defina a identidade visual, nome do grupo e configurações globais da aplicação."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                    actions={
                        <ActionButton 
                            onClick={onNavigateToEconomicGroups} 
                            disabled={isLoading} 
                            primary 
                            label="Configurar"
                        />
                    }
                />
                <Card 
                    title="Marcas (Bandeiras)"
                    description="Gerencie as marcas representadas (ex: GM, Honda) para segmentação de relatórios."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                    actions={
                        <ActionButton 
                            onClick={onNavigateToBrands} 
                            disabled={isLoading} 
                            primary 
                            label="Gerenciar Marcas"
                        />
                    }
                />
                <Card 
                    title="Empresas (Lojas)"
                    description="Cadastro de CNPJs e códigos ERP para vínculo correto na importação de dados."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>}
                    actions={
                        <ActionButton 
                            onClick={onNavigateToCompanies} 
                            disabled={isLoading} 
                            primary 
                            label="Gerenciar Lojas"
                        />
                    }
                />
            </div>
            )}

            {activeTab === 'parameters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <Card 
                    title="Mapeamento Global"
                    description="Central de vínculo entre Contas Contábeis e Gerenciais. Resolva pendências de mapeamento aqui."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                    actions={
                        onNavigateToMapping && (
                            <ActionButton 
                                onClick={onNavigateToMapping} 
                                disabled={isLoading} 
                                label="Gerenciar Mapeamentos"
                            />
                        )
                    }
                />

                <Card 
                    title="Plano de Contas (Contábil)"
                    description="Visualize o plano de contas importado do ERP para referência nos mapeamentos."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                    actions={
                        <>
                            {onUploadChartOfAccountsClick && <ActionButton onClick={handleImportChartOfAccounts} disabled={isLoading} label="Importar Excel" icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} />}
                            {onNavigateToChartOfAccounts && <ActionButton onClick={onNavigateToChartOfAccounts} disabled={!hasChartOfAccounts || isLoading} label="Visualizar" />}
                        </>
                    }
                />
                
                <Card 
                    title="Centro de Resultado & Deptos"
                    description="Mapeie as siglas de C.R. do balancete para os Departamentos da aplicação."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                    actions={
                        <>
                            <ActionButton onClick={onUploadCostCenterClick} disabled={isLoading} label="Importar" icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} />
                            <ActionButton onClick={onNavigateToCostCenters} disabled={isLoading} label="Gerenciar" />
                        </>
                    }
                />
                
                <Card 
                    title="Contas de Resultado (DRE)"
                    description="Gerencie apenas a lista de contas DRE. Os vínculos ficam no Mapeamento Global."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                    warning={dreUnmappedCount}
                    actions={
                        <>
                            <ActionButton onClick={onUploadDreChartOfAccountsClick} disabled={isLoading} label="Importar" icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} />
                            <ActionButton onClick={onNavigateToDreChartOfAccounts} disabled={isLoading} label="Gerenciar Contas" alert={dreUnmappedCount > 0} primary={dreUnmappedCount > 0} />
                        </>
                    }
                />
                
                <Card 
                    title="Contas Patrimoniais (Balanço)"
                    description="Gerencie as contas de Ativo e Passivo. Os vínculos ficam no Mapeamento Global."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
                    warning={bsUnmappedCount}
                    actions={
                        <>
                            {onUploadBalanceSheetStructureClick && <ActionButton onClick={onUploadBalanceSheetStructureClick} disabled={isLoading} label="Importar" icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} />}
                            {onNavigateToBalanceSheetStructure && <ActionButton onClick={onNavigateToBalanceSheetStructure} disabled={isLoading} label="Gerenciar Contas" alert={bsUnmappedCount > 0} primary={bsUnmappedCount > 0} />}
                        </>
                    }
                />

                <Card 
                    title="Benchmarks (Metas)"
                    description="Defina indicadores-chave de desempenho (KPIs) esperados por marca e departamento."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                    actions={
                        <ActionButton 
                            onClick={onNavigateToBenchmarks} 
                            disabled={isLoading} 
                            label="Definir Metas"
                        />
                    }
                />
                
                {mode === 'both' && (
                    <Card 
                        title="Modelos de Demonstrações"
                        description="Crie estruturas personalizadas de DRE e Fluxo de Caixa, definindo grupos e totalizadores."
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        actions={
                            <ActionButton 
                                onClick={onNavigateToReportTemplates} 
                                disabled={isLoading} 
                                label="Editar Modelos"
                            />
                        }
                    />
                )}
            </div>
            )}
        </div>
      </div>

      <FileImportModal 
          isOpen={importModalConfig.isOpen}
          title={importModalConfig.title}
          fields={importModalConfig.fields}
          onImport={importModalConfig.onImport}
          onClose={() => setImportModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </main>
  );
};

export default ManagementView;
