"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Mail, Lock, ArrowRight, Eye, EyeOff, Building2, TrendingUp, BarChart3, Zap } from "lucide-react"
import { consoleBranding } from "../config/console-branding"
import { getConsoleConfig, type ConsoleConfig } from "../utils/console-config"

interface ConsoleLoginProps {
  onLogin: (email: string, password: string) => Promise<void>
}

const ConsoleLogin: React.FC<ConsoleLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [dynamicConfig, setDynamicConfig] = useState<ConsoleConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getConsoleConfig()
        if (config) {
          setDynamicConfig(config)
          updateFavicon(config.logoUrl)
        }
      } catch (err) {
        console.error("[v0] Error loading console config:", err)
      } finally {
        setConfigLoading(false)
      }
    }
    loadConfig()
  }, [])

  const updateFavicon = (logoUrl: string | null) => {
    if (!logoUrl) return
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    if (link) {
      link.href = logoUrl
    } else {
      const newLink = document.createElement("link")
      newLink.rel = "icon"
      newLink.href = logoUrl
      document.head.appendChild(newLink)
    }
  }

  const { company: staticCompany, logos: staticLogos, colors: staticColors, login, typography } = consoleBranding

  const company = {
    ...staticCompany,
    name: dynamicConfig?.companyName || staticCompany.name,
    tagline: dynamicConfig?.tagline || staticCompany.tagline,
  }

  const logos = {
    ...staticLogos,
    primary: dynamicConfig?.logoUrl || staticLogos.primary,
  }

  const colors = {
    ...staticColors,
    primary: dynamicConfig?.primaryColor || staticColors.primary,
    primaryHover: dynamicConfig?.primaryColor
      ? adjustColor(dynamicConfig.primaryColor, -20)
      : staticColors.primaryHover,
    secondary: dynamicConfig?.secondaryColor || staticColors.secondary,
    secondaryHover: dynamicConfig?.secondaryColor
      ? adjustColor(dynamicConfig.secondaryColor, -20)
      : staticColors.secondaryHover,
    accent: dynamicConfig?.accentColor || staticColors.accent,
  }

  function adjustColor(hex: string, amount: number): string {
    const num = Number.parseInt(hex.replace("#", ""), 16)
    const r = Math.min(255, Math.max(0, (num >> 16) + amount))
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await onLogin(email.trim().toLowerCase(), password)
    } catch (err) {
      setError(login.errors.invalidCredentials)
    } finally {
      setIsLoading(false)
    }
  }

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  const GeometricIllustration = () => (
    <svg className="w-full h-full" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Grid de pontos */}
      <defs>
        <pattern id="dotPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill={`${colors.secondary}33`} />
        </pattern>
      </defs>
      <rect width="600" height="600" fill="url(#dotPattern)" />

      {/* Linhas conectoras */}
      <path
        d="M100 300 L250 200 L400 280 L500 180"
        stroke={`${colors.secondary}44`}
        strokeWidth="2"
        strokeDasharray="8 4"
        fill="none"
      />
      <path
        d="M150 450 L300 350 L450 420 L550 320"
        stroke={`${colors.primary}44`}
        strokeWidth="2"
        strokeDasharray="8 4"
        fill="none"
      />

      {/* Círculo grande central */}
      <circle cx="350" cy="300" r="120" stroke={`${colors.secondary}33`} strokeWidth="2" fill="none" />
      <circle cx="350" cy="300" r="80" stroke={`${colors.secondary}22`} strokeWidth="1" fill="none" />

      {/* Card de gráfico */}
      <rect
        x="280"
        y="220"
        width="140"
        height="100"
        rx="12"
        fill="white"
        filter="drop-shadow(0 4px 20px rgba(0,0,0,0.08))"
      />
      <rect x="295" y="240" width="20" height="50" rx="4" fill={colors.secondary} opacity="0.7" />
      <rect x="325" y="255" width="20" height="35" rx="4" fill={colors.primary} opacity="0.7" />
      <rect x="355" y="230" width="20" height="60" rx="4" fill={colors.secondary} />
      <rect x="385" y="245" width="20" height="45" rx="4" fill={colors.primary} opacity="0.5" />

      {/* Ícone de check */}
      <circle cx="500" cy="150" r="35" fill="white" filter="drop-shadow(0 4px 15px rgba(0,0,0,0.08))" />
      <path
        d="M485 150 L495 160 L515 140"
        stroke={colors.secondary}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Ícone de analytics */}
      <circle cx="150" cy="200" r="30" fill="white" filter="drop-shadow(0 4px 15px rgba(0,0,0,0.08))" />
      <path
        d="M140 210 L145 200 L150 205 L155 190 L160 195"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Ícone de share/conexão */}
      <circle cx="520" cy="380" r="28" fill="white" filter="drop-shadow(0 4px 15px rgba(0,0,0,0.08))" />
      <circle cx="510" cy="370" r="5" fill={colors.secondary} />
      <circle cx="530" cy="370" r="5" fill={colors.secondary} />
      <circle cx="520" cy="390" r="5" fill={colors.secondary} />
      <path d="M514 372 L526 372 M512 375 L518 388 M528 375 L522 388" stroke={colors.secondary} strokeWidth="1.5" />

      {/* Diamantes decorativos */}
      <rect
        x="200"
        y="380"
        width="25"
        height="25"
        rx="4"
        transform="rotate(45 212.5 392.5)"
        fill={colors.secondary}
        opacity="0.6"
      />
      <rect
        x="420"
        y="450"
        width="20"
        height="20"
        rx="3"
        transform="rotate(45 430 460)"
        fill={colors.primary}
        opacity="0.4"
      />
      <rect
        x="100"
        y="350"
        width="15"
        height="15"
        rx="2"
        transform="rotate(45 107.5 357.5)"
        fill={colors.secondary}
        opacity="0.3"
      />

      {/* Círculos pequenos decorativos */}
      <circle cx="180" cy="480" r="10" fill={colors.secondary} opacity="0.5" />
      <circle cx="450" cy="180" r="8" fill={colors.primary} opacity="0.4" />
      <circle cx="550" cy="450" r="12" fill={colors.secondary} opacity="0.3" />
      <circle cx="80" cy="280" r="6" fill={colors.primary} opacity="0.5" />

      {/* Ícone de dashboard */}
      <rect
        x="120"
        y="420"
        width="70"
        height="50"
        rx="8"
        fill="white"
        filter="drop-shadow(0 4px 15px rgba(0,0,0,0.08))"
      />
      <rect x="130" y="430" width="20" height="15" rx="2" fill={colors.primary} opacity="0.6" />
      <rect x="155" y="430" width="25" height="15" rx="2" fill={colors.secondary} opacity="0.4" />
      <rect x="130" y="450" width="50" height="10" rx="2" fill={`${colors.secondary}33`} />
    </svg>
  )

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 lg:p-16 bg-white relative">
        {/* Decorative subtle pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(${colors.primary} 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        <div className="w-full max-w-md relative z-10">
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-8">
              {logos.primary ? (
                <img
                  src={logos.primary || "/placeholder.svg"}
                  alt={company.name}
                  className="w-20 h-20 object-contain"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${colors.primary}15` }}
                >
                  <Building2 className="w-10 h-10" style={{ color: colors.primary }} />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>
                  {company.name.replace(".ai", "")}
                  <span style={{ color: colors.secondary }}>.ai</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: colors.text?.secondary || "#64748b" }}>
                  Console Administrativo
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-2" style={{ color: colors.text?.primary || "#1e293b" }}>
              {login.form.heading}
            </h2>
            <p style={{ color: colors.text?.secondary || "#64748b" }}>{login.form.description}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: colors.text?.primary || "#1e293b" }}
              >
                {login.form.emailLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5" style={{ color: colors.text?.muted || "#94a3b8" }} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all"
                  style={
                    {
                      "--tw-ring-color": `${colors.secondary}44`,
                    } as React.CSSProperties
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.secondary
                    e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}22`
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0"
                    e.target.style.boxShadow = "none"
                  }}
                  placeholder={login.form.emailPlaceholder}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: colors.text?.primary || "#1e293b" }}
              >
                {login.form.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5" style={{ color: colors.text?.muted || "#94a3b8" }} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all"
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.secondary
                    e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}22`
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0"
                    e.target.style.boxShadow = "none"
                  }}
                  placeholder={login.form.passwordPlaceholder}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 focus:ring-2"
                  style={{ accentColor: colors.secondary }}
                />
                <span className="text-sm text-slate-600">{login.form.rememberMe}</span>
              </label>
              <button
                type="button"
                className="text-sm font-medium transition-colors"
                style={{ color: colors.secondary }}
              >
                {login.form.forgotPassword}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500 text-xs">!</span>
                </div>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-4 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              style={{
                backgroundColor: colors.primary,
                boxShadow: `0 10px 40px -10px ${colors.primary}66`,
              }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {login.form.submitButton}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Acesso restrito a administradores do sistema</p>
            <p className="text-xs text-slate-400 mt-2">
              © {new Date().getFullYear()} {company.name}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Illustration or Video/Image from config */}
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center"
        style={{ backgroundColor: "#f8fafc" }}
      >
        {dynamicConfig?.loginVideoUrl ? (
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover" 
            src={dynamicConfig.loginVideoUrl} 
          />
        ) : dynamicConfig?.loginIllustrationUrl ? (
          <img 
            src={dynamicConfig.loginIllustrationUrl} 
            alt="Login illustration" 
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.secondary}12 50%, ${colors.primary}05 100%)`,
              }}
            />

            {/* Ilustração geométrica */}
            <div className="relative w-full h-full max-w-2xl max-h-2xl p-12">
              <GeometricIllustration />
            </div>

            <div className="absolute bottom-12 left-12 right-12">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                <h3 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>
                  Gestão Inteligente de Resultados
                </h3>
                <p className="text-slate-600 text-sm">
                  {company.tagline || "Transforme dados em insights estratégicos para sua organização."}
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${colors.secondary}22` }}
                    >
                      <TrendingUp className="w-4 h-4" style={{ color: colors.secondary }} />
                    </div>
                    <span className="text-xs text-slate-500">Analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${colors.primary}22` }}
                    >
                      <BarChart3 className="w-4 h-4" style={{ color: colors.primary }} />
                    </div>
                    <span className="text-xs text-slate-500">Relatórios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${colors.secondary}22` }}
                    >
                      <Zap className="w-4 h-4" style={{ color: colors.secondary }} />
                    </div>
                    <span className="text-xs text-slate-500">Automação</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ConsoleLogin
