"use client"

import { useState, useEffect } from "react"
import type {
  User,
  EconomicGroup,
  Brand,
  Company,
  Department,
  ReportTemplate,
  AdjustmentEntry,
  FinancialAccount,
  DreAccount,
  BalanceSheetAccount,
  CostCenter,
  AccountCostCenterMapping,
  ReportLine,
  BudgetAssumption,
  BudgetAssumptionValue,
  BudgetMapping,
  MonthlyBalanceEntry,
} from "../types"
import { getCadastroTenant, getUnreadNotificationCount } from "../utils/db"

const mergeInterfaceConfig = (group: any): EconomicGroup => {
  // O campo config_interface vem do banco como JSONB e é mapeado para interfaceConfig
  const config = group.interfaceConfig || group.config_interface || {}

  // Mapeia os campos do config_interface para os campos diretos do EconomicGroup
  return {
    ...group,
    // Garante que interfaceConfig existe
    interfaceConfig: config,
    // Cores do Sistema - prioriza valores diretos, depois config_interface
    primarycolor: group.primarycolor || config.primaryColor || config.primarycolor,
    secondarycolor: group.secondarycolor || config.secondaryColor || config.secondarycolor,
    backgroundColor: group.backgroundColor || config.backgroundColor,
    textColor: group.textColor || config.textColor,
    textSecondaryColor: group.textSecondaryColor || config.textSecondaryColor,
    // Layout - Sidebar
    sidebarColor: group.sidebarColor || config.sidebarColor,
    sidebarTextColor: group.sidebarTextColor || config.sidebarTextColor,
    sidebarSectionTitleColor: group.sidebarSectionTitleColor || config.sidebarSectionTitleColor,
    sidebarFooterBackgroundColor: group.sidebarFooterBackgroundColor || config.sidebarFooterBackgroundColor,
    sidebarFooterTextColor: group.sidebarFooterTextColor || config.sidebarFooterTextColor,
    // Layout - Header
    headerColor: group.headerColor || config.headerColor,
    headerTextColor: group.headerTextColor || config.headerTextColor,
    // Tabelas
    tableHeaderColor: group.tableHeaderColor || config.tableHeaderColor,
    tableHeaderTextColor: group.tableHeaderTextColor || config.tableHeaderTextColor,
    tableTotalColor: group.tableTotalColor || config.tableTotalColor,
    tableSubtotalColor: group.tableSubtotalColor || config.tableSubtotalColor,
    tableRowColor: group.tableRowColor || config.tableRowColor,
    // Login
    loginBackgroundImage: group.loginBackgroundImage || config.loginBackgroundImage,
    loginLogo: group.loginLogo || config.loginLogo,
    loginTitle: group.loginTitle || config.loginTitle,
    loginTitleColor: group.loginTitleColor || config.loginTitleColor,
    loginTitleFontSize: group.loginTitleFontSize || config.loginTitleFontSize,
    loginSubtitle: group.loginSubtitle || config.loginSubtitle,
    loginSubtitleColor: group.loginSubtitleColor || config.loginSubtitleColor,
    loginSubtitleFontSize: group.loginSubtitleFontSize || config.loginSubtitleFontSize,
    loginBackgroundOpacity: group.loginBackgroundOpacity ?? config.loginBackgroundOpacity ?? 0.5,
    // Outros
    font: group.font || config.font,
    borderradius: group.borderradius || config.borderRadius || config.borderradius,
    scrollbarColor: group.scrollbarColor || config.scrollbarColor,
    scrollbarWidth: group.scrollbarWidth || config.scrollbarWidth,
    scrollbarRadius: group.scrollbarRadius || config.scrollbarRadius,
    // Logo principal
    logo: group.logo || config.logo,
  }
}

export const useAppData = (user: User | null, effectiveTenantId?: string | null) => {
  const [users, setUsers] = useState<User[]>([])
  const [economicGroups, setEconomicGroups] = useState<EconomicGroup[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([])
  const [adjustments, setAdjustments] = useState<AdjustmentEntry[]>([])
  const [accountingAccounts, setAccountingAccounts] = useState<FinancialAccount[]>([])
  const [dreAccounts, setDreAccounts] = useState<DreAccount[]>([])
  const [balanceSheetAccounts, setBalanceSheetAccounts] = useState<BalanceSheetAccount[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [mappings, setMappings] = useState<AccountCostCenterMapping[]>([])
  const [reportLines, setReportLines] = useState<ReportLine[]>([])
  const [budgetAssumptions, setBudgetAssumptions] = useState<BudgetAssumption[]>([])
  const [budgetAssumptionValues, setBudgetAssumptionValues] = useState<BudgetAssumptionValue[]>([])
  const [budgetMappings, setBudgetMappings] = useState<BudgetMapping[]>([])
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalanceEntry[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [isLoadingData, setIsLoadingData] = useState(false)

  // O Tenant ID é a âncora de segurança de todo o carregamento
  // Para SUPER_ADMINs, usa o tenant selecionado (effectiveTenantId)
  // Para usuários normais, usa o tenantId do próprio usuário
  const tenantId = effectiveTenantId || user?.tenantId

  // 1. Carrega dados de Identidade (Grupo/Temas)
  useEffect(() => {
    const loadIdentity = async () => {
      if (!tenantId) return
      try {
        // Busca especificamente o grupo deste tenant
        const groups = await getCadastroTenant("economicgroups", tenantId)

        const merged = groups.map((g: any) => {
          // Mescla o config_interface do grupo econômico
          return mergeInterfaceConfig(g)
        })

        setEconomicGroups(merged)
      } catch (e) {
        console.error("Identity load failed", e)
      }
    }
    loadIdentity()
  }, [tenantId])

  // 2. Carrega Dados Transacionais e Cadastrais (Isolamento por Tenant)
  useEffect(() => {
    console.log("[v0] useAppData loadTenantData check:", { 
      hasUser: !!user, 
      userId: user?.id,
      tenantId,
      willLoad: !!user && !!tenantId
    })
    
    const loadTenantData = async () => {
      if (!user || !tenantId) {
        console.log("[v0] useAppData skipping load - missing user or tenantId")
        return
      }
      console.log("[v0] useAppData starting data load for tenant:", tenantId)
      setIsLoadingData(true)

      try {
        // Executa todas as buscas em paralelo, garantindo isolamento via tenantId
        const results = await Promise.allSettled([
          getCadastroTenant("users", tenantId),
          getCadastroTenant("brands", tenantId),
          getCadastroTenant("companies", tenantId),
          getCadastroTenant("departments", tenantId),
          getCadastroTenant("report_templates", tenantId),
          getCadastroTenant("adjustment_entries", tenantId),
          getCadastroTenant("chart_of_accounts", tenantId),
          getCadastroTenant("balance_sheet_accounts", tenantId),
          getCadastroTenant("cost_centers", tenantId),
          getCadastroTenant("account_cost_center_mapping", tenantId),
          getCadastroTenant("report_lines", tenantId),
          getCadastroTenant("plano_contas_dre", tenantId),
          getCadastroTenant("budget_assumptions", tenantId),
          getCadastroTenant("budget_values", tenantId),
          getCadastroTenant("saldos_mensais", tenantId),
          getCadastroTenant("budget_mappings", tenantId),
        ])

        const getVal = <T,>(idx: number): T[] =>
          results[idx].status === "fulfilled" ? (results[idx] as any).value : []

        setUsers(getVal(0))
        setBrands(getVal(1))
        setCompanies(getVal(2))
        setDepartments(getVal(3))
        setReportTemplates(getVal(4))
        setAdjustments(getVal(5))
        
        // Mapeia campos do banco para FinancialAccount
        const rawAccounts = getVal<any>(6)
        setAccountingAccounts(rawAccounts.map((a: any) => ({
          id: a.id,
          reducedCode: a.codigo_contabil || a.reducedCode || '',
          name: a.nome || a.name || '',
          accountType: a.tipo || a.accountType || '',
          nature: a.natureza || a.nature || '',
          monthlyData: a.monthlyData || {},
        })))
        
        const rawBalanceSheetAccounts = getVal<any>(7)
        setBalanceSheetAccounts(rawBalanceSheetAccounts)
        setCostCenters(getVal(8))
        
        // Process mappings with lookups to related tables
        const rawMappings = getVal<any>(9)
        const rawDreAccounts = getVal<any>(11)
        
        // Create lookup maps for efficient name resolution
        const dreAccountMap = new Map(rawDreAccounts.map((d: any) => [d.id, d.nome || d.name]))
        const accountingAccountMap = new Map(rawAccounts.map((a: any) => [a.id, { nome: a.nome || a.name, codigo: a.codigo_contabil || a.reducedCode }]))
        const balanceAccountMap = new Map(rawBalanceSheetAccounts.map((b: any) => [b.id, b.nome || b.name]))
        
        // Enrich mappings with looked-up names
        const enrichedMappings = rawMappings.map((m: any) => {
          const contaContabil = accountingAccountMap.get(m.accountingAccountId || m.conta_contabil_id)
          const dreName = dreAccountMap.get(m.dreAccountId || m.conta_dre_id)
          const balanceName = balanceAccountMap.get(m.balanceAccountId || m.conta_balanco_id)
          
          return {
            ...m,
            idconta: m.accountingAccountId || m.conta_contabil_id,
            contaContabilId: m.accountingAccountId || m.conta_contabil_id,
            contaBalancoId: m.balanceAccountId || m.conta_balanco_id,
            conta: contaContabil?.nome || '',
            codigoContabil: contaContabil?.codigo || '',
            contasintetica: dreName || balanceName || '',
            dreAccountName: dreName || '',
            balanceAccountName: balanceName || '',
          }
        })
        
        setMappings(enrichedMappings)
        setReportLines(getVal(10))
        setDreAccounts(rawDreAccounts)
        
        // Mapeia os dados do banco para os tipos TypeScript
        const rawAssumptions = getVal<any>(12)
        setBudgetAssumptions(rawAssumptions.map((a: any) => ({
          id: a.id,
          name: a.nome || a.name,
          type: a.tipo || a.type || 'number',
          description: a.descricao || a.description,
        })))
        
        const rawValues = getVal<any>(13)
        setBudgetAssumptionValues(rawValues.map((v: any) => ({
          id: v.id,
          assumptionId: v.premissa_id || v.assumptionId,
          store: v.empresa_id || v.store,
          department: v.departamento || v.department,
          year: v.ano || v.year,
          month: v.mes || v.month,
          value: v.valor || v.value || 0,
        })))

        const rawMonthlyBalances = getVal<any>(14)
        setMonthlyBalances(rawMonthlyBalances.map((b: any) => ({
          id: b.id,
          empresaId: b.empresa_id,
          contaContabilId: b.conta_contabil_id,
          ano: b.ano,
          mes: b.mes,
          valor: b.valor || 0,
          organizacaoId: b.organizacao_id,
        })))
        
        const rawBudgetMappings = getVal<any>(15)
        setBudgetMappings(rawBudgetMappings.map((m: any) => ({
          id: m.id,
          premissaId: m.premissa_id || m.premissaId,
          contaDreId: m.conta_dre_id || m.contaDreId,
          departamentoId: m.departamento_id || m.departamentoId,
          fatorMultiplicador: m.fator_multiplicador || m.fatorMultiplicador || 1,
          tipoCalculo: m.tipo_calculo || m.tipoCalculo || 'direto',
          formula: m.formula || '',
          descricao: m.descricao || '',
          ativo: m.ativo !== false,
        })))

        const unread = await getUnreadNotificationCount(user.id)
        setUnreadNotifications(unread)
      } catch (e) {
        console.error("Tenant data critical load error", e)
      } finally {
        setIsLoadingData(false)
      }
    }
    loadTenantData()
  }, [user, tenantId])

  return {
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
    monthlyBalances,
    setMonthlyBalances,
    unreadNotifications,
    setUnreadNotifications,
    isLoadingData,
  }
}
