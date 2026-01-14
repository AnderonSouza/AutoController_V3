import { supabase } from "./supabaseClient"
import type { EconomicGroup } from "../types"

const PRODUCTION_DOMAINS = ["autocontroller.ai", "autocontroller.io", "autocontroller.com.br"]

const DEVELOPMENT_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "v0.app",
  "v0.dev",
  "vercel.app",
  "vercel.dev",
  "netlify.app",
  "pages.dev",
  "vusercontent.net",
  "replit.dev",
  "replit.app",
  "picard.replit.dev",
]

export const ADMIN_CONSOLE_SUBDOMAIN = "console"

/**
 * Verifica se está acessando o console administrativo (console.autocontroller.ai)
 */
export function isAdminConsole(): boolean {
  if (typeof window === "undefined") return false

  const hostname = window.location.hostname.toLowerCase()

  // Em desenvolvimento, verificar parâmetro ?console=true
  const isDevelopmentEnv = DEVELOPMENT_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))

  if (isDevelopmentEnv) {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get("console") === "true"
  }

  // Em produção, verificar se é console.autocontroller.ai
  for (const domain of PRODUCTION_DOMAINS) {
    if (hostname === `${ADMIN_CONSOLE_SUBDOMAIN}.${domain}`) {
      return true
    }
  }

  return false
}

/**
 * Extrai o subdomínio da URL atual
 * Exemplos:
 * - viamargrupo.autocontroller.ai -> "viamargrupo"
 * - console.autocontroller.ai -> null (subdomínio admin, não é tenant)
 * - www.autocontroller.ai -> null (subdomínio padrão)
 * - localhost:3000 -> null
 */
export function getSubdomainFromUrl(): string | null {
  if (typeof window === "undefined") return null

  const hostname = window.location.hostname.toLowerCase()

  // Lista de subdomínios que não são tenants
  const reservedSubdomains = ["www", "app", "api", "admin", "staging", "dev", "preview", "console"]

  const isDevelopmentEnv = DEVELOPMENT_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))

  if (isDevelopmentEnv) {
    // Em desenvolvimento, verificar parâmetro de tenant na URL
    const urlParams = new URLSearchParams(window.location.search)
    const tenantParam = urlParams.get("tenant")
    if (tenantParam) return tenantParam

    // Verificar localStorage para desenvolvimento
    const savedTenant = localStorage.getItem("dev_tenant_subdomain")
    if (savedTenant) return savedTenant

    return null
  }

  const isProductionDomain = PRODUCTION_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))

  if (!isProductionDomain) {
    // Não é um domínio de produção conhecido, não extrair subdomínio
    return null
  }

  // Produção: extrair subdomínio
  // hostname = viamargrupo.autocontroller.ai
  // parts = ['viamargrupo', 'autocontroller', 'ai']
  const parts = hostname.split(".")

  // Se tiver 3 ou mais partes e não for um subdomínio reservado
  if (parts.length >= 3) {
    const subdomain = parts[0]
    if (!reservedSubdomains.includes(subdomain)) {
      return subdomain
    }
  }

  return null
}

/**
 * Busca os dados do tenant pelo subdomínio
 * Usa função SECURITY DEFINER para bypass de RLS
 */
export async function getTenantBySubdomain(subdomain: string): Promise<EconomicGroup | null> {
  try {
    // Usar a função RPC que criamos no banco
    const { data, error } = await supabase.rpc("get_tenant_by_subdomain", { p_subdomain: subdomain })

    if (error) {
      console.error("Erro ao buscar tenant por subdomain:", error)
      // Fallback: buscar diretamente (pode falhar se RLS bloquear)
      return await getTenantBySubdomainDirect(subdomain)
    }

    if (!data || data.length === 0) {
      return null
    }

    const tenant = data[0]

    // Mapear para o formato EconomicGroup
    const economicGroup: EconomicGroup = {
      id: tenant.id,
      name: tenant.nome,
      logo: tenant.logo,
      subdomain: tenant.subdomain,
      interfaceConfig: tenant.config_interface || {},
    }

    // Expandir config_interface para os campos diretos
    if (tenant.config_interface) {
      Object.assign(economicGroup, tenant.config_interface)
    }

    return economicGroup
  } catch (err) {
    console.error("Erro ao buscar tenant:", err)
    return null
  }
}

/**
 * Fallback: busca direta na tabela (pode falhar com RLS)
 */
async function getTenantBySubdomainDirect(subdomain: string): Promise<EconomicGroup | null> {
  const { data, error } = await supabase
    .from("organizacoes")
    .select("id, nome, logo, config_interface, subdomain")
    .ilike("subdomain", subdomain)
    .single()

  if (error || !data) {
    return null
  }

  const economicGroup: EconomicGroup = {
    id: data.id,
    name: data.nome,
    logo: data.logo,
    subdomain: data.subdomain,
    interfaceConfig: data.config_interface || {},
  }

  if (data.config_interface) {
    Object.assign(economicGroup, data.config_interface)
  }

  return economicGroup
}

/**
 * Gera a URL completa para um tenant
 */
export function getTenantUrl(subdomain: string, baseDomain = "autocontroller.ai"): string {
  if (process.env.NODE_ENV === "development") {
    return `http://localhost:3000?tenant=${subdomain}`
  }
  return `https://${subdomain}.${baseDomain}`
}

/**
 * Valida se um subdomínio é válido
 */
export function isValidSubdomain(subdomain: string): { valid: boolean; error?: string } {
  // Mínimo 3 caracteres, máximo 30
  if (subdomain.length < 3) {
    return { valid: false, error: "Subdomínio deve ter pelo menos 3 caracteres" }
  }
  if (subdomain.length > 30) {
    return { valid: false, error: "Subdomínio deve ter no máximo 30 caracteres" }
  }

  // Apenas letras minúsculas, números e hífens
  const regex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
  if (!regex.test(subdomain)) {
    return {
      valid: false,
      error:
        "Subdomínio deve conter apenas letras minúsculas, números e hífens. Não pode começar ou terminar com hífen.",
    }
  }

  // Não pode ter hífens consecutivos
  if (subdomain.includes("--")) {
    return { valid: false, error: "Subdomínio não pode conter hífens consecutivos" }
  }

  // Subdomínios reservados
  const reserved = [
    "www",
    "app",
    "api",
    "admin",
    "staging",
    "dev",
    "test",
    "mail",
    "smtp",
    "ftp",
    "cdn",
    "static",
    "console",
  ]
  if (reserved.includes(subdomain)) {
    return { valid: false, error: "Este subdomínio está reservado" }
  }

  return { valid: true }
}

/**
 * Verifica se um subdomínio já está em uso
 */
export async function isSubdomainAvailable(subdomain: string, excludeGroupId?: string): Promise<boolean> {
  let query = supabase.from("organizacoes").select("id").ilike("subdomain", subdomain)

  if (excludeGroupId) {
    query = query.neq("id", excludeGroupId)
  }

  const { data, error } = await query.single()

  // Se não encontrou nenhum registro, está disponível
  return error?.code === "PGRST116" || !data
}
