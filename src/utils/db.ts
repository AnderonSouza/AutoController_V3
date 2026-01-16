import { supabase } from "./supabaseClient"
import type {
  TrialBalanceEntry,
  Ticket,
  TicketMessage,
  TicketStatus,
  Notification,
  MonthlyBalanceEntry,
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
  const { error } = await supabase.from(dbTable).delete().eq("id", id)
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
        if (item[appKey] !== undefined) {
          obj[dbKey] = item[appKey]
          if (appKey !== dbKey) delete obj[appKey]
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

    if (dbTable === "linhas_relatorio") {
      const obj: any = {}
      Object.entries(FIELD_MAP_REPORT_LINES).forEach(([appKey, dbKey]) => {
        if (item[appKey] !== undefined) {
          obj[dbKey] = item[appKey]
        }
      })
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

export const bulkSaveSaldosMensais = async (entries: MonthlyBalanceEntry[], tenantId: string): Promise<void> => {
  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    organizacao_id: tenantId,
  }))

  const { error } = await supabase.from("saldos_mensais").insert(enrichedEntries)
  if (error) throw error
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
    const idMap = new Map<string, string>()
    
    const newLines = lines.map(line => {
      const newId = crypto.randomUUID()
      idMap.set(line.id, newId)
      return {
        ...line,
        id: newId,
        relatorio_id: inserted.id,
        pai_id: null as string | null,
      }
    })

    newLines.forEach((line, idx) => {
      const originalPaiId = lines[idx].pai_id
      if (originalPaiId && idMap.has(originalPaiId)) {
        line.pai_id = idMap.get(originalPaiId) || null
      }
    })

    await supabase.from("linhas_relatorio").insert(newLines)
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
