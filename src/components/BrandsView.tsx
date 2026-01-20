import React, { useState, useEffect } from 'react';
import { Brand, EconomicGroup } from '../types';
import StyledSelect from './StyledSelect';
import { getCadastroTenant } from '../utils/db';

interface BrandsViewProps {
  brands: Brand[];
  economicGroups: EconomicGroup[];
  onNavigateBack: () => void;
  onSaveBrands: (updatedBrands: Brand[]) => Promise<void>;
  onDeleteBrand?: (id: string) => Promise<void>;
  tenantId?: string | null;
}

const DeleteConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
    isLoading: boolean;
}> = ({ isOpen, onClose, onConfirm, itemName, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 transform transition-all scale-100">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Excluir Marca?
                    </h3>
                    <div className="text-sm text-slate-600 mb-6">
                        <p className="mb-2">Você está prestes a excluir a marca <strong>{itemName}</strong>.</p>
                        <p className="text-slate-500">Esta ação é irreversível.</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirm} 
                        disabled={isLoading}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg shadow-red-200 transition-all flex items-center disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Excluindo...
                            </>
                        ) : (
                            'Sim, Excluir'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const BrandsView: React.FC<BrandsViewProps> = ({ brands, economicGroups, onNavigateBack, onSaveBrands, onDeleteBrand, tenantId }) => {
    const [editableBrands, setEditableBrands] = useState<Brand[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

    useEffect(() => {
        setEditableBrands(JSON.parse(JSON.stringify(brands)));
    }, [brands]);

    const handleFieldChange = (id: string, field: keyof Brand, value: string) => {
        setEditableBrands(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const handleLogoChange = async (id: string, file: File | null) => {
        if (!file) {
            handleFieldChange(id, 'logo', '');
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert('A imagem é muito grande. O limite é de 2MB.');
            return;
        }
        try {
            const base64Logo = await fileToBase64(file);
            handleFieldChange(id, 'logo', base64Logo);
        } catch (error) {
            console.error("Erro ao converter imagem:", error);
            alert("Não foi possível carregar a imagem.");
        }
    };

    const handleRemoveBrand = (id: string) => {
        const brand = editableBrands.find(b => b.id === id);
        if (brand) setBrandToDelete(brand);
    };

    const confirmDeleteBrand = async () => {
        if (!brandToDelete) return;
        
        setIsSaving(true); // Using generic loading state for delete modal too
        try {
            if (brandToDelete.id.startsWith('new_')) {
                // Just remove from local state if not saved yet
                setEditableBrands(prev => prev.filter(b => b.id !== brandToDelete.id));
            } else if (onDeleteBrand) {
                // Call API to delete
                await onDeleteBrand(brandToDelete.id);
                // Also update local state to reflect immediately
                setEditableBrands(prev => prev.filter(b => b.id !== brandToDelete.id));
            }
            setBrandToDelete(null);
        } catch (error) {
            console.error("Failed to delete brand", error);
            alert("Erro ao excluir a marca. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddBrand = () => {
        const newBrand: Brand = {
            id: `new_${Date.now()}`,
            name: '',
            economicGroupId: economicGroups[0]?.id || '', // Updated
            logo: '',
        };
        setEditableBrands(prev => [...prev, newBrand]);
    };

    const handleSaveChanges = async () => {
        const firstInvalidBrand = editableBrands.find(b => !b.name.trim() || !b.economicGroupId);

        if (firstInvalidBrand) {
            const brandIdentifier = firstInvalidBrand.name.trim() || 'uma nova marca';
            alert(`Não é possível salvar. Verifique a marca "${brandIdentifier}". O nome da marca não pode estar em branco e um grupo econômico deve ser selecionado.`);
            return;
        }

        const names = editableBrands.map(b => b.name.trim().toLowerCase());
        if (new Set(names).size !== names.length) {
            alert('Não pode haver marcas com nomes duplicados.');
            return;
        }
        
        setIsSaving(true);
        await onSaveBrands(editableBrands);
        setIsSaving(false);
    };

    const inputClasses = "w-full bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition";

    return (
        <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
            <div className="w-full flex flex-col h-full">
                <div className="flex flex-col overflow-hidden flex-grow">
                    {/* Header Section - Fixed */}
                    <div className="p-6 border-b border-slate-100 shrink-0 bg-white z-10">
                        <div className="flex justify-between items-center mb-2">
                            <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Marcas</h1>
                            <button
                              onClick={handleAddBrand}
                              disabled={economicGroups.length === 0}
                              className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-200 flex items-center shadow-sm disabled:bg-slate-300"
                              title={economicGroups.length === 0 ? "Cadastre um grupo econômico primeiro" : "Adicionar nova marca"}
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                               Adicionar Marca
                            </button>
                        </div>
                        <p className="text-slate-600">Adicione, edite ou remova as marcas (bandeiras) e associe-as a um grupo econômico.</p>
                    </div>
                    
                    {/* Scrollable List Section - Added pb-20 for clearance */}
                    <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50 pb-20">
                        <div className="space-y-4">
                            {editableBrands.map((brand) => (
                                <div key={brand.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    {/* Logo Column Reduced to 3 to give space to Group */}
                                    <div className="md:col-span-3 flex items-center gap-4">
                                        <div 
                                            className="flex-shrink-0 w-24 h-16 flex items-center justify-center rounded-lg border border-slate-200 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner"
                                        >
                                            {brand.logo ? (
                                                <img src={brand.logo} alt="Logo" className="max-h-full max-w-full object-contain"/>
                                            ) : (
                                                <div className="text-slate-300 text-xs text-center font-medium">Sem logo</div>
                                            )}
                                        </div>
                                        <div>
                                            <input id={`logo-upload-${brand.id}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoChange(brand.id, e.target.files ? e.target.files[0] : null)}/>
                                            <button type="button" onClick={() => document.getElementById(`logo-upload-${brand.id}`)?.click()} className="text-xs font-bold text-primary hover:underline uppercase tracking-wide">
                                              {brand.logo ? "Alterar" : "Adicionar Logo"}
                                            </button>
                                            <p className="text-[10px] text-slate-400 mt-0.5">PNG/SVG Transparente</p>
                                        </div>
                                    </div>
                                    
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome da Marca</label>
                                        <input
                                            type="text"
                                            value={brand.name}
                                            onChange={(e) => handleFieldChange(brand.id, 'name', e.target.value)}
                                            className={inputClasses}
                                            placeholder="Ex: Chevrolet"
                                        />
                                    </div>
                                    
                                    {/* Group Column Increased to 4 */}
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Grupo Econômico</label>
                                        <StyledSelect
                                            value={brand.economicGroupId || ''} 
                                            onChange={(e) => handleFieldChange(brand.id, 'economicGroupId', e.target.value)}
                                            className="w-full py-2 pl-3 pr-10 text-sm"
                                            containerClassName="w-full"
                                        >
                                            <option value="" disabled>Selecione...</option>
                                            {economicGroups.map(group => (
                                                <option key={group.id} value={group.id}>{group.name}</option>
                                            ))}
                                        </StyledSelect>
                                    </div>
                                    
                                    <div className="md:col-span-1 flex justify-end">
                                        <button
                                            onClick={() => handleRemoveBrand(brand.id)}
                                            className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                                            title="Remover marca"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                             {editableBrands.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <p>Nenhuma marca cadastrada.</p>
                                    <button onClick={handleAddBrand} className="mt-2 text-primary font-semibold hover:underline text-sm">
                                        Adicionar a primeira marca
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Footer Section - Fixed */}
                    <div className="px-6 py-4 bg-white border-t border-slate-200 shrink-0 flex justify-end z-10">
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="px-6 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-hover disabled:bg-slate-300 transition-colors duration-200 flex items-center shadow-md transform active:scale-95"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Salvando...
                                </>
                            ) : 'Salvar Alterações'}
                        </button>
                    </div>

                </div>
            </div>
            
            <DeleteConfirmationModal 
                isOpen={!!brandToDelete}
                onClose={() => setBrandToDelete(null)}
                onConfirm={confirmDeleteBrand}
                itemName={brandToDelete?.name || 'Nova Marca'}
                isLoading={isSaving}
            />
        </main>
    );
};

export default BrandsView;
