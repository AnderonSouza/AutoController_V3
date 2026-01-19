import React, { useState } from 'react';
import { User, EconomicGroup, Brand, Company, Department } from '../types';
import UserEditModal from './UserEditModal';
import { UserPlus, ChevronLeft } from 'lucide-react';

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
      tenantId: economicGroups.length > 0 ? economicGroups[0].id : '',
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

  const roleColors: Record<User['role'], string> = {
    SUPER_ADMIN: 'text-purple-800 bg-purple-100',
    ADMIN: 'text-emerald-800 bg-emerald-100',
    Administrador: 'text-emerald-800 bg-emerald-100',
    Gestor: 'text-sky-800 bg-sky-100',
    Analista: 'text-indigo-800 bg-indigo-100',
    Leitor: 'text-slate-800 bg-slate-200',
    Suporte: 'text-orange-800 bg-orange-100',
    Operacional: 'text-amber-800 bg-amber-100'
  };

  const validUsers = Array.isArray(users) ? users.filter(u => u && u.id) : [];

  return (
    <div className="page-container">
      <button onClick={onNavigateBack} className="back-button">
        <ChevronLeft className="w-4 h-4" />
        Voltar
      </button>
      
      <div className="content-card">
        <div className="card-header">
          <div className="header-text">
            <h1 className="card-title">Gerenciamento de Usuários</h1>
            <p className="card-subtitle">Adicione, edite ou remova usuários e configure suas permissões de acesso.</p>
          </div>
          <div className="header-actions">
            <button onClick={handleAddNewUser} className="btn btn-primary">
              <UserPlus className="w-4 h-4" />
              Adicionar Novo Usuário
            </button>
          </div>
        </div>
        
        <div className="card-body p-0">
          <div className="data-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead className="sticky-header">
                <tr>
                  <th className="text-left">Nome / E-mail</th>
                  <th className="text-left">Perfil</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {validUsers.length > 0 ? (
                  validUsers.map(user => (
                    <tr key={user.id} className={user.status === 'inativo' ? 'opacity-60' : ''}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-text-main)]">{user.name}</span>
                          <span className="text-xs text-[var(--color-text-muted)]">{user.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${roleColors[user.role] || 'badge-neutral'}`}>
                          {user.role}
                          {user.role === 'Suporte' && user.supportDepartment && ` (${user.supportDepartment === 'IT' ? 'TI' : 'Contr.'})`}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${(user.status || 'ativo') === 'ativo' ? 'badge-success' : 'badge-error'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${(user.status || 'ativo') === 'ativo' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'}`}></span>
                          {(user.status || 'ativo') === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button onClick={() => handleEditUser(user)} className="action-link">
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="table-empty">
                        <span>Nenhum usuário encontrado.</span>
                      </div>
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
    </div>
  );
};

export default UserManagementView;
