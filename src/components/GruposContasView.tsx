"use client"

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Save, FolderTree } from 'lucide-react'
import { GrupoContas } from '../types'

interface GruposContasViewProps {
  accountGroups: GrupoContas[]
  onNavigateBack: () => void
  onSaveAccountGroups: (data: GrupoContas[]) => Promise<void>
  onDeleteAccountGroup: (id: string) => Promise<void>
  tenantId: string
}

const GruposContasView: React.FC<GruposContasViewProps> = ({
  accountGroups,
  onNavigateBack,
  onSaveAccountGroups,
  onDeleteAccountGroup,
  tenantId
}) => {
  const [editableGroups, setEditableGroups] = useState<GrupoContas[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)

  useEffect(() => {
    setEditableGroups(JSON.parse(JSON.stringify(accountGroups)))
  }, [accountGroups])

  const handleGroupChange = (id: string, field: keyof GrupoContas, value: any) => {
    setEditableGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))
  }

  const handleAddGroup = () => {
    const newGroup: GrupoContas = {
      id: `new_${Date.now()}`,
      organizacaoId: tenantId,
      nome: '',
      descricao: '',
      tipo: 'dre',
      ordem: editableGroups.length + 1,
      ativo: true
    }
    setEditableGroups(prev => [...prev, newGroup])
  }

  const handleSaveGroups = async () => {
    const invalidGroups = editableGroups.filter(g => !g.nome.trim())
    if (invalidGroups.length > 0) {
      alert('Por favor, preencha o nome de todos os grupos.')
      return
    }

    setIsSaving(true)
    try {
      await onSaveAccountGroups(editableGroups)
      alert('Grupos de contas salvos com sucesso!')
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar grupos.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setGroupToDelete(id)
  }

  const confirmDeleteGroup = async () => {
    if (groupToDelete) {
      if (groupToDelete.startsWith('new_')) {
        setEditableGroups(prev => prev.filter(g => g.id !== groupToDelete))
      } else {
        await onDeleteAccountGroup(groupToDelete)
      }
      setGroupToDelete(null)
    }
  }

  return (
    <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
      <div className="w-full p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateBack}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FolderTree className="text-emerald-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Grupos de Contas</h1>
                <p className="text-sm text-slate-500">
                  Cadastre grupos para categorizar as contas do Plano DRE e Balanço.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddGroup}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={18} />
              Novo Grupo
            </button>
            <button
              onClick={handleSaveGroups}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b">
                  Ordem
                </th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b">
                  Nome
                </th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b">
                  Descricao
                </th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b">
                  Tipo
                </th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b">
                  Ativo
                </th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b w-20">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {editableGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Nenhum grupo de contas cadastrado. Clique em "Novo Grupo" para adicionar.
                  </td>
                </tr>
              ) : (
                editableGroups.map((group) => (
                  <tr key={group.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 w-24">
                      <input
                        type="number"
                        value={group.ordem}
                        onChange={(e) => handleGroupChange(group.id, 'ordem', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={group.nome}
                        onChange={(e) => handleGroupChange(group.id, 'nome', e.target.value)}
                        placeholder="Nome do grupo..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={group.descricao || ''}
                        onChange={(e) => handleGroupChange(group.id, 'descricao', e.target.value)}
                        placeholder="Descricao opcional..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="p-3 w-40">
                      <select
                        value={group.tipo}
                        onChange={(e) => handleGroupChange(group.id, 'tipo', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="dre">DRE</option>
                        <option value="balanco">Balanco</option>
                        <option value="ambos">Ambos</option>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={group.ativo}
                        onChange={(e) => handleGroupChange(group.id, 'ativo', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteClick(group.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir grupo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {groupToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Confirmar Exclusao</h3>
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja excluir este grupo de contas? 
              Esta acao nao podera ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setGroupToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteGroup}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default GruposContasView
