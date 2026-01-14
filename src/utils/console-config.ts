import { supabase } from "./supabaseClient"

// Tipo para as configurações do console
export interface ConsoleConfig {
  id?: string
  logoUrl: string
  companyName: string
  tagline: string
  primaryColor: string      // Cor principal: sidebar, botões
  backgroundColor: string   // Cor de fundo da aplicação
  accentColor: string       // Cor de destaque: links, badges, seleções
  loginIllustrationUrl?: string
  loginVideoUrl?: string
  splashVideoUrl?: string   // Vídeo de animação para a tela de carregamento inicial
  updatedAt?: string
  updatedBy?: string
}

// Configurações padrão
export const DEFAULT_CONSOLE_CONFIG: ConsoleConfig = {
  logoUrl: "/images/autocontroller-logo.png",
  companyName: "AutoController.ai",
  tagline: "Plataforma de Gestão Financeira Inteligente",
  primaryColor: "#1e3a5f",
  backgroundColor: "#f8fafc",
  accentColor: "#0891b2",
  loginIllustrationUrl: "",
  loginVideoUrl: "",
  splashVideoUrl: "",
}

// Função para calcular cor de hover (clarear 15%)
export function lightenColor(hex: string, percent: number = 15): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt)
  const B = Math.min(255, (num & 0x0000ff) + amt)
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`
}

// Função para calcular luminância relativa (WCAG 2.1)
// Retorna valor entre 0 (preto) e 1 (branco)
export function getRelativeLuminance(hex: string): number {
  const rgb = parseInt(hex.replace("#", ""), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = rgb & 0xff
  
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

// Determina se deve usar texto claro ou escuro baseado na luminância do fundo
// Retorna 'light' para fundos escuros e 'dark' para fundos claros
export function getContrastingTextColor(backgroundColor: string): { 
  textColor: string
  textColorHover: string
  textColorMuted: string 
} {
  const luminance = getRelativeLuminance(backgroundColor)
  
  // Se luminância < 0.5, fundo é escuro -> usar texto claro
  if (luminance < 0.5) {
    return {
      textColor: "#ffffff",
      textColorHover: "#e2e8f0",
      textColorMuted: "rgba(255, 255, 255, 0.7)"
    }
  } else {
    // Fundo é claro -> usar texto escuro
    return {
      textColor: "#1e293b",
      textColorHover: "#334155",
      textColorMuted: "rgba(30, 41, 59, 0.7)"
    }
  }
}

// Mapeamento de campos do banco para o TypeScript
const FIELD_MAP = {
  logo_url: "logoUrl",
  company_name: "companyName",
  tagline: "tagline",
  primary_color: "primaryColor",
  background_color: "backgroundColor",
  accent_color: "accentColor",
  login_illustration_url: "loginIllustrationUrl",
  login_video_url: "loginVideoUrl",
  splash_video_url: "splashVideoUrl",
  updated_at: "updatedAt",
  updated_by: "updatedBy",
} as const

// Mapeamento inverso (TypeScript para banco)
const REVERSE_FIELD_MAP = Object.fromEntries(Object.entries(FIELD_MAP).map(([k, v]) => [v, k])) as Record<
  string,
  string
>

// Converter dados do banco para o formato TypeScript
function mapFromDb(data: Record<string, any>): ConsoleConfig {
  const result: Record<string, any> = { ...DEFAULT_CONSOLE_CONFIG }
  for (const [dbKey, tsKey] of Object.entries(FIELD_MAP)) {
    if (data[dbKey] !== undefined && data[dbKey] !== null) {
      result[tsKey] = data[dbKey]
    }
  }
  if (data.id) result.id = data.id
  console.log("[v0] Console config mapped:", { 
    primaryColor: result.primaryColor, 
    backgroundColor: result.backgroundColor, 
    accentColor: result.accentColor 
  })
  return result as ConsoleConfig
}

// Converter dados do TypeScript para o formato do banco
function mapToDb(data: Partial<ConsoleConfig>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [tsKey, value] of Object.entries(data)) {
    if (tsKey === "id") {
      result.id = value
    } else if (REVERSE_FIELD_MAP[tsKey]) {
      result[REVERSE_FIELD_MAP[tsKey]] = value
    }
  }
  return result
}

// Buscar configurações do console
export async function getConsoleConfig(): Promise<ConsoleConfig> {
  try {
    const { data, error } = await supabase.from("console_config").select("*").limit(1).single()

    if (error) {
      console.warn("[v0] Usando config padrão do console:", error.message)
      return { ...DEFAULT_CONSOLE_CONFIG }
    }

    console.log("[v0] Console config loaded from DB:", data)
    return mapFromDb(data)
  } catch (err) {
    console.error("[v0] Erro ao buscar config do console:", err)
    return { ...DEFAULT_CONSOLE_CONFIG }
  }
}

// Salvar configurações do console
export async function saveConsoleConfig(config: Partial<ConsoleConfig>): Promise<{ success: boolean; error?: string }> {
  try {
    // Primeiro, verificar se já existe uma configuração
    const { data: existing } = await supabase.from("console_config").select("id").limit(1).single()

    const dbData = mapToDb(config)

    if (existing?.id) {
      // Atualizar configuração existente
      const { error } = await supabase.from("console_config").update(dbData).eq("id", existing.id)

      if (error) {
        console.error("[v0] Erro ao atualizar config:", error)
        return { success: false, error: error.message }
      }
    } else {
      // Inserir nova configuração
      const { error } = await supabase.from("console_config").insert(dbData)

      if (error) {
        console.error("[v0] Erro ao inserir config:", error)
        return { success: false, error: error.message }
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error("[v0] Erro ao salvar config:", err)
    return { success: false, error: err.message || "Erro desconhecido" }
  }
}

// Upload de logo para o Supabase Storage
export async function uploadConsoleLogo(file: File): Promise<{ url: string | null; error?: string }> {
  try {
    const fileExt = file.name.split(".").pop()
    const fileName = `console-logo-${Date.now()}.${fileExt}`
    const filePath = `console/${fileName}`

    // Upload para o bucket 'logos'
    const { error: uploadError } = await supabase.storage.from("logos").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (uploadError) {
      console.error("[v0] Erro no upload:", uploadError)
      return { url: null, error: uploadError.message }
    }

    // Obter URL pública
    const { data } = supabase.storage.from("logos").getPublicUrl(filePath)

    return { url: data.publicUrl }
  } catch (err: any) {
    console.error("[v0] Erro no upload da logo:", err)
    return { url: null, error: err.message || "Erro no upload" }
  }
}

const THEME_CACHE_KEY = "autocontroller_theme_cache"

// Salvar tema no localStorage para carregamento instantâneo
function cacheTheme(config: ConsoleConfig) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({
      primaryColor: config.primaryColor,
      backgroundColor: config.backgroundColor,
      accentColor: config.accentColor,
      timestamp: Date.now()
    }))
  } catch (e) {
    console.warn("[v0] Failed to cache theme:", e)
  }
}

// Carregar tema do cache (síncrono - para usar antes do primeiro render)
export function getCachedTheme(): Partial<ConsoleConfig> | null {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      // Cache válido por 24 horas
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed
      }
    }
  } catch (e) {
    console.warn("[v0] Failed to load cached theme:", e)
  }
  return null
}

// Aplicar tema do cache imediatamente (deve ser chamado o mais cedo possível)
export function applyThemeFromCache() {
  const cached = getCachedTheme()
  if (cached && cached.primaryColor && cached.backgroundColor && cached.accentColor) {
    applyConsoleTheme({
      ...DEFAULT_CONSOLE_CONFIG,
      primaryColor: cached.primaryColor,
      backgroundColor: cached.backgroundColor,
      accentColor: cached.accentColor
    })
    return true
  }
  return false
}

// Aplicar configurações do console ao documento (tema unificado)
export function applyConsoleTheme(config: ConsoleConfig) {
  const root = document.documentElement
  
  console.log("[v0] Applying console theme:", { 
    primaryColor: config.primaryColor, 
    backgroundColor: config.backgroundColor, 
    accentColor: config.accentColor 
  })
  
  // Cores principais
  root.style.setProperty("--color-primary", config.primaryColor)
  root.style.setProperty("--color-primary-hover", lightenColor(config.primaryColor, 15))
  root.style.setProperty("--color-bg-app", config.backgroundColor)
  root.style.setProperty("--color-accent", config.accentColor)
  
  // Sidebar usa cor primária
  root.style.setProperty("--color-bg-sidebar", config.primaryColor)
  
  // Calcular cores de texto contrastantes para a sidebar
  const sidebarTextColors = getContrastingTextColor(config.primaryColor)
  root.style.setProperty("--color-sidebar-text", sidebarTextColors.textColor)
  root.style.setProperty("--color-sidebar-text-hover", sidebarTextColors.textColorHover)
  root.style.setProperty("--color-sidebar-text-muted", sidebarTextColors.textColorMuted)
  
  // Calcular cores de texto para elementos sobre a cor primária (botões, etc)
  const primaryTextColors = getContrastingTextColor(config.primaryColor)
  root.style.setProperty("--color-on-primary", primaryTextColors.textColor)
  
  // Tokens shadcn
  root.style.setProperty("--primary", config.primaryColor)
  root.style.setProperty("--primary-foreground", primaryTextColors.textColor)
  root.style.setProperty("--accent", config.accentColor)
  root.style.setProperty("--background", config.backgroundColor)
  
  // Salvar no cache para próximo carregamento
  cacheTheme(config)
}
