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

export type CompanyType = "efetiva" | "apoio"

export interface Company {
  id: string
  name: string
  nickname?: string
  cnpj?: string
  erpCode?: string
  brandId: string
  economicGroupId: string
  parentCompanyId?: string
  tipo?: CompanyType
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
  | "BUDGET_WIZARD"
  | "USER_MANAGEMENT"
  | "BENCHMARKS"
  | "REPORT_TEMPLATES"
  | "REPORT_STRUCTURE"
  | "DOCUMENTATION"
  | "SUPPORT"
  | "CLOSING_SCHEDULE"
  | "CLOSING_LOCK"
  | "OPERATIONAL_INDICATORS"
  | "OPERATIONAL_DATA_ENTRY"
  | "OPERATIONAL_FORMULAS"
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
  type: "header" | "data_bucket" | "total" | "formula" | "operational"
  sign: 1 | -1
  dreAccountId?: string
  balanceAccountId?: string
  formula?: string
  operationalFormulaId?: string
  sourceAccounts?: string[]
  style?: any
  createdAt?: string
  updatedAt?: string
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
  departmentId?: string
  value: number
}

export interface BudgetAssumption {
  id: string
  name: string
  type: "number" | "percentage" | "currency"
  description?: string
}

export interface BudgetAssumptionValue {
  id?: string
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

export interface BudgetMapping {
  id: string
  premissaId: string
  tipoDestino: 'conta_dre' | 'indicador_operacional'
  contaDreId?: string
  indicadorId?: string
  departamentoId?: string
  fatorMultiplicador: number
  tipoCalculo: 'direto' | 'formula' | 'percentual'
  formula?: string
  descricao?: string
  ativo: boolean
}

export interface AuxiliaryPremise {
  id: string
  nome: string
  tipo: 'preco_medio' | 'margem' | 'taxa' | 'indice' | 'outros'
  contaDreId?: string
  departamento?: string
  marcaId?: string
  empresaId?: string
  ano: number
  mes?: string
  valor: number
  origem: 'manual' | 'historico' | 'calculado'
}

export interface BudgetDreValue {
  id: string
  contaDreId: string
  empresaId: string
  departamentoId?: string
  ano: number
  mes: string
  valorPremissas: number
  valorHistorico: number
  valorManual: number
  valorImportado: number
  valorTotal: number
}

export type NaturezaConta = 'Receita' | 'Despesa' | 'Custo' | 'Outros'

export interface DreAccount {
  id: string
  name: string
  economicGroupId: string
  naturezaConta?: NaturezaConta
  grupoConta?: string
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
  contaContabilId?: string
  contaBalancoId?: string
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

// ============================================================
// DADOS OPERACIONAIS (KPIs não-financeiros)
// ============================================================

export type EscopoIndicador = "empresa" | "marca" | "departamento" | "loja" | "consolidado"

export interface OperationalIndicator {
  id: string
  organizacaoId: string
  codigo: string
  nome: string
  descricao?: string
  categoria?: string
  unidadeMedida: string
  natureza: "volume" | "eficiencia" | "qualidade" | "financeiro"
  escopos: EscopoIndicador[]
  permiteMeta: boolean
  ativo: boolean
  ordem: number
  createdAt?: string
  updatedAt?: string
}

export interface OperationalValueEntry {
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

export interface OperationalValue {
  id: string
  organizacaoId: string
  indicadorId: string
  ano: number
  mes: string
  empresaId?: string
  marcaId?: string
  departamentoId?: string
  lojaId?: string
  valor: number
  meta?: number
  origem: "manual" | "importacao" | "api" | "calculado"
  status: "rascunho" | "confirmado" | "bloqueado"
  observacao?: string
  preenchidoPor?: string
  confirmadoPor?: string
  createdAt?: string
  updatedAt?: string
}

export interface OperationalFormula {
  id: string
  organizacaoId: string
  codigo: string
  nome: string
  descricao?: string
  expressao: string
  categoria?: string
  unidadeMedida: string
  casasDecimais: number
  formatoExibicao: "numero" | "percentual" | "moeda"
  escopo: "empresa" | "marca" | "departamento" | "consolidado"
  ordem: number
  ativo: boolean
  createdAt?: string
  updatedAt?: string
}

export interface OperationalReportLineMapping {
  id: string
  organizacaoId: string
  linhaRelatorioId: string
  tipo: "INDICADOR" | "FORMULA"
  indicadorId?: string
  formulaId?: string
  ordem: number
  ativo: boolean
}

// ============================================================
// ORÇAMENTO AUTOMATIZADO
// ============================================================

export type TipoConta = "fixa" | "variavel" | "manual"
export type TipoIndice = "IPCA" | "IGP-M" | "SELIC" | "PERCENTUAL" | "CUSTOM"

export interface RegraOrcamento {
  id: string
  organizacaoId: string
  contaDreId: string
  contaDreNome?: string
  tipoConta: TipoConta
  
  // Despesas Fixas
  periodoBaseMeses: number
  indiceCorrecao?: TipoIndice
  percentualCorrecao?: number
  
  // Despesas Variáveis
  linhaReferenciaId?: string
  linhaReferenciaNome?: string
  percentualSobreLinha?: number
  usarPercentualHistorico: boolean
  
  // Escopo
  departamentoId?: string
  empresaId?: string
  
  ativo: boolean
  createdAt?: string
  updatedAt?: string
}

export interface IndiceEconomico {
  id: string
  organizacaoId: string
  tipo: TipoIndice
  ano: number
  mes: string
  valor: number
  createdAt?: string
}

export interface OrcamentoGerado {
  contaDreId: string
  contaDreNome: string
  tipoConta: TipoConta
  ano: number
  mes: string
  valorCalculado: number
  baseCalculo: string
  detalhes: {
    mediaHistorica?: number
    indiceCorrecao?: number
    percentualAplicado?: number
    valorReferencia?: number
  }
}
