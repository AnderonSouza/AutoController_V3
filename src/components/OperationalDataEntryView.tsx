"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Save, Search, ChevronDown, ChevronRight, Upload, Download, FileSpreadsheet } from 'lucide-react'
import type { OperationalIndicator, Company, Brand, Department } from '../types'
import { getCadastroTenant, saveCadastroTenant } from '../utils/db'
import { generateUUID } from '../utils/helpers'
import * as XLSX from 'xlsx'

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
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const [editedValues, setEditedValues] = useState<Record<string, number | null>>({})
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [indicatorsData, valuesData, companiesData, brandsData, departmentsData] = await Promise.all([
        getCadastroTenant("operational_indicators", tenantId),
        getCadastroTenant("operational_values", tenantId),
        getCadastroTenant("companies", tenantId),
        getCadastroTenant("brands", tenantId),
        getCadastroTenant("departments", tenantId),
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

      const mappedDepartments: Department[] = (departmentsData || []).map((row: any) => ({
        id: row.id,
        name: row.name || row.nome,
        economicGroupId: row.economicGroupId || row.organizacao_id,
      }))

      setIndicators(mappedIndicators)
      setValues(mappedValues)
      setCompanies(companiesData || [])
      setBrands(brandsData || [])
      setDepartments(mappedDepartments)

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

  const getValueKey = (indicatorId: string, month: string, companyId?: string, departmentId?: string) => {
    const cId = companyId ?? selectedCompany ?? 'all'
    const dId = departmentId ?? selectedDepartment ?? 'all'
    return `${indicatorId}_${selectedYear}_${month}_${cId}_${selectedBrand || 'all'}_${dId}`
  }

  const getCurrentValue = (indicatorId: string, month: string, companyId?: string, departmentId?: string): number | null => {
    const key = getValueKey(indicatorId, month, companyId, departmentId)
    if (editedValues[key] !== undefined) return editedValues[key]

    const cId = companyId ?? selectedCompany
    const dId = departmentId ?? selectedDepartment

    const existing = values.find(v => 
      v.indicadorId === indicatorId &&
      v.ano === selectedYear &&
      v.mes === month &&
      (cId ? v.empresaId === cId : !v.empresaId) &&
      (selectedBrand ? v.marcaId === selectedBrand : !v.marcaId) &&
      (dId ? v.departamentoId === dId : !v.departamentoId)
    )
    return existing?.valor ?? null
  }

  const handleValueChange = (indicatorId: string, month: string, value: string, companyId?: string, departmentId?: string) => {
    const key = getValueKey(indicatorId, month, companyId, departmentId)
    const numValue = value === "" ? null : parseFloat(value)
    setEditedValues(prev => ({ ...prev, [key]: numValue }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const valuesToSave: any[] = []

      Object.entries(editedValues).forEach(([key, valor]) => {
        const parts = key.split('_')
        const indicatorId = parts[0]
        const year = parts[1]
        const month = parts[2]
        const companyId = parts[3] === 'all' ? null : parts[3]
        const brandId = parts[4] === 'all' ? null : parts[4]
        const departmentId = parts[5] === 'all' ? null : parts[5]
        
        const existing = values.find(v => 
          v.indicadorId === indicatorId &&
          v.ano === parseInt(year) &&
          v.mes === month &&
          (companyId ? v.empresaId === companyId : !v.empresaId) &&
          (brandId ? v.marcaId === brandId : !v.marcaId) &&
          (departmentId ? v.departamentoId === departmentId : !v.departamentoId)
        )

        valuesToSave.push({
          id: existing?.id || generateUUID(),
          organizacao_id: tenantId,
          indicador_id: indicatorId,
          ano: parseInt(year),
          mes: month,
          empresa_id: companyId,
          marca_id: brandId,
          departamento_id: departmentId,
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

  const handleExportTemplate = () => {
    const templateData: any[] = []
    const selectedCompanyData = selectedCompany ? companies.find(c => c.id === selectedCompany) : null
    
    indicators.forEach(ind => {
      MONTHS_DATA.forEach(month => {
        templateData.push({
          "Código Indicador": ind.codigo,
          "Nome Indicador": ind.nome,
          "Categoria": ind.categoria || "Outros",
          "Unidade": ind.unidadeMedida,
          "Ano": selectedYear,
          "Mês": month.value,
          "CNPJ": selectedCompanyData?.cnpj || "",
          "Código ERP": selectedCompanyData?.erpCode || "",
          "Valor": ""
        })
      })
    })

    const ws = XLSX.utils.json_to_sheet(templateData)
    
    ws['!cols'] = [
      { wch: 20 },
      { wch: 40 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 }
    ]
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Dados Operacionais")
    
    const instrucoes = [
      ["INSTRUÇÕES DE PREENCHIMENTO"],
      [""],
      ["1. Preencha apenas a coluna 'Valor' com os dados numéricos."],
      ["2. Não altere as colunas 'Código Indicador', 'Ano' e 'Mês'."],
      ["3. Para identificar a empresa/loja, preencha UM dos campos: 'CNPJ' (14 dígitos) ou 'Código ERP'."],
      ["4. Deixe 'CNPJ' e 'Código ERP' em branco para dados consolidados."],
      ["5. Os meses devem estar em maiúsculas (JANEIRO, FEVEREIRO, etc.)."],
      [""],
      ["CÓDIGOS DOS INDICADORES DISPONÍVEIS:"],
      ...indicators.map(ind => [`${ind.codigo} - ${ind.nome} (${ind.unidadeMedida})`])
    ]
    const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes)
    wsInstrucoes['!cols'] = [{ wch: 80 }]
    XLSX.utils.book_append_sheet(wb, wsInstrucoes, "Instruções")
    
    XLSX.writeFile(wb, `modelo_dados_operacionais_${selectedYear}.xlsx`)
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

          const valuesToImport: any[] = []
          const errors: string[] = []
          let imported = 0

          for (const row of jsonData) {
            const codigo = row["Código Indicador"]?.toString().trim().toUpperCase()
            const ano = parseInt(row["Ano"])
            const mes = row["Mês"]?.toString().trim().toUpperCase()
            const valorStr = row["Valor"]?.toString().trim()
            const cnpj = row["CNPJ"]?.toString().replace(/\D/g, '').trim()
            const codigoErp = row["Código ERP"]?.toString().trim()

            if (!codigo || !ano || !mes) {
              continue
            }

            if (!valorStr || valorStr === "") {
              continue
            }

            const valor = parseFloat(valorStr.replace(",", "."))
            if (isNaN(valor)) {
              errors.push(`Valor inválido para ${codigo} em ${mes}/${ano}`)
              continue
            }

            const indicator = indicators.find(i => i.codigo.toUpperCase() === codigo)
            if (!indicator) {
              errors.push(`Indicador não encontrado: ${codigo}`)
              continue
            }

            const validMonth = MONTHS_DATA.find(m => m.value === mes)
            if (!validMonth) {
              errors.push(`Mês inválido: ${mes}`)
              continue
            }

            let empresaId: string | null = null
            if (cnpj || codigoErp) {
              let empresa = null
              if (cnpj) {
                empresa = companies.find(c => c.cnpj?.replace(/\D/g, '') === cnpj)
              }
              if (!empresa && codigoErp) {
                empresa = companies.find(c => c.erpCode === codigoErp)
              }
              if (!empresa) {
                errors.push(`Empresa não encontrada com CNPJ: ${cnpj || '-'} ou Código ERP: ${codigoErp || '-'}`)
                continue
              }
              empresaId = empresa.id
            }

            const empresa = empresaId ? companies.find(c => c.id === empresaId) : null
            const marcaId = empresa?.brandId || null

            const existing = values.find(v => 
              v.indicadorId === indicator.id &&
              v.ano === ano &&
              v.mes === mes &&
              (empresaId ? v.empresaId === empresaId : !v.empresaId) &&
              (marcaId ? v.marcaId === marcaId : !v.marcaId)
            )

            valuesToImport.push({
              id: existing?.id || generateUUID(),
              organizacao_id: tenantId,
              indicador_id: indicator.id,
              ano: ano,
              mes: mes,
              empresa_id: empresaId,
              marca_id: marcaId,
              departamento_id: null,
              valor: valor,
              meta: null,
              origem: "importacao",
              status: "confirmado",
            })
            imported++
          }

          if (valuesToImport.length > 0) {
            await saveCadastroTenant("operational_values", valuesToImport, tenantId)
            await loadData()
          }

          let message = `Importação concluída! ${imported} valores importados.`
          if (errors.length > 0) {
            message += `\n\nAvisos (${errors.length}):\n${errors.slice(0, 10).join('\n')}`
            if (errors.length > 10) {
              message += `\n... e mais ${errors.length - 10} avisos.`
            }
          }
          alert(message)
        } catch (parseError) {
          console.error("Erro ao processar arquivo:", parseError)
          alert("Erro ao processar o arquivo. Verifique se o formato está correto.")
        } finally {
          setImporting(false)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }
      }

      reader.onerror = () => {
        alert("Erro ao ler o arquivo.")
        setImporting(false)
      }

      reader.readAsBinaryString(file)
    } catch (err) {
      console.error("Erro na importação:", err)
      alert("Erro ao importar arquivo.")
      setImporting(false)
    }
  }

  const filteredIndicators = indicators.filter(ind => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchesCode = ind.codigo.toLowerCase().includes(term)
      const matchesName = ind.nome.toLowerCase().includes(term)
      const matchesDescription = ind.descricao?.toLowerCase().includes(term) || false
      if (!matchesCode && !matchesName && !matchesDescription) {
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportTemplate}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition border border-slate-200"
            title="Baixar planilha modelo"
          >
            <Download className="w-4 h-4" />
            Planilha Modelo
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="hidden"
            id="import-file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
            title="Importar dados de planilha"
          >
            <Upload className="w-4 h-4" />
            {importing ? "Importando..." : "Importar"}
          </button>

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

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Departamento</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className={selectClasses}
          >
            <option value="">Todos</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
                  {expandedCategories[categoria] && items.map(indicator => {
                    if (indicator.escopo === 'departamento') {
                      const filteredCompanies = companies.filter(c => 
                        (!selectedBrand || c.brandId === selectedBrand) &&
                        (!selectedCompany || c.id === selectedCompany)
                      )
                      const filteredDepartments = departments.filter(d =>
                        !selectedDepartment || d.id === selectedDepartment
                      )
                      
                      if (filteredCompanies.length === 0 || filteredDepartments.length === 0) {
                        return (
                          <tr key={indicator.id} className="border-b border-slate-100 bg-amber-50">
                            <td colSpan={13} className="py-2 px-4 text-sm text-amber-700">
                              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mr-2">
                                {indicator.codigo}
                              </span>
                              {indicator.nome} - Selecione uma loja e departamento para preencher
                            </td>
                          </tr>
                        )
                      }

                      return (
                        <React.Fragment key={indicator.id}>
                          <tr className="bg-blue-50 border-b border-blue-100">
                            <td colSpan={13} className="py-2 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded text-blue-600">
                                  {indicator.codigo}
                                </span>
                                <span className="font-medium text-blue-800">{indicator.nome}</span>
                                <span className="text-xs text-blue-500 ml-2">
                                  ({indicator.unidadeMedida} - por Departamento)
                                </span>
                              </div>
                            </td>
                          </tr>
                          {filteredCompanies.flatMap(company => 
                            filteredDepartments.map(dept => (
                              <tr key={`${indicator.id}-${company.id}-${dept.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-2 px-4 sticky left-0 bg-white pl-8">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                                      {company.nickname || company.name}
                                    </span>
                                    <span className="text-xs text-slate-400">→</span>
                                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                      {dept.name}
                                    </span>
                                  </div>
                                </td>
                                {MONTHS_DATA.map(month => (
                                  <td key={month.value} className="py-2 px-1 text-center">
                                    <input
                                      type="number"
                                      value={getCurrentValue(indicator.id, month.value, company.id, dept.id) ?? ""}
                                      onChange={(e) => handleValueChange(indicator.id, month.value, e.target.value, company.id, dept.id)}
                                      className="w-full text-center bg-slate-50 border border-slate-200 rounded py-1 px-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                                      placeholder="-"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))
                          )}
                        </React.Fragment>
                      )
                    }

                    return (
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
                    )
                  })}
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
