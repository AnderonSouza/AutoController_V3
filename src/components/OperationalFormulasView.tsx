"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, Save, X, Search, Calculator, FileText } from 'lucide-react'
import type { OperationalIndicator, ReportLine, ReportTemplate } from '../types'
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
  const [reportLines, setReportLines] = useState<ReportLine[]>([])
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [indicatorSearch, setIndicatorSearch] = useState("")
  const [formulaSearch, setFormulaSearch] = useState("")
  const [reportLineSearch, setReportLineSearch] = useState("")
  const [selectedReportType, setSelectedReportType] = useState<string>("all")
  const [selectedIndicatorCategory, setSelectedIndicatorCategory] = useState<string>("all")

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
      const [formulasData, indicatorsData, templatesData, linesData] = await Promise.all([
        getCadastroTenant("operational_formulas", tenantId),
        getCadastroTenant("operational_indicators", tenantId),
        getCadastroTenant("report_templates", tenantId),
        getCadastroTenant("report_lines", tenantId),
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

      const mappedTemplates: ReportTemplate[] = (templatesData || []).map((row: any) => ({
        id: row.id,
        name: row.nome || row.name,
        type: row.tipo || row.type,
        economicGroupId: row.organizacao_id || row.grupo_economico_id,
        createdAt: row.criado_em || row.created_at,
        isActive: row.ativo ?? row.is_active ?? true,
      }))

      const mappedLines: ReportLine[] = (linesData || [])
        .filter((row: any) => row.codigo || row.code)
        .map((row: any) => ({
          id: row.id,
          reportId: row.relatorio_id || row.report_id,
          parentId: row.pai_id || row.parent_id,
          name: row.nome || row.name,
          code: row.codigo || row.code,
          order: row.ordem || row.order,
          type: row.tipo || row.type,
          sign: row.sinal || row.sign,
          dreAccountId: row.conta_dre_id,
          balanceAccountId: row.conta_balanco_id,
          formula: row.formula,
        }))

      setFormulas(mappedFormulas)
      setIndicators(mappedIndicators)
      setReportTemplates(mappedTemplates)
      setReportLines(mappedLines)
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

  const insertReportLineCode = (codigo: string) => {
    const currentExpressao = formData.expressao || ""
    setFormData({ ...formData, expressao: currentExpressao + `DRE[${codigo}]` })
  }

  const getReportTypeName = (reportId: string) => {
    const template = reportTemplates.find(t => t.id === reportId)
    return template?.name || template?.type || "Relatório"
  }

  const indicatorCategories = [...new Set(indicators.map(i => i.categoria).filter(Boolean))]

  const filteredIndicators = indicators.filter(ind => {
    if (selectedIndicatorCategory !== "all" && ind.categoria !== selectedIndicatorCategory) return false
    if (indicatorSearch) {
      const term = indicatorSearch.toLowerCase()
      return (
        ind.nome.toLowerCase().includes(term) ||
        ind.codigo.toLowerCase().includes(term) ||
        (ind.descricao && ind.descricao.toLowerCase().includes(term))
      )
    }
    return true
  })

  const availableFormulas = formulas.filter(f => f.id !== editingId)
  const filteredAvailableFormulas = availableFormulas.filter(f => {
    if (formulaSearch) {
      const term = formulaSearch.toLowerCase()
      return (
        f.nome.toLowerCase().includes(term) ||
        f.codigo.toLowerCase().includes(term) ||
        (f.descricao && f.descricao.toLowerCase().includes(term))
      )
    }
    return true
  })

  const filteredReportLines = reportLines.filter(line => {
    if (!line.code) return false
    if (selectedReportType !== "all" && line.reportId !== selectedReportType) return false
    if (reportLineSearch) {
      const term = reportLineSearch.toLowerCase()
      return (
        line.name.toLowerCase().includes(term) ||
        (line.code && line.code.toLowerCase().includes(term))
      )
    }
    return true
  })

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
                  <strong>Sintaxe:</strong> Use <code className="bg-slate-200 px-1 rounded">OPE[CODIGO]</code> para indicadores operacionais, 
                  <code className="bg-slate-200 px-1 rounded ml-1">DRE[CODIGO]</code> para linhas de relatório (DRE, Balanço) e 
                  <code className="bg-slate-200 px-1 rounded ml-1">FORM[CODIGO]</code> para outras fórmulas.
                </p>
                <p className="text-xs text-slate-500">
                  Operadores: <code>+</code> soma, <code>-</code> subtração, <code>*</code> multiplicação, <code>/</code> divisão, <code>( )</code> parênteses
                </p>
              </div>
            </div>

            {indicators.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="inline-flex items-center gap-1">
                    Indicadores Operacionais <span className="text-xs text-slate-400">(clique para inserir na fórmula)</span>
                  </span>
                </label>
                <div className="bg-blue-50 rounded-lg border border-blue-100 p-3">
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nome ou código..."
                        value={indicatorSearch}
                        onChange={(e) => setIndicatorSearch(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 pl-7 pr-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    {indicatorCategories.length > 0 && (
                      <select
                        value={selectedIndicatorCategory}
                        onChange={(e) => setSelectedIndicatorCategory(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">Todas categorias</option>
                        {indicatorCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {filteredIndicators.slice(0, 50).map(ind => (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => insertIndicatorCode(ind.codigo)}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1.5 rounded hover:bg-blue-200 transition flex items-center gap-1.5 text-left"
                        title={ind.descricao || ind.nome}
                      >
                        <span className="font-mono font-medium">{ind.codigo}</span>
                        <span className="text-blue-500 max-w-[150px] truncate">{ind.nome}</span>
                      </button>
                    ))}
                    {filteredIndicators.length === 0 && (
                      <span className="text-xs text-slate-400">Nenhum indicador encontrado</span>
                    )}
                    {filteredIndicators.length > 50 && (
                      <span className="text-xs text-slate-400">
                        Mostrando 50 de {filteredIndicators.length}. Use a busca para filtrar.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {reportLines.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Linhas de Relatório (DRE, Balanço)
                  </span>
                </label>
                <div className="bg-emerald-50 rounded-lg border border-emerald-100 p-3">
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar linha..."
                        value={reportLineSearch}
                        onChange={(e) => setReportLineSearch(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 pl-7 pr-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <select
                      value={selectedReportType}
                      onChange={(e) => setSelectedReportType(e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">Todos os relatórios</option>
                      {reportTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {filteredReportLines.slice(0, 50).map(line => (
                      <button
                        key={line.id}
                        type="button"
                        onClick={() => insertReportLineCode(line.code!)}
                        className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 transition flex items-center gap-1"
                        title={`${line.name} (${getReportTypeName(line.reportId)})`}
                      >
                        <span className="font-mono">{line.code}</span>
                        <span className="text-emerald-500 text-[10px] max-w-[100px] truncate">
                          {line.name}
                        </span>
                      </button>
                    ))}
                    {filteredReportLines.length === 0 && (
                      <span className="text-xs text-slate-400">Nenhuma linha encontrada</span>
                    )}
                    {filteredReportLines.length > 50 && (
                      <span className="text-xs text-slate-400">
                        Mostrando 50 de {filteredReportLines.length}. Use a busca para filtrar.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {availableFormulas.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <Calculator className="w-4 h-4" />
                    Outras Fórmulas <span className="text-xs text-slate-400">(clique para inserir na fórmula)</span>
                  </span>
                </label>
                <div className="bg-purple-50 rounded-lg border border-purple-100 p-3">
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar fórmula..."
                      value={formulaSearch}
                      onChange={(e) => setFormulaSearch(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 pl-7 pr-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {filteredAvailableFormulas.slice(0, 30).map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => insertFormulaCode(f.codigo)}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1.5 rounded hover:bg-purple-200 transition flex items-center gap-1.5 text-left"
                        title={f.descricao || f.nome}
                      >
                        <span className="font-mono font-medium">{f.codigo}</span>
                        <span className="text-purple-500 max-w-[120px] truncate">{f.nome}</span>
                      </button>
                    ))}
                    {filteredAvailableFormulas.length === 0 && (
                      <span className="text-xs text-slate-400">Nenhuma fórmula encontrada</span>
                    )}
                    {filteredAvailableFormulas.length > 30 && (
                      <span className="text-xs text-slate-400">
                        Mostrando 30 de {filteredAvailableFormulas.length}. Use a busca para filtrar.
                      </span>
                    )}
                  </div>
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
