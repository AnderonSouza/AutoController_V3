export interface MonthlyData {
  balancete: number
  transfGerencial?: number
  ajusteContabil?: number
  cgGerencial?: number
  cg?: number
  orcado: number
  orcadoPremissas?: number
  orcadoHistorico?: number
  orcadoManual?: number
  orcadoImportado?: number
}

export interface FinancialAccount {
  id: string
  name: string
  reducedCode?: string
  accountType?: string
  nature?: string
  isTotal?: boolean
  isSubTotal?: boolean
  operation?: "add" | "subtract"
  monthlyData: { [year: number]: { [month: string]: MonthlyData } }
  children?: FinancialAccount[]
  levelAdjustment?: number
  sourceAccounts?: string[]
  isVerticalAnalysisBase?: boolean
}

export interface LoginAnnouncement {
  enabled: boolean
  type: "info" | "warning" | "error" | "success"
  text: string
  linkEnabled: boolean
  linkText: string
  linkUrl: string
  startDate: string
  endDate: string
}

export interface EconomicGroup {
  id: string
  name: string
  logo?: string
  logoDark?: string
  lastClosedYear?: number
  lastClosedMonth?: number
  subdomain?: string
  loginAnnouncement?: LoginAnnouncement
  loginBackgroundUrl?: string
  loginBackgroundType?: "image" | "video"

  // Custom Login & Layout (Required by Login.tsx and SystemSettingsView.tsx)
  loginBackgroundImage?: string
  loginLogo?: string
  loginTitle?: string
  loginTitleColor?: string
  loginTitleFontSize?: string
  loginSubtitle?: string
  loginSubtitleColor?: string
  loginSubtitleFontSize?: string
  loginBackgroundOpacity?: number

  primarycolor?: string
  secondarycolor?: string
  sidebarColor?: string
  sidebarTextColor?: string
  sidebarSectionTitleColor?: string
  sidebarFooterBackgroundColor?: string
  sidebarFooterTextColor?: string
  headerColor?: string
  headerTextColor?: string
  backgroundColor?: string
  textColor?: string
  textSecondaryColor?: string
  tableHeaderColor?: string
  tableHeaderTextColor?: string
  tableTotalColor?: string
  tableSubtotalColor?: string
  tableRowColor?: string
  borderradius?: string
  scrollbarColor?: string
  scrollbarWidth?: string
  scrollbarRadius?: string

  interfaceConfig: {
    font?: string
    primaryColor?: string
    secondaryColor?: string
    sidebarColor?: string
    sidebarTextColor?: string
    sidebarSectionTitleColor?: string
    sidebarFooterBackgroundColor?: string
    sidebarFooterTextColor?: string
    headerColor?: string
    headerTextColor?: string
    backgroundColor?: string
    textColor?: string
    tableHeaderColor?: string
    tableHeaderTextColor?: string
    tableTotalColor?: string
    tableSubtotalColor?: string
    tableRowColor?: string
    loginBackgroundImage?: string
    loginLogo?: string
    loginTitle?: string
    loginTitleColor?: string
    loginTitleFontSize?: string
    loginSubtitle?: string
    loginSubtitleColor?: string
    loginSubtitleFontSize?: string
    loginBackgroundOpacity?: number
    scrollbarColor?: string
    scrollbarWidth?: string
    scrollbarRadius?: string
    borderRadius?: string

    // Sidebar Labels (Required by Sidebar.tsx)
    sidebar_title_financial?: string
    sidebar_title_budget?: string
    sidebar_budget_planning?: string
    sidebar_budget_planning_icon?: string
    sidebar_budget_assumptions?: string
    sidebar_budget_data?: string
    sidebar_title_entries?: string
    sidebar_import?: string
    sidebar_import_icon?: string
    sidebar_transfers?: string
    sidebar_transfers_icon?: string
    sidebar_cg?: string
    sidebar_cg_icon?: string
    sidebar_adjustments?: string
    sidebar_adjustments_icon?: string
    sidebar_queries?: string
    sidebar_queries_icon?: string
    sidebar_title_closing?: string
    sidebar_title_management?: string
    sidebar_structure_icon?: string
    sidebar_parameters_icon?: string
    sidebar_report_templates_icon?: string
    sidebar_title_system?: string
    sidebar_users?: string
    sidebar_users_icon?: string
    app_title?: string
  }
}

export interface Brand {
  id: string
  name: string
  economicGroupId: string
  logo?: string
}

export interface Company {
  id: string
  name: string
  nickname?: string
  cnpj?: string
  erpCode?: string
  brandId: string
  economicGroupId: string
  parentCompanyId?: string
}

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "Administrador"
  | "Gestor"
  | "Analista"
  | "Leitor"
  | "Suporte"
  | "Operacional"

export interface User {
  id: string
  name: string
  email: string
  password?: string
  role: UserRole
  status: "ativo" | "inativo"
  tenantId: string
  permissions: any
  supportDepartment?: TicketDepartment
}

export type View =
  | "DYNAMIC_REPORT"
  | "DRE"
  | "CASH_FLOW"
  | "RAZAO_CONTABIL"
  | "MANAGEMENT"
  | "MANAGEMENT_STRUCTURE"
  | "MANAGEMENT_PARAMETERS"
  | "CHART_OF_ACCOUNTS"
  | "COST_CENTERS"
  | "COST_CENTERS_LIST"
  | "ACCOUNT_COST_CENTER_MAPPING"
  | "ACCOUNTING_ENTRIES"
  | "MONTHLY_BALANCES"
  | "QUERIES"
  | "SYSTEM_SETTINGS"
  | "USER_PROFILE"
  | "COMPANIES"
  | "BRANDS"
  | "ECONOMIC_GROUPS"
  | "MANAGEMENT_TRANSFERS"
  | "DRE_CHART_OF_ACCOUNTS"
  | "BALANCE_SHEET_STRUCTURE"
  | "CG_ENTRIES"
  | "ACCOUNTING_ADJUSTMENTS"
  | "DATA_IMPORT"
  | "BUDGET_PLANNING"
  | "BUDGET_ASSUMPTIONS"
  | "BUDGET_DATA"
  | "BUDGET_DEFINITIONS"
  | "BUDGET_IMPORT"
  | "USER_MANAGEMENT"
  | "BENCHMARKS"
  | "REPORT_TEMPLATES"
  | "REPORT_STRUCTURE"
  | "DOCUMENTATION"
  | "SUPPORT"
  | "CLOSING_SCHEDULE"
  | "CLOSING_LOCK"
  | "SuperAdmin"

export interface ReportTemplate {
  id: string
  name: string
  description?: string
  type: "DRE" | "CASH_FLOW" | "BALANCE_SHEET" | "OTHER"
  isActive: boolean
  orderIndex?: number
  updatedAt?: string
  createdAt?: string
}

export interface ReportLine {
  id: string
  reportId: string
  parentId?: string | null
  name: string
  code?: string
  order: number
  type: "header" | "data_bucket" | "total" | "formula"
  sign: 1 | -1
  dreAccountId?: string
  formula?: string
  style?: any
}

export interface TrialBalanceEntry {
  id?: string
  companyId: string
  economicGroupId: string
  year: number
  month: string
  data: string
  idconta: string
  descricaoconta: string
  siglacr: string
  descricaocr: string
  natureza: "C" | "D"
  valor: number
  empresa?: string
  store?: string
  companyCnpj?: string
  companyErpCode?: string
  historico?: string
  contaContabilId?: string
  centroResultadoId?: string
}

export interface AdjustmentEntry {
  id: string
  transactionId: string
  economicGroupId: string
  year: number
  month: string
  description: string
  companyId: string
  department: string
  dreAccountName: string
  value: number
  targetReport?: "DRE" | "CASH_FLOW"
  provisionId?: string
  requiresReversal?: boolean
  createdAt?: string
}

export interface CgEntry extends AdjustmentEntry {}
export interface ManagementTransfer extends AdjustmentEntry {
  type: "origin" | "destination"
}

export interface Benchmark {
  id: string
  description: string
  type: "currency" | "percentage" | "number"
  dreAccountId: string
  brandId: string
  value: number
}

export interface BudgetAssumption {
  id: string
  name: string
  type: "number" | "percentage" | "currency"
  description?: string
}

export interface BudgetAssumptionValue {
  assumptionId: string
  store: string
  department: string
  year: number
  month: string
  value: number
}

export interface BudgetFormula {
  id: string
  dreAccountId: string
  department: string
  expression: string
  description?: string
}

export interface DreAccount {
  id: string
  name: string
  economicGroupId: string
}

export interface Department {
  id: string
  name: string
  economicGroupId: string
}

export interface CostCenter {
  id: string
  sigla: string
  descricao: string
  departmentId?: string
  departamento?: string
  economicGroupId: string
}

export interface AccountCostCenterMapping {
  id: string
  idconta: string
  conta: string
  contasintetica: string
  dreAccountId?: string
  economicGroupId: string
  isNew?: boolean
}

export interface BalanceSheetAccount {
  id: string
  name: string
}

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed"
export type TicketPriority = "low" | "medium" | "high"
export type TicketDepartment = "IT" | "CONTROLLERSHIP"

export interface Ticket {
  id: string
  userId: string
  userName: string
  department: TicketDepartment
  title: string
  status: TicketStatus
  priority: TicketPriority
  isArchived: boolean
  assignedTo?: string
  updatedAt: string
  createdAt: string
}

export interface TicketMessage {
  id: string
  ticketId: string
  userId: string
  userName: string
  content: string
  attachments?: string[]
  createdAt: string
}

export interface ClosingTask {
  id: string
  ciclo_id: string
  departmentId: string
  description: string
  demonstrativo: string
  status: string
  tempo_estimado?: string
  responsavel_ids: string[]
  checklist: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface ClosingPeriod {
  id: string
  year: number
  month: string
  status: "aberto" | "fechado"
  openedAt: string
  progress: number
}

export interface TaskTemplate {
  id: string
  description: string
  demonstrativo: string
  dia_referencia: number
  tipo_data: "util" | "corrido"
  prioridade: "baixa" | "media" | "alta"
  responsavel_ids: string[]
  departmentId: string
  tempo_estimado?: string
  passo_a_passo?: string
}

export interface ClosingComment {
  id: string
  tarefa_id: string
  usuario_id: string
  usuario_nome: string
  conteudo: string
  criado_em: string
}

export interface ClosingAttachment {
  id: string
  tarefa_id: string
  nome: string
  url: string
  criado_em: string
}

export interface MonthlyBalanceEntry {
  id?: string
  ano: number
  mes: string
  conta_contabil_id?: string  // UUID reference to plano_contas
  valor: number
  empresa_id: string
  organizacao_id?: string
}

export interface Notification {
  id: string
  recipientId: string
  senderId?: string
  type: "BUDGET_ACTION" | "SYSTEM_INFO" | "MENTION" | "TASK" | "TICKET_UPDATE"
  title: string
  content?: string
  payload?: any
  isRead: boolean
  actionLink?: string
  createdAt: string
  readAt?: string
}
