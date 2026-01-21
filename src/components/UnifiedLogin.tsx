"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "../utils/supabaseClient"
import { TenantSelector } from "./TenantSelector"
import type { EconomicGroup, LoginAnnouncement } from "../types"
import { Info, AlertTriangle, AlertCircle, CheckCircle, X } from "lucide-react"
import { applyConsoleTheme, DEFAULT_CONSOLE_CONFIG } from "../utils/console-config"

const AnnouncementBanner: React.FC<{ announcement: LoginAnnouncement | undefined }> = ({ announcement }) => {
  const [dismissed, setDismissed] = useState(false)
  
  if (!announcement?.enabled || !announcement?.text || dismissed) return null
  
  const now = new Date()
  const startDate = announcement.startDate ? new Date(announcement.startDate) : null
  const endDate = announcement.endDate ? new Date(announcement.endDate) : null
  
  if (endDate && now > endDate) return null
  if (startDate && now < startDate) return null
  
  const typeConfig = {
    info: { icon: <Info className="w-4 h-4" />, color: "#3b82f6" },
    warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "#f59e0b" },
    error: { icon: <AlertCircle className="w-4 h-4" />, color: "#ef4444" },
    success: { icon: <CheckCircle className="w-4 h-4" />, color: "#22c55e" },
  }[announcement.type] || { icon: <Info className="w-4 h-4" />, color: "#3b82f6" }
  
  return (
    <div 
      className="flex items-center gap-3 px-4 py-3 text-sm"
      style={{ backgroundColor: `${typeConfig.color}15`, borderLeft: `4px solid ${typeConfig.color}` }}
    >
      <span style={{ color: typeConfig.color }}>{typeConfig.icon}</span>
      <span className="flex-1 text-slate-700">{announcement.text}</span>
      {announcement.linkEnabled && announcement.linkText && announcement.linkUrl && (
        <a 
          href={announcement.linkUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-medium hover:underline whitespace-nowrap"
          style={{ color: typeConfig.color }}
        >
          {announcement.linkText}
        </a>
      )}
      <button 
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-slate-600 p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ConsoleConfig {
  logoUrl?: string
  loginVideoUrl?: string
  splashVideoUrl?: string
  companyName: string
  tagline: string
  primaryColor: string
  backgroundColor: string
  accentColor: string
}

interface UnifiedLoginProps {
  isConsole?: boolean
  tenantInfo?: { name: string; logo?: string } | null
  onLogin: (email: string, password: string) => Promise<string | void | undefined>
}

const UnifiedLogin: React.FC<UnifiedLoginProps> = ({ isConsole: isConsoleProp = false, tenantInfo, onLogin }) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<ConsoleConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [error, setError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [tenants, setTenants] = useState<EconomicGroup[]>([])
  const [currentTenant, setCurrentTenant] = useState<EconomicGroup | null>(null)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [splashTimerComplete, setSplashTimerComplete] = useState(false)
  
  // Detect console mode internally from URL to avoid race condition with App.tsx
  const isConsole = typeof window !== "undefined" 
    ? new URLSearchParams(window.location.search).get("console") === "true" || isConsoleProp
    : isConsoleProp

  useEffect(() => {
    loadConfig()
    loadTenants()
  }, [isConsole])

  useEffect(() => {
    if (loadingConfig) return
    
    if (config?.splashVideoUrl) {
      console.log("[v0] Starting splash timer for 3 seconds")
      const timer = setTimeout(() => {
        console.log("[v0] Splash timer complete")
        setSplashTimerComplete(true)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setSplashTimerComplete(true)
    }
  }, [config?.splashVideoUrl, loadingConfig])

  // Aplica o tema global do console_config (apenas SUPER_ADMIN pode alterar cores)
  useEffect(() => {
    if (!config) return
    
    console.log("[v0] Applying global theme from console_config:", { 
      primaryColor: config.primaryColor, 
      backgroundColor: config.backgroundColor, 
      accentColor: config.accentColor 
    })
    
    applyConsoleTheme({
      ...DEFAULT_CONSOLE_CONFIG,
      primaryColor: config.primaryColor,
      backgroundColor: config.backgroundColor,
      accentColor: config.accentColor,
      logoUrl: config.logoUrl || DEFAULT_CONSOLE_CONFIG.logoUrl,
      companyName: config.companyName || DEFAULT_CONSOLE_CONFIG.companyName,
    })
  }, [config])

  const loadConfig = async () => {
    try {
      setLoadingConfig(true)
      
      // Timeout de 10 segundos para garantir que a página não fique travada
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 10000)
      })
      
      const queryPromise = supabase.from("console_config").select("*").single()
      const { data, error: err } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (err) {
        console.log("[v0] Erro ao carregar config:", err.message)
        setLoadingConfig(false)
        return
      }

      console.log("[v0] Splash video URL from DB:", data.splash_video_url)
      
      setConfig({
        logoUrl: data.logo_url,
        loginVideoUrl: data.login_video_url,
        splashVideoUrl: data.splash_video_url,
        companyName: data.company_name || "",
        tagline: data.tagline || "",
        primaryColor: data.primary_color || "var(--color-sidebar-icon-bar)",
        backgroundColor: data.background_color || "#f8fafc",
        accentColor: data.accent_color || "#000000",
      })

      if (data.logo_url) {
        updateFavicon(data.logo_url)
      }
    } catch (err) {
      console.log("[v0] Erro geral ao carregar config:", err)
    } finally {
      setLoadingConfig(false)
    }
  }

  const loadTenants = async () => {
    setLoadingTenants(true)
    try {
      console.log("[v0] Loading tenants from organizacoes table...")
      
      // Timeout de 10 segundos para garantir que a página não fique travada
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 10000)
      })
      
      const queryPromise = supabase
        .from("organizacoes")
        .select("id, name:nome, subdomain, logo, logo_dark, login_announcement, login_background_url, login_background_type, config_interface")
        .order("nome")
      
      const { data, error: err } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (err) {
        console.log("[v0] Erro ao carregar tenants de 'organizacoes':", err.message)

        const isDev =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" || 
           window.location.hostname.includes("vusercontent") ||
           window.location.hostname.includes("replit.dev") ||
           window.location.hostname.includes("replit.app") ||
           window.location.hostname.includes("repl.co"))

        if (isDev) {
          console.log("[v0] Usando mock data de tenants para desenvolvimento")
          const mockTenants: EconomicGroup[] = [
            {
              id: "mock-viamar",
              name: "Grupo Viamar",
              subdomain: "viamargrupo",
              logo: undefined,
              interfaceConfig: {},
            },
            {
              id: "mock-faberge",
              name: "Grupo Faberge",
              subdomain: "fabergegrupo",
              logo: undefined,
              interfaceConfig: {},
            },
          ]
          setTenants(mockTenants)
          setLoadingTenants(false)
          return
        }
        setLoadingTenants(false)
        return
      }

      console.log("[v0] Tenants loaded:", data?.length || 0, "organizations")
      const mappedTenants: EconomicGroup[] = (data || []).map((org: any) => {
        const bgUrl = org.login_background_url || undefined
        let bgType = org.login_background_type || undefined
        
        if (bgUrl && !bgType) {
          const lowerUrl = bgUrl.toLowerCase()
          if (lowerUrl.includes('/video/') || lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov')) {
            bgType = 'video'
          } else if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.gif') || lowerUrl.includes('.webp')) {
            bgType = 'image'
          }
        }
        
        return {
          id: org.id,
          name: org.name,
          subdomain: org.subdomain,
          logo: org.logo,
          logoDark: org.logo_dark,
          loginAnnouncement: org.login_announcement,
          loginBackgroundUrl: bgUrl,
          loginBackgroundType: bgType,
          interfaceConfig: org.config_interface || {},
        }
      })

      setTenants(mappedTenants)

      const urlParams = new URLSearchParams(window.location.search)
      const tenantParam = urlParams.get("tenant")
      const storedTenant = localStorage.getItem("dev_tenant_subdomain")

      const selectedSubdomain = tenantParam || storedTenant
      if (selectedSubdomain && mappedTenants) {
        const found = mappedTenants.find((t) => t.subdomain === selectedSubdomain)
        if (found) {
          setCurrentTenant(found)
        }
      }
    } catch (err) {
      console.log("[v0] Erro geral ao carregar tenants:", err)
    } finally {
      setLoadingTenants(false)
    }
  }

  const updateFavicon = (logoUrl: string) => {
    const existingLink = document.querySelector("link[rel~='icon']")
    const link = (existingLink || document.createElement("link")) as HTMLLinkElement
    link.rel = "icon"
    link.href = logoUrl
    if (!existingLink) document.head.appendChild(link)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      console.log("[v0] Login attempt with email:", email)
      const result = await onLogin(email, password)
      
      if (result && typeof result === "string") {
        console.log("[v0] Login error returned:", result)
        setError(result)
        setLoading(false)
        return
      }
      
      console.log("[v0] Login successful, App.tsx will handle navigation")
    } catch (err: any) {
      console.log("[v0] Login exception:", err.message)
      setError(err.message || "Erro ao fazer login")
      setLoading(false)
    }
  }

  const companyName = config?.companyName || ""
  
  // Splash removido da tela de login - agora aparece após o login no App.tsx

  const isInitialLoading = loadingConfig && !config

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        {/* Tela branca enquanto carrega config - evita mostrar spinner antes do splash */}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header
        className="h-14 flex items-center px-6 py-2 border-b border-gray-200 flex-shrink-0 bg-white"
      >
        <div className="flex items-center gap-3 flex-1">
          {config?.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" className="h-13 w-13 object-contain" />
          ) : companyName ? (
            <div
              className="h-10 w-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-base font-bold shadow-sm"
              style={{ color: 'var(--color-primary)' }}
            >
              {companyName.substring(0, 2).toUpperCase()}
            </div>
          ) : null}
          <span className="text-lg font-bold text-gray-900">{companyName}</span>
        </div>

        <div className="flex items-center gap-3">
          <TenantSelector
            tenants={tenants}
            currentTenant={currentTenant}
            isLoading={loadingTenants}
            onTenantChange={(tenant) => {
              setCurrentTenant(tenant)
            }}
          />

          <button
            onClick={() => {
              const url = new URL(window.location.href)
              if (url.searchParams.has("console")) {
                url.searchParams.delete("console")
              } else {
                url.searchParams.set("console", "true")
              }
              window.location.href = url.toString()
            }}
            className="px-4 py-2 bg-primary hover:bg-primary-hover rounded text-on-primary text-sm font-medium transition-colors"
          >
            {isConsole ? "Sair do Console" : "Ir para Console"}
          </button>
        </div>
      </header>

      {/* Announcement Banner - Only show for tenant login, not console */}
      {!isConsole && currentTenant?.loginAnnouncement && (
        <AnnouncementBanner announcement={currentTenant.loginAnnouncement} />
      )}

      <main className="flex-1 flex min-h-0">
        <div className="w-1/2 flex items-center justify-center px-12 bg-white">
          <div className="w-full max-w-md">
            {/* Logo em container azul com sombra */}
            {!isConsole && currentTenant?.logo ? (
              <div className="mb-6 text-center">
                <div 
                  className="inline-block p-1.5 rounded-md mb-4 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <img 
                    src={currentTenant.logoDark || currentTenant.logo} 
                    alt={currentTenant.name} 
                    className={`h-16 w-auto object-contain ${!currentTenant.logoDark ? 'brightness-0 invert' : ''}`}
                  />
                </div>
                <p className="text-gray-600">Acesse seu ambiente</p>
              </div>
            ) : (
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold mb-2 text-gray-900">
                  {isConsole ? "Console Administrativo" : currentTenant?.name || tenantInfo?.name || "Login"}
                </h1>
                <p className="text-gray-600">
                  {isConsole
                    ? "Acesse o painel de gerenciamento de organizações"
                    : currentTenant?.name || tenantInfo?.name
                      ? "Acesse seu ambiente"
                      : "Faça login para continuar"}
                </p>
              </div>
            )}

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none border-l-4"
                  style={{
                    borderLeftColor: 'var(--color-primary)',
                  }}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none border-l-4"
                  style={{
                    borderLeftColor: 'var(--color-primary)',
                  }}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  id="remember"
                  className="w-4 h-4 rounded cursor-pointer accent-primary"
                />
                <label htmlFor="remember" className="text-sm text-gray-700 cursor-pointer select-none">
                  Manter conectado
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Continuar {!loading && "→"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="#" className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                Esqueceu seu login ou senha?
              </a>
            </div>
          </div>
        </div>

        <div className="w-1/2 bg-slate-50 flex items-center justify-center relative overflow-hidden">
          {/* For Console: always use console config. For tenant: use tenant background */}
          {isConsole ? (
            config?.loginVideoUrl ? (
              <video 
                key={config.loginVideoUrl}
                autoPlay 
                loop 
                muted 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover" 
                src={config.loginVideoUrl} 
              />
            ) : config === null ? (
              <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                <div 
                  className="w-24 h-24 rounded-xl flex items-center justify-center text-3xl font-bold text-white"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  AC
                </div>
                <span className="text-lg font-medium text-slate-600">{companyName}</span>
                <span className="text-sm text-slate-400">{config?.tagline}</span>
              </div>
            )
          ) : currentTenant?.loginBackgroundUrl ? (
            currentTenant.loginBackgroundType === "video" ? (
              <video 
                key={currentTenant.loginBackgroundUrl}
                autoPlay 
                loop 
                muted 
                playsInline
                className="absolute inset-0 w-full h-full object-cover" 
                src={currentTenant.loginBackgroundUrl} 
              />
            ) : (
              <img 
                key={currentTenant.loginBackgroundUrl}
                src={currentTenant.loginBackgroundUrl} 
                alt="Login background"
                className="absolute inset-0 w-full h-full object-cover" 
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
              <div 
                className="w-24 h-24 rounded-xl flex items-center justify-center text-3xl font-bold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {currentTenant?.name?.substring(0, 2).toUpperCase() || companyName?.substring(0, 2).toUpperCase() || ""}
              </div>
              <span className="text-lg font-medium text-slate-600">{currentTenant?.name || companyName}</span>
              <span className="text-sm text-slate-400">{config?.tagline}</span>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-black text-gray-400 py-4 px-6 flex justify-between items-center flex-shrink-0">
        <div className="flex gap-6 text-sm">
          <a href="#" className="hover:text-white transition-colors">
            Contato
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Privacidade
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Termos de Uso
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Acessibilidade
          </a>
        </div>
        <div className="text-xs">
          Powered by <strong>{companyName}</strong>
        </div>
      </footer>
    </div>
  )
}

export default UnifiedLogin
