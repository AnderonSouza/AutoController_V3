import { supabase } from "./supabaseClient"
import type {
  TrialBalanceEntry,
  Ticket,
  TicketMessage,
  TicketStatus,
  Notification,
  MonthlyBalanceEntry,
  RegraOrcamento,
  IndiceEconomico,
  TipoConta,
  TipoIndice,
} from "../types"

const TABLE_MAPPING: Record<string, string> = {
  // Tabelas de cadastros principais
  economicgroups: "organizacoes",
  economic_groups: "organizacoes",
  organizations: "organizacoes",
  users: "usuarios",
  companies: "empresas",
  brands: "marcas",
  departments: "departamentos",
  cost_centers: "centros_resultado",

  // Tabelas de plano de contas
  chart_of_accounts: "plano_contas",
  plano_contas_contabil: "plano_contas",
  balance_sheet_accounts: "plano_contas_balanco",
  plano_contas_dre: "plano_contas_dre",

  // Tabelas de lançamentos
  accounting_entries: "lancamentos_contabeis",
  adjustment_entries: "lancamentos_ajustes",

  // Tabelas de relatórios
  report_templates: "modelos_relatorios",
  report_lines: "linhas_relatorio",

  // Tabelas de mapeamento
  account_cost_center_mapping: "mapeamento_contas",
  mapeamento_contas_gerencial: "mapeamento_contas",

  // Tabelas de fechamento
  closing_cycles: "ciclos_fechamento",
  closing_tasks: "tarefas_fechamento",
  task_templates: "modelos_tarefas_fechamento",
  closing_attachments: "anexos_fechamento",
  closing_comments: "comentarios_fechamento",

  // Tabelas de chamados
  tickets: "chamados",
  ticket_messages: "mensagens_chamado",

  // Tabelas de fórmulas
  calculation_formulas: "formulas_calculo",

  // Tabelas de orçamento
  budget_assumptions: "premissas_orcamentarias",
  budget: "orcamento",
  monthly_balances: "saldos_mensais",
  budget_values: "valores_premissas",
  budget_targets: "metas_indicadores",

  // Tabelas de notificações
  notifications: "notificacoes",

  // Tabelas de dados operacionais
  operational_indicators: "indicadores_operacionais",
  operational_values: "valores_operacionais",
  operational_formulas: "formulas_operacionais",
  operational_formula_dependencies: "formulas_operacionais_dependencias",
  operational_report_mappings: "relatorio_linhas_operacionais",
}

const resolveTableName = (tableName: string) => TABLE_MAPPING[tableName] || tableName

const FIELD_MAP_USERS: Record<string, string> = {
  name: "nome",
  role: "perfil",
  status: "status",
  email: "email",
  tenantId: "organizacao_id",
  supportDepartment: "departamento_suporte",
}

const FIELD_MAP_ORG: Record<string, string> = {
  id: "id",
  name: "nome",
  logo: "logo",
  logoDark: "logo_dark",
  lastClosedYear: "ultimo_ano_fechado",
  lastClosedMonth: "ultimo_mes_fechado",
  interfaceConfig: "config_interface",
  subdomain: "subdomain",
  loginAnnouncement: "login_announcement",
  loginBackgroundUrl: "login_background_url",
  loginBackgroundType: "login_background_type",
}

const FIELD_MAP_COMPANIES: Record<string, string> = {
  id: "id",
  name: "nome",
  nickname: "nome_fantasia",
  cnpj: "cnpj",
  erpCode: "codigo_erp",
  brandId: "marca_id",
  economicGroupId: "organizacao_id",
  parentCompanyId: "empresa_pai_id",
}

const FIELD_MAP_BRANDS: Record<string, string> = {
  id: "id",
  name: "nome",
  economicGroupId: "organizacao_id",
}

const FIELD_MAP_DEPARTMENTS: Record<string, string> = {
  id: "id",
  name: "nome",
  economicGroupId: "organizacao_id",
}

const FIELD_MAP_COST_CENTERS: Record<string, string> = {
  id: "id",
  code: "codigo",
  name: "nome",
  sigla: "codigo",
  descricao: "nome",
  economicGroupId: "organizacao_id",
  departmentId: "departamento_id",
}

const FIELD_MAP_REPORT_TEMPLATES: Record<string, string> = {
  id: "id",
  name: "nome",
  description: "descricao",
  type: "tipo",
  isActive: "ativo",
  orderIndex: "ordem",
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  economicGroupId: "organizacao_id",
}

const FIELD_MAP_REPORT_LINES: Record<string, string> = {
  id: "id",
  reportId: "relatorio_id",
  parentId: "pai_id",
  name: "nome",
  code: "codigo",
  order: "ordem",
  type: "tipo",
  sign: "sinal",
  formula: "formula",
  sourceAccounts: "contas_origem",
  style: "estilo",
  createdAt: "criado_em",
  updatedAt: "atualizado_em",
  dreAccountId: "conta_dre_id",
  balanceAccountId: "conta_balanco_id",
  economicGroupId: "organizacao_id",
}

const FIELD_MAP_BENCHMARKS: Record<string, string> = {
  id: "id",
  description: "description",
  type: "type",
  dreAccountId: "dre_account_id",
  brandId: "brand_id",
  value: "value",
  createdAt: "criado_em",
  economicGroupId: "organizacao_id",
}

const FIELD_MAP_THEMES: Record<string, string> = {
  cor_primaria: "primarycolor",
  cor_secundaria: "secondarycolor",
  cor_fundo: "backgroundColor",
  cor_texto: "textColor",
  cor_texto_secundario: "textSecondaryColor",
  cor_sidebar: "sidebarColor",
  cor_texto_sidebar: "sidebarTextColor",
  cor_titulo_secao_sidebar: "sidebarSectionTitleColor",
  cor_fundo_rodape_sidebar: "sidebarFooterBackgroundColor",
  cor_texto_rodape_sidebar: "sidebarFooterTextColor",
  cor_header: "headerColor",
  cor_texto_header: "headerTextColor",
  cor_cabecalho_tabela: "tableHeaderColor",
  cor_texto_cabecalho_tabela: "tableHeaderTextColor",
  cor_total_tabela: "tableTotalColor",
  cor_subtotal_tabela: "tableSubtotalColor",
  cor_linha_tabela: "tableRowColor",
  raio_borda: "borderradius",
  cor_scrollbar: "scrollbarColor",
  largura_scrollbar: "scrollbarWidth",
  raio_scrollbar: "scrollbarRadius",
  fonte: "font",
  grupo_economico_id: "economicGroupId",
  // Login customization
  imagem_fundo_login: "loginBackgroundImage",
  logo_login: "loginLogo",
  titulo_login: "loginTitle",
  cor_titulo_login: "loginTitleColor",
  tamanho_fonte_titulo_login: "loginTitleFontSize",
  subtitulo_login: "loginSubtitle",
  cor_subtitulo_login: "loginSubtitleColor",
  tamanho_fonte_subtitulo_login: "loginSubtitleFontSize",
  opacidade_fundo_login: "loginBackgroundOpacity",
}

export const getCadastro = async (table: string): Promise<any[]> => {
  const dbTable = resolveTableName(table)
  const { data, error } = await supabase.from(dbTable).select("*")
  if (error) {
    console.error("Error fetching " + table + ":", error)
    return []
  }
  return data || []
}

export const saveCadastro = async (table: string, data: any[]): Promise<any[]> => {
  const dbTable = resolveTableName(table)
  const { data: saved, error } = await supabase.from(dbTable).upsert(data).select()
  if (error) throw error
  return saved || []
}

export const deleteById = async (table: string, id: string): Promise<void> => {
  const dbTable = resolveTableName(table)
  console.log("[v0-db] deleteById called:", { table, dbTable, id })
  const { error, count } = await supabase.from(dbTable).delete().eq("id", id)
  console.log("[v0-db] deleteById result:", { error, count })
  if (error) throw error
}

const mapFieldsToDb = (tableName: string, item: any): any => {
  const dbTable = resolveTableName(tableName)

  if (dbTable === "usuarios") {
    const mapped: any = {}
    Object.entries(item).forEach(([key, value]) => {
      const dbKey = FIELD_MAP_USERS[key] || key
      // Não incluir campos que não existem no banco
      if (dbKey !== "password" && dbKey !== "permissions") {
        mapped[dbKey] = value
      }
    })
    // Mapear permissions para o campo JSON do banco
    if (item.permissions) {
      mapped.permissoes = item.permissions
    }
    return mapped
  }

  return item
}

const TENANT_COLUMN_MAP: Record<string, string> = {
  usuarios: "organizacao_id",
  organizacoes: "id",
  empresas: "organizacao_id",
  marcas: "organizacao_id",
  departamentos: "organizacao_id",
  centros_resultado: "organizacao_id",
  plano_contas: "organizacao_id",
  plano_contas_balanco: "organizacao_id",
  plano_contas_dre: "organizacao_id",
  modelos_relatorios: "organizacao_id",
  linhas_relatorio: "organizacao_id",
  lancamentos_ajustes: "organizacao_id",
  lancamentos_contabeis: "organizacao_id",
  mapeamento_contas: "organizacao_id",
  saldos_mensais: "organizacao_id",
  benchmarks: "organizacao_id",
  notificacoes: "organizacao_id",
  indicadores_operacionais: "organizacao_id",
  valores_operacionais: "organizacao_id",
  formulas_operacionais: "organizacao_id",
  formulas_operacionais_dependencias: "organizacao_id",
  relatorio_linhas_operacionais: "organizacao_id",
}

export const getCadastroTenant = async (table: string, tenantId: string | null): Promise<any[]> => {
  console.log("[v0-db] getCadastroTenant called:", { table, tenantId })
  
  if (!tenantId) {
    console.log("[v0-db] No tenantId, falling back to getCadastro")
    return getCadastro(table)
  }

  const dbTable = resolveTableName(table)
  const tenantColumn = TENANT_COLUMN_MAP[dbTable] || "organizacao_id"
  
  let query = supabase.from(dbTable).select("*")
  
  if (dbTable === "organizacoes") {
    query = query.eq("id", tenantId)
  } else {
    query = query.eq(tenantColumn, tenantId)
  }

  // Remove Supabase default 1000 row limit for large tables
  // Note: Supabase has a default limit of 1000 rows. We need to explicitly set a higher limit.
  const largeTables = ['plano_contas', 'lancamentos_contabeis', 'mapeamento_contas', 'saldos_mensais']
  if (largeTables.includes(dbTable)) {
    // Use .limit() to override the default 1000 row limit
    query = query.limit(100000)
  }

  console.log("[v0-db] Querying table:", dbTable, "with filter", tenantColumn, "=", tenantId)
  const { data, error, status, statusText } = await query
  console.log("[v0-db] Query result for", dbTable, ":", { 
    count: data?.length ?? 0, 
    error: error?.message,
    status,
    statusText,
    firstRecord: data?.[0] ? Object.keys(data[0]) : null
  })
  
  if (error) {
    console.error("Erro ao buscar " + table + ":", error.message)
    return []
  }

  return (data || []).map((item) => {
    if (dbTable === "organizacoes") {
      const result: any = {}
      Object.entries(FIELD_MAP_ORG).forEach(([appKey, dbKey]) => {
        result[appKey] = item[dbKey]
      })

      const configInterface = item.config_interface || {}
      result.interfaceConfig = configInterface

      result.primarycolor = configInterface.primaryColor || configInterface.primarycolor
      result.secondarycolor = configInterface.secondaryColor || configInterface.secondarycolor
      result.backgroundColor = configInterface.backgroundColor
      result.textColor = configInterface.textColor
      result.textSecondaryColor = configInterface.textSecondaryColor
      result.sidebarColor = configInterface.sidebarColor
      result.sidebarTextColor = configInterface.sidebarTextColor
      result.sidebarSectionTitleColor = configInterface.sidebarSectionTitleColor
      result.sidebarFooterBackgroundColor = configInterface.sidebarFooterBackgroundColor
      result.sidebarFooterTextColor = configInterface.sidebarFooterTextColor
      result.headerColor = configInterface.headerColor
      result.headerTextColor = configInterface.headerTextColor
      result.tableHeaderColor = configInterface.tableHeaderColor
      result.tableHeaderTextColor = configInterface.tableHeaderTextColor
      result.tableTotalColor = configInterface.tableTotalColor
      result.tableSubtotalColor = configInterface.tableSubtotalColor
      result.tableRowColor = configInterface.tableRowColor
      result.loginBackgroundImage = configInterface.loginBackgroundImage
      result.loginLogo = configInterface.loginLogo
      result.loginTitle = configInterface.loginTitle
      result.loginTitleColor = configInterface.loginTitleColor
      result.loginTitleFontSize = configInterface.loginTitleFontSize
      result.loginSubtitle = configInterface.loginSubtitle
      result.loginSubtitleColor = configInterface.loginSubtitleColor
      result.loginSubtitleFontSize = configInterface.loginSubtitleFontSize
      result.loginBackgroundOpacity = configInterface.loginBackgroundOpacity
      result.font = configInterface.font
      result.borderradius = configInterface.borderRadius || configInterface.borderradius
      result.scrollbarColor = configInterface.scrollbarColor
      result.scrollbarWidth = configInterface.scrollbarWidth
      result.scrollbarRadius = configInterface.scrollbarRadius

      return result
    }
    if (dbTable === "usuarios") {
      return {
        id: item.id,
        name: item.nome,
        email: item.email,
        role: item.perfil,
        status: item.status,
        tenantId: item.organizacao_id,
        permissions: item.permissoes || {},
        supportDepartment: item.departamento_suporte,
      }
    }
    if (dbTable === "empresas") {
      const result: any = { ...item }
      Object.entries(FIELD_MAP_COMPANIES).forEach(([appKey, dbKey]) => {
        if (item[dbKey] !== undefined) {
          result[appKey] = item[dbKey]
        }
      })
      return result
    }
    if (dbTable === "marcas") {
      const result: any = { ...item }
      Object.entries(FIELD_MAP_BRANDS).forEach(([appKey, dbKey]) => {
        if (item[dbKey] !== undefined) {
          result[appKey] = item[dbKey]
        }
      })
      return result
    }
    if (dbTable === "departamentos") {
      const result: any = { ...item }
      Object.entries(FIELD_MAP_DEPARTMENTS).forEach(([appKey, dbKey]) => {
        if (item[dbKey] !== undefined) {
          result[appKey] = item[dbKey]
        }
      })
      return result
    }
    if (dbTable === "centros_resultado") {
      const result: any = { ...item }
      Object.entries(FIELD_MAP_COST_CENTERS).forEach(([appKey, dbKey]) => {
        if (item[dbKey] !== undefined) {
          result[appKey] = item[dbKey]
        }
      })
      return result
    }
    if (dbTable === "plano_contas_balanco") {
      return {
        id: item.id,
        name: item.nome,
        economicGroupId: item.organizacao_id,
      }
    }
    if (dbTable === "plano_contas_dre") {
      return {
        id: item.id,
        name: item.nome,
        type: item.tipo,
        order: item.ordem,
        reducedCode: item.codigo_reduzido,
        economicGroupId: item.organizacao_id,
      }
    }
    if (dbTable === "mapeamento_contas") {
      // Return basic mapping data - names will be enriched in useAppData hook
      return {
        id: item.id,
        accountingAccountId: item.conta_contabil_id,
        dreAccountId: item.conta_dre_id,
        balanceAccountId: item.conta_balanco_id,
        economicGroupId: item.organizacao_id,
        createdAt: item.criado_em,
      }
    }
    if (dbTable === "modelos_relatorios") {
      return {
        id: item.id,
        name: item.nome,
        description: item.descricao,
        type: item.tipo,
        isActive: item.ativo,
        orderIndex: item.ordem,
        createdAt: item.criado_em,
        updatedAt: item.atualizado_em,
        economicGroupId: item.organizacao_id,
      }
    }
    if (dbTable === "linhas_relatorio") {
      // For operational lines, extract operationalFormulaId from formula field
      let operationalFormulaId: string | undefined;
      let formula = item.formula;
      if (item.tipo === 'operational' && item.formula?.startsWith('OP:')) {
        operationalFormulaId = item.formula.substring(3); // Remove 'OP:' prefix
        formula = undefined; // Clear formula since it was used for operationalFormulaId
      }
      return {
        id: item.id,
        reportId: item.relatorio_id,
        parentId: item.pai_id,
        name: item.nome,
        code: item.codigo,
        order: item.ordem,
        type: item.tipo,
        sign: item.sinal,
        formula: formula,
        operationalFormulaId: operationalFormulaId,
        sourceAccounts: item.contas_origem,
        style: item.estilo,
        createdAt: item.criado_em,
        updatedAt: item.atualizado_em,
        dreAccountId: item.conta_dre_id,
        economicGroupId: item.organizacao_id,
      }
    }
    if (dbTable === "benchmarks") {
      return {
        id: item.id,
        description: item.description,
        type: item.type,
        dreAccountId: item.dre_account_id,
        brandId: item.brand_id,
        value: item.value,
        createdAt: item.criado_em,
        economicGroupId: item.organizacao_id,
      }
    }
    return item
  })
}

export const saveCadastroTenant = async (tableName: string, data: any[], tenantId: string): Promise<any[]> => {
  const dbTable = resolveTableName(tableName)

  const dbData = data.map((item) => {
    if (tableName === "economicgroups" || tableName === "organizations") {
      const obj: any = {}
      Object.entries(FIELD_MAP_ORG).forEach(([appKey, dbKey]) => {
        if (item[appKey] !== undefined) {
          obj[dbKey] = item[appKey]
        }
      })
      return obj
    }

    if (dbTable === "usuarios") {
      const mapped = mapFieldsToDb(tableName, item)
      mapped.organizacao_id = tenantId
      return mapped
    }

    if (dbTable === "empresas") {
      const obj: any = { ...item }
      Object.entries(FIELD_MAP_COMPANIES).forEach(([appKey, dbKey]) => {
        if (appKey !== dbKey) {
          if (item[appKey] !== undefined) {
            obj[dbKey] = item[appKey]
          }
          delete obj[appKey]
        }
      })
      obj.organizacao_id = tenantId
      return obj
    }

    if (dbTable === "marcas") {
      const obj: any = { ...item }
      Object.entries(FIELD_MAP_BRANDS).forEach(([appKey, dbKey]) => {
        if (item[appKey] !== undefined) {
          obj[dbKey] = item[appKey]
          if (appKey !== dbKey) delete obj[appKey]
        }
      })
      obj.organizacao_id = tenantId
      return obj
    }

    if (dbTable === "departamentos") {
      const obj: any = { ...item }
      Object.entries(FIELD_MAP_DEPARTMENTS).forEach(([appKey, dbKey]) => {
        if (item[appKey] !== undefined) {
          obj[dbKey] = item[appKey]
          if (appKey !== dbKey) delete obj[appKey]
        }
      })
      obj.organizacao_id = tenantId
      return obj
    }

    if (dbTable === "centros_resultado") {
      const obj: any = { ...item }
      Object.entries(FIELD_MAP_COST_CENTERS).forEach(([appKey, dbKey]) => {
        if (item[appKey] !== undefined) {
          obj[dbKey] = item[appKey]
          if (appKey !== dbKey) delete obj[appKey]
        }
      })
      obj.organizacao_id = tenantId
      return obj
    }

    if (dbTable === "modelos_relatorios") {
      const obj: any = {}
      Object.entries(FIELD_MAP_REPORT_TEMPLATES).forEach(([appKey, dbKey]) => {
        if (item[appKey] !== undefined) {
          obj[dbKey] = item[appKey]
        }
      })
      obj.organizacao_id = tenantId
      return obj
    }

    if (dbTable === "linhas_relatorio") {
      const obj: any = {}
      Object.entries(FIELD_MAP_REPORT_LINES).forEach(([appKey, dbKey]) => {
        if (item[appKey] !== undefined) {
          obj[dbKey] = item[appKey]
        }
      })
      // For operational lines, store operationalFormulaId in the formula field
      if (item.type === 'operational' && item.operationalFormulaId) {
        obj.formula = `OP:${item.operationalFormulaId}`;
      }
      obj.organizacao_id = tenantId
      return obj
    }

    if (dbTable === "mapeamento_contas") {
      return {
        id: item.id,
        conta_contabil_id: item.accountingAccountId || item.conta_contabil_id,
        conta_dre_id: item.dreAccountId || item.conta_dre_id,
        dre_account_id: item.dreAccountId || item.dre_account_id,
        idconta: item.idconta,
        conta: item.conta,
        conta_gerencial: item.contasintetica || item.conta_gerencial,
        organizacao_id: tenantId,
      }
    }

    if (dbTable === "benchmarks") {
      const obj: any = {}
      Object.entries(FIELD_MAP_BENCHMARKS).forEach(([appKey, dbKey]) => {
        if (item[appKey] !== undefined) {
          obj[dbKey] = item[appKey]
        }
      })
      obj.organizacao_id = tenantId
      return obj
    }

    const obj = { ...item, organizacao_id: tenantId }
    return obj
  })

  const { data: saved, error } = await supabase.from(dbTable).upsert(dbData).select()
  if (error) {
    console.error("Erro ao salvar em " + tableName + ":", error.message)
    throw error
  }
  return saved || []
}

export const createNewUser = async (userData: any, tenantId: string): Promise<any> => {
  // 1. Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
  })

  if (authError) {
    // Se não tiver permissão de admin, tenta signup normal
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    })

    if (signUpError) {
      throw new Error("Erro ao criar usuário no Auth: " + signUpError.message)
    }

    if (!signUpData.user) {
      throw new Error("Usuário não foi criado no Auth")
    }

    // 2. Inserir na tabela usuarios com o ID do Auth
    const dbUser = {
      id: signUpData.user.id,
      nome: userData.name,
      email: userData.email,
      perfil: userData.role,
      status: userData.status || "ativo",
      organizacao_id: tenantId,
      permissoes: userData.permissions || {},
      departamento_suporte: userData.supportDepartment,
    }

    const { data: savedUser, error: dbError } = await supabase.from("usuarios").insert([dbUser]).select().single()

    if (dbError) {
      throw new Error("Erro ao criar perfil do usuário: " + dbError.message)
    }

    return savedUser
  }

  // Caso tenha permissão admin
  if (!authData.user) {
    throw new Error("Usuário não foi criado no Auth")
  }

  const dbUser = {
    id: authData.user.id,
    nome: userData.name,
    email: userData.email,
    perfil: userData.role,
    status: userData.status || "ativo",
    organizacao_id: tenantId,
    permissoes: userData.permissions || {},
    departamento_suporte: userData.supportDepartment,
  }

  const { data: savedUser, error: dbError } = await supabase.from("usuarios").insert([dbUser]).select().single()

  if (dbError) {
    throw new Error("Erro ao criar perfil do usuário: " + dbError.message)
  }

  return savedUser
}

export const updateExistingUser = async (userData: any, tenantId: string): Promise<any> => {
  const dbUser: any = {
    nome: userData.name,
    email: userData.email,
    perfil: userData.role,
    status: userData.status,
    organizacao_id: tenantId,
    permissoes: userData.permissions || {},
    departamento_suporte: userData.supportDepartment,
  }

  // Atualizar senha se fornecida
  if (userData.password) {
    const { error: pwdError } = await supabase.auth.admin.updateUserById(userData.id, { password: userData.password })
    if (pwdError) {
      console.error("Erro ao atualizar senha:", pwdError.message)
    }
  }

  const { data: savedUser, error: dbError } = await supabase
    .from("usuarios")
    .update(dbUser)
    .eq("id", userData.id)
    .select()
    .single()

  if (dbError) {
    throw new Error("Erro ao atualizar usuário: " + dbError.message)
  }

  return savedUser
}

export const getAuditEntries = async (
  year: number,
  months: string[] = [],
  companies: string[] = [],
  page = 1,
  pageSize = 100,
  searchTerm = "",
  tenantId: string,
) => {
  let query = supabase
    .from("lancamentos_contabeis")
    .select(`
      *,
      plano_contas:conta_contabil_id(id, codigo_contabil, nome),
      centros_resultado:centro_resultado_id(id, codigo, nome)
    `, { count: "exact" })
    .eq("ano", year)
    .eq("organizacao_id", tenantId)

  if (months.length > 0) query = query.in("mes", months)
  if (companies.length > 0) query = query.in("empresa_id", companies)

  if (searchTerm) {
    query = query.or(
      "loja.ilike.%" + searchTerm + "%,historico.ilike.%" + searchTerm + "%",
    )
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query.range(from, to).order("data", { ascending: false })

  if (error) throw error
  return { data: data || [], total: count || 0 }
}

export const adminDeleteUser = async (id: string) => {
  await supabase.from("usuarios").delete().eq("id", id)
}

export const requestPasswordReset = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  return { success: !error, message: error?.message || "" }
}

export const updateUserPassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password })
  return { success: !error, message: error?.message || "" }
}

export const getAuditStats = async (year: number, month: string) => {
  const { data, error } = await supabase.rpc("get_audit_stats", { p_year: year, p_month: month })
  if (error) return { debit: 0, credit: 0, balance: 0 }
  return data
}

// Load aggregated data for DRE reports (all records, with DRE account mapping)
export const getDreAggregatedData = async (
  years: number[],
  tenantId: string,
  accountMappings: { accountingAccountId?: string; conta_contabil_id?: string; dreAccountId?: string; conta_dre_id?: string }[]
): Promise<{ dreAccountId: string; year: number; month: string; valor: number; natureza: string; companyId: string; costCenterId: string }[]> => {
  // Create lookup map from conta_contabil_id to conta_dre_id
  const contaToDreMap = new Map<string, string>()
  accountMappings.forEach(m => {
    const contaId = m.accountingAccountId || m.conta_contabil_id
    const dreId = m.dreAccountId || m.conta_dre_id
    if (contaId && dreId) {
      contaToDreMap.set(contaId, dreId)
    }
  })

  const allData: any[] = []
  const pageSize = 50000

  for (const year of years) {
    let page = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from("lancamentos_contabeis")
        .select("conta_contabil_id, empresa_id, centro_resultado_id, ano, mes, valor, natureza")
        .eq("organizacao_id", tenantId)
        .eq("ano", year)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error("Error loading DRE data:", error)
        break
      }

      if (data && data.length > 0) {
        // Map to DRE accounts
        data.forEach(entry => {
          const dreAccountId = contaToDreMap.get(entry.conta_contabil_id)
          if (dreAccountId) {
            allData.push({
              dreAccountId,
              year: entry.ano,
              month: entry.mes,
              valor: entry.valor || 0,
              natureza: entry.natureza,
              companyId: entry.empresa_id,
              costCenterId: entry.centro_resultado_id
            })
          }
        })
        
        if (data.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      } else {
        hasMore = false
      }

      // Safety limit
      if (allData.length >= 1000000) {
        console.warn("DRE data safety limit reached")
        hasMore = false
      }
    }
  }

  return allData
}

export const getNotifications = async (userId: string, limit = 50): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return []
  return data as Notification[]
}

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await supabase.from("notificacoes").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id)
}

export const createNotification = async (notif: Partial<Notification>): Promise<void> => {
  await supabase.from("notificacoes").insert([notif])
}

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("notificacoes")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("is_read", false)
  if (error) return 0
  return count || 0
}

export const bulkSaveLancamentos = async (entries: TrialBalanceEntry[], tenantId: string): Promise<void> => {
  const enrichedEntries = entries.map((entry) => ({
    empresa_id: entry.companyId || null,
    conta_contabil_id: entry.contaContabilId || null,
    centro_resultado_id: entry.centroResultadoId || null,
    loja: entry.store || entry.empresa || null,
    company_cnpj: entry.companyCnpj || null,
    company_erp_code: entry.companyErpCode || null,
    ano: entry.year,
    mes: entry.month,
    data: entry.data || null,
    valor: entry.valor || 0,
    natureza: entry.natureza || 'D',
    historico: entry.historico || null,
    organizacao_id: tenantId,
  }))

  const { error } = await supabase.from("lancamentos_contabeis").insert(enrichedEntries)
  if (error) throw error
}

export interface SaldosMensaisImportStats {
  totalRows: number;
  success: number;
  accountNotFound: number;
  zeroValues: number;
  invalidData: number;
  deletedRecords: number;
  accountErrors: Array<{ codigo: string; count: number }>;
}

export const bulkSaveSaldosMensais = async (
  entries: MonthlyBalanceEntry[], 
  tenantId: string
): Promise<SaldosMensaisImportStats> => {
  const stats: SaldosMensaisImportStats = {
    totalRows: entries.length,
    success: 0,
    accountNotFound: 0,
    zeroValues: 0,
    invalidData: 0,
    deletedRecords: 0,
    accountErrors: []
  }
  
  // Track account codes not found
  const accountNotFoundMap = new Map<string, number>()

  // First, fetch plano_contas to resolve codigo_contabil to UUID
  const { data: planoContas, error: planoError } = await supabase
    .from("plano_contas")
    .select("id, codigo_contabil")
    .eq("organizacao_id", tenantId)
  
  if (planoError) {
    console.error("[v0-db] Error fetching plano_contas for saldos_mensais import:", planoError)
    throw planoError
  }

  // Create a map of codigo_contabil -> UUID
  const codigoToIdMap = new Map<string, string>()
  planoContas?.forEach(conta => {
    if (conta.codigo_contabil) {
      codigoToIdMap.set(String(conta.codigo_contabil), conta.id)
    }
  })

  console.log("[v0-db] bulkSaveSaldosMensais - plano_contas mapping count:", codigoToIdMap.size)

  // Transform entries to match database schema
  const enrichedEntries = entries
    .map((entry) => {
      // Check for zero/empty values
      if (entry.valor === 0 || entry.valor === null || entry.valor === undefined) {
        stats.zeroValues++
        return null
      }

      // Resolve codigo_contabil to UUID
      const codigoConta = entry.conta_contabil_id || ''
      const contaContabilUuid = codigoToIdMap.get(codigoConta)
      
      if (!contaContabilUuid) {
        stats.accountNotFound++
        // Track which codes were not found
        const currentCount = accountNotFoundMap.get(codigoConta) || 0
        accountNotFoundMap.set(codigoConta, currentCount + 1)
        return null // Skip entries without valid account mapping
      }

      return {
        empresa_id: entry.empresa_id,
        conta_contabil_id: contaContabilUuid,
        ano: entry.ano,
        mes: entry.mes.toUpperCase(),
        valor: entry.valor,
        organizacao_id: tenantId,
      }
    })
    .filter(Boolean) as Array<{
      empresa_id: string;
      conta_contabil_id: string;
      ano: number;
      mes: string;
      valor: number;
      organizacao_id: string;
    }>

  // Convert map to array for stats
  stats.accountErrors = Array.from(accountNotFoundMap.entries())
    .map(([codigo, count]) => ({ codigo, count }))
    .sort((a, b) => b.count - a.count)

  if (enrichedEntries.length === 0) {
    console.warn("[v0-db] No valid entries to save after account mapping")
    return stats
  }

  console.log("[v0-db] Saving", enrichedEntries.length, "saldos_mensais entries (with upsert)")

  // UPSERT strategy: Delete existing records for the same combinations, then insert new ones
  // Group entries by empresa_id + ano + mes to optimize deletions
  const uniqueCombinations = new Map<string, { empresa_id: string; ano: number; mes: string }>()
  enrichedEntries.forEach(entry => {
    const key = `${entry.empresa_id}-${entry.ano}-${entry.mes}`
    if (!uniqueCombinations.has(key)) {
      uniqueCombinations.set(key, {
        empresa_id: entry.empresa_id,
        ano: entry.ano,
        mes: entry.mes
      })
    }
  })

  console.log("[v0-db] Deleting existing records for", uniqueCombinations.size, "empresa/ano/mes combinations before upsert")

  // Delete existing records for each unique combination
  for (const combo of uniqueCombinations.values()) {
    // First count existing records
    const { count: existingCount } = await supabase
      .from("saldos_mensais")
      .select('*', { count: 'exact', head: true })
      .eq("organizacao_id", tenantId)
      .eq("empresa_id", combo.empresa_id)
      .eq("ano", combo.ano)
      .eq("mes", combo.mes)
    
    stats.deletedRecords += existingCount || 0

    // Then delete
    const { error: deleteError } = await supabase
      .from("saldos_mensais")
      .delete()
      .eq("organizacao_id", tenantId)
      .eq("empresa_id", combo.empresa_id)
      .eq("ano", combo.ano)
      .eq("mes", combo.mes)
    
    if (deleteError) {
      console.error("[v0-db] Error deleting existing saldos_mensais:", deleteError)
      throw deleteError
    }
  }

  // Now insert all new entries
  const { error } = await supabase.from("saldos_mensais").insert(enrichedEntries)
  if (error) throw error

  stats.success = enrichedEntries.length
  console.log("[v0-db] Successfully saved", enrichedEntries.length, "saldos_mensais entries")
  
  return stats
}

export const getSaldosMensais = async (
  year: number,
  months: string[] = [],
  companyId = "",
  page = 1,
  pageSize = 100,
  searchTerm = "",
  tenantId: string, // Adicionado parâmetro tenantId obrigatório
) => {
  let query = supabase
    .from("saldos_mensais")
    .select("*", { count: "exact" })
    .eq("ano", year)
    .eq("organizacao_id", tenantId)
  if (months.length > 0) query = query.in("mes", months)
  if (companyId) query = query.eq("empresa_id", companyId)
  if (searchTerm) query = query.or("conta_id.ilike.%" + searchTerm + "%,conta_descricao.ilike.%" + searchTerm + "%")

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { data: data || [], total: count || 0 }
}

export const duplicateReportTemplate = async (templateId: string, newName: string, tenantId: string) => {
  const { data: original, error: fetchError } = await supabase
    .from("modelos_relatorios")
    .select("*")
    .eq("id", templateId)
    .single()
  
  if (fetchError) throw fetchError
  if (!original) throw new Error("Template não encontrado")

  const newTemplate = {
    nome: newName,
    descricao: original.descricao,
    tipo: original.tipo,
    ativo: original.ativo,
    ordem: (original.ordem || 0) + 1,
    organizacao_id: tenantId,
  }

  const { data: inserted, error: insertError } = await supabase
    .from("modelos_relatorios")
    .insert([newTemplate])
    .select()
    .single()
  
  if (insertError) throw insertError

  const { data: lines, error: linesError } = await supabase
    .from("linhas_relatorio")
    .select("*")
    .eq("relatorio_id", templateId)

  if (!linesError && lines && lines.length > 0) {
    const linesWithoutHierarchy = lines
      .filter(line => !line.pai_id)
      .map(line => {
        const { id, criado_em, atualizado_em, ...rest } = line
        return { ...rest, relatorio_id: inserted.id, _original_id: id }
      })

    const linesWithHierarchy = lines
      .filter(line => line.pai_id)
      .map(line => {
        const { id, criado_em, atualizado_em, ...rest } = line
        return { ...rest, relatorio_id: inserted.id, _original_id: id, _original_pai_id: line.pai_id }
      })

    const insertedRoots: any[] = []
    for (const line of linesWithoutHierarchy) {
      const { _original_id, ...lineData } = line
      const { data } = await supabase.from("linhas_relatorio").insert(lineData).select().single()
      if (data) insertedRoots.push({ ...data, _original_id })
    }

    const idMap = new Map<string, string>()
    insertedRoots.forEach(r => idMap.set(r._original_id, r.id))

    for (const line of linesWithHierarchy) {
      const { _original_id, _original_pai_id, ...lineData } = line
      const newPaiId = idMap.get(_original_pai_id)
      if (newPaiId) {
        const { data } = await supabase.from("linhas_relatorio").insert({ ...lineData, pai_id: newPaiId }).select().single()
        if (data) idMap.set(_original_id, data.id)
      }
    }
  }

  return inserted
}

export const getTicketMessages = async (ticketId: string): Promise<TicketMessage[]> => {
  const { data, error } = await supabase
    .from("mensagens_chamado")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
  if (error) return []
  return data as TicketMessage[]
}

export const createTicket = async (ticket: Partial<Ticket>): Promise<Ticket> => {
  const { data, error } = await supabase.from("chamados").insert([ticket]).select().single()
  if (error) throw error
  return data as Ticket
}

export const sendMessage = async (msg: Partial<TicketMessage>): Promise<TicketMessage> => {
  const { data, error } = await supabase.from("mensagens_chamado").insert([msg]).select().single()
  if (error) throw error
  return data as TicketMessage
}

export const updateTicketStatus = async (
  ticketId: string,
  status: TicketStatus,
  assignedTo?: string,
): Promise<void> => {
  const { error } = await supabase
    .from("chamados")
    .update({ status, assigned_to: assignedTo, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
  if (error) throw error
}

export const archiveTicket = async (ticketId: string, archived: boolean): Promise<void> => {
  const { error } = await supabase
    .from("chamados")
    .update({ is_archived: archived, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
  if (error) throw error
}

export const uploadTicketAttachment = async (file: File): Promise<string> => {
  const fileExt = file.name.split(".").pop()
  const fileName = Math.random().toString() + "." + fileExt
  const filePath = "ticket-attachments/" + fileName

  const { error: uploadError } = await supabase.storage.from("attachments").upload(filePath, file)
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from("attachments").getPublicUrl(filePath)
  return data.publicUrl
}

export const mapThemeFields = (theme: Record<string, any>): Record<string, any> => {
  const mapped: Record<string, any> = {}
  for (const [key, value] of Object.entries(theme)) {
    const mappedKey = FIELD_MAP_THEMES[key] || key
    mapped[mappedKey] = value
  }
  return mapped
}

export interface BatchDeleteProgress {
  total: number
  deleted: number
  currentBatch: number
  status: 'counting' | 'deleting' | 'completed' | 'error'
  error?: string
}

export interface BatchDeleteOptions {
  table: 'lancamentos_contabeis' | 'saldos_mensais'
  tenantId: string
  year: number
  month: string
  companyNames?: string[]
  companyIds?: string[]
  batchSize?: number
  onProgress?: (progress: BatchDeleteProgress) => void
}

export const deleteEntriesInBatches = async (options: BatchDeleteOptions): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  const {
    table,
    tenantId,
    year,
    month,
    companyNames,
    companyIds,
    onProgress
  } = options

  const progress: BatchDeleteProgress = {
    total: 0,
    deleted: 0,
    currentBatch: 0,
    status: 'counting'
  }

  const reportProgress = () => {
    if (onProgress) onProgress({ ...progress })
  }

  try {
    reportProgress()

    let countQuery = supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('ano', year)
      .eq('mes', month)
      .eq('organizacao_id', tenantId)

    if (table === 'lancamentos_contabeis' && companyNames && companyNames.length > 0) {
      countQuery = countQuery.in('loja', companyNames)
    } else if (table === 'saldos_mensais' && companyIds && companyIds.length > 0) {
      countQuery = countQuery.in('empresa_id', companyIds)
    }

    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('[v0-db] Count error:', countError)
      throw countError
    }

    progress.total = count || 0
    progress.status = 'deleting'
    reportProgress()

    console.log('[v0-db] Starting direct delete:', { table, year, month, tenantId, total: progress.total })

    if (progress.total === 0) {
      progress.status = 'completed'
      reportProgress()
      return { success: true, deletedCount: 0 }
    }

    let deleteQuery = supabase
      .from(table)
      .delete()
      .eq('ano', year)
      .eq('mes', month)
      .eq('organizacao_id', tenantId)

    if (table === 'lancamentos_contabeis' && companyNames && companyNames.length > 0) {
      deleteQuery = deleteQuery.in('loja', companyNames)
    } else if (table === 'saldos_mensais' && companyIds && companyIds.length > 0) {
      deleteQuery = deleteQuery.in('empresa_id', companyIds)
    }

    console.log('[v0-db] Executing direct delete...')

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('[v0-db] Delete error:', deleteError)
      throw deleteError
    }

    progress.deleted = progress.total
    progress.status = 'completed'
    reportProgress()

    console.log('[v0-db] Delete completed:', { deletedCount: progress.total })
    return { success: true, deletedCount: progress.deleted }
  } catch (err: any) {
    console.error('[v0-db] Delete error:', err)
    progress.status = 'error'
    progress.error = err.message || 'Erro desconhecido'
    reportProgress()
    return { success: false, deletedCount: progress.deleted, error: err.message }
  }
}

// ============================================================
// REGRAS DE ORÇAMENTO AUTOMATIZADO
// ============================================================

export const fetchRegrasOrcamento = async (tenantId: string): Promise<RegraOrcamento[]> => {
  const { data, error } = await supabase
    .from("regras_orcamento")
    .select("*")
    .eq("organizacao_id", tenantId)
    .eq("ativo", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[db] fetchRegrasOrcamento error:", error)
    return []
  }

  if (!data || data.length === 0) return []

  const contaDreIds = [...new Set(data.map(r => r.conta_dre_id).filter(Boolean))]
  const linhaIds = [...new Set(data.map(r => r.linha_referencia_id).filter(Boolean))]

  const [contasResult, linhasResult] = await Promise.all([
    contaDreIds.length > 0 
      ? supabase.from("plano_contas_dre").select("id, nome").in("id", contaDreIds)
      : Promise.resolve({ data: [], error: null }),
    linhaIds.length > 0
      ? supabase.from("linhas_relatorio").select("id, nome").in("id", linhaIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const contasMap = new Map((contasResult.data || []).map((c: any) => [c.id, c.nome]))
  const linhasMap = new Map((linhasResult.data || []).map((l: any) => [l.id, l.nome]))

  return data.map((row: any) => ({
    id: row.id,
    organizacaoId: row.organizacao_id,
    contaDreId: row.conta_dre_id,
    contaDreNome: contasMap.get(row.conta_dre_id) || "",
    tipoConta: row.tipo_conta as TipoConta,
    periodoBaseMeses: row.periodo_base_meses || 6,
    indiceCorrecao: row.indice_correcao as TipoIndice | undefined,
    percentualCorrecao: row.percentual_correcao,
    linhaReferenciaId: row.linha_referencia_id,
    linhaReferenciaNome: linhasMap.get(row.linha_referencia_id) || "",
    percentualSobreLinha: row.percentual_sobre_linha,
    usarPercentualHistorico: row.usar_percentual_historico ?? true,
    departamentoId: row.departamento_id,
    empresaId: row.empresa_id,
    ativo: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export const saveRegraOrcamento = async (regra: Partial<RegraOrcamento> & { organizacaoId: string }): Promise<RegraOrcamento> => {
  const dbData: any = {
    organizacao_id: regra.organizacaoId,
    conta_dre_id: regra.contaDreId,
    tipo_conta: regra.tipoConta,
    periodo_base_meses: regra.periodoBaseMeses || 6,
    indice_correcao: regra.indiceCorrecao,
    percentual_correcao: regra.percentualCorrecao,
    linha_referencia_id: regra.linhaReferenciaId || null,
    percentual_sobre_linha: regra.percentualSobreLinha,
    usar_percentual_historico: regra.usarPercentualHistorico ?? true,
    departamento_id: regra.departamentoId || null,
    empresa_id: regra.empresaId || null,
    ativo: regra.ativo ?? true,
    updated_at: new Date().toISOString(),
  }

  if (regra.id) {
    const { data, error } = await supabase
      .from("regras_orcamento")
      .update(dbData)
      .eq("id", regra.id)
      .select()
      .single()

    if (error) throw error
    return { ...regra, id: data.id } as RegraOrcamento
  } else {
    const { data, error } = await supabase
      .from("regras_orcamento")
      .insert(dbData)
      .select()
      .single()

    if (error) throw error
    return { ...regra, id: data.id } as RegraOrcamento
  }
}

export const deleteRegraOrcamento = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("regras_orcamento")
    .delete()
    .eq("id", id)

  if (error) throw error
}

export const fetchIndicesEconomicos = async (tenantId: string, tipo?: TipoIndice): Promise<IndiceEconomico[]> => {
  let query = supabase
    .from("indices_economicos")
    .select("*")
    .eq("organizacao_id", tenantId)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })

  if (tipo) {
    query = query.eq("tipo", tipo)
  }

  const { data, error } = await query

  if (error) {
    console.error("[db] fetchIndicesEconomicos error:", error)
    throw error
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    organizacaoId: row.organizacao_id,
    tipo: row.tipo as TipoIndice,
    ano: row.ano,
    mes: row.mes,
    valor: parseFloat(row.valor) || 0,
    createdAt: row.created_at,
  }))
}

export const saveIndiceEconomico = async (indice: Partial<IndiceEconomico> & { organizacaoId: string }): Promise<IndiceEconomico> => {
  const dbData = {
    organizacao_id: indice.organizacaoId,
    tipo: indice.tipo,
    ano: indice.ano,
    mes: indice.mes,
    valor: indice.valor,
  }

  if (indice.id) {
    const { data, error } = await supabase
      .from("indices_economicos")
      .update(dbData)
      .eq("id", indice.id)
      .select()
      .single()

    if (error) throw error
    return { ...indice, id: data.id } as IndiceEconomico
  } else {
    const { data, error } = await supabase
      .from("indices_economicos")
      .insert(dbData)
      .select()
      .single()

    if (error) throw error
    return { ...indice, id: data.id } as IndiceEconomico
  }
}

export const fetchHistoricoContas = async (
  tenantId: string,
  contaDreId: string,
  periodoMeses: number
): Promise<{ ano: number; mes: string; valor: number }[]> => {
  const { data: mappings, error: mappingsError } = await supabase
    .from("mapeamento_contas")
    .select("conta_contabil_id")
    .eq("organizacao_id", tenantId)
    .eq("conta_dre_id", contaDreId)

  if (mappingsError) {
    console.error("[db] fetchHistoricoContas mappings error:", mappingsError)
    return []
  }

  const contaContabilIds = (mappings || [])
    .map(m => m.conta_contabil_id)
    .filter(Boolean)

  if (contaContabilIds.length === 0) {
    console.log("[db] fetchHistoricoContas: No accounting accounts mapped to DRE account", { contaDreId })
    return []
  }

  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth()
  const anoInicio = mesAtual < periodoMeses ? anoAtual - 1 : anoAtual
  
  const { data, error } = await supabase
    .from("saldos_mensais")
    .select("ano, mes, valor")
    .eq("organizacao_id", tenantId)
    .in("conta_contabil_id", contaContabilIds)
    .gte("ano", anoInicio)
    .order("ano", { ascending: false })
    .limit(periodoMeses * contaContabilIds.length * 2)

  if (error) {
    console.error("[db] fetchHistoricoContas error:", error)
    return []
  }

  const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                     "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  
  const totaisPorMes = new Map<string, { ano: number; mesNum: number; valor: number }>()
  for (const row of data || []) {
    const mesNum = typeof row.mes === 'number' ? row.mes : mesesNomes.indexOf(row.mes) + 1
    const chave = `${row.ano}-${String(mesNum).padStart(2, '0')}`
    const atual = totaisPorMes.get(chave) || { ano: row.ano, mesNum, valor: 0 }
    atual.valor += Math.abs(parseFloat(row.valor) || 0)
    totaisPorMes.set(chave, atual)
  }

  return Array.from(totaisPorMes.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, periodoMeses)
    .map(([, v]) => ({
      ano: v.ano,
      mes: mesesNomes[v.mesNum - 1] || String(v.mesNum),
      valor: v.valor,
    }))
}

export const fetchContasDRE = async (tenantId: string): Promise<{ id: string; nome: string; codigo?: string }[]> => {
  const { data, error } = await supabase
    .from("plano_contas_dre")
    .select("id, nome, codigo_reduzido")
    .eq("organizacao_id", tenantId)
    .order("codigo_reduzido", { ascending: true })

  if (error) {
    console.error("[db] fetchContasDRE error:", error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    nome: row.nome,
    codigo: row.codigo_reduzido,
  }))
}

export const fetchLinhasTotalizadoras = async (tenantId: string): Promise<{ id: string; nome: string; codigo?: string }[]> => {
  const { data, error } = await supabase
    .from("linhas_relatorio")
    .select("id, nome, codigo")
    .eq("organizacao_id", tenantId)
    .in("tipo", ["total", "formula"])
    .order("ordem", { ascending: true })

  if (error) {
    console.error("[db] fetchLinhasTotalizadoras error:", error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
  }))
}

export const fetchTotalLinhaDRE = async (
  tenantId: string,
  linhaReferenciaId: string,
  periodoMeses: number
): Promise<number> => {
  const { data, error } = await supabase
    .from("linhas_relatorio")
    .select("conta_dre_id, contas_origem")
    .eq("id", linhaReferenciaId)
    .single()

  if (error || !data) {
    console.error("[db] fetchTotalLinhaDRE error:", error)
    return 0
  }

  const dreAccountIds: string[] = []
  if (data.conta_dre_id) dreAccountIds.push(data.conta_dre_id)
  if (data.contas_origem && Array.isArray(data.contas_origem)) {
    dreAccountIds.push(...data.contas_origem)
  }

  if (dreAccountIds.length === 0) return 0

  const { data: mappings, error: mappingsError } = await supabase
    .from("mapeamento_contas")
    .select("conta_contabil_id")
    .eq("organizacao_id", tenantId)
    .in("conta_dre_id", dreAccountIds)

  if (mappingsError) {
    console.error("[db] fetchTotalLinhaDRE mappings error:", mappingsError)
    return 0
  }

  const contaContabilIds = (mappings || [])
    .map(m => m.conta_contabil_id)
    .filter(Boolean)

  if (contaContabilIds.length === 0) {
    console.log("[db] fetchTotalLinhaDRE: No accounting accounts mapped to DRE accounts", { dreAccountIds })
    return 0
  }

  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth()
  
  const anoInicio = mesAtual < periodoMeses ? anoAtual - 1 : anoAtual

  const { data: saldos, error: saldosError } = await supabase
    .from("saldos_mensais")
    .select("ano, mes, valor")
    .eq("organizacao_id", tenantId)
    .in("conta_contabil_id", contaContabilIds)
    .gte("ano", anoInicio)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .limit(periodoMeses * contaContabilIds.length * 2)

  if (saldosError) {
    console.error("[db] fetchTotalLinhaDRE saldos error:", saldosError)
    return 0
  }

  if (!saldos || saldos.length === 0) {
    console.log("[db] fetchTotalLinhaDRE: No balances found", { contaContabilIds: contaContabilIds.slice(0, 5) })
    return 0
  }

  const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                     "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  
  const totaisPorMes = new Map<string, number>()
  for (const saldo of saldos) {
    const mesNum = typeof saldo.mes === 'number' ? saldo.mes : mesesNomes.indexOf(saldo.mes) + 1
    const chave = `${saldo.ano}-${String(mesNum).padStart(2, '0')}`
    const valorAtual = totaisPorMes.get(chave) || 0
    totaisPorMes.set(chave, valorAtual + Math.abs(parseFloat(saldo.valor) || 0))
  }

  const mesesOrdenados = Array.from(totaisPorMes.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, periodoMeses)

  const totalAcumulado = mesesOrdenados.reduce((acc, [, valor]) => acc + valor, 0)
  const mesesComDados = mesesOrdenados.length
  const mediaMensal = mesesComDados > 0 ? totalAcumulado / mesesComDados : 0

  console.log("[db] fetchTotalLinhaDRE result:", { linhaReferenciaId, mediaMensal, mesesComDados, totalAcumulado })

  return mediaMensal
}
