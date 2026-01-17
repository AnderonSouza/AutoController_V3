import React, { useState, useEffect, useMemo } from "react"
import { supabase } from "../utils/supabaseClient"
import { Search, Filter, Download, RefreshCw, FileText, ChevronLeft, AlertTriangle, CheckCircle2, BarChart3, List, X, CheckCircle } from "lucide-react"
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
  nickname: string
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
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[new Date().getMonth()])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(true)
  const [activeAuditTab, setActiveAuditTab] = useState<"dashboard" | "entries">("dashboard")
  const [needsRefresh, setNeedsRefresh] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [aggregatedStats, setAggregatedStats] = useState<{
    totalEntries: number
    totalDebits: number
    totalCredits: number
    errorCount: number
    byMonth: { mes: string; entries: number; debits: number; credits: number; errors: number }[]
    byCompany: { empresa_id: string; entries: number; debits: number; credits: number; errors: number }[]
    byCostCenter: { centro_resultado_id: string; entries: number; debits: number; credits: number; errors: number }[]
  } | null>(null)

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
          nickname: c.nome_fantasia || c.nome,
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
      // Use JOIN to get related data from plano_contas and centros_resultado
      let query = supabase
        .from("lancamentos_contabeis")
        .select(`
          *,
          plano_contas:conta_contabil_id(id, codigo_contabil, nome),
          centros_resultado:centro_resultado_id(id, codigo, nome)
        `)
        .eq("organizacao_id", tenantId)
        .eq("ano", selectedYear)
        .order("data", { ascending: false })

      if (selectedMonth) {
        query = query.eq("mes", selectedMonth.toUpperCase())
      }

      if (selectedCompanyId) {
        query = query.eq("empresa_id", selectedCompanyId)
      }

      // Apply brand filter
      if (selectedBrandId && companies.length > 0) {
        const brandCompanyIds = companies
          .filter(c => c.brandId === selectedBrandId)
          .map(c => c.id)
        if (brandCompanyIds.length > 0) {
          query = query.in("empresa_id", brandCompanyIds)
        }
      }

      // For entries list, keep limit at 1000 for performance
      const { data, error } = await query.limit(1000)

      if (error) {
        console.error("Error loading entries:", error)
        setEntries([])
      } else {
        // Map related data to flat structure for display
        const mappedData = (data || []).map(e => ({
          ...e,
          idconta: e.plano_contas?.codigo_contabil || '',
          descricaoconta: e.plano_contas?.nome || '',
          siglacr: e.centros_resultado?.codigo || '',
          descricaocr: e.centros_resultado?.nome || '',
        }))
        setEntries(mappedData)
      }
    } catch (error) {
      console.error("Error loading entries:", error)
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }

  // Load aggregated statistics for audit dashboard (no limit)
  const loadAggregatedStats = async () => {
    if (!tenantId || mode !== "monitor") return
    
    setIsLoadingStats(true)
    setNeedsRefresh(false)

    try {
      // Get company IDs for selected brand filter
      let brandCompanyIds: string[] = []
      if (selectedBrandId && companies.length > 0) {
        brandCompanyIds = companies
          .filter(c => c.brandId === selectedBrandId)
          .map(c => c.id)
      }

      // Fetch all records without limit for aggregation (paginated)
      let allData: any[] = []
      let page = 0
      const pageSize = 50000 // Increased for better performance
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from("lancamentos_contabeis")
          .select("valor, natureza, conta_contabil_id, centro_resultado_id, mes, empresa_id")
          .eq("organizacao_id", tenantId)
          .eq("ano", selectedYear)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (selectedMonth) {
          query = query.eq("mes", selectedMonth.toUpperCase())
        }
        if (selectedCompanyId) {
          query = query.eq("empresa_id", selectedCompanyId)
        } else if (selectedBrandId && brandCompanyIds.length > 0) {
          // Filter by brand's companies
          query = query.in("empresa_id", brandCompanyIds)
        }

        const { data, error } = await query

        if (error) {
          console.error("Error loading aggregated stats:", error)
          break
        }

        if (data && data.length > 0) {
          allData = allData.concat(data)
          if (data.length < pageSize) {
            hasMore = false
          } else {
            page++
          }
        } else {
          hasMore = false
        }

        // Safety limit - max 500k records
        if (allData.length >= 500000) {
          console.warn("Safety limit reached for aggregation")
          hasMore = false
        }
      }

      // Aggregate the data
      let totalDebits = 0
      let totalCredits = 0
      let errorCount = 0
      const byMonthMap = new Map<string, { entries: number; debits: number; credits: number; errors: number }>()
      const byCompanyMap = new Map<string, { entries: number; debits: number; credits: number; errors: number }>()
      const byCostCenterMap = new Map<string, { entries: number; debits: number; credits: number; errors: number }>()

      allData.forEach(e => {
        const debit = e.natureza === 'D' ? (e.valor || 0) : 0
        const credit = e.natureza === 'C' ? (e.valor || 0) : 0
        const hasError = !e.conta_contabil_id || !e.centro_resultado_id || (!e.valor || e.valor === 0)

        totalDebits += debit
        totalCredits += credit
        if (hasError) errorCount++

        // By Month
        const monthKey = e.mes || 'Sem Mês'
        const monthData = byMonthMap.get(monthKey) || { entries: 0, debits: 0, credits: 0, errors: 0 }
        monthData.entries++
        monthData.debits += debit
        monthData.credits += credit
        if (hasError) monthData.errors++
        byMonthMap.set(monthKey, monthData)

        // By Company
        const companyKey = e.empresa_id || 'sem_empresa'
        const companyData = byCompanyMap.get(companyKey) || { entries: 0, debits: 0, credits: 0, errors: 0 }
        companyData.entries++
        companyData.debits += debit
        companyData.credits += credit
        if (hasError) companyData.errors++
        byCompanyMap.set(companyKey, companyData)

        // By Cost Center
        const centerKey = e.centro_resultado_id || 'sem_cr'
        const centerData = byCostCenterMap.get(centerKey) || { entries: 0, debits: 0, credits: 0, errors: 0 }
        centerData.entries++
        centerData.debits += debit
        centerData.credits += credit
        if (hasError) centerData.errors++
        byCostCenterMap.set(centerKey, centerData)
      })

      setAggregatedStats({
        totalEntries: allData.length,
        totalDebits,
        totalCredits,
        errorCount,
        byMonth: Array.from(byMonthMap.entries()).map(([mes, data]) => ({ mes, ...data })),
        byCompany: Array.from(byCompanyMap.entries()).map(([empresa_id, data]) => ({ empresa_id, ...data })),
        byCostCenter: Array.from(byCostCenterMap.entries()).map(([centro_resultado_id, data]) => ({ centro_resultado_id, ...data })),
      })
    } catch (error) {
      console.error("Error loading aggregated stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Mark as needing refresh when filters change
  useEffect(() => {
    if (mode === "monitor") {
      setNeedsRefresh(true)
    }
  }, [selectedYear, selectedMonth, selectedCompanyId, selectedBrandId, mode])

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
    // In monitor mode, use aggregated stats if available
    if (mode === "monitor" && aggregatedStats) {
      return {
        totalEntries: aggregatedStats.totalEntries,
        totalDebits: aggregatedStats.totalDebits,
        totalCredits: aggregatedStats.totalCredits,
        balance: aggregatedStats.totalDebits - aggregatedStats.totalCredits,
        errorCount: aggregatedStats.errorCount,
      }
    }

    // Otherwise use filtered entries (limited to 1000)
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
  }, [filteredEntries, mode, aggregatedStats])

  // Audit dashboard summaries
  const auditSummaries = useMemo(() => {
    // Use aggregated data if available in monitor mode
    if (mode === "monitor" && aggregatedStats) {
      // Build brand summary from company data
      const byBrandMap = new Map<string, { entries: number; debits: number; credits: number; errors: number }>()
      aggregatedStats.byCompany.forEach(compData => {
        const company = companies.find(c => c.id === compData.empresa_id)
        const brandId = company?.brandId || 'sem_marca'
        const existing = byBrandMap.get(brandId) || { entries: 0, debits: 0, credits: 0, errors: 0 }
        existing.entries += compData.entries
        existing.debits += compData.debits
        existing.credits += compData.credits
        existing.errors += compData.errors
        byBrandMap.set(brandId, existing)
      })

      return {
        byBrand: Array.from(byBrandMap.entries()).map(([id, data]) => ({
          id,
          name: brands.find(b => b.id === id)?.name || (id === 'sem_marca' ? 'Sem Marca' : id),
          ...data
        })).sort((a, b) => b.entries - a.entries),
        
        byCompany: aggregatedStats.byCompany.map(row => {
          const company = companies.find(c => c.id === row.empresa_id)
          return {
            id: row.empresa_id,
            name: company?.nickname || company?.name || (row.empresa_id === 'sem_empresa' ? 'Sem Empresa' : row.empresa_id),
            ...row
          }
        }).sort((a, b) => b.entries - a.entries),
        
        byMonth: aggregatedStats.byMonth.map(row => ({
          id: row.mes,
          name: row.mes,
          entries: row.entries,
          debits: row.debits,
          credits: row.credits,
          errors: row.errors,
        })).sort((a, b) => MONTHS.indexOf(a.name) - MONTHS.indexOf(b.name)),
        
        byCostCenter: aggregatedStats.byCostCenter.map(row => {
          const center = costCenters.find(c => c.id === row.centro_resultado_id)
          return {
            id: row.centro_resultado_id,
            name: center?.name || (row.centro_resultado_id === 'sem_cr' ? 'Sem Centro' : row.centro_resultado_id),
            entries: row.entries,
            debits: row.debits,
            credits: row.credits,
            errors: row.errors,
          }
        }).sort((a, b) => b.entries - a.entries),
      }
    }

    // Fallback to filtered entries calculation
    // Summary by Brand
    const byBrand = new Map<string, { entries: number; debits: number; credits: number; errors: number }>()
    // Summary by Company
    const byCompany = new Map<string, { entries: number; debits: number; credits: number; errors: number }>()
    // Summary by Month
    const byMonth = new Map<string, { entries: number; debits: number; credits: number; errors: number }>()
    // Summary by Cost Center
    const byCostCenter = new Map<string, { entries: number; debits: number; credits: number; errors: number }>()

    filteredEntries.forEach(e => {
      const debit = e.natureza === 'D' ? (e.valor || 0) : 0
      const credit = e.natureza === 'C' ? (e.valor || 0) : 0
      const hasError = !e.conta_contabil_id || !e.centro_resultado_id || (!e.valor || e.valor === 0)

      // By Company
      const companyId = e.empresa_id || 'sem_empresa'
      const companyData = byCompany.get(companyId) || { entries: 0, debits: 0, credits: 0, errors: 0 }
      companyData.entries++
      companyData.debits += debit
      companyData.credits += credit
      if (hasError) companyData.errors++
      byCompany.set(companyId, companyData)

      // By Brand (via company)
      const company = companies.find(c => c.id === companyId)
      const brandId = company?.brandId || 'sem_marca'
      const brandData = byBrand.get(brandId) || { entries: 0, debits: 0, credits: 0, errors: 0 }
      brandData.entries++
      brandData.debits += debit
      brandData.credits += credit
      if (hasError) brandData.errors++
      byBrand.set(brandId, brandData)

      // By Month
      const monthKey = e.mes || 'sem_mes'
      const monthData = byMonth.get(monthKey) || { entries: 0, debits: 0, credits: 0, errors: 0 }
      monthData.entries++
      monthData.debits += debit
      monthData.credits += credit
      if (hasError) monthData.errors++
      byMonth.set(monthKey, monthData)

      // By Cost Center
      const centerKey = e.siglacr || e.descricaocr || 'sem_cr'
      const centerData = byCostCenter.get(centerKey) || { entries: 0, debits: 0, credits: 0, errors: 0 }
      centerData.entries++
      centerData.debits += debit
      centerData.credits += credit
      if (hasError) centerData.errors++
      byCostCenter.set(centerKey, centerData)
    })

    return {
      byBrand: Array.from(byBrand.entries()).map(([id, data]) => ({
        id,
        name: brands.find(b => b.id === id)?.name || (id === 'sem_marca' ? 'Sem Marca' : id),
        ...data
      })).sort((a, b) => b.entries - a.entries),
      
      byCompany: Array.from(byCompany.entries()).map(([id, data]) => ({
        id,
        name: companies.find(c => c.id === id)?.name || (id === 'sem_empresa' ? 'Sem Empresa' : id),
        ...data
      })).sort((a, b) => b.entries - a.entries),
      
      byMonth: Array.from(byMonth.entries()).map(([id, data]) => ({
        id,
        name: id === 'sem_mes' ? 'Sem Mês' : id,
        ...data
      })).sort((a, b) => MONTHS.indexOf(a.name) - MONTHS.indexOf(b.name)),
      
      byCostCenter: Array.from(byCostCenter.entries()).map(([id, data]) => ({
        id,
        name: id === 'sem_cr' ? 'Sem Centro' : id,
        ...data
      })).sort((a, b) => b.entries - a.entries),
    }
  }, [filteredEntries, companies, brands, costCenters, mode, aggregatedStats])

  const getCompanyName = (empresaId: string) => {
    const company = companies.find(c => c.id === empresaId)
    return company?.nickname || company?.name || "N/A"
  }

  // State for entry detail modal
  const [selectedEntry, setSelectedEntry] = useState<any>(null)

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
                {mode === "monitor" ? "Auditoria Contábil" : "Razão Contábil"}
              </h1>
              <p className="card-subtitle">
                {mode === "monitor" 
                  ? "Valide os lançamentos importados por marca, empresa, mês e centro de resultado" 
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
              onClick={mode === "monitor" ? loadAggregatedStats : loadEntries}
              disabled={isLoading || isLoadingStats}
              className={`btn ${needsRefresh && mode === "monitor" ? 'btn-primary' : 'btn-secondary'}`}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading || isLoadingStats ? 'animate-spin' : ''}`} />
              {needsRefresh && mode === "monitor" ? "Carregar Dados" : "Atualizar"}
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
                  .map(c => <option key={c.id} value={c.id}>{c.nickname || c.name}</option>)}
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
            {mode === "monitor" && stats.errorCount > 0 && (
              <div className="summary-card" style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
                <p className="summary-card-label" style={{ color: '#dc2626' }}>Pendências</p>
                <p className="summary-card-value" style={{ color: '#dc2626' }}>
                  {stats.errorCount.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {mode === "monitor" && (
            <div className="flex gap-2 mt-4 mb-4 border-b border-slate-200">
              <button
                onClick={() => setActiveAuditTab("dashboard")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeAuditTab === "dashboard"
                    ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Resumo por Dimensão
              </button>
              <button
                onClick={() => setActiveAuditTab("entries")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeAuditTab === "entries"
                    ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="h-4 w-4" />
                Lançamentos
              </button>
            </div>
          )}

          {mode === "monitor" && activeAuditTab === "dashboard" && needsRefresh && !isLoadingStats && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center mt-4">
              <BarChart3 className="h-12 w-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Clique em "Carregar Dados" para iniciar</h3>
              <p className="text-blue-600 text-sm">
                Selecione os filtros desejados e clique no botão acima para carregar os dados de auditoria.
              </p>
            </div>
          )}

          {mode === "monitor" && activeAuditTab === "dashboard" && isLoadingStats && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center mt-4">
              <RefreshCw className="h-12 w-12 text-slate-400 mx-auto mb-3 animate-spin" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Carregando dados...</h3>
              <p className="text-slate-500 text-sm">
                Processando lançamentos contábeis. Isso pode levar alguns segundos.
              </p>
            </div>
          )}

          {mode === "monitor" && activeAuditTab === "dashboard" && !needsRefresh && !isLoadingStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Summary by Month */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-700">Por Mês</h3>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2">Mês</th>
                        <th className="text-right px-2 py-2">Lanç.</th>
                        <th className="text-right px-2 py-2">Débitos</th>
                        <th className="text-right px-2 py-2">Créditos</th>
                        <th className="text-center px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditSummaries.byMonth.map(row => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium">{row.name}</td>
                          <td className="text-right px-2 py-2">{row.entries.toLocaleString()}</td>
                          <td className="text-right px-2 py-2 text-red-600 font-mono">{formatCurrency(row.debits)}</td>
                          <td className="text-right px-2 py-2 text-blue-600 font-mono">{formatCurrency(row.credits)}</td>
                          <td className="text-center px-2 py-2">
                            {row.errors > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                {row.errors}
                              </span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary by Brand */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-700">Por Marca</h3>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2">Marca</th>
                        <th className="text-right px-2 py-2">Lanç.</th>
                        <th className="text-right px-2 py-2">Débitos</th>
                        <th className="text-right px-2 py-2">Créditos</th>
                        <th className="text-center px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditSummaries.byBrand.map(row => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium">{row.name}</td>
                          <td className="text-right px-2 py-2">{row.entries.toLocaleString()}</td>
                          <td className="text-right px-2 py-2 text-red-600 font-mono">{formatCurrency(row.debits)}</td>
                          <td className="text-right px-2 py-2 text-blue-600 font-mono">{formatCurrency(row.credits)}</td>
                          <td className="text-center px-2 py-2">
                            {row.errors > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                {row.errors}
                              </span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary by Company */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-700">Por Empresa</h3>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2">Empresa</th>
                        <th className="text-right px-2 py-2">Lanç.</th>
                        <th className="text-right px-2 py-2">Débitos</th>
                        <th className="text-right px-2 py-2">Créditos</th>
                        <th className="text-center px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditSummaries.byCompany.slice(0, 20).map(row => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium truncate max-w-[200px]" title={row.name}>{row.name}</td>
                          <td className="text-right px-2 py-2">{row.entries.toLocaleString()}</td>
                          <td className="text-right px-2 py-2 text-red-600 font-mono">{formatCurrency(row.debits)}</td>
                          <td className="text-right px-2 py-2 text-blue-600 font-mono">{formatCurrency(row.credits)}</td>
                          <td className="text-center px-2 py-2">
                            {row.errors > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                {row.errors}
                              </span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary by Cost Center */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-700">Por Centro de Resultado</h3>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2">Centro</th>
                        <th className="text-right px-2 py-2">Lanç.</th>
                        <th className="text-right px-2 py-2">Débitos</th>
                        <th className="text-right px-2 py-2">Créditos</th>
                        <th className="text-center px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditSummaries.byCostCenter.slice(0, 20).map(row => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium">{row.name}</td>
                          <td className="text-right px-2 py-2">{row.entries.toLocaleString()}</td>
                          <td className="text-right px-2 py-2 text-red-600 font-mono">{formatCurrency(row.debits)}</td>
                          <td className="text-right px-2 py-2 text-blue-600 font-mono">{formatCurrency(row.credits)}</td>
                          <td className="text-center px-2 py-2">
                            {row.errors > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                {row.errors}
                              </span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {(mode !== "monitor" || activeAuditTab === "entries") && (
          <div className="data-table-wrapper mt-4">
            <table className="data-table">
              <thead className="sticky-header">
                <tr>
                  <th className="text-left">Data</th>
                  <th className="text-left">Empresa</th>
                  <th className="text-left">Conta</th>
                  <th className="text-left">Descrição</th>
                  <th className="text-left">Centro de Resultado</th>
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
                      <tr 
                        key={entry.id || idx} 
                        className={`cursor-pointer hover:bg-slate-100 ${hasError && mode === "monitor" ? 'bg-red-50 hover:bg-red-100' : ''}`}
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <td className="text-[var(--color-text-muted)]">{entry.mes}/{entry.ano}</td>
                        <td className="max-w-[120px] truncate" title={getCompanyName(entry.empresa_id)}>{getCompanyName(entry.empresa_id)}</td>
                        <td className="font-mono text-[var(--color-text-secondary)] text-xs">{entry.idconta || "-"}</td>
                        <td className="max-w-[180px] truncate" title={entry.descricaoconta || ""}>{entry.descricaoconta || "-"}</td>
                        <td className="max-w-[120px] truncate" title={entry.descricaocr || entry.siglacr || ""}>{entry.descricaocr || entry.siglacr || "-"}</td>
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
          )}

          {/* Entry Detail Modal */}
          {selectedEntry && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedEntry(null)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                  <h2 className="text-lg font-semibold text-slate-800">Detalhes do Lançamento</h2>
                  <button onClick={() => setSelectedEntry(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase">Período</label>
                      <p className="text-slate-800 font-medium">{selectedEntry.mes}/{selectedEntry.ano}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase">Data</label>
                      <p className="text-slate-800">{selectedEntry.data || "-"}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase">Empresa</label>
                    <p className="text-slate-800 font-medium">{getCompanyName(selectedEntry.empresa_id)}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase">Conta Contábil</label>
                      <p className="text-slate-800 font-mono">{selectedEntry.idconta || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase">Centro de Resultado</label>
                      <p className="text-slate-800">{selectedEntry.descricaocr || selectedEntry.siglacr || "-"}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase">Descrição da Conta</label>
                    <p className="text-slate-800">{selectedEntry.descricaoconta || "-"}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 uppercase">Histórico</label>
                    <p className="text-slate-800">{selectedEntry.historico || "-"}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase">Débito</label>
                      <p className="text-2xl font-bold text-red-600">
                        {selectedEntry.natureza === 'D' ? formatCurrency(selectedEntry.valor || 0) : "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase">Crédito</label>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedEntry.natureza === 'C' ? formatCurrency(selectedEntry.valor || 0) : "-"}
                      </p>
                    </div>
                  </div>
                  
                  {mode === "monitor" && (
                    <div className="pt-4 border-t border-slate-200">
                      <label className="text-xs font-medium text-slate-500 uppercase">Status</label>
                      <div className="mt-2">
                        {(!selectedEntry.conta_contabil_id || !selectedEntry.centro_resultado_id) ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700">
                            <AlertTriangle className="h-4 w-4" />
                            Lançamento com dados incompletos
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700">
                            <CheckCircle className="h-4 w-4" />
                            Lançamento completo
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DataQueryView
