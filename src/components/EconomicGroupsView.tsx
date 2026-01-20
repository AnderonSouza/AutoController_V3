import React, { useState, useEffect } from 'react';
import { EconomicGroup } from '../types';
import { getCadastroTenant } from '../utils/db'; // Fix: Use getCadastroTenant

interface EconomicGroupsViewProps {
  economicGroups: EconomicGroup[];
  onNavigateBack: () => void;
  onSaveEconomicGroups: (updatedGroups: EconomicGroup[]) => Promise<void>;
  tenantId: string; // Added tenantId prop
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const EconomicGroupsView: React.FC<EconomicGroupsViewProps> = ({ economicGroups, onNavigateBack, onSaveEconomicGroups, tenantId }) => {
    const [editableGroup, setEditableGroup] = useState<EconomicGroup | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const initializeGroup = (group: EconomicGroup) => {
            setEditableGroup(JSON.parse(JSON.stringify(group)));
        };

        const createDefaultGroup = () => {
            setEditableGroup({
                id: `new_${Date.now()}`,
                name: 'Minha Empresa',
                logo: '',
                font: "'Source Sans Pro', sans-serif",
                primarycolor: '#6d28d9',
                secondarycolor: '#f1f5f9',
                sidebarColor: '#0f172a',
                sidebarTextColor: '#cbd5e1',
                backgroundColor: '#f1f5f9',
                textColor: '#1e293b',
                textSecondaryColor: '#64748b',
                headerColor: '#f1f5f9',
                headerTextColor: '#1e293b',
                borderradius: '0.75rem',
                loginBackgroundImage: '',
                loginLogo: '',
                interfaceConfig: {},
            });
        };

        if (economicGroups.length > 0) {
            initializeGroup(economicGroups[0]);
        } else {
            // Try fetching from DB directly as a fallback
            getCadastroTenant<EconomicGroup>('economicgroups', tenantId).then(groups => {
                if (groups && groups.length > 0) {
                    initializeGroup(groups[0]);
                } else {
                    createDefaultGroup();
                }
            }).catch(err => {
                console.error("Error self-healing economic group:", err);
                createDefaultGroup();
            });
        }
    }, [economicGroups, tenantId]);

    const handleFieldChange = (field: keyof EconomicGroup, value: string) => {
        setEditableGroup(prev => prev ? { ...prev, [field]: value } : null);
    };
    
    const handleLogoChange = async (file: File | null) => {
        if (!file) {
            handleFieldChange('logo', '');
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert('A imagem é muito grande. O limite é de 2MB.');
            return;
        }
        try {
            const base64Logo = await fileToBase64(file);
            handleFieldChange('logo', base64Logo);
        } catch (error) {
            console.error("Erro ao converter imagem:", error);
            alert("Não foi possível carregar a imagem.");
        }
    };
    
    const handleSaveChanges = async () => {
        if (!editableGroup || !editableGroup.name.trim()) {
            alert('O nome da empresa não pode estar em branco.');
            return;
        }
        
        setIsSaving(true);
        await onSaveEconomicGroups([editableGroup]);
        setIsSaving(false);
    };
    
    const inputClasses = "w-full bg-white border border-slate-300 rounded-lg shadow-sm py-1.5 px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition h-9";
    const labelClasses = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

    if (!editableGroup) {
        return (
            <main className="flex-grow flex items-center justify-center bg-white">
                <p>Carregando configurações...</p>
            </main>
        );
    }

    return (
        <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
            <div className="w-full flex flex-col h-full">
                <div className="flex flex-col overflow-hidden flex-grow">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Cadastro do Grupo Econômico</h1>
                            <p className="text-sm text-slate-500">Informações básicas de identificação.</p>
                        </div>
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="px-5 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover disabled:bg-slate-400 transition-colors shadow-sm flex items-center"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto">
                        <div className="max-w-2xl">
                            {/* Basic Identity */}
                            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-6">
                                <div>
                                    <label htmlFor="group-name" className={labelClasses}>NOME DA EMPRESA/GRUPO</label>
                                    <input id="group-name" type="text" value={editableGroup.name} onChange={(e) => handleFieldChange('name', e.target.value)} className={inputClasses} />
                                    <p className="text-xs text-slate-400 mt-1">Nome utilizado para identificação interna.</p>
                                </div>
                                
                                <div>
                                    <label className={labelClasses}>LOGO PRINCIPAL (MENU SUPERIOR)</label>
                                    <div className="flex gap-4 items-end mt-2">
                                        <div className="flex-shrink-0">
                                            {/* Standardized Logo Container with Checkerboard Background */}
                                            <div 
                                                className="h-20 w-32 flex items-center justify-center border border-slate-300 rounded-lg overflow-hidden shadow-sm p-2 transition-all"
                                                style={editableGroup.logo ? {
                                                    backgroundColor: '#f1f5f9', // fallback
                                                    backgroundImage: `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), 
                                                      linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), 
                                                      linear-gradient(45deg, transparent 75%, #cbd5e1 75%), 
                                                      linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`,
                                                    backgroundSize: '20px 20px',
                                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                                                } : { backgroundColor: '#ffffff' }}
                                            >
                                                {editableGroup.logo ? (
                                                    <img src={editableGroup.logo} alt="Logo" className="max-h-full max-w-full object-contain relative z-10"/>
                                                ) : (
                                                    <span className="text-slate-300 text-xs font-bold">{editableGroup.name?.[0]}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex h-9">
                                            <input id="group-logo" type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoChange(e.target.files ? e.target.files[0] : null)}/>
                                            <button type="button" onClick={() => document.getElementById(`group-logo`)?.click()} className="text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-l-md px-3 hover:bg-slate-50 border-r-0 whitespace-nowrap">Escolher Arquivo</button>
                                            <div className="flex-grow bg-slate-100 border border-slate-300 rounded-r-md px-3 flex items-center text-xs text-slate-500 truncate">{editableGroup.logo ? 'Imagem Carregada' : 'Nenhum arquivo selecionado'}</div>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Formato recomendado: PNG ou SVG com fundo transparente. A imagem será ajustada automaticamente para caber no espaço.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <p className="text-sm text-blue-800 font-medium">Procurando personalização avançada?</p>
                                <p className="text-xs text-blue-700 mt-1">Para alterar cores, fontes, tela de login e textos do menu, acesse a aba <strong>Sistema</strong> no menu lateral.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default EconomicGroupsView;
