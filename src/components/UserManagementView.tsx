import React, { useState } from 'react';
import { User, EconomicGroup, Brand, Company, Department } from '../types';
import UserEditModal from './UserEditModal';

interface UserManagementViewProps {
  onNavigateBack: () => void;
  users: User[];
  onSaveUser: (user: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  economicGroups: EconomicGroup[];
  brands: Brand[];
  companies: Company[];
  departments: Department[];
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ 
  onNavigateBack, users, onSaveUser, onDeleteUser, economicGroups, brands, companies, departments
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleAddNewUser = () => {
    setEditingUser({
      id: `new_${Date.now()}`, name: '', email: '', password: '', role: 'Analista',
      status: 'ativo',
      permissions: { 
        economicGroups: [], 
        brands: [], 
        stores: [], 
        departments: [],
        reportAccess: [],
        actionAccess: []
      }
    });
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => { setEditingUser(user); setIsModalOpen(true); };
  const handleCloseModal = () => { setEditingUser(null); setIsModalOpen(false); };
  
  const handleSave = async (user: User) => { 
      try {
        await onSaveUser(user); 
        handleCloseModal(); 
      } catch (error) {
        console.error("Erro ao salvar no modal:", error);
      }
  };
  
  const handleDelete = async (userId: string) => { await onDeleteUser(userId); handleCloseModal(); };

  // Fix: Added missing 'Operacional' key to roleColors to satisfy the Record<UserRole, string> type requirement.
  const roleColors: Record<User['role'], string> = {
    Administrador: 'text-emerald-800 bg-emerald-100 border-emerald-200',
    Gestor: 'text-sky-800 bg-sky-100 border-sky-200',
    Analista: 'text-indigo-800 bg-indigo-100 border-indigo-200',
    Leitor: 'text-slate-800 bg-slate-200 border-slate-300',
    Suporte: 'text-orange-800 bg-orange-100 border-orange-200',
    Operacional: 'text-amber-800 bg-amber-100 border-amber-200'
  };

  // Filter out any invalid user objects to prevent crashes
  const validUsers = Array.isArray(users) ? users.filter(u => u && u.id) : [];

  return (
    <main className="flex-grow p-6 lg:p-8 h-full overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        <button onClick={onNavigateBack} className="mb-6 text-sm text-slate-600 hover:text-slate-900 font-semibold flex items-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          Voltar
        </button>
        
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden flex-grow">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Usuários</h1>
                <p className="text-slate-500 mt-1">Adicione, edite ou remova usuários e configure suas permissões de acesso.</p>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleAddNewUser} 
                    className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover flex items-center shadow-md transform active:scale-95 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>
                    Adicionar Novo Usuário
                </button>
            </div>
          </div>
          
           <div className="overflow-auto flex-grow">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nome / E-mail</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {validUsers.length > 0 ? (
                      validUsers.map(user => (
                        <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.status === 'inativo' ? 'bg-slate-50/50' : ''}`}>
                          <td className="px-6 py-4">
                              <div className="flex flex-col">
                                  <span className={`text-sm font-bold ${user.status === 'inativo' ? 'text-slate-500' : 'text-slate-800'}`}>{user.name}</span>
                                  <span className="text-xs text-slate-500">{user.email}</span>
                              </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${roleColors[user.role] || 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                                {user.role}
                                {user.role === 'Suporte' && user.supportDepartment && ` (${user.supportDepartment === 'IT' ? 'TI' : 'Contr.'})`}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${(user.status || 'ativo') === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                <span className={`w-2 h-2 rounded-full ${(user.status || 'ativo') === 'ativo' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {(user.status || 'ativo') === 'ativo' ? 'Ativo' : 'Inativo'}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleEditUser(user)} 
                                className="text-primary hover:text-primary-hover font-semibold text-sm hover:underline"
                              >
                                  Gerenciar
                              </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                      <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-500 text-sm">
                              Nenhum usuário encontrado.
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </div>
      
      {isModalOpen && editingUser && (
        <UserEditModal 
            user={editingUser} 
            onClose={handleCloseModal} 
            onSave={handleSave} 
            onDelete={handleDelete} 
            economicGroups={economicGroups} 
            brands={brands} 
            companies={companies}
            departments={departments}
        />
      )}
    </main>
  );
};

export default UserManagementView;
