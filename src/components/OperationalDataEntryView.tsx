"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Save, Search, ChevronDown, ChevronRight } from 'lucide-react'
import type { OperationalIndicator, Company, Brand } from '../types'
import { getCadastroTenant, saveCadastroTenant } from '../utils/db'
import { generateUUID } from '../utils/helpers'

interface OperationalDataEntryViewProps {
  tenantId: string
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

const MONTHS_DATA = [
  { value: "JANEIRO", short: "Jan" },
  { value: "FEVEREIRO", short: "Fev" },
  { value: "MARÇO", short: "Mar" },
  { value: "ABRIL", short: "Abr" },
  { value: "MAIO", short: "Mai" },
  { value: "JUNHO", short: "Jun" },
  { value: "JULHO", short: "Jul" },
  { value: "AGOSTO", short: "Ago" },
  { value: "SETEMBRO", short: "Set" },
  { value: "OUTUBRO", short: "Out" },
  { value: "NOVEMBRO", short: "Nov" },
  { value: "DEZEMBRO", short: "Dez" },
]

interface OperationalValueRow {
  id: string
  organizacaoId: string
  indicadorId: string
  ano: number
  mes: string
  empresaId?: string
  marcaId?: string
  departamentoId?: string
  valor: number | null
  meta?: number
}

const OperationalDataEntryView: React.FC<OperationalDataEntryViewProps> = ({ tenantId }) => {
  const [indicators, setIndicators] = useState<OperationalIndicator[]>([])
  const [values, setValues] = useState<OperationalValueRow[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const [editedValues, setEditedValues] = useState<Record<string, number | null>>({})

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [indicatorsData, valuesData, companiesData, brandsData] = await Promise.all([
        getCadastroTenant("operational_indicators", tenantId),
        getCadastroTenant("operational_values", tenantId),
        getCadastroTenant("companies", tenantId),
        getCadastroTenant("brands", tenantId),
      ])

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

      mappedIndicators.sort((a, b) => {
        if (a.categoria !== b.categoria) return (a.categoria || "").localeCompare(b.categoria || "")
        if (a.ordem !== b.ordem) return (a.ordem || 0) - (b.ordem || 0)
        return a.nome.localeCompare(b.nome)
      })

      const mappedValues: OperationalValueRow[] = (valuesData || []).map((row: any) => ({
        id: row.id,
        organizacaoId: row.organizacao_id,
        indicadorId: row.indicador_id,
        ano: row.ano,
        mes: row.mes,
        empresaId: row.empresa_id,
        marcaId: row.marca_id,
        departamentoId: row.departamento_id,
        valor: row.valor,
        meta: row.meta,
      }))

      setIndicators(mappedIndicators)
      setValues(mappedValues)
      setCompanies(companiesData || [])
      setBrands(brandsData || [])

      const categories = [...new Set(mappedIndicators.map(i => i.categoria))]
      const expanded: Record<string, boolean> = {}
      categories.forEach(cat => { expanded[cat || "Outros"] = true })
      setExpandedCategories(expanded)
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getValueKey = (indicatorId: string, month: string) => {
    return `${indicatorId}_${selectedYear}_${month}_${selectedCompany || 'all'}_${selectedBrand || 'all'}`
  }

  const getCurrentValue = (indicatorId: string, month: string): number | null => {
    const key = getValueKey(indicatorId, month)
    if (editedValues[key] !== undefined) return editedValues[key]

    const existing = values.find(v => 
      v.indicadorId === indicatorId &&
      v.ano === selectedYear &&
      v.mes === month &&
      (selectedCompany ? v.empresaId === selectedCompany : !v.empresaId) &&
      (selectedBrand ? v.marcaId === selectedBrand : !v.marcaId)
    )
    return existing?.valor ?? null
  }

  const handleValueChange = (indicatorId: string, month: string, value: string) => {
    const key = getValueKey(indicatorId, month)
    const numValue = value === "" ? null : parseFloat(value)
    setEditedValues(prev => ({ ...prev, [key]: numValue }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const valuesToSave: any[] = []

      Object.entries(editedValues).forEach(([key, valor]) => {
        const [indicatorId, year, month] = key.split('_')
        
        const existing = values.find(v => 
          v.indicadorId === indicatorId &&
          v.ano === parseInt(year) &&
          v.mes === month &&
          (selectedCompany ? v.empresaId === selectedCompany : !v.empresaId) &&
          (selectedBrand ? v.marcaId === selectedBrand : !v.marcaId)
        )

        valuesToSave.push({
          id: existing?.id || generateUUID(),
          organizacao_id: tenantId,
          indicador_id: indicatorId,
          ano: parseInt(year),
          mes: month,
          empresa_id: selectedCompany || null,
          marca_id: selectedBrand || null,
          departamento_id: null,
          valor: valor,
          meta: null,
          origem: "manual",
          status: "confirmado",
        })
      })

      if (valuesToSave.length > 0) {
        await saveCadastroTenant("operational_values", valuesToSave, tenantId)
      }

      setEditedValues({})
      setHasChanges(false)
      await loadData()
    } catch (err) {
      console.error("Erro ao salvar valores:", err)
      alert("Erro ao salvar valores. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const filteredIndicators = indicators.filter(ind => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!ind.nome.toLowerCase().includes(term) && !ind.codigo.toLowerCase().includes(term)) {
        return false
      }
    }
    return true
  })

  const groupedByCategoria = filteredIndicators.reduce((acc, ind) => {
    const cat = ind.categoria || "Outros"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ind)
    return acc
  }, {} as Record<string, OperationalIndicator[]>)

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  const inputClasses = "w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  const selectClasses = "bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (indicators.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-800">Preenchimento de Dados Operacionais</h1>
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mt-6">
          <p className="text-slate-500">Nenhum indicador operacional cadastrado.</p>
          <p className="text-sm text-slate-400 mt-1">
            Primeiro cadastre os indicadores na tela "Indicadores".
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Preenchimento de Dados Operacionais</h1>
          <p className="text-slate-500 mt-1">
            Informe os valores mensais dos indicadores.
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className={selectClasses}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Marca</label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className={selectClasses}
          >
            <option value="">Todas</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Empresa/Loja</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className={selectClasses}
          >
            <option value="">Todas</option>
            {companies
              .filter(c => !selectedBrand || c.brandId === selectedBrand)
              .map(c => <option key={c.id} value={c.id}>{c.nickname || c.name}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar indicador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputClasses} pl-10`}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-600 sticky left-0 bg-slate-50 min-w-[250px]">
                  Indicador
                </th>
                {MONTHS_DATA.map(month => (
                  <th key={month.value} className="text-center py-3 px-2 font-medium text-slate-600 min-w-[80px]">
                    {month.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedByCategoria).map(([categoria, items]) => (
                <React.Fragment key={categoria}>
                  <tr 
                    className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition"
                    onClick={() => toggleCategory(categoria)}
                  >
                    <td colSpan={13} className="py-2 px-4 font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        {expandedCategories[categoria] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {categoria} ({items.length})
                      </div>
                    </td>
                  </tr>
                  {expandedCategories[categoria] && items.map(indicator => (
                    <tr key={indicator.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 sticky left-0 bg-white">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                            {indicator.codigo}
                          </span>
                          <span className="text-slate-700">{indicator.nome}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {indicator.unidadeMedida}
                        </div>
                      </td>
                      {MONTHS_DATA.map(month => (
                        <td key={month.value} className="py-2 px-1 text-center">
                          <input
                            type="number"
                            value={getCurrentValue(indicator.id, month.value) ?? ""}
                            onChange={(e) => handleValueChange(indicator.id, month.value, e.target.value)}
                            className="w-full text-center bg-slate-50 border border-slate-200 rounded py-1 px-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            placeholder="-"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default OperationalDataEntryView
