import React, { useState, useEffect, useMemo } from "react"
import { supabase } from "../utils/supabaseClient"
import { ArrowLeft, Search, Filter, Download, RefreshCw, AlertTriangle, FileText, TrendingUp, ArrowRightLeft, Calendar, Building2, ChevronDown } from "lucide-react"
import type {
  CgEntry,
  ManagementTransfer,
  Company,
  DreAccount,
  Brand,
  TrialBalanceEntry,
  AdjustmentEntry,
  FinancialAccount,
  CostCenter,
  AccountCostCenterMapping,
  BalanceSheetAccount,
  Department,
} from "../types"

interface DataQueryViewProps {
  accountingEntries?: TrialBalanceEntry[]
  cgEntries?: CgEntry[]
  managementTransfers?: ManagementTransfer[]
  adjustmentEntries?: AdjustmentEntry[]
  companies?: Company[]
  brands?: Brand[]
  dreAccounts?: DreAccount[]
  balanceSheetAccounts?: BalanceSheetAccount[]
  chartOfAccounts?: FinancialAccount[]
  costCenters?: CostCenter[]
  mappings?: AccountCostCenterMapping[]
  departments?: Department[]
  mode?: "razao" | "monitor"
  onNavigateBack?: () => void
  tenantId?: string | null
}

type EntryType = "accounting" | "transfer" | "cg" | "adjustment"

const formatCurrency = (num: number): string => num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

interface LocalCompany {
  id: string
  name: string
  brandId: string
}

interface LocalBrand {
  id: string
  name: string
}

interface LocalAccount {
  id: string
  code: string
  name: string
}

interface LocalCostCenter {
  id: string
  code: string
  name: string
}

const DataQueryView: React.FC<DataQueryViewProps> = ({
  mode = "razao",
  onNavigateBack,
  tenantId,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  const [companies, setCompanies] = useState<LocalCompany[]>([])
  const [brands, setBrands] = useState<LocalBrand[]>([])
  const [chartOfAccounts, setChartOfAccounts] = useState<LocalAccount[]>([])
  const [costCenters, setCostCenters] = useState<LocalCostCenter[]>([])
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(true)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    if (tenantId) {
      loadReferenceData()
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId && selectedYear) {
      loadEntries()
    }
  }, [tenantId, selectedYear, selectedMonth, selectedCompanyId, selectedBrandId])

  const loadReferenceData = async () => {
    if (!tenantId) return
    
    try {
      const [companiesRes, brandsRes, accountsRes, centersRes] = await Promise.all([
        supabase.from("empresas").select("*").eq("organizacao_id", tenantId),
        supabase.from("marcas").select("*").eq("organizacao_id", tenantId),
        supabase.from("plano_contas").select("*").eq("organizacao_id", tenantId),
        supabase.from("centros_resultado").select("*").eq("organizacao_id", tenantId),
      ])

      if (companiesRes.data) {
        setCompanies(companiesRes.data.map(c => ({
          id: c.id,
          name: c.nome,
          brandId: c.marca_id,
        })))
      }
      if (brandsRes.data) {
        setBrands(brandsRes.data.map(b => ({
          id: b.id,
          name: b.nome,
        })))
      }
      if (accountsRes.data) {
        setChartOfAccounts(accountsRes.data.map(a => ({
          id: a.id,
          code: a.codigo_contabil,
          name: a.nome,
        })))
      }
      if (centersRes.data) {
        setCostCenters(centersRes.data.map(c => ({
          id: c.id,
          code: c.codigo,
          name: c.nome,
        })))
      }
    } catch (error) {
      console.error("Error loading reference data:", error)
    }
  }

  const loadEntries = async () => {
    if (!tenantId) return
    
    setIsLoading(true)
    try {
      let query = supabase
        .from("lancamentos_contabeis")
        .select("*")
        .eq("organizacao_id", tenantId)
        .eq("ano", selectedYear)

      if (selectedMonth) {
        query = query.eq("mes", selectedMonth)
      }
      if (selectedCompanyId) {
        query = query.eq("empresa_id", selectedCompanyId)
      }

      const { data, error } = await query.order("id", { ascending: false }).limit(1000)

      if (error) {
        console.error("Error loading entries:", error)
        setEntries([])
      } else {
        setEntries(data || [])
      }
    } catch (error) {
      console.error("Error loading entries:", error)
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredEntries = useMemo(() => {
    let result = entries

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(e => 
        e.descricaoconta?.toLowerCase().includes(term) ||
        e.idconta?.toLowerCase().includes(term) ||
        e.siglacr?.toLowerCase().includes(term)
      )
    }

    if (selectedBrandId && companies.length > 0) {
      const brandCompanyIds = companies
        .filter(c => c.brandId === selectedBrandId)
        .map(c => c.id)
      result = result.filter(e => brandCompanyIds.includes(e.empresa_id))
    }

    return result
  }, [entries, searchTerm, selectedBrandId, companies])

  const stats = useMemo(() => {
    const totalDebits = filteredEntries.reduce((sum, e) => {
      if (e.natureza === 'D') return sum + (e.valor || 0)
      return sum
    }, 0)
    const totalCredits = filteredEntries.reduce((sum, e) => {
      if (e.natureza === 'C') return sum + (e.valor || 0)
      return sum
    }, 0)
    const balance = totalDebits - totalCredits

    const errorEntries = filteredEntries.filter(e => 
      !e.conta_contabil_id || 
      !e.centro_resultado_id ||
      (!e.valor || e.valor === 0)
    )

    return {
      totalEntries: filteredEntries.length,
      totalDebits,
      totalCredits,
      balance,
      errorCount: errorEntries.length,
    }
  }, [filteredEntries])

  const getCompanyName = (empresaId: string) => {
    const company = companies.find(c => c.id === empresaId)
    return company?.name || "N/A"
  }

  const getAccountName = (contaId: string) => {
    const account = chartOfAccounts.find(a => a.id === contaId)
    return account?.name || "N/A"
  }

  const getCostCenterName = (centroId: string) => {
    const center = costCenters.find(c => c.id === centroId)
    return center?.name || "N/A"
  }

  const exportToCsv = () => {
    const headers = ["Período", "Empresa", "Conta", "Descrição Conta", "Centro de Resultado", "Histórico", "Débito", "Crédito"]
    const rows = filteredEntries.map(e => {
      const debit = e.natureza === 'D' ? e.valor : 0
      const credit = e.natureza === 'C' ? e.valor : 0
      return [
        `${e.mes}/${e.ano}`,
        getCompanyName(e.empresa_id),
        e.idconta || "",
        e.descricaoconta || "",
        e.siglacr || e.descricaocr || "",
        e.historico || "",
        debit || 0,
        credit || 0,
      ]
    })

    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `lancamentos_${selectedYear}_${selectedMonth || "todos"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col bg-slate-100 p-3">
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onNavigateBack && (
                <button onClick={onNavigateBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {mode === "monitor" ? "Monitor de Erros" : "Razão Contábil"}
                </h1>
                <p className="text-sm text-slate-500">
                  {mode === "monitor" 
                    ? "Visualize e corrija lançamentos com problemas de mapeamento" 
                    : "Consulte os lançamentos contábeis importados"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${showFilters ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>
              <button 
                onClick={loadEntries}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button 
                onClick={exportToCsv}
                disabled={filteredEntries.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 text-sm"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Ano</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Mês</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Todos os meses</option>
                  {MONTHS.map((m, i) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Marca</label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Todas as marcas</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Empresa</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Todas as empresas</option>
                  {companies
                    .filter(c => !selectedBrandId || c.brandId === selectedBrandId)
                    .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Conta, descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="text-xs font-medium text-slate-500 mb-1">Total de Lançamentos</p>
              <p className="text-xl font-bold text-slate-800">{stats.totalEntries.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
              <p className="text-xs font-medium text-red-600 mb-1">Total Débitos</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(stats.totalDebits)}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <p className="text-xs font-medium text-blue-600 mb-1">Total Créditos</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(stats.totalCredits)}</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-xl">
              <p className="text-xs font-medium text-slate-300 mb-1">Saldo</p>
              <p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.balance)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 pb-4 overflow-hidden">
          <div className="h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Data</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Empresa</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Conta Contábil</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Centro de Resultado</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Descrição</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Débito</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Crédito</th>
                    {mode === "monitor" && <th className="text-center px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Status</th>}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={mode === "monitor" ? 8 : 7} className="p-8 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                          <span>Carregando lançamentos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={mode === "monitor" ? 8 : 7} className="p-8 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="h-12 w-12 text-slate-300" />
                          <span>Nenhum lançamento encontrado para os filtros selecionados.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.slice(0, 500).map((entry, idx) => {
                      const hasError = !entry.conta_contabil_id || !entry.centro_resultado_id
                      const debitValue = entry.natureza === 'D' ? entry.valor : 0
                      const creditValue = entry.natureza === 'C' ? entry.valor : 0
                      return (
                        <tr 
                          key={entry.id || idx} 
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${hasError ? 'bg-orange-50/50' : ''}`}
                        >
                          <td className="px-4 py-2.5 text-slate-600">
                            {entry.mes?.substring(0,3)}/{entry.ano}
                          </td>
                          <td className="px-4 py-2.5 text-slate-800 font-medium">
                            {getCompanyName(entry.empresa_id)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-slate-800">{entry.idconta || "N/A"}</span>
                            {entry.descricaoconta && (
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">{entry.descricaoconta}</p>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            {entry.siglacr || entry.descricaocr || getCostCenterName(entry.centro_resultado_id)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">
                            {entry.historico || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-red-600">
                            {debitValue > 0 ? formatCurrency(debitValue) : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-blue-600">
                            {creditValue > 0 ? formatCurrency(creditValue) : "-"}
                          </td>
                          {mode === "monitor" && (
                            <td className="px-4 py-2.5 text-center">
                              {hasError ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                  <AlertTriangle className="h-3 w-3" />
                                  Pendente
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  OK
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredEntries.length > 500 && (
              <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-sm text-slate-500">
                Mostrando 500 de {filteredEntries.length.toLocaleString()} lançamentos. Use os filtros para refinar a busca.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataQueryView
