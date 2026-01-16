import React, { useState, useEffect, useMemo } from "react"
import { supabase } from "../utils/supabaseClient"
import { Search, Filter, Download, RefreshCw, FileText, ChevronLeft } from "lucide-react"
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
          code: c.sigla,
          name: c.descricao,
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
        .order("data", { ascending: false })

      if (selectedMonth) {
        query = query.eq("mes", selectedMonth)
      }

      if (selectedCompanyId) {
        query = query.eq("empresa_id", selectedCompanyId)
      }

      const { data, error } = await query.limit(1000)

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
    <div className="page-container">
      <div className="content-card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            {onNavigateBack && (
              <button onClick={onNavigateBack} className="icon-btn icon-btn-ghost">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="header-text">
              <h1 className="card-title">
                {mode === "monitor" ? "Monitor de Erros" : "Razão Contábil"}
              </h1>
              <p className="card-subtitle">
                {mode === "monitor" 
                  ? "Visualize e corrija lançamentos com problemas de mapeamento" 
                  : "Consulte os lançamentos contábeis importados"}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary-outline' : 'btn-secondary'}`}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
            <button 
              onClick={loadEntries}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button 
              onClick={exportToCsv}
              disabled={filteredEntries.length === 0}
              className="btn btn-primary"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filter-bar">
            <div className="filter-group">
              <label className="filter-label">Ano</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="filter-select"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Mês</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os meses</option>
                {MONTHS.map((m, i) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Marca</label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="filter-select"
              >
                <option value="">Todas as marcas</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Empresa</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="filter-select"
              >
                <option value="">Todas as empresas</option>
                {companies
                  .filter(c => !selectedBrandId || c.brandId === selectedBrandId)
                  .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Buscar</label>
              <div className="filter-search">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Conta, descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-search-input"
                />
              </div>
            </div>
          </div>
        )}

        <div className="card-body">
          <div className="summary-cards">
            <div className="summary-card summary-card-neutral">
              <p className="summary-card-label">Total de Lançamentos</p>
              <p className="summary-card-value">{stats.totalEntries.toLocaleString()}</p>
            </div>
            <div className="summary-card summary-card-error">
              <p className="summary-card-label">Total Débitos</p>
              <p className="summary-card-value">{formatCurrency(stats.totalDebits)}</p>
            </div>
            <div className="summary-card summary-card-info">
              <p className="summary-card-label">Total Créditos</p>
              <p className="summary-card-value">{formatCurrency(stats.totalCredits)}</p>
            </div>
            <div className="summary-card summary-card-dark">
              <p className="summary-card-label">Saldo</p>
              <p className={`summary-card-value ${stats.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.balance)}
              </p>
            </div>
          </div>

          <div className="data-table-wrapper mt-4">
            <table className="data-table">
              <thead className="sticky-header">
                <tr>
                  <th className="text-left">Data</th>
                  <th className="text-left">Empresa</th>
                  <th className="text-left">Conta Contábil</th>
                  <th className="text-left">Centro de Resultado</th>
                  <th className="text-left">Descrição</th>
                  <th className="text-right">Débito</th>
                  <th className="text-right">Crédito</th>
                  {mode === "monitor" && <th className="text-center">Status</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={mode === "monitor" ? 8 : 7}>
                      <div className="table-loading">
                        <RefreshCw className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                        <span>Carregando lançamentos...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={mode === "monitor" ? 8 : 7}>
                      <div className="table-empty">
                        <FileText className="h-12 w-12 text-slate-300" />
                        <span>Nenhum lançamento encontrado para os filtros selecionados.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.slice(0, 100).map((entry, idx) => {
                    const debit = entry.natureza === 'D' ? entry.valor : 0
                    const credit = entry.natureza === 'C' ? entry.valor : 0
                    const hasError = !entry.conta_contabil_id || !entry.centro_resultado_id
                    
                    return (
                      <tr key={entry.id || idx} className={hasError && mode === "monitor" ? 'bg-red-50' : ''}>
                        <td className="text-[var(--color-text-muted)]">{entry.mes}/{entry.ano}</td>
                        <td>{getCompanyName(entry.empresa_id)}</td>
                        <td className="font-mono text-[var(--color-text-secondary)]">{entry.idconta || "-"}</td>
                        <td>{entry.siglacr || entry.descricaocr || "-"}</td>
                        <td className="max-w-[200px] truncate">{entry.descricaoconta || "-"}</td>
                        <td className="text-right font-mono text-red-600">{debit > 0 ? formatCurrency(debit) : "-"}</td>
                        <td className="text-right font-mono text-blue-600">{credit > 0 ? formatCurrency(credit) : "-"}</td>
                        {mode === "monitor" && (
                          <td className="text-center">
                            {hasError ? (
                              <span className="badge badge-error">Pendente</span>
                            ) : (
                              <span className="badge badge-success">OK</span>
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
        </div>
      </div>
    </div>
  )
}

export default DataQueryView
