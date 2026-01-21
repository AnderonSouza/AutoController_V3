"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import type { User, View, ReportTemplate, FinancialAccount, EconomicGroup, Benchmark } from "./types"
import SuperAdminView from "./components/SuperAdminView"
import SuperAdminDashboard from "./components/SuperAdminDashboard"
import UnifiedLayout from "./components/UnifiedLayout"
import type { SidebarItem } from "./components/UnifiedSidebar"
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  BookOpen,
  Database,
  Building2,
  Target,
  FolderTree,
  Layers,
  Calculator,
  FileText,
  FileSpreadsheet,
  ArrowRightLeft,
  FileInput,
  ClipboardList,
  Lock,
  Calendar,
  Settings,
  Users,
  HelpCircle,
  Shield,
  Activity,
  Gauge,
  Headphones,
  GraduationCap,
  Sparkles,
} from "lucide-react"

import { TenantProvider } from "./context/TenantContext"

// Component Imports
import UserManagementView from "./components/UserManagementView"
import SystemSettingsView from "./components/SystemSettingsView"
import SupportView from "./components/SupportView"
import DocumentationView from "./components/DocumentationView"
import UnifiedLogin from "./components/UnifiedLogin"
import PasswordReset from "./components/PasswordReset"
import ManagementTransfersView from "./components/ManagementTransfersView"
import CgEntriesView from "./components/CgEntriesView"
import AjustesContabeisView from "./components/AjustesContabeisView"
import DataImportView from "./components/DataImportView"
import AccountingEntriesView from "./components/AccountingEntriesView"
import MonthlyBalancesView from "./components/MonthlyBalancesView"
import DataQueryView from "./components/DataQueryView"
import CostCenterView from "./components/CostCenterView"
import AccountCostCenterMappingView from "./components/AccountCostCenterMappingView"
import DreChartOfAccountsView from "./components/DreChartOfAccountsView"
import ChartOfAccountsView from "./components/ChartOfAccountsView"
import BalanceSheetChartOfAccountsView from "./components/BalanceSheetChartOfAccountsView"
import CompaniesView from "./components/CompaniesView"
import BrandsView from "./components/BrandsView"
import EconomicGroupsView from "./components/EconomicGroupsView"
import BenchmarkManagementView from "./components/BenchmarkManagementView"
import ReportTemplatesView from "./components/ReportTemplatesView"
import ReportStructureView from "./components/ReportStructureView"
import ManagementView from "./components/ManagementView"
import Toolbar from "./components/Toolbar"
import FinancialTable from "./components/FinancialTable"
import ClosingModuleView from "./components/ClosingModuleView"
import ClosingLockView from "./components/ClosingLockView"
import OperationalIndicatorsView from "./components/OperationalIndicatorsView"
import OperationalDataEntryView from "./components/OperationalDataEntryView"
import OperationalFormulasView from "./components/OperationalFormulasView"
import Tabs from "./components/Tabs"
import BudgetAssumptionsView from "./components/BudgetAssumptionsView"
import { generateUUID } from "./utils/helpers"
import BudgetValuesView from "./components/BudgetValuesView"
import BudgetView from "./components/BudgetView"
import BudgetWizardView from "./components/BudgetWizardView"
import OrganizationalStructureView from "./components/OrganizationalStructureView"
import ParametrosApuracaoView from "./components/ParametrosApuracaoView"
import BalanceSheetView from "./components/BalanceSheetView"

// Utils
import {
  adminDeleteUser,
  saveCadastroTenant,
  getCadastroTenant,
  getAuditEntries,
  getDreAggregatedData,
  deleteById,
  createNewUser,
  updateExistingUser,
} from "./utils/db"
import { supabase } from "./utils/supabaseClient"
import { useDreCalculation } from "./components/useDreCalculation"
import { CALENDAR_MONTHS } from "./constants"
import { applyThemeToDocument } from "./utils/theme"
import { getConsoleConfig, applyConsoleTheme, applyThemeFromCache } from "./utils/console-config"
import { useAppData } from "./hooks/useAppData"
import useBudgetCalculation from "./hooks/useBudgetCalculation"
import { useUnmappedAccounts } from "./hooks/useUnmappedAccounts"
import { getSubdomainFromUrl, isAdminConsole } from "./utils/tenant"

// Aplicar tema do cache imediatamente (antes do primeiro render)
if (typeof window !== 'undefined') {
  applyThemeFromCache()
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [currentView, setCurrentView] = useState<View>("DRE")
  const [currentReportId, setCurrentReportId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [supportContext, setSupportContext] = useState<"IT" | "CONTROLLERSHIP" | null>(null)
  const [supportTicketId, setSupportTicketId] = useState<string | null>(null)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false)
  const [isLucaOpen, setIsLucaOpen] = useState(false)
  const [selectedEconomicGroupId, setSelectedEconomicGroupId] = useState<string | null>(null)
  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(null)
  const [isOnAdminConsole, setIsOnAdminConsole] = useState(false)
  const [availableTenants, setAvailableTenants] = useState<EconomicGroup[]>([])
  const [splashVideoUrl, setSplashVideoUrl] = useState<string | null>(null)
  const [showPostLoginSplash, setShowPostLoginSplash] = useState(false)
  const [splashTimerComplete, setSplashTimerComplete] = useState(false)
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])

  // Carrega todos os tenants disponíveis na inicialização (independente de login)
  useEffect(() => {
    const loadAvailableTenants = async () => {
      try {
        console.log("[v0] Loading available tenants...")
        const { data, error } = await supabase
          .from("organizacoes")
          .select("*")
        
        console.log("[v0] Available tenants query result:", { count: data?.length, error: error?.message })
        
        if (data && !error) {
          const mapped = data.map((org: any) => ({
            id: org.id,
            name: org.nome,
            subdomain: org.subdomain,
            logo: org.logo,
            status: org.status,
          })) as EconomicGroup[]
          console.log("[v0] Available tenants mapped:", mapped.map(t => ({ id: t.id, name: t.name, subdomain: t.subdomain })))
          setAvailableTenants(mapped)
        }
      } catch (e) {
        console.error("[v0] Error loading available tenants:", e)
      }
    }
    loadAvailableTenants()
  }, [])

  // Carrega e aplica o tema do console na inicialização
  useEffect(() => {
    const loadAndApplyTheme = async () => {
      try {
        const config = await getConsoleConfig()
        applyConsoleTheme(config)
        // Armazena a URL do splash video para uso após login
        if (config.splashVideoUrl) {
          setSplashVideoUrl(config.splashVideoUrl)
          console.log("[v0] Splash video URL loaded:", config.splashVideoUrl)
        }
      } catch (e) {
        console.error("[v0] Error loading console theme:", e)
      }
    }
    loadAndApplyTheme()
  }, [])

  // Ativa o splash após o login bem-sucedido
  useEffect(() => {
    if (user && splashVideoUrl && !splashTimerComplete) {
      console.log("[v0] Activating post-login splash screen")
      setShowPostLoginSplash(true)
      // Timer para fechar o splash após 3 segundos
      const timer = setTimeout(() => {
        console.log("[v0] Post-login splash timer complete")
        setSplashTimerComplete(true)
        setShowPostLoginSplash(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [user, splashVideoUrl, splashTimerComplete])

  // Seleciona tenant baseado na URL ou localStorage quando os tenants estão disponíveis
  // Este efeito também roda quando o user muda para re-avaliar o tenant após login
  useEffect(() => {
    console.log("[v0] Tenant auto-select check:", { 
      availableTenantsCount: availableTenants.length, 
      selectedEconomicGroupId,
      hasUser: !!user,
      url: typeof window !== 'undefined' ? window.location.search : 'N/A'
    })
    
    if (availableTenants.length === 0) return
    
    // Verifica se já temos um tenant selecionado
    if (selectedEconomicGroupId) return

    // Tenta pegar do parâmetro de URL primeiro
    const urlParams = new URLSearchParams(window.location.search)
    const tenantParam = urlParams.get("tenant")
    
    // Ou do localStorage
    const savedSubdomain = localStorage.getItem("dev_tenant_subdomain")
    const subdomain = tenantParam || savedSubdomain

    console.log("[v0] Tenant subdomain detection:", { tenantParam, savedSubdomain, subdomain })

    if (subdomain) {
      const tenant = availableTenants.find(
        t => t.subdomain?.toLowerCase() === subdomain.toLowerCase()
      )
      if (tenant) {
        console.log("[v0] Auto-selecting tenant from URL/localStorage:", { subdomain, tenantId: tenant.id })
        setSelectedEconomicGroupId(tenant.id)
      } else {
        console.log("[v0] Tenant not found for subdomain:", subdomain, "Available:", availableTenants.map(t => t.subdomain))
      }
    }
  }, [availableTenants, selectedEconomicGroupId, user])

  // Determina o tenantId efetivo para carregar dados:
  // 1. SUPER_ADMINs: usam o tenant selecionado
  // 2. Usuários normais: usam seu tenantId próprio
  // 3. Antes do login: se há tenant selecionado, usa-o (para pré-carregar dados)
  const effectiveTenantId = user 
    ? (user.role === "SUPER_ADMIN" ? selectedEconomicGroupId : user.tenantId)
    : selectedEconomicGroupId

  const {
    users,
    setUsers,
    economicGroups,
    setEconomicGroups,
    brands,
    setBrands,
    companies,
    setCompanies,
    departments,
    setDepartments,
    reportTemplates,
    setReportTemplates,
    adjustments,
    setAdjustments,
    accountingAccounts,
    setAccountingAccounts,
    dreAccounts,
    setDreAccounts,
    balanceSheetAccounts,
    setBalanceSheetAccounts,
    costCenters,
    setCostCenters,
    mappings,
    setMappings,
    reportLines,
    setReportLines,
    budgetAssumptions,
    setBudgetAssumptions,
    budgetAssumptionValues,
    setBudgetAssumptionValues,
    budgetMappings,
    setBudgetMappings,
    operationalIndicators,
    monthlyBalances,
    unreadNotifications,
    isLoadingData,
  } = useAppData(user, effectiveTenantId)

  const { count: drePendingCount } = useUnmappedAccounts(accountingAccounts, mappings, "RESULT")
  const { count: bsPendingCount } = useUnmappedAccounts(accountingAccounts, mappings, "BALANCE")

  const [realizedEntries, setRealizedEntries] = useState<any[]>([])
  const [isLoadingDreData, setIsLoadingDreData] = useState(false)
  const currentYear = new Date().getFullYear()
  const [selectedPeriod, setSelectedPeriod] = useState<{ years: number[]; months: string[] }>({
    years: [currentYear],
    months: CALENDAR_MONTHS,
  })
  const [currentBrand, setCurrentBrand] = useState("Todas as Marcas")
  const [currentStore, setCurrentStore] = useState("Consolidado")
  const [activeTab, setActiveTab] = useState("")
  
  // Calculate store options based on selected brand
  const storeOptionsForBrand = useMemo(() => {
    const options: { label: string; value: string }[] = [{ label: "Consolidado", value: "Consolidado" }]
    
    if (currentBrand === "Todas as Marcas") {
      // Show all companies when "Todas as Marcas" is selected
      companies.forEach(c => {
        options.push({ label: c.nickname || c.name, value: c.id })
      })
    } else {
      // Find the brand by name and filter companies by brandId
      const selectedBrandObj = brands.find(b => b.name === currentBrand)
      if (selectedBrandObj) {
        companies
          .filter(c => c.brandId === selectedBrandObj.id)
          .forEach(c => {
            options.push({ label: c.nickname || c.name, value: c.id })
          })
      }
    }
    
    return options
  }, [currentBrand, brands, companies])
  
  // Get company IDs for the selected brand (for filtering data)
  const companyIdsForBrand = useMemo(() => {
    if (currentBrand === "Todas as Marcas") return null
    
    const selectedBrandObj = brands.find(b => b.name === currentBrand)
    if (!selectedBrandObj) return null
    
    return companies.filter(c => c.brandId === selectedBrandObj.id).map(c => c.id)
  }, [currentBrand, brands, companies])
  
  // Reset store to Consolidado when brand changes
  useEffect(() => {
    setCurrentStore("Consolidado")
  }, [currentBrand])
  const [isBudgetMode, setIsBudgetMode] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showVertical, setShowVertical] = useState(false)
  const [showHorizontal, setShowHorizontal] = useState(false)
  const [showBenchmark, setShowBenchmark] = useState(false)

  const [financialData, setFinancialData] = useState<FinancialAccount[]>([])
  const { calculateDynamicReport } = useDreCalculation()
  
  const memoizedBudgetMappings = useMemo(() => budgetMappings.map(m => ({
    id: m.id,
    premissaId: m.premissaId,
    tipoDestino: m.tipoDestino,
    contaDreId: m.contaDreId,
    indicadorId: m.indicadorId,
    departamentoId: m.departamentoId,
    fatorMultiplicador: m.fatorMultiplicador,
    tipoCalculo: m.tipoCalculo as 'direto' | 'formula' | 'percentual',
    formula: m.formula,
  })), [budgetMappings])

  const memoizedMonthlyBalances = useMemo(() => monthlyBalances.filter(b => b.id && b.conta_contabil_id).map(b => ({
    id: b.id!,
    empresaId: b.empresa_id,
    contaContabilId: b.conta_contabil_id!,
    ano: b.ano,
    mes: b.mes,
    valor: b.valor,
  })), [monthlyBalances])

  const memoizedAccountMappings = useMemo(() => mappings.filter(m => m.dreAccountId).map(m => ({
    contaContabilId: m.idconta || m.contaContabilId || '',
    contaDreId: m.dreAccountId!,
  })), [mappings])

  const memoizedReportLines = useMemo(() => reportLines.map(line => ({
    id: line.id,
    type: line.type,
    operationalFormulaId: line.operationalFormulaId,
  })), [reportLines])

  const { applyBudgetToAccounts } = useBudgetCalculation({
    dreAccounts,
    assumptions: budgetAssumptions,
    assumptionValues: budgetAssumptionValues,
    budgetMappings: memoizedBudgetMappings,
    auxiliaryPremises: [],
    monthlyBalances: memoizedMonthlyBalances,
    selectedYear: selectedPeriod.years[0] || new Date().getFullYear(),
    selectedMonths: selectedPeriod.months,
    selectedCompanyId: currentStore !== "Consolidado" ? currentStore : undefined,
    selectedDepartment: activeTab || undefined,
    accountMappings: memoizedAccountMappings,
    reportLines: memoizedReportLines,
  })

  useEffect(() => {
    const subdomain = getSubdomainFromUrl()
    setCurrentSubdomain(subdomain)

    const adminConsole = isAdminConsole()
    setIsOnAdminConsole(adminConsole)

    console.log("[v0] Domain detection:", {
      hostname: typeof window !== "undefined" ? window.location.hostname : "",
      subdomain,
      isAdminConsole: adminConsole,
    })
  }, [])

  useEffect(() => {
    if (economicGroups.length > 0) applyThemeToDocument(economicGroups[0])
  }, [economicGroups])
  useEffect(() => {
    if (departments.length > 0 && !activeTab) setActiveTab(departments[0].name)
  }, [departments])

  // Load DRE data when mappings are available
  const mappingsLength = mappings.length
  useEffect(() => {
    const loadDreData = async () => {
      if (!effectiveTenantId || selectedPeriod.years.length === 0 || mappingsLength === 0) return
      try {
        setIsLoadingDreData(true)
        console.log("[v0] Loading DRE data with mappings:", { 
          years: selectedPeriod.years, 
          mappingsCount: mappingsLength 
        })
        const dreData = await getDreAggregatedData(selectedPeriod.years, effectiveTenantId, mappings)
        console.log("[v0] DRE data loaded:", { count: dreData.length })
        setRealizedEntries(dreData)
      } catch (e) {
        console.error("Error loading DRE data:", e)
      } finally {
        setIsLoadingDreData(false)
      }
    }
    loadDreData()
  }, [selectedPeriod.years, effectiveTenantId, mappingsLength])

  useEffect(() => {
    const loadBenchmarks = async () => {
      if (!effectiveTenantId) return
      try {
        const data = await getCadastroTenant("benchmarks", effectiveTenantId)
        setBenchmarks(data || [])
      } catch (e) {
        console.error("Error loading benchmarks:", e)
      }
    }
    loadBenchmarks()
  }, [effectiveTenantId])

  useEffect(() => {
    if (!reportTemplates.length || !reportLines.length || !selectedPeriod.years.length) return
    
    const dreTemplate = reportTemplates.find(t => t.type === 'DRE' || t.description?.toUpperCase().includes('DRE'))
    if (!dreTemplate) return
    
    const dreLines = reportLines.filter(l => l.reportId === dreTemplate.id)
    if (dreLines.length === 0) return
    
    // Find the department ID from the activeTab name
    // Then get all cost centers that belong to this department
    const selectedDepartment = departments.find(d => d.name === activeTab)
    const costCenterIdsForDepartment = selectedDepartment 
      ? costCenters.filter(cc => cc.departmentId === selectedDepartment.id).map(cc => cc.id)
      : null
    
    // Filter entries by brand if a specific brand is selected
    let filteredEntries = realizedEntries
    if (companyIdsForBrand && companyIdsForBrand.length > 0) {
      filteredEntries = realizedEntries.filter((entry: any) => 
        companyIdsForBrand.includes(entry.companyId)
      )
    }
    
    const result = calculateDynamicReport(
      dreTemplate,
      dreLines,
      filteredEntries,
      adjustments,
      [],
      [],
      selectedPeriod,
      currentStore,
      costCenterIdsForDepartment
    )
    const resultWithBudget = applyBudgetToAccounts(result)
    setFinancialData(resultWithBudget)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportTemplates, reportLines, realizedEntries, adjustments, selectedPeriod, currentStore, activeTab, departments, costCenters, calculateDynamicReport, currentBrand, brands, companies])

  useEffect(() => {
    console.log("[v0] Tenant data loading debug:", {
      userExists: !!user,
      userTenantId: user?.tenantId ?? null,
      selectedEconomicGroupId: selectedEconomicGroupId ?? null,
      effectiveTenantId: effectiveTenantId ?? null,
      availableTenantsCount: availableTenants.length,
      companiesLoaded: companies.length,
      brandsLoaded: brands.length,
      departmentsLoaded: departments.length,
      isLoadingData,
    })
  }, [user?.id, user?.tenantId, selectedEconomicGroupId, effectiveTenantId, availableTenants.length, companies.length, brands.length, departments.length, isLoadingData])

  useEffect(() => {
    console.log("[v0] User state changed:", {
      userSet: !!user,
      userId: user?.id,
      tenantId: user?.tenantId,
      role: user?.role,
    })
  }, [user])

  const handleLogin = async (email: string, pass: string) => {
    try {
      console.log("[v0] Login attempt:", { email })

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: pass })

      console.log("[v0] Auth result:", {
        success: !!authData?.user,
        error: authError?.message,
        userId: authData?.user?.id,
      })

      if (authError) {
        const errorMessages: Record<string, string> = {
          "Invalid login credentials": "E-mail ou senha incorretos",
          "Email not confirmed": "E-mail não confirmado. Verifique sua caixa de entrada.",
          "User not found": "Usuário não encontrado",
          "Invalid email or password": "E-mail ou senha inválidos",
          "Too many requests": "Muitas tentativas. Aguarde alguns minutos.",
        }
        const translatedMessage = errorMessages[authError.message] || authError.message
        return translatedMessage
      }
      if (!authData.user) return "Erro interno."

      console.log("[v0] Fetching user profile...")

      const profileResult = await supabase.from("usuarios").select("*").eq("id", authData.user.id).single()

      console.log("[v0] Profile result:", {
        success: !!profileResult.data,
        error: profileResult.error?.message,
        profile: profileResult.data ? { id: profileResult.data.id, perfil: profileResult.data.perfil } : null,
      })

      if (profileResult.error || !profileResult.data) {
        return "Usuário sem perfil configurado."
      }

      const p = profileResult.data

      const u: User = {
        id: p.id,
        name: p.nome,
        email: p.email,
        role: p.perfil,
        status: p.status,
        tenantId: p.organizacao_id,
        permissions: p.permissoes || {},
        supportDepartment: p.departamento_suporte,
      }

      console.log("[v0] Setting user:", { id: u.id, role: u.role, tenantId: u.tenantId })

      setUser(u)
      return u
    } catch (error) {
      console.error("[v0] Login error:", error)
      return "Erro inesperado."
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCurrentView("DRE")
  }

  const handleNavigate = (view: View, template?: ReportTemplate) => {
    setCurrentView(view)
    if (template) setCurrentReportId(template.id)
    else if (view === "DRE") setCurrentReportId(null)
  }

  const handleSaveUser = async (userData: User) => {
    if (!user?.tenantId) return

    try {
      const isNew = userData.id.startsWith("new_")

      if (isNew) {
        const result = await createNewUser(userData, user.tenantId)
        if (result) {
          setUsers((prev) => [...prev.filter((u) => u.id !== userData.id), result])
        }
      } else {
        const result = await updateExistingUser(userData, user.tenantId)
        if (result) {
          setUsers((prev) => prev.map((u) => (u.id === userData.id ? result : u)))
        }
      }
    } catch (error) {
      console.error("Erro ao salvar usuário:", error)
      throw error
    }
  }

  const handleNavigateToOrg = async (orgId: string) => {
    if (user?.role === "SUPER_ADMIN") {
      const targetGroup = economicGroups.find((g) => g.id === orgId)
      if (targetGroup) {
        setSelectedEconomicGroupId(orgId)
        applyThemeToDocument(targetGroup)
        setCurrentView("DRE")
      }
    }
  }

  const handleTenantChange = async (tenant: EconomicGroup) => {
    setSelectedEconomicGroupId(tenant.id)
    applyThemeToDocument(tenant)
    setCurrentView("DRE")
  }

  // Build analysis menu items dynamically from report templates
  const analysisChildren = useMemo(() => {
    const children: SidebarItem[] = []
    
    if (reportTemplates && reportTemplates.length > 0) {
      // Sort by orderIndex and filter active templates
      const sortedTemplates = [...reportTemplates]
        .filter(t => t.isActive)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      
      sortedTemplates.forEach(template => {
        const templateName = template.name || ''
        const templateType = template.type
        
        if (templateType === "DRE") {
          children.push({ id: "DRE", icon: BarChart3, label: templateName })
        } else if (templateType === "CASH_FLOW") {
          children.push({ id: "CASH_FLOW", icon: TrendingUp, label: templateName })
        } else if (templateType === "BALANCE_SHEET") {
          children.push({ id: "BALANCE_SHEET", icon: FileSpreadsheet, label: templateName })
        }
      })
    }
    
    // Always add Razão Contábil as it has its own dedicated functionality
    children.push({ id: "RAZAO_CONTABIL", icon: BookOpen, label: "Razão Contábil" })
    
    return children
  }, [reportTemplates])

  const tenantSidebarItems: SidebarItem[] = useMemo(
    () => [
      {
        id: "analises",
        icon: BarChart3,
        label: "Análises",
        children: analysisChildren,
      },
      {
        id: "orcamento",
        icon: ClipboardList,
        label: "Orçamento",
        children: [
          { id: "BUDGET_PLANNING", icon: Target, label: "Painel Orçamentário" },
          { id: "BUDGET_WIZARD", icon: Sparkles, label: "Assistente de Orçamento" },
          { id: "BUDGET_ASSUMPTIONS", icon: FileText, label: "Premissas" },
          { id: "BUDGET_IMPORT", icon: Database, label: "Dados do Orçamento" },
        ],
      },
      {
        id: "dados_contabeis",
        icon: Calculator,
        label: "Dados",
        children: [
          { id: "DATA_IMPORT", icon: FileInput, label: "Carregar Realizado" },
          { id: "MANAGEMENT_TRANSFERS", icon: ArrowRightLeft, label: "Transferências" },
          { id: "CG_ENTRIES", icon: TrendingUp, label: "Ajustes de Caixa" },
          { id: "ACCOUNTING_ADJUSTMENTS", icon: ArrowRightLeft, label: "Ajustes Contábeis" },
          { id: "QUERIES", icon: Database, label: "Auditoria Contábil" },
        ],
      },
      {
        id: "dados_operacionais",
        icon: Activity,
        label: "Operacional",
        children: [
          { id: "OPERATIONAL_INDICATORS", icon: Gauge, label: "Indicadores" },
          { id: "OPERATIONAL_DATA_ENTRY", icon: FileInput, label: "Preenchimento" },
          { id: "OPERATIONAL_FORMULAS", icon: Calculator, label: "Fórmulas" },
        ],
      },
      {
        id: "fechamento",
        icon: Lock,
        label: "Fechamento",
        children: [
          { id: "CLOSING_SCHEDULE", icon: Calendar, label: "Cronograma" },
          { id: "CLOSING_LOCK", icon: Lock, label: "Bloqueio de Período" },
        ],
      },
      {
        id: "administracao",
        icon: Building2,
        label: "Admin",
        children: [
          { id: "COMPANIES", icon: Building2, label: "Estrutura Organizacional" },
          { id: "COST_CENTERS", icon: Layers, label: "Parâmetros de Apuração" },
          { id: "REPORT_TEMPLATES", icon: FileSpreadsheet, label: "Modelos de Demonstrações" },
        ],
      },
      {
        id: "sistema",
        icon: Settings,
        label: "Sistema",
        children: [
          { id: "SYSTEM_SETTINGS", icon: Settings, label: "Aparência" },
          { id: "USER_MANAGEMENT", icon: Users, label: "Usuários", roles: ["ADMIN", "SUPER_ADMIN"] },
        ],
      },
      ...(user?.role === "SUPER_ADMIN" && isOnAdminConsole
        ? [{ id: "SuperAdmin", icon: Shield, label: "Gestão" }]
        : []),
      {
        id: "SUPPORT",
        icon: Headphones,
        label: "Suporte",
      },
      {
        id: "DOCUMENTATION",
        icon: GraduationCap,
        label: "Aprender",
        containerColor: "var(--color-learning-center, #7c3aed)",
      },
    ],
    [user?.role, analysisChildren, isOnAdminConsole]
  )

  const getPageTitle = (view: View): string => {
    const viewTitles: Record<string, string> = {
      DRE: "DRE",
      BALANCE_SHEET: "Balanço Patrimonial",
      CASH_FLOW: "Fluxo de Caixa",
      RAZAO_CONTABIL: "Razão Contábil",
      ECONOMIC_GROUPS: "Organizações",
      COMPANIES: "Estrutura Organizacional",
      COMPANIES_LIST: "Gerenciamento de Empresas",
      BRANDS: "Marcas",
      COST_CENTERS: "Parâmetros de Apuração",
      COST_CENTERS_LIST: "Centro de Resultado",
      BENCHMARK: "Definição de Benchmarks",
      BENCHMARKS: "Definição de Benchmarks",
      ACCOUNTING_ENTRIES: "Lançamentos",
      MONTHLY_BALANCES: "Saldos Mensais",
      ADJUSTMENTS: "Ajustes Contábeis",
      ACCOUNTING_ADJUSTMENTS: "Ajustes Contábeis",
      DATA_IMPORT: "Carregar Realizado",
      MANAGEMENT: "Visão Gerencial",
      ACCOUNT_COST_CENTER_MAPPING: "Mapeamento CC",
      CG_ENTRIES: "Ajustes de Caixa",
      TRANSFERS: "Transferências",
      MANAGEMENT_TRANSFERS: "Transferências",
      REPORT_TEMPLATES: "Modelos de Demonstrações",
      REPORT_STRUCTURE: "Editor de Estrutura",
      DRE_CHART_OF_ACCOUNTS: "Plano DRE",
      CHART_OF_ACCOUNTS: "Plano de Contas (Contábil)",
      BALANCE_SHEET_STRUCTURE: "Plano de Contas Patrimonial & Mapeamento",
      CLOSING_MODULE: "Cronograma de Fechamento",
      CLOSING_SCHEDULE: "Cronograma de Fechamento",
      CLOSING_LOCK: "Bloqueio de Período",
      SYSTEM_SETTINGS: "Aparência",
      USER_MANAGEMENT: "Usuários",
      DOCUMENTATION: "Documentação",
      SUPPORT: "Suporte",
      SuperAdmin: "Gestão do Sistema",
      BUDGET_PLANNING: "Painel Orçamentário",
      BUDGET_WIZARD: "Assistente de Orçamento",
      BUDGET_ASSUMPTIONS: "Premissas",
      BUDGET_IMPORT: "Dados do Orçamento",
      QUERIES: "Auditoria Contábil",
      OPERATIONAL_INDICATORS: "Indicadores Operacionais",
      OPERATIONAL_DATA_ENTRY: "Preenchimento de Dados",
      OPERATIONAL_FORMULAS: "Fórmulas Operacionais",
    }
    return viewTitles[view] || view
  }

  const renderMainContent = () => {
    if (user?.role === "SUPER_ADMIN" && currentView === "SuperAdmin") {
      return <SuperAdminView currentUser={user} onNavigateToOrg={handleNavigateToOrg} />
    }

    switch (currentView) {
      case "DRE":
      case "CASH_FLOW":
      case "DYNAMIC_REPORT":
        if (isLoadingDreData || isLoadingData) {
          return (
            <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
              <div className="flex flex-col items-center justify-center h-full gap-4">
                {splashVideoUrl ? (
                  <video
                    src={splashVideoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-64 h-64 object-contain"
                  />
                ) : (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]"></div>
                )}
                <p className="text-slate-500 text-sm">Carregando dados do relatório...</p>
              </div>
            </main>
          )
        }
        return (
          <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
            <div className="w-full flex flex-col h-full">
              <Toolbar
                storeOptions={storeOptionsForBrand}
                currentStore={currentStore}
                onStoreChange={setCurrentStore}
                brands={brands}
                currentBrand={currentBrand}
                onBrandChange={setCurrentBrand}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                isBudgetMode={isBudgetMode}
                onBudgetModeChange={setIsBudgetMode}
                showCalculationDetails={showDetails}
                onShowCalculationDetailsChange={setShowDetails}
                showVerticalAnalysis={showVertical}
                onShowVerticalAnalysisChange={setShowVertical}
                showHorizontalAnalysis={showHorizontal}
                onShowHorizontalAnalysisChange={setShowHorizontal}
                showBenchmark={showBenchmark}
                onShowBenchmarkChange={setShowBenchmark}
                isLoading={isLoadingData}
              />
              <div className="flex-grow overflow-auto bg-white">
                <FinancialTable
                  data={financialData}
                  onDataChange={() => {}}
                  isBudgetMode={isBudgetMode}
                  showCalculationDetails={showDetails}
                  showVerticalAnalysis={showVertical}
                  showHorizontalAnalysis={showHorizontal}
                  showBenchmark={showBenchmark}
                  benchmarks={benchmarks.filter(b => b.brandId === 'all' || brands.find(brand => brand.id === b.brandId && brand.name === currentBrand))}
                  activeTab={activeTab}
                  selectedPeriod={selectedPeriod}
                  userRole={user.role}
                />
              </div>
              <Tabs tabs={departments.map((d) => d.name)} activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
          </main>
        )
      case "BALANCE_SHEET":
        const balanceSheetTemplate = reportTemplates.find(t => t.type === 'BALANCE_SHEET')
        const balanceSheetLines = balanceSheetTemplate 
          ? reportLines.filter(l => l.reportId === balanceSheetTemplate.id)
          : []
        return (
          <BalanceSheetView
            brands={brands}
            companies={companies}
            reportTemplate={balanceSheetTemplate || null}
            reportLines={balanceSheetLines}
            accountMappings={mappings}
            monthlyBalances={monthlyBalances}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            isLoading={isLoadingData}
          />
        )
      case "SUPPORT":
        return (
          <SupportView user={user} users={users} defaultDepartment={supportContext} initialTicketId={supportTicketId} />
        )
      case "DOCUMENTATION":
        return <DocumentationView onNavigateBack={() => handleNavigate("DRE")} />
      case "USER_MANAGEMENT":
        return (
          <UserManagementView
            users={users}
            onNavigateBack={() => handleNavigate("MANAGEMENT")}
            onSaveUser={handleSaveUser}
            onDeleteUser={async (id) => {
              await adminDeleteUser(id)
              setUsers((prev) => prev.filter((u) => u.id !== id))
            }}
            economicGroups={economicGroups}
            brands={brands}
            companies={companies}
            departments={departments}
          />
        )
      case "BRANDS":
        return (
          <BrandsView
            brands={brands}
            economicGroups={economicGroups}
            onNavigateBack={() => handleNavigate("COMPANIES")}
            onSaveBrands={async (data) => {
              await saveCadastroTenant("brands", data, effectiveTenantId || user.tenantId)
            }}
            tenantId={effectiveTenantId || user.tenantId}
          />
        )
      case "COMPANIES":
        return (
          <OrganizationalStructureView
            onNavigateToCompanies={() => handleNavigate("COMPANIES_LIST")}
            onNavigateToBrands={() => handleNavigate("BRANDS")}
          />
        )
      case "COMPANIES_LIST":
        return (
          <CompaniesView
            companies={companies}
            brands={brands}
            onNavigateBack={() => handleNavigate("COMPANIES")}
            onSaveCompanies={async (data) => {
              await saveCadastroTenant("companies", data, effectiveTenantId || user.tenantId)
            }}
            tenantId={effectiveTenantId || user.tenantId}
          />
        )
      case "COST_CENTERS":
        return (
          <ParametrosApuracaoView
            onNavigateToCostCenters={() => handleNavigate("COST_CENTERS_LIST")}
            onNavigateToDreChartOfAccounts={() => handleNavigate("DRE_CHART_OF_ACCOUNTS")}
            onNavigateToAccountMapping={() => handleNavigate("ACCOUNT_COST_CENTER_MAPPING")}
            onNavigateToBenchmarks={() => handleNavigate("BENCHMARKS")}
            onNavigateToChartOfAccounts={() => handleNavigate("CHART_OF_ACCOUNTS")}
            onNavigateToBalanceSheetAccounts={() => handleNavigate("BALANCE_SHEET_STRUCTURE")}
          />
        )
      case "CHART_OF_ACCOUNTS":
        return (
          <ChartOfAccountsView
            accounts={accountingAccounts}
            onNavigateBack={() => handleNavigate("COST_CENTERS")}
            onImportAccounts={async (rawData) => {
              const tenantToUse = effectiveTenantId || user.tenantId
              const dbData = rawData.map((row) => ({
                codigo_contabil: row.codigo_contabil || "",
                nome: row.nome || "",
                tipo: row.tipo || "",
                natureza: row.natureza || "",
                organizacao_id: tenantToUse,
              }))
              await saveCadastroTenant("chart_of_accounts", dbData, tenantToUse)
              const freshData = await getCadastroTenant("chart_of_accounts", tenantToUse)
              setAccountingAccounts(freshData.map((a: any) => ({
                id: a.id,
                reducedCode: a.codigo_contabil || "",
                name: a.nome || "",
                accountType: a.tipo || "",
                nature: a.natureza || "",
                monthlyData: {},
              })))
            }}
          />
        )
      case "BALANCE_SHEET_STRUCTURE":
        return (
          <BalanceSheetChartOfAccountsView
            accounts={balanceSheetAccounts}
            accountingAccounts={accountingAccounts}
            currentMappings={mappings}
            onNavigateBack={() => handleNavigate("COST_CENTERS")}
            onSave={async (d) => {
              await saveCadastroTenant("plano_contas_balanco", d, effectiveTenantId || user.tenantId)
              setBalanceSheetAccounts(d)
            }}
            onSaveMappings={async (d) => {
              await saveCadastroTenant("account_cost_center_mapping", d, effectiveTenantId || user.tenantId)
              // Merge new mappings with existing ones, replacing by idconta
              setMappings(prev => {
                const updatedIds = new Set(d.map((m: any) => m.idconta))
                const kept = prev.filter(m => !updatedIds.has(m.idconta))
                return [...kept, ...d]
              })
            }}
            onDeleteAccount={async (id) => {
              await deleteById("plano_contas_balanco", id)
              setBalanceSheetAccounts((prev) => prev.filter((a) => a.id !== id))
            }}
            onDeleteMappings={async () => {}}
            onUnmapAccounts={async () => {}}
            onRename={async () => {}}
            onUploadClick={() => {}}
          />
        )
      case "COST_CENTERS_LIST":
        return (
          <CostCenterView
            costCenters={costCenters}
            departments={departments}
            onNavigateBack={() => handleNavigate("COST_CENTERS")}
            onSaveCostCenters={async (d) => {
              await saveCadastroTenant("cost_centers", d, effectiveTenantId || user.tenantId)
            }}
            onSaveDepartments={async (d) => {
              await saveCadastroTenant("departments", d, effectiveTenantId || user.tenantId)
            }}
            onDeleteCostCenter={async (id) => {
              await deleteById("cost_centers", id)
            }}
            onDeleteDepartment={async (id) => {
              await deleteById("departments", id)
            }}
            tenantId={effectiveTenantId || user.tenantId}
          />
        )
      case "DRE_CHART_OF_ACCOUNTS":
        return (
          <DreChartOfAccountsView
            accounts={dreAccounts}
            accountingAccounts={accountingAccounts}
            currentMappings={mappings}
            onNavigateBack={() => handleNavigate("COST_CENTERS")}
            onSave={async (d) => {
              await saveCadastroTenant("plano_contas_dre", d, effectiveTenantId || user.tenantId)
            }}
            onSaveMappings={async (d) => {
              await saveCadastroTenant("account_cost_center_mapping", d, effectiveTenantId || user.tenantId)
              setMappings(prev => {
                const updatedIds = new Set(d.map((m: any) => m.idconta))
                const kept = prev.filter(m => !updatedIds.has(m.idconta))
                return [...kept, ...d]
              })
            }}
            onDeleteAccount={async (id) => {
              await deleteById("plano_contas_dre", id)
            }}
            onDeleteMappings={async (dreAccountName: string) => {
              const mappingsToDelete = mappings.filter(m => m.contasintetica?.trim() === dreAccountName.trim())
              for (const m of mappingsToDelete) {
                await deleteById("account_cost_center_mapping", m.id)
              }
              setMappings(prev => prev.filter(m => m.contasintetica?.trim() !== dreAccountName.trim()))
            }}
            onUnmapAccounts={async (ids: string[]) => {
              const mappingsToDelete = mappings.filter(m => ids.includes(m.idconta))
              for (const m of mappingsToDelete) {
                await deleteById("account_cost_center_mapping", m.id)
              }
              setMappings(prev => prev.filter(m => !ids.includes(m.idconta)))
            }}
            onRename={async (oldName: string, newName: string) => {
              const affectedMappings = mappings.filter(m => m.contasintetica?.trim() === oldName.trim())
              for (const m of affectedMappings) {
                await saveCadastroTenant("account_cost_center_mapping", [{ ...m, contasintetica: newName }], effectiveTenantId || user.tenantId)
              }
              setMappings(prev => prev.map(m => 
                m.contasintetica?.trim() === oldName.trim() ? { ...m, contasintetica: newName } : m
              ))
            }}
            onUploadClick={() => {}}
            tenantId={effectiveTenantId || user.tenantId}
          />
        )
      case "ACCOUNT_COST_CENTER_MAPPING":
        return (
          <AccountCostCenterMappingView
            mappings={mappings}
            chartOfAccounts={accountingAccounts}
            dreAccounts={dreAccounts}
            dreDepartmentOptions={departments.map((d) => d.name)}
            costCenters={costCenters}
            onNavigateBack={() => handleNavigate("COST_CENTERS")}
            onSaveMappings={async (d) => {
              await saveCadastroTenant("account_cost_center_mapping", d, effectiveTenantId || user.tenantId)
            }}
            tenantId={effectiveTenantId || user.tenantId}
          />
        )
      case "ECONOMIC_GROUPS":
        return (
          <EconomicGroupsView
            economicGroups={economicGroups}
            onNavigateBack={() => handleNavigate("MANAGEMENT_STRUCTURE")}
            onSaveEconomicGroups={async (data) => {
              await saveCadastroTenant("economicgroups", data, effectiveTenantId || user.tenantId)
            }}
            tenantId={effectiveTenantId || user.tenantId}
          />
        )
      case "SYSTEM_SETTINGS":
        return (
          <SystemSettingsView
            economicGroups={economicGroups}
            onNavigateBack={() => handleNavigate("MANAGEMENT")}
            onSaveEconomicGroups={async (data) => {
              await saveCadastroTenant("economicgroups", data, effectiveTenantId || user.tenantId)
            }}
          />
        )
      case "DATA_IMPORT":
        return (
          <DataImportView 
            onNavigateBack={() => handleNavigate("MANAGEMENT_DATA")} 
            tenantId={effectiveTenantId || user.tenantId}
            onNavigateToAccountingEntries={() => handleNavigate("ACCOUNTING_ENTRIES")}
            onNavigateToMonthlyBalances={() => handleNavigate("MONTHLY_BALANCES")}
          />
        )
      case "ACCOUNTING_ENTRIES":
        return (
          <AccountingEntriesView onNavigateBack={() => handleNavigate("MANAGEMENT_DATA")} tenantId={effectiveTenantId || user.tenantId} />
        )
      case "MONTHLY_BALANCES":
        return <MonthlyBalancesView onNavigateBack={() => handleNavigate("MANAGEMENT_DATA")} tenantId={effectiveTenantId || user.tenantId} />
      case "RAZAO_CONTABIL":
        return <DataQueryView onNavigateBack={() => handleNavigate("DRE")} tenantId={effectiveTenantId || user.tenantId} />
      case "ADJUSTMENTS":
        return (
          <AjustesContabeisView
            onNavigateBack={() => handleNavigate("MANAGEMENT_DATA")}
            tenantId={effectiveTenantId || user.tenantId}
            adjustments={adjustments}
          />
        )
      case "CLOSING_MODULE":
        return (
          <ClosingModuleView onNavigateBack={() => handleNavigate("MANAGEMENT")} tenantId={effectiveTenantId || user.tenantId} user={user} />
        )
      case "CLOSING_LOCK":
        return <ClosingLockView onNavigateBack={() => handleNavigate("MANAGEMENT")} tenantId={effectiveTenantId || user.tenantId} user={user} economicGroup={economicGroups[0]} />
      case "OPERATIONAL_INDICATORS":
        return <OperationalIndicatorsView tenantId={effectiveTenantId || user.tenantId} />
      case "OPERATIONAL_DATA_ENTRY":
        return <OperationalDataEntryView tenantId={effectiveTenantId || user.tenantId} />
      case "OPERATIONAL_FORMULAS":
        return <OperationalFormulasView tenantId={effectiveTenantId || user.tenantId} />
      case "REPORT_TEMPLATES":
        return (
          <ReportTemplatesView
            templates={reportTemplates}
            onNavigateBack={() => handleNavigate("MANAGEMENT_REPORTS")}
            onSaveTemplates={async (d) => {
              await saveCadastroTenant("report_templates", d, effectiveTenantId || user?.tenantId || '')
            }}
            onDeleteTemplate={async (id) => {
              await deleteById("report_templates", id)
            }}
            onEditStructure={(template) => {
              setCurrentReportId(template.id)
              handleNavigate("REPORT_STRUCTURE")
            }}
            tenantId={effectiveTenantId || user?.tenantId || ''}
          />
        )
      case "REPORT_STRUCTURE":
        const currentTemplate = reportTemplates.find(t => t.id === currentReportId)
        if (currentReportId && currentTemplate) {
          return (
            <ReportStructureView
              reportTemplate={currentTemplate}
              lines={reportLines.filter((l) => l.reportId === currentReportId)}
              dreAccounts={dreAccounts}
              balanceSheetAccounts={balanceSheetAccounts}
              tenantId={effectiveTenantId || user.tenantId}
              onNavigateBack={() => handleNavigate("REPORT_TEMPLATES")}
              onSaveStructure={async (d) => {
                await saveCadastroTenant("report_lines", d, effectiveTenantId || user.tenantId)
              }}
              onDeleteLine={async (id) => {
                await deleteById("report_lines", id)
              }}
            />
          )
        }
        break
      case "BENCHMARK":
      case "BENCHMARKS":
        return (
          <BenchmarkManagementView
            benchmarks={benchmarks}
            onSaveBenchmarks={async (data) => {
              await saveCadastroTenant("benchmarks", data, effectiveTenantId || user.tenantId)
              setBenchmarks(data)
            }}
            onNavigateBack={() => handleNavigate("COST_CENTERS")}
            brands={brands}
            departments={departments}
            reportLines={reportLines}
            reportTemplates={reportTemplates}
          />
        )
      case "MANAGEMENT":
        return (
          <ManagementView
            onNavigate={handleNavigate}
            user={user}
            drePendingCount={drePendingCount}
            bsPendingCount={bsPendingCount}
          />
        )
      case "CG_ENTRIES":
        return <CgEntriesView onNavigateBack={() => handleNavigate("MANAGEMENT_DATA")} tenantId={effectiveTenantId || user.tenantId} />
      case "TRANSFERS":
      case "MANAGEMENT_TRANSFERS":
        return (
          <ManagementTransfersView onNavigateBack={() => handleNavigate("MANAGEMENT_DATA")} tenantId={effectiveTenantId || user.tenantId} />
        )
      case "ACCOUNTING_ADJUSTMENTS":
        return (
          <AjustesContabeisView
            onNavigateBack={() => handleNavigate("MANAGEMENT_DATA")}
            tenantId={effectiveTenantId || user.tenantId}
            adjustments={adjustments}
          />
        )
      case "QUERIES":
        return <DataQueryView mode="monitor" onNavigateBack={() => handleNavigate("MANAGEMENT_DATA")} tenantId={effectiveTenantId || user.tenantId} />
      case "CLOSING_SCHEDULE":
        return (
          <ClosingModuleView onNavigateBack={() => handleNavigate("MANAGEMENT")} tenantId={effectiveTenantId || user.tenantId} user={user} />
        )
      case "BUDGET_PLANNING":
        return (
          <BudgetView
            onNavigateBack={() => handleNavigate("MANAGEMENT")}
            accounts={financialData}
            onDataChange={(accountId, year, month, field, value) => {
              setFinancialData(prev => prev.map(acc => 
                acc.id === accountId ? { ...acc, [field]: value } : acc
              ))
            }}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            activeTabContext={activeTab}
            brands={brands}
            currentBrand={currentBrand}
            onBrandChange={setCurrentBrand}
            storeOptions={storeOptionsForBrand}
            currentStore={currentStore}
            onStoreChange={setCurrentStore}
            reportTemplates={reportTemplates.filter(t => t.type === 'DRE' || t.name.includes('Base DRE'))}
            currentReportTemplateId={currentReportId}
            onReportTemplateChange={setCurrentReportId}
            isLoading={isLoadingData}
            showDetails={showDetails}
            onShowDetailsChange={setShowDetails}
            showVerticalAnalysis={showVertical}
            onShowVerticalAnalysisChange={setShowVertical}
            showHorizontalAnalysis={showHorizontal}
            onShowHorizontalAnalysisChange={setShowHorizontal}
            showBenchmark={showBenchmark}
            onShowBenchmarkChange={setShowBenchmark}
          />
        )
      case "BUDGET_ASSUMPTIONS":
        return (
          <BudgetAssumptionsView
            assumptions={budgetAssumptions}
            onSaveAssumptions={async (data) => {
              await saveCadastroTenant("budget_assumptions", data.map(a => ({
                id: a.id,
                nome: a.name,
                tipo: a.type,
                descricao: a.description,
              })), effectiveTenantId || user.tenantId)
              setBudgetAssumptions(data)
            }}
            onNavigateBack={() => handleNavigate("BUDGET_PLANNING")}
            formulas={[]}
            financialAccounts={accountingAccounts}
            availableDepartments={departments.map(d => d.name)}
            dreAccounts={dreAccounts}
            operationalIndicators={operationalIndicators}
            budgetMappings={budgetMappings}
            onSaveMapping={async (mapping) => {
              const tenantId = effectiveTenantId || user.tenantId
              await saveCadastroTenant("budget_mappings", [{
                id: mapping.id,
                premissa_id: mapping.premissaId,
                tipo_destino: mapping.tipoDestino,
                conta_dre_id: mapping.contaDreId,
                indicador_id: mapping.indicadorId,
                departamento_id: mapping.departamentoId,
                fator_multiplicador: mapping.fatorMultiplicador,
                tipo_calculo: mapping.tipoCalculo,
                formula: mapping.formula,
                ativo: mapping.ativo,
                organizacao_id: tenantId,
              }], tenantId)
              setBudgetMappings(prev => {
                const idx = prev.findIndex(m => m.id === mapping.id)
                if (idx >= 0) {
                  const updated = [...prev]
                  updated[idx] = mapping
                  return updated
                }
                return [...prev, mapping]
              })
            }}
            onDeleteMapping={async (id) => {
              await deleteById("mapeamento_premissa_dre", id)
              setBudgetMappings(prev => prev.filter(m => m.id !== id))
            }}
          />
        )
      case "BUDGET_IMPORT":
        return (
          <BudgetValuesView
            assumptions={budgetAssumptions}
            assumptionValues={budgetAssumptionValues}
            onSaveAssumptionValue={async (val) => {
              // Check if this value already exists in the database
              const existingValue = budgetAssumptionValues.find(v =>
                v.assumptionId === val.assumptionId &&
                v.store === val.store &&
                v.month === val.month &&
                v.year === val.year &&
                v.department === val.department
              )
              const recordId = existingValue?.id || generateUUID()
              
              await saveCadastroTenant("budget_values", [{
                id: recordId,
                premissa_id: val.assumptionId,
                empresa_id: val.store,
                departamento: val.department,
                ano: val.year,
                mes: val.month,
                valor: val.value,
              }], effectiveTenantId || user.tenantId)
              
              // Update local state
              setBudgetAssumptionValues(prev => {
                const idx = prev.findIndex(v =>
                  v.assumptionId === val.assumptionId &&
                  v.store === val.store &&
                  v.month === val.month &&
                  v.year === val.year &&
                  v.department === val.department
                )
                if (idx >= 0) {
                  const updated = [...prev]
                  updated[idx] = { ...updated[idx], value: val.value }
                  return updated
                }
                return [...prev, { ...val, id: recordId }]
              })
            }}
            onNavigateBack={() => handleNavigate("BUDGET_PLANNING")}
            availableBrands={brands}
            availableCompanies={companies}
            availableDepartments={departments.map(d => d.name)}
          />
        )
      case "BUDGET_WIZARD":
        return (
          <BudgetWizardView
            tenantId={effectiveTenantId || user.tenantId}
            onNavigateBack={() => handleNavigate("BUDGET_PLANNING")}
          />
        )
      default:
        return null
    }
  }

  if (isPasswordResetMode) return <PasswordReset onSuccess={handleLogout} />

  if (!user) {
    const tenantInfo =
      currentSubdomain && economicGroups.length > 0
        ? {
            name: economicGroups[0]?.name || currentSubdomain,
            logo: economicGroups[0]?.logo || null,
            subdomain: currentSubdomain,
          }
        : null

    return (
      <UnifiedLogin
        isConsole={isOnAdminConsole}
        onLogin={async (email, password) => {
          const result = await handleLogin(email, password)
          return result
        }}
        tenantInfo={tenantInfo}
      />
    )
  }

  // Mostra splash screen após login e antes de carregar o sistema
  if (showPostLoginSplash && splashVideoUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <video
          src={splashVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-64 h-64 object-contain"
          onError={() => {
            console.log("[v0] Post-login splash video failed to load")
            setSplashTimerComplete(true)
            setShowPostLoginSplash(false)
          }}
        />
      </div>
    )
  }

  // If SUPER_ADMIN on admin console, use SuperAdminDashboard
  // Otherwise (console SUPER_ADMIN in tenant mode or ADMIN/USER in tenant), use unified Sidebar+Header layout
  if (isOnAdminConsole && user?.role === "SUPER_ADMIN") {
    return <SuperAdminDashboard currentUser={user} onLogout={handleLogout} />
  }

  const currentGroup = economicGroups.find((g) => g.id === selectedEconomicGroupId) || economicGroups[0]

  const tenantContextValue = {
    effectiveTenantId,
    selectedEconomicGroupId,
    setSelectedEconomicGroupId,
    availableTenants,
    currentSubdomain,
  }

  return (
    <TenantProvider value={tenantContextValue}>
      <UnifiedLayout
        sidebarItems={tenantSidebarItems}
        activeView={currentView}
        onNavigate={(viewId) => handleNavigate(viewId as View)}
        onLogout={handleLogout}
        logo={currentGroup?.logo}
        companyName={currentGroup?.name || "AutoController"}
        primaryColor="#1e3a5f"
        secondaryColor="#3b82f6"
        userRole={user.role}
        userName={user.name}
        breadcrumbPrefix={currentGroup?.name || "AutoController"}
        currentPageTitle={getPageTitle(currentView)}
        isLoading={isLoadingData}
        onNotifications={() => setIsNotificationOpen(true)}
        onHelp={() => {}}
      >
        {renderMainContent()}
      </UnifiedLayout>
    </TenantProvider>
  )
}

export default App
