"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { Download, Upload } from 'lucide-react'
import type { OperationalIndicator, Company, Brand, Department } from '../types'
import { getCadastroTenant, saveCadastroTenant } from '../utils/db'
import { generateUUID } from '../utils/helpers'
import StyledSelect from './StyledSelect'
import MultiSelectDropdown from './MultiSelectDropdown'
import PeriodSelector from './PeriodSelector'
import { CALENDAR_MONTHS } from '../constants'
import * as XLSX from 'xlsx'

interface OperationalDataEntryViewProps {
  tenantId: string
  onNavigateBack?: () => void
}

const CURRENT_YEAR = new Date().getFullYear()
const AVAILABLE_YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3, CURRENT_YEAR - 4]

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

const OperationalDataEntryView: React.FC<OperationalDataEntryViewProps> = ({ tenantId, onNavigateBack }) => {
  const [indicators, setIndicators] = useState<OperationalIndicator[]>([])
  const [values, setValues] = useState<OperationalValueRow[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedPeriod, setSelectedPeriod] = useState<{ years: number[]; months: string[] }>({
    years: [CURRENT_YEAR],
    months: [...CALENDAR_MONTHS]
  })
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("")
  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<string[]>([])

  const [pendingChanges, setPendingChanges] = useState<Record<string, number | null>>({})
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

      if (brandsData?.length > 0 && !selectedBrandId) {
        setSelectedBrandId(brandsData[0].id)
      }
      if (mappedDepartments.length > 0 && !selectedDepartment) {
        setSelectedDepartment(mappedDepartments[0].id)
      }
      if (mappedIndicators.length > 0 && selectedIndicatorIds.length === 0) {
        setSelectedIndicatorIds([mappedIndicators[0].id])
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredCompanies = useMemo(() => {
    if (!selectedBrandId) return []
    return companies.filter(c => c.brandId === selectedBrandId)
  }, [selectedBrandId, companies])

  const displayCompanies = useMemo(() => {
    if (selectedCompanyId) {
      return filteredCompanies.filter(c => c.id === selectedCompanyId)
    }
    return filteredCompanies
  }, [filteredCompanies, selectedCompanyId])

  const filteredIndicators = useMemo(() => {
    if (selectedIndicatorIds.length === 0) return []
    return indicators.filter(i => selectedIndicatorIds.includes(i.id))
  }, [indicators, selectedIndicatorIds])

  const indicatorOptions = useMemo(() => 
    indicators.map(i => ({ id: i.id, name: i.nome })), 
    [indicators]
  )

  const selectedYear = selectedPeriod.years[0] || CURRENT_YEAR
  const selectedMonths = selectedPeriod.months

  const getValueKey = (indicatorId: string, companyId: string, year: number, month: string) => {
    return `${indicatorId}|${companyId}|${year}|${month}`
  }

  const getValue = (indicatorId: string, companyId: string, year: number, month: string): number | null => {
    const key = getValueKey(indicatorId, companyId, year, month)
    if (pendingChanges.hasOwnProperty(key)) {
      return pendingChanges[key]
    }
    const found = values.find(v =>
      v.indicadorId === indicatorId &&
      v.ano === year &&
      v.mes === month &&
      v.empresaId === companyId &&
      v.departamentoId === selectedDepartment
    )
    return found?.valor ?? null
  }

  const handleValueChange = (indicatorId: string, companyId: string, year: number, month: string, value: string) => {
    const key = getValueKey(indicatorId, companyId, year, month)
    const numValue = value === "" ? null : parseFloat(value)
    setPendingChanges(prev => ({ ...prev, [key]: numValue }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const valuesToSave: any[] = []

      Object.entries(pendingChanges).forEach(([key, valor]) => {
        if (valor === null) return
        
        const [indicatorId, companyId, yearStr, month] = key.split('|')
        const year = parseInt(yearStr)
        const company = companies.find(c => c.id === companyId)

        const existing = values.find(v =>
          v.indicadorId === indicatorId &&
          v.ano === year &&
          v.mes === month &&
          v.empresaId === companyId &&
          v.departamentoId === selectedDepartment
        )

        valuesToSave.push({
          id: existing?.id || generateUUID(),
          organizacao_id: tenantId,
          indicador_id: indicatorId,
          ano: year,
          mes: month,
          empresa_id: companyId,
          marca_id: company?.brandId || null,
          departamento_id: selectedDepartment,
          valor: valor,
          meta: null,
          origem: "manual",
          status: "confirmado",
        })
      })

      if (valuesToSave.length > 0) {
        await saveCadastroTenant("operational_values", valuesToSave, tenantId)
      }

      setPendingChanges({})
      await loadData()
      alert('Dados salvos com sucesso!')
    } catch (err) {
      console.error("Erro ao salvar valores:", err)
      alert("Erro ao salvar valores. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const handleCancelChanges = () => {
    if (confirm('Deseja descartar todas as alterações não salvas?')) {
      setPendingChanges({})
    }
  }

  const handleExportTemplate = () => {
    const templateData: any[] = []

    filteredIndicators.forEach(ind => {
      filteredCompanies.forEach(company => {
        selectedPeriod.years.forEach(year => {
          selectedMonths.forEach(month => {
            templateData.push({
              "Código Indicador": ind.codigo,
              "Nome Indicador": ind.nome,
              "Unidade": ind.unidadeMedida,
              "Ano": year,
              "Mês": month,
              "CNPJ": company.cnpj || "",
              "Loja": company.nickname || company.name,
              "Valor": getValue(ind.id, company.id, year, month) ?? ""
            })
          })
        })
      })
    })

    const ws = XLSX.utils.json_to_sheet(templateData)
    ws['!cols'] = [
      { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 10 },
      { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 15 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Dados Operacionais")
    XLSX.writeFile(wb, `dados_operacionais_${selectedPeriod.years.join('-')}.xlsx`)
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
          let imported = 0

          for (const row of jsonData) {
            const codigo = row["Código Indicador"]?.toString().trim().toUpperCase()
            const ano = parseInt(row["Ano"])
            const mes = row["Mês"]?.toString().trim().toUpperCase()
            const valorStr = row["Valor"]?.toString().trim()
            const cnpj = row["CNPJ"]?.toString().replace(/\D/g, '').trim()

            if (!codigo || !ano || !mes || !valorStr) continue

            const valor = parseFloat(valorStr.replace(",", "."))
            if (isNaN(valor)) continue

            const indicator = indicators.find(i => i.codigo.toUpperCase() === codigo)
            if (!indicator) continue

            let empresa = companies.find(c => c.cnpj?.replace(/\D/g, '') === cnpj)
            if (!empresa) continue

            valuesToImport.push({
              id: generateUUID(),
              organizacao_id: tenantId,
              indicador_id: indicator.id,
              ano: ano,
              mes: mes,
              empresa_id: empresa.id,
              marca_id: empresa.brandId,
              departamento_id: selectedDepartment,
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

          alert(`Importação concluída! ${imported} valores importados.`)
        } catch (err) {
          console.error("Erro ao processar arquivo:", err)
          alert("Erro ao processar arquivo.")
        } finally {
          setImporting(false)
        }
      }
      reader.readAsBinaryString(file)
    } catch (err) {
      console.error("Erro na importação:", err)
      setImporting(false)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <main className="flex-grow flex flex-col h-full overflow-hidden relative" style={{ backgroundColor: 'var(--color-bg-app)' }}>
      <div className="max-w-full mx-auto w-full flex flex-col h-full p-6 lg:p-8">
        {onNavigateBack && (
          <button onClick={onNavigateBack} className="mb-6 text-sm text-slate-600 hover:text-slate-900 font-semibold flex items-center self-start shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Voltar
          </button>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden flex-grow">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Dados Operacionais</h1>
              <p className="text-sm text-slate-500 mt-1">Insira os valores dos indicadores operacionais para cada loja.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                Planilha Modelo
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm cursor-pointer">
                <Upload className="h-4 w-4" />
                Importar
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0 relative z-40">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-2">
                <MultiSelectDropdown
                  label="Indicadores"
                  options={indicatorOptions}
                  selectedValues={selectedIndicatorIds}
                  onChange={setSelectedIndicatorIds}
                  className="w-full"
                  placeholder="Selecionar indicadores..."
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Período</label>
                <PeriodSelector
                  selectedPeriod={selectedPeriod}
                  onPeriodChange={setSelectedPeriod}
                  availableYears={AVAILABLE_YEARS}
                  className="h-[42px] py-2.5 pl-4 pr-3 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Marca</label>
                <StyledSelect
                  value={selectedBrandId}
                  onChange={(e) => {
                    setSelectedBrandId(e.target.value)
                    setSelectedCompanyId("")
                  }}
                  containerClassName="w-full"
                  className="h-[42px] py-2.5 pl-4 pr-10 text-sm"
                >
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </StyledSelect>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Empresa/Loja</label>
                <StyledSelect
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  containerClassName="w-full"
                  className="h-[42px] py-2.5 pl-4 pr-10 text-sm"
                >
                  <option value="">Todas as lojas</option>
                  {filteredCompanies.map(c => <option key={c.id} value={c.id}>{c.nickname || c.name}</option>)}
                </StyledSelect>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Departamento</label>
                <StyledSelect
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  containerClassName="w-full"
                  className="h-[42px] py-2.5 pl-4 pr-10 text-sm"
                >
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </StyledSelect>
              </div>
            </div>
          </div>

          <div className="flex-grow overflow-auto bg-white">
            {displayCompanies.length > 0 && filteredIndicators.length > 0 ? (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="bg-slate-50 sticky top-0 z-30 shadow-sm">
                  <tr>
                    <th className="p-2 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-r min-w-[200px] w-[200px] sticky left-0 bg-slate-50 z-40 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                      Indicador
                    </th>
                    <th className="p-2 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-r min-w-[180px] w-[180px] sticky left-[200px] bg-slate-50 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      Loja
                    </th>
                    {selectedPeriod.years.sort((a, b) => a - b).map(year => (
                      selectedMonths.map(month => (
                        <th key={`${year}-${month}`} className="p-0 text-center text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-r min-w-[85px]">
                          {month.slice(0, 3)}/{year}
                        </th>
                      ))
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredIndicators.map(indicator => (
                    <React.Fragment key={indicator.id}>
                      {displayCompanies.map((company, idx) => (
                        <tr key={`${indicator.id}-${company.id}`} className="hover:bg-slate-50/50">
                          {idx === 0 && (
                            <td
                              rowSpan={displayCompanies.length}
                              className="p-2 text-sm font-medium text-slate-800 border-r border-b bg-white sticky left-0 z-20 align-top"
                            >
                              <div className="font-semibold text-slate-800 text-xs">{indicator.nome}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">({indicator.unidadeMedida})</div>
                            </td>
                          )}
                          <td className="p-2 text-xs text-slate-700 border-r border-b bg-white sticky left-[200px] z-20">
                            {company.nickname || company.name}
                          </td>
                          {selectedPeriod.years.sort((a, b) => a - b).map(year => (
                            selectedMonths.map(month => {
                              const value = getValue(indicator.id, company.id, year, month)
                              return (
                                <td key={`${year}-${month}`} className="p-0 border-r border-b">
                                  <input
                                    type="number"
                                    value={value ?? ''}
                                    onChange={(e) => handleValueChange(indicator.id, company.id, year, month, e.target.value)}
                                    className="w-full text-center bg-slate-50 border-0 py-1.5 px-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white"
                                    placeholder="-"
                                  />
                                </td>
                              )
                            })
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">Selecione indicadores, marca e departamento para visualizar os dados.</p>
              </div>
            )}
          </div>

          {hasPendingChanges && (
            <div className="px-6 py-4 bg-amber-50 border-t border-amber-200 flex justify-between items-center shrink-0">
              <span className="text-sm text-amber-700 font-medium">
                Você tem {Object.keys(pendingChanges).length} alteração(ões) não salva(s).
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelChanges}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
                >
                  Descartar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".xlsx,.xls"
        className="hidden"
      />
    </main>
  )
}

export default OperationalDataEntryView
