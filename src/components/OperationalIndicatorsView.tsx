"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, Save, X, Search, Filter } from 'lucide-react'
import type { OperationalIndicator, EscopoIndicador } from '../types'
import { getCadastroTenant, saveCadastroTenant, deleteById } from '../utils/db'
import { generateUUID } from '../utils/helpers'

interface OperationalIndicatorsViewProps {
  tenantId: string
}

const CATEGORIAS = [
  "Comercial",
  "Pós-Venda",
  "Oficina",
  "Peças",
  "F&I",
  "Estoque",
  "RH",
  "Financeiro",
  "Outros"
]

const UNIDADES = [
  "Unidades",
  "R$",
  "%",
  "Horas",
  "Quantidade",
  "Litros",
  "Metros",
  "Dias"
]

const NATUREZAS: { value: OperationalIndicator["natureza"]; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "eficiencia", label: "Eficiência" },
  { value: "qualidade", label: "Qualidade" },
  { value: "financeiro", label: "Financeiro" }
]

const ESCOPOS: { value: EscopoIndicador; label: string }[] = [
  { value: "departamento", label: "Departamento" },
  { value: "loja", label: "Loja" },
  { value: "marca", label: "Marca" },
  { value: "consolidado", label: "Consolidado" }
]

const OperationalIndicatorsView: React.FC<OperationalIndicatorsViewProps> = ({ tenantId }) => {
  const [indicators, setIndicators] = useState<OperationalIndicator[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategoria, setFilterCategoria] = useState<string>("")
  const [showAddForm, setShowAddForm] = useState(false)

  const [formData, setFormData] = useState<Partial<OperationalIndicator>>({
    codigo: "",
    nome: "",
    descricao: "",
    categoria: "Comercial",
    unidadeMedida: "Unidades",
    natureza: "volume",
    escopos: ["departamento"],
    permiteMeta: true,
    ativo: true,
    ordem: 0
  })

  const loadIndicators = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCadastroTenant("operational_indicators", tenantId)
      
      const mapped: OperationalIndicator[] = (data || []).map((row: any) => ({
        id: row.id,
        organizacaoId: row.organizacao_id,
        codigo: row.codigo,
        nome: row.nome,
        descricao: row.descricao,
        categoria: row.categoria,
        unidadeMedida: row.unidade_medida,
        natureza: row.natureza,
        escopos: row.escopos || (row.escopo ? [row.escopo] : ["departamento"]),
        permiteMeta: row.permite_meta,
        ativo: row.ativo,
        ordem: row.ordem,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      mapped.sort((a, b) => {
        if (a.categoria !== b.categoria) return (a.categoria || "").localeCompare(b.categoria || "")
        if (a.ordem !== b.ordem) return (a.ordem || 0) - (b.ordem || 0)
        return a.nome.localeCompare(b.nome)
      })

      setIndicators(mapped)
    } catch (err) {
      console.error("Erro ao carregar indicadores:", err)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadIndicators()
  }, [loadIndicators])

  const handleSave = async () => {
    if (!formData.codigo?.trim() || !formData.nome?.trim()) {
      alert("Código e Nome são obrigatórios.")
      return
    }

    const codeExists = indicators.some(
      ind => ind.codigo.toUpperCase() === formData.codigo?.toUpperCase() && ind.id !== editingId
    )
    if (codeExists) {
      alert("Já existe um indicador com este código.")
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
        categoria: formData.categoria,
        unidade_medida: formData.unidadeMedida,
        natureza: formData.natureza,
        escopos: formData.escopos || ["departamento"],
        permite_meta: formData.permiteMeta,
        ativo: formData.ativo,
        ordem: formData.ordem || 0
      }

      await saveCadastroTenant("operational_indicators", [dbData], tenantId)
      await loadIndicators()
      resetForm()
    } catch (err) {
      console.error("Erro ao salvar indicador:", err)
      alert("Erro ao salvar indicador. Verifique os dados e tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (indicator: OperationalIndicator) => {
    setEditingId(indicator.id)
    setFormData({
      codigo: indicator.codigo,
      nome: indicator.nome,
      descricao: indicator.descricao,
      categoria: indicator.categoria,
      unidadeMedida: indicator.unidadeMedida,
      natureza: indicator.natureza,
      escopos: indicator.escopos || ["departamento"],
      permiteMeta: indicator.permiteMeta,
      ativo: indicator.ativo,
      ordem: indicator.ordem
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este indicador? Esta ação não pode ser desfeita.")) return

    try {
      await deleteById("operational_indicators", id)
      await loadIndicators()
    } catch (err) {
      console.error("Erro ao excluir indicador:", err)
      alert("Erro ao excluir indicador. Verifique se não há dados vinculados a ele.")
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: "",
      nome: "",
      descricao: "",
      categoria: "Comercial",
      unidadeMedida: "Unidades",
      natureza: "volume",
      escopos: ["departamento"],
      permiteMeta: true,
      ativo: true,
      ordem: 0
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const toggleEscopo = (escopo: EscopoIndicador) => {
    const current = formData.escopos || []
    if (current.includes(escopo)) {
      if (current.length > 1) {
        setFormData({ ...formData, escopos: current.filter(e => e !== escopo) })
      }
    } else {
      setFormData({ ...formData, escopos: [...current, escopo] })
    }
  }

  const filteredIndicators = indicators.filter(ind => {
    const matchSearch = searchTerm
      ? ind.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      : true
    const matchCategoria = filterCategoria ? ind.categoria === filterCategoria : true
    return matchSearch && matchCategoria
  })

  const groupedByCategoria = filteredIndicators.reduce((acc, ind) => {
    const cat = ind.categoria || "Outros"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ind)
    return acc
  }, {} as Record<string, OperationalIndicator[]>)

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
          <h1 className="text-2xl font-bold text-slate-800">Indicadores Operacionais</h1>
          <p className="text-slate-500 mt-1">
            Cadastre os KPIs não-financeiros que serão usados nos relatórios.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Novo Indicador
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
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className={selectClasses}
            style={{ minWidth: "150px" }}
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {editingId ? "Editar Indicador" : "Novo Indicador"}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
              <input
                type="text"
                value={formData.codigo || ""}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="Ex: VOL_VENDAS_VN"
                className={inputClasses}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.nome || ""}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Volume de Vendas - Veículos Novos"
                className={inputClasses}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <input
                type="text"
                value={formData.descricao || ""}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada do indicador"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <select
                value={formData.categoria || ""}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className={selectClasses}
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
              <select
                value={formData.unidadeMedida || ""}
                onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                className={selectClasses}
              >
                {UNIDADES.map(un => (
                  <option key={un} value={un}>{un}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Natureza</label>
              <select
                value={formData.natureza || "volume"}
                onChange={(e) => setFormData({ ...formData, natureza: e.target.value as OperationalIndicator["natureza"] })}
                className={selectClasses}
              >
                {NATUREZAS.map(n => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Escopos (selecione um ou mais)</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {ESCOPOS.map(e => (
                  <label key={e.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.escopos || []).includes(e.value)}
                      onChange={() => toggleEscopo(e.value)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{e.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ordem</label>
              <input
                type="number"
                value={formData.ordem || 0}
                onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                className={inputClasses}
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.permiteMeta}
                  onChange={(e) => setFormData({ ...formData, permiteMeta: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Permite Meta</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
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

      <div className="space-y-6">
        {Object.keys(groupedByCategoria).length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-500">Nenhum indicador cadastrado.</p>
            <p className="text-sm text-slate-400 mt-1">
              Clique em "Novo Indicador" para começar.
            </p>
          </div>
        ) : (
          Object.entries(groupedByCategoria).map(([categoria, items]) => (
            <div key={categoria} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700">{categoria}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map(indicator => (
                  <div
                    key={indicator.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {indicator.codigo}
                        </span>
                        <span className="font-medium text-slate-800">{indicator.nome}</span>
                        {!indicator.ativo && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        <span>Unidade: {indicator.unidadeMedida}</span>
                        <span>Escopos: {(indicator.escopos || []).join(", ")}</span>
                        <span>Natureza: {indicator.natureza}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(indicator)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(indicator.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default OperationalIndicatorsView
