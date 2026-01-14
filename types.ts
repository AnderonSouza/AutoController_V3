export interface MonthlyData {
  balancete: number;
  transfGerencial?: number;
  ajusteContabil?: number;
  cgGerencial?: number;
  cg?: number;
  
  // Campos de Orçamento (Composição)
  orcado: number; // Total consolidado
  orcadoPremissas?: number;
  orcadoHistorico?: number;
  orcadoManual?: number;
  orcadoImportado?: number;
}

export interface FinancialAccount {
  id: string; // "Conta" column
  name: string; // "Descrição" column
  reducedCode?: string; // "Cod. Reduzido" column
  accountType?: string; // "Tipo" column (Sintética/Analítica)
  nature?: string; // "Natureza" column (Devedora/Credora)
  isTotal?: boolean;
  isSubTotal?: boolean;
  operation?: 'add' | 'subtract';
  monthlyData: { [year: number]: { [month: string]: MonthlyData } };
  children?: FinancialAccount[];
  contaSintetica?: string; // Legacy/Internal use
  grupoConta?: string; // Legacy/Internal use
  tipoConta?: string; // Legacy/Internal use
  levelAdjustment?: number; // Propriedade para ajuste visual da indentação
  sourceAccounts?: string[]; // IDs das contas DRE (DreAccount) que compõem esta linha
}

export interface DreAccount {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface CostCenter {
  id: string; // Changed from number to string to allow manual code entry (e.g., "1.01")
  sigla: string;
  descricao: string;
  departamento?: string;
}

export interface AccountCostCenterMapping {
  idconta: string;
  conta: string;
  contasintetica: string; // The DRE Account
  
  // These fields are legacy/deprecated for direct mapping logic but kept for DB compatibility
  ccusto?: string; 
  ccconta?: string;
  departamento?: string;
  grupo?: string;
  isNew?: boolean;
}

export interface TrialBalanceEntry {
  store: string; // Legacy fallback (Name)
  companyCnpj?: string; // New robust key
  companyErpCode?: string; // New robust key
  year: number;
  month: string;
  empresa: string; // Display name
  data: string;
  idconta: string;
  descricaoconta: string;
  siglacr: string;
  descricaocr: string;
  natureza: 'C' | 'D';
  valor: number;
}

export interface Period {
  year: number;
  month: string;
}

export interface InterfaceConfig {
  // Group Titles
  sidebar_title_financial?: string;
  sidebar_title_entries?: string;
  sidebar_title_budget?: string; // New Group Title
  sidebar_title_management?: string;
  sidebar_title_system?: string;

  // Item Labels
  sidebar_dre?: string;
  sidebar_cashflow?: string;
  sidebar_budget_planning?: string; // Renamed
  sidebar_budget_assumptions?: string; // New Item
  sidebar_budget_data?: string; // New Item for Values
  sidebar_budget_import?: string; // New Item
  sidebar_transfers?: string;
  sidebar_cg?: string;
  sidebar_adjustments?: string;
  sidebar_import?: string;
  sidebar_queries?: string;
  
  // Management Sub-items
  sidebar_structure?: string; // New: Estrutura Organizacional
  sidebar_parameters?: string; // New: Parâmetros de Apuração
  sidebar_report_templates?: string; // New: Modelos de Relatórios
  
  sidebar_users?: string;
  sidebar_system?: string;
  
  // Item Icons (Keys from ICON_LIBRARY)
  sidebar_dre_icon?: string;
  sidebar_cashflow_icon?: string;
  sidebar_budget_planning_icon?: string;
  sidebar_budget_assumptions_icon?: string;
  sidebar_budget_data_icon?: string;
  sidebar_budget_import_icon?: string;
  sidebar_transfers_icon?: string;
  sidebar_cg_icon?: string;
  sidebar_adjustments_icon?: string;
  sidebar_import_icon?: string;
  sidebar_queries_icon?: string;
  
  sidebar_structure_icon?: string;
  sidebar_parameters_icon?: string;
  sidebar_report_templates_icon?: string;

  sidebar_users_icon?: string;
  sidebar_system_icon?: string;
  
  // App Identity
  app_title?: string;
  app_subtitle?: string;
}

export interface EconomicGroup {
  id: string;
  name: string;
  logo?: string;
  font?: string;
  
  // Cores do Tema
  primarycolor?: string;      
  secondarycolor?: string;    
  
  // Cores de Layout
  sidebarColor?: string;      
  sidebarTextColor?: string;
  
  // Cores do Cabeçalho App
  headerColor?: string;
  headerTextColor?: string;
  
  backgroundColor?: string;   
  
  // Cores de Tipografia
  textColor?: string;         
  textSecondaryColor?: string;

  // Cores de Tabela (Relatórios) - NEW
  tableHeaderColor?: string;
  tableHeaderTextColor?: string;
  tableTotalColor?: string;
  tableSubtotalColor?: string;
  tableRowColor?: string;
  
  borderradius?: string;
  
  // Configurações de Login
  loginBackgroundImage?: string;
  loginLogo?: string;
  loginTitle?: string;
  loginTitleColor?: string;
  loginTitleFontSize?: string; // New: ex: '3rem'
  loginSubtitle?: string;
  loginSubtitleColor?: string;
  loginSubtitleFontSize?: string; // New: ex: '1.2rem'
  loginBackgroundOpacity?: number; // New: 0 to 1 (default 0.5)

  // Configurações de Scrollbar
  scrollbarColor?: string; // Thumb color
  scrollbarWidth?: string; // 'thin' | 'normal' | 'none' (or px value)
  scrollbarRadius?: string; // 'rounded' | 'square'

  // Configurações de Texto
  interfaceConfig?: InterfaceConfig;

  // Configuração de Fechamento
  lastClosedYear?: number;
  lastClosedMonth?: string;
}

export interface Brand {
  id: string;
  name: string;
  economicGroupId: string; // Fixed: camelCase matching DB utils
  logo?: string;
}

export interface Company {
  id: string;
  name: string; // Nome exato para matching com Excel (Fallback)
  nickname?: string; // Nome amigável para exibição
  cnpj?: string; // Identificador único
  erpCode?: string; // Código interno do sistema de origem
  brandId: string; // Fixed: camelCase matching DB utils
  parentCompanyId?: string; // ID da empresa onde os resultados serão consolidados
}

export type UserRole = 'Administrador' | 'Gestor' | 'Analista' | 'Leitor';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: 'ativo' | 'inativo';
  resetToken?: string; // For password recovery
  resetTokenExpires?: string; // ISO Date string
  permissions: {
    // Persistence helper: Store role here to work with existing DB schema
    role?: UserRole; 
    
    // Escopo de Dados (Onde?)
    economicGroups: string[] | ['*'];
    brands: string[] | ['*'];
    stores: string[] | ['*'];
    departments: string[] | ['*'];
    
    // Acesso a Relatórios (O Quê?)
    reportAccess: string[]; // Ex: ['DRE', 'CASH_FLOW', 'BUDGET']
    
    // Permissões Funcionais (Como?)
    actionAccess: string[]; // Ex: ['UPLOAD', 'MANUAL_ENTRIES', 'SETTINGS']
  };
}

export interface ManagementTransfer {
  id: string; // Primary key for the row
  transactionId: string; // Groups rows into a single transaction
  year: number;
  month: string;
  description: string;
  type: 'origin' | 'destination';
  companyId: string;
  department: string;
  dreAccountName: string;
  value: number;
  createdAt?: string;
}

export interface CgEntry {
  id: string; // Primary key for the row
  transactionId: string; // Groups rows into a single transaction
  year: number;
  month: string;
  description: string;
  companyId: string;
  department: string;
  dreAccountName: string;
  value: number; // Can be positive or negative
  createdAt?: string;
}

export interface AdjustmentEntry {
  id: string;
  transactionId: string;
  provisionId?: string; // If NULL, it's a provision. If set, it's a reversal linked to a provision.
  year: number;
  month: string;
  description: string;
  companyId: string;
  department: string;
  dreAccountName: string;
  value: number;
  createdAt?: string;
}

export interface BudgetAssumption {
  id: string;
  name: string;
  type: 'number' | 'percentage' | 'currency';
  description?: string;
}

export interface BudgetAssumptionValue {
  assumptionId: string;
  store: string; // 'Consolidado' or Store Name
  department: string; // 'Veículos Novos', etc.
  year: number;
  month: string;
  value: number;
}

export interface BudgetFormula {
  id: string;
  dreAccountId: string; // ID da conta na DRE (ex: '1_1')
  department: string; // Departamento ao qual a regra se aplica (ou 'Todos')
  expression: string; // Ex: "{ASSUMPTION_ID_1} * {ASSUMPTION_ID_2}"
  description?: string;
}

export interface Benchmark {
  id: string;
  description: string;
  type: 'currency' | 'percentage' | 'number';
  dreAccountId: string; // ID da conta na estrutura da DRE (ex: '18')
  brandId: string; // ID da marca específica ou 'all' para todas
  value: number;
}

// --- NEW STRUCTURE FOR DYNAMIC REPORTS ---

export type ReportType = 'DRE' | 'CASH_FLOW' | 'BALANCE_SHEET' | 'OTHER';

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  isActive: boolean;
  orderIndex?: number; // New field for sorting in sidebar
  createdAt?: string; // New field to satisfy DB constraints
  updatedAt?: string; // New field to satisfy DB constraints
}

export interface ReportLine {
  id: string;
  reportId: string;
  parentId?: string | null; // Null for root items
  name: string;
  code: string; // e.g., "1", "1.1", "2.0"
  order: number; // Display order
  type: 'header' | 'data_bucket' | 'total' | 'formula';
  sign: 1 | -1; // 1 for add, -1 for subtract (relative to parent)
  formula?: string; // For type='formula'
  sourceAccounts?: string[]; // IDs of DreAccount/ChartOfAccounts that feed this bucket
  style?: {
    bold?: boolean;
    color?: string;
    indent?: number;
    background?: string;
  };
}

export type NotificationType = 'BUDGET_ACTION' | 'SYSTEM_INFO' | 'MENTION' | 'TASK';

export interface Notification {
    id: string;
    recipientId: string;
    senderId?: string;
    type: NotificationType;
    title: string;
    content?: string;
    payload?: any; // Flexible JSON payload
    isRead: boolean;
    actionLink?: string;
    createdAt: string;
    readAt?: string;
}

export type View = 'DYNAMIC_REPORT' | 'DRE' | 'CASH_FLOW' | 'MANAGEMENT' | 'MANAGEMENT_STRUCTURE' | 'MANAGEMENT_PARAMETERS' | 'CHART_OF_ACCOUNTS' | 'COST_CENTERS' | 'ACCOUNT_COST_CENTER_MAPPING' | 'ACCOUNTING_ENTRIES' | 'QUERIES' | 'SYSTEM_SETTINGS' | 'USER_PROFILE' | 'COMPANIES' | 'BRANDS' | 'ECONOMIC_GROUPS' | 'MANAGEMENT_TRANSFERS' | 'DRE_CHART_OF_ACCOUNTS' | 'CG_ENTRIES' | 'ACCOUNTING_ADJUSTMENTS' | 'DATA_IMPORT' | 'BUDGET_PLANNING' | 'BUDGET_ASSUMPTIONS' | 'BUDGET_DATA' | 'BUDGET_IMPORT' | 'USER_MANAGEMENT' | 'BENCHMARKS' | 'REPORT_TEMPLATES' | 'REPORT_STRUCTURE';
