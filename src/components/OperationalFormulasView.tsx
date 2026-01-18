"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, Save, X, Search, Calculator } from 'lucide-react'
import type { OperationalIndicator } from '../types'
import { getCadastroTenant, saveCadastroTenant, deleteById } from '../utils/db'
import { generateUUID } from '../utils/helpers'

interface OperationalFormulasViewProps {
  tenantId: string
}

interface FormulaRow {
  id: string
  organizacaoId: string
  codigo: string
  nome: string
  descricao?: string
  expressao: string
  categoria?: string
  unidadeMedida: string
  ativo: boolean
  createdAt?: string
  updatedAt?: string
}

const OperationalFormulasView: React.FC<OperationalFormulasViewProps> = ({ tenantId }) => {
  const [formulas, setFormulas] = useState<FormulaRow[]>([])
  const [indicators, setIndicators] = useState<OperationalIndicator[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [formData, setFormData] = useState<Partial<FormulaRow>>({
    codigo: "",
    nome: "",
    descricao: "",
    expressao: "",
    unidadeMedida: "R$",
    ativo: true,
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [formulasData, indicatorsData] = await Promise.all([
        getCadastroTenant("operational_formulas", tenantId),
        getCadastroTenant("operational_indicators", tenantId),
      ])

      const mappedFormulas: FormulaRow[] = (formulasData || []).map((row: any) => ({
        id: row.id,
        organizacaoId: row.organizacao_id,
        codigo: row.codigo,
        nome: row.nome,
        descricao: row.descricao,
        expressao: row.expressao,
        unidadeMedida: row.unidade_medida,
        ativo: row.ativo,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))

      const mappedIndicators: OperationalIndicator[] = (indicatorsData || [])
        .filter((row: any) => row.ativo)
        .map((row: any) => ({
          id: row.id,
          organizacaoId: row.organizacao_id,
          codigo: row.codigo,
          nome: row.nome,
          descricao: row.descricao,
          categoria: row.categoria,
          unidadeMedida: row.unidade_medida,
          natureza: row.natureza,
          escopo: row.escopo,
          permiteMeta: row.permite_meta,
          ativo: row.ativo,
          ordem: row.ordem,
        }))

      setFormulas(mappedFormulas)
      setIndicators(mappedIndicators)
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    if (!formData.codigo?.trim() || !formData.nome?.trim() || !formData.expressao?.trim()) {
      alert("Código, Nome e Fórmula são obrigatórios.")
      return
    }

    const codeExists = formulas.some(
      f => f.codigo.toUpperCase() === formData.codigo?.toUpperCase() && f.id !== editingId
    )
    if (codeExists) {
      alert("Já existe uma fórmula com este código.")
      return
    }

    try {
      setSaving(true)

      const dbData = {
        id: editingId || generateUUID(),
        organizacao_id: tenantId,
        codigo: formData.codigo?.toUpperCase(),
        nome: formData.nome,
        descricao: formData.descricao || null,
        expressao: formData.expressao,
        unidade_medida: formData.unidadeMedida,
        ativo: formData.ativo,
      }

      await saveCadastroTenant("operational_formulas", [dbData], tenantId)
      await loadData()
      resetForm()
    } catch (err) {
      console.error("Erro ao salvar fórmula:", err)
      alert("Erro ao salvar fórmula. Verifique os dados e tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (formula: FormulaRow) => {
    setEditingId(formula.id)
    setFormData({
      codigo: formula.codigo,
      nome: formula.nome,
      descricao: formula.descricao,
      expressao: formula.expressao,
      unidadeMedida: formula.unidadeMedida,
      ativo: formula.ativo,
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta fórmula?")) return

    try {
      await deleteById("operational_formulas", id)
      await loadData()
    } catch (err) {
      console.error("Erro ao excluir fórmula:", err)
      alert("Erro ao excluir fórmula.")
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: "",
      nome: "",
      descricao: "",
      expressao: "",
      unidadeMedida: "R$",
      ativo: true,
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const insertIndicatorCode = (codigo: string) => {
    const currentExpressao = formData.expressao || ""
    setFormData({ ...formData, expressao: currentExpressao + `OPE[${codigo}]` })
  }

  const insertFormulaCode = (codigo: string) => {
    const currentExpressao = formData.expressao || ""
    setFormData({ ...formData, expressao: currentExpressao + `FORM[${codigo}]` })
  }

  const filteredFormulas = formulas.filter(f => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return f.nome.toLowerCase().includes(term) || f.codigo.toLowerCase().includes(term)
  })

  const inputClasses = "w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  const selectClasses = "w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fórmulas Operacionais</h1>
          <p className="text-slate-500 mt-1">
            Crie indicadores calculados a partir de outros indicadores.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nova Fórmula
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClasses} pl-10`}
          />
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {editingId ? "Editar Fórmula" : "Nova Fórmula"}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
              <input
                type="text"
                value={formData.codigo || ""}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="Ex: TICKET_MEDIO_VN"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.nome || ""}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Ticket Médio - Veículos Novos"
                className={inputClasses}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <input
                type="text"
                value={formData.descricao || ""}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da fórmula"
                className={inputClasses}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fórmula *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.expressao || ""}
                  onChange={(e) => setFormData({ ...formData, expressao: e.target.value })}
                  placeholder="Ex: OPE[RECEITA_VN] / OPE[VOL_VENDA_VN]"
                  className={`${inputClasses} font-mono`}
                />
              </div>
              <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-2">
                  <strong>Sintaxe:</strong> Use <code className="bg-slate-200 px-1 rounded">OPE[CODIGO]</code> para indicadores operacionais 
                  e <code className="bg-slate-200 px-1 rounded">FORM[CODIGO]</code> para outras fórmulas.
                </p>
                <p className="text-xs text-slate-500">
                  Operadores: <code>+</code> soma, <code>-</code> subtração, <code>*</code> multiplicação, <code>/</code> divisão, <code>( )</code> parênteses
                </p>
              </div>
            </div>

            {indicators.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Indicadores disponíveis (clique para inserir)</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                  {indicators.map(ind => (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => insertIndicatorCode(ind.codigo)}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
                      title={ind.nome}
                    >
                      {ind.codigo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formulas.filter(f => f.id !== editingId).length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Fórmulas disponíveis (clique para inserir)</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                  {formulas.filter(f => f.id !== editingId).map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => insertFormulaCode(f.codigo)}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition"
                      title={f.nome}
                    >
                      {f.codigo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidade do Resultado</label>
              <select
                value={formData.unidadeMedida || "R$"}
                onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                className={selectClasses}
              >
                <option value="R$">R$</option>
                <option value="%">%</option>
                <option value="Unidades">Unidades</option>
                <option value="Quantidade">Quantidade</option>
                <option value="Dias">Dias</option>
                <option value="Horas">Horas</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Ativo</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredFormulas.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma fórmula cadastrada.</p>
            <p className="text-sm text-slate-400 mt-1">
              Clique em "Nova Fórmula" para criar indicadores calculados.
            </p>
          </div>
        ) : (
          filteredFormulas.map(formula => (
            <div
              key={formula.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs bg-purple-100 px-2 py-1 rounded text-purple-600">
                      {formula.codigo}
                    </span>
                    <span className="font-medium text-slate-800">{formula.nome}</span>
                    {!formula.ativo && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                  </div>
                  {formula.descricao && (
                    <p className="text-sm text-slate-500 mt-1">{formula.descricao}</p>
                  )}
                  <div className="mt-2 p-2 bg-slate-50 rounded font-mono text-sm text-slate-600">
                    {formula.expressao}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    Resultado em: {formula.unidadeMedida}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(formula)}
                    className="p-2 text-slate-400 hover:text-blue-600 transition"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(formula.id)}
                    className="p-2 text-slate-400 hover:text-red-600 transition"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default OperationalFormulasView
