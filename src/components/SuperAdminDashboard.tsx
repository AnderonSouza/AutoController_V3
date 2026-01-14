"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import type { User } from "../types"
import { supabase } from "../utils/supabaseClient"
import { createNewUser } from "../utils/db"
import {
  getConsoleConfig,
  saveConsoleConfig,
  applyConsoleTheme,
  DEFAULT_CONSOLE_CONFIG,
  type ConsoleConfig,
} from "../utils/console-config"
import {
  Building2,
  Users,
  PlusCircle,
  Settings,
  LogOut,
  Globe,
  Search,
  ExternalLink,
  UserPlus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Copy,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Clock,
  Activity,
  Briefcase,
  X,
  Check,
  Palette,
  Upload,
  Loader2,
  ImageIcon,
  Bell,
  HelpCircle,
  Grid3X3,
  List,
  ArrowLeft,
  Power,
  PowerOff,
  Video,
  FolderPlus,
} from "lucide-react"
import UnifiedSidebar, { type SidebarItem } from "./UnifiedSidebar"

interface SuperAdminDashboardProps {
  currentUser: User
  onLogout: () => void
}

interface Organization {
  id: string
  name: string
  subdomain: string | null
  logo: string | null
  userCount: number
  companyCount: number
  createdAt: string | undefined
  status: "ativo" | "inativo"
  motivoInativacao?: string | undefined
  dataInativacao?: string | undefined
  lastActivity?: string
}

interface DashboardStats {
  totalOrgs: number
  totalUsers: number
  totalCompanies: number
  activeOrgs: number
}

interface SearchResult {
  id: string
  type: "org" | "user" | "config"
  title: string
  subtitle: string
  icon: React.ElementType
  action: () => void
}

type ActiveView =
  | "dashboard"
  | "organizations"
  | "create-org"
  | "org-details"
  | "create-admin"
  | "settings"
  | "theme-builder"


const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ currentUser, onLogout }) => {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [stats, setStats] = useState<DashboardStats>({ totalOrgs: 0, totalUsers: 0, totalCompanies: 0, activeOrgs: 0 })
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  const [searchFocused, setSearchFocused] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Form states
  const [newOrgName, setNewOrgName] = useState("")
  const [newOrgSubdomain, setNewOrgSubdomain] = useState("")
  const [newAdminName, setNewAdminName] = useState("")
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [newAdminOrgId, setNewAdminOrgId] = useState("")

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [passwordError, setPasswordError] = useState<string>("")

  const [illustrationPreview, setIllustrationPreview] = useState<string>("")
  const [illustrationFile, setIllustrationFile] = useState<File | null>(null)

  const [videoPreview, setVideoPreview] = useState<string>("")
  const [splashVideoPreview, setSplashVideoPreview] = useState<string>("")

  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")

  const [themeConfig, setThemeConfig] = useState<ConsoleConfig>(DEFAULT_CONSOLE_CONFIG)

  const [showSaveToast, setShowSaveToast] = useState(false)
  const [saveToastMessage, setSaveToastMessage] = useState("")
  const [saveToastType, setSaveToastType] = useState<"success" | "error">("success")
  const [transparencyWarning, setTransparencyWarning] = useState(false)

  const [showInactivateModal, setShowInactivateModal] = useState(false)
  const [inactivateReason, setInactivateReason] = useState("")
  const [orgToInactivate, setOrgToInactivate] = useState<Organization | null>(null)

  const [showFullPreview, setShowFullPreview] = useState(false)

  const sidebarItems: SidebarItem[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Início" },
    { id: "organizations", icon: Building2, label: "Organizações", badge: stats.totalOrgs },
    { 
      id: "cadastros", 
      icon: FolderPlus, 
      label: "Cadastros",
      children: [
        { id: "create-org", icon: PlusCircle, label: "Nova Organização" },
        { id: "create-admin", icon: UserPlus, label: "Criar Admin" },
      ]
    },
    { 
      id: "configuracoes", 
      icon: Settings, 
      label: "Configurações",
      children: [
        { id: "theme-builder", icon: Palette, label: "Personalização" },
        { id: "settings", icon: Settings, label: "Sistema" },
      ]
    },
  ]
  
  const handleNavigate = (viewId: string) => {
    setActiveView(viewId as ActiveView)
  }

  const performSearch = (term: string) => {
    if (!term.trim()) {
      // Mostrar sugestões quando vazio
      const suggestions: SearchResult[] = [
        ...organizations.slice(0, 5).map((org) => ({
          id: org.id,
          type: "org" as const,
          title: org.name,
          subtitle: org.subdomain ? `${org.subdomain}.autocontroller.ai` : "Organização",
          icon: Building2,
          action: () => {
            setSelectedOrg(org)
            setActiveView("org-details")
            setShowSearchDropdown(false)
          },
        })),
        {
          id: "config",
          type: "config" as const,
          title: "Personalização",
          subtitle: "Configurar aparência do sistema",
          icon: Palette,
          action: () => {
            setActiveView("theme-builder")
            setShowSearchDropdown(false)
          },
        },
      ]
      setSearchResults(suggestions)
      return
    }

    const lowerTerm = term.toLowerCase()
    const results: SearchResult[] = []

    // Buscar em organizações
    organizations.forEach((org) => {
      if (org.name.toLowerCase().includes(lowerTerm) || org.subdomain?.toLowerCase().includes(lowerTerm)) {
        results.push({
          id: org.id,
          type: "org",
          title: org.name,
          subtitle: org.subdomain ? `${org.subdomain}.autocontroller.ai` : "Organização",
          icon: Building2,
          action: () => {
            setSelectedOrg(org)
            setActiveView("org-details")
            setShowSearchDropdown(false)
          },
        })
      }
    })

    // Buscar em menus
    sidebarItems.forEach((item) => {
      if (item.label.toLowerCase().includes(lowerTerm)) {
        results.push({
          id: item.id,
          type: "config",
          title: item.label,
          subtitle: "Menu do sistema",
          icon: item.icon,
          action: () => {
            setActiveView(item.id)
            setShowSearchDropdown(false)
          },
        })
      }
    })

    setSearchResults(results)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const updateFavicon = (logoUrl: string | null) => {
    const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement("link")
    link.type = "image/png"
    link.rel = "icon"
    link.href = logoUrl || "/images/autocontroller-logo.png"
    const existingFavicon = document.querySelector("link[rel~='icon']")
    if (existingFavicon) existingFavicon.remove()
    document.head.appendChild(link)
  }

  useEffect(() => {
    const loadConfig = async () => {
      const config = await getConsoleConfig()
      setThemeConfig(config)
      setLogoPreview(config.logoUrl || "")
      updateFavicon(config.logoUrl)
      setIllustrationPreview(config.loginIllustrationUrl || "")
      setVideoPreview(config.loginVideoUrl || "")
      setSplashVideoPreview(config.splashVideoUrl || "")
      applyConsoleTheme(config)
    }
    loadConfig()
    loadOrganizations()
  }, [])

  useEffect(() => {
    const filtered = organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.subdomain?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredOrgs(filtered)
  }, [searchTerm, organizations])

  useEffect(() => {
    if (newOrgSubdomain.length >= 3) {
      checkSubdomainAvailability(newOrgSubdomain)
    } else {
      setSubdomainStatus("idle")
    }
  }, [newOrgSubdomain])

  const checkSubdomainAvailability = async (subdomain: string) => {
    setSubdomainStatus("checking")
    try {
      const { data } = await supabase.from("organizacoes").select("id").ilike("subdomain", subdomain).single()
      setSubdomainStatus(data ? "taken" : "available")
    } catch {
      setSubdomainStatus("available")
    }
  }

  const loadOrganizations = async () => {
    setIsLoading(true)
    try {
      const { data: orgsData, error } = await supabase
        .from("organizacoes")
        .select("id, nome, subdomain, logo, status, motivo_inativacao, data_inativacao, criado_em")
        .order("nome")

      if (error) {
        console.error("[v0] Erro ao buscar organizações:", error)
        throw error
      }

      const orgsWithStats = await Promise.all(
        (orgsData || []).map(async (org: any) => {
          let userCount = 0
          let companyCount = 0

          try {
            const { count: userCountResult } = await supabase
              .from("usuarios")
              .select("*", { count: "exact", head: true })
              .eq("organizacao_id", org.id)
            userCount = userCountResult || 0
          } catch (e) {
            // Silenciosamente ignorar erros de contagem
          }

          try {
            const { count: companyCountResult } = await supabase
              .from("empresas")
              .select("*", { count: "exact", head: true })
              .eq("organizacao_id", org.id)
            companyCount = companyCountResult || 0
          } catch (e) {
            // Silenciosamente ignorar erros de contagem
          }

          return {
            id: org.id,
            name: org.nome,
            subdomain: org.subdomain,
            logo: org.logo,
            userCount,
            companyCount,
            createdAt: org.criado_em,
            status: org.status || "ativo",
            motivoInativacao: org.motivo_inativacao,
            dataInativacao: org.data_inativacao,
          }
        }),
      )

      setOrganizations(orgsWithStats)
      setFilteredOrgs(orgsWithStats)
      setStats({
        totalOrgs: orgsWithStats.length,
        totalUsers: orgsWithStats.reduce((acc, org) => acc + org.userCount, 0),
        totalCompanies: orgsWithStats.reduce((acc, org) => acc + org.companyCount, 0),
        activeOrgs: orgsWithStats.filter((org) => org.status === "ativo").length,
      })
    } catch (error) {
      console.error("[v0] Erro fatal ao carregar organizações:", error)
      setOrganizations([])
      setFilteredOrgs([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleOrgStatus = async (org: Organization, inactivate: boolean, reason?: string) => {
    try {
      setIsSaving(true)

      const updateData: any = {
        status: inactivate ? "inativo" : "ativo",
      }

      if (inactivate) {
        updateData.motivo_inativacao = reason || "Sem motivo especificado"
        updateData.data_inativacao = new Date().toISOString()
      } else {
        updateData.motivo_inativacao = null
        updateData.data_inativacao = null
      }

      const { error } = await supabase.from("organizacoes").update(updateData).eq("id", org.id)

      if (error) throw error

      setSaveToastMessage(inactivate ? "Organização inativada com sucesso" : "Organização reativada com sucesso")
      setSaveToastType("success")
      setShowSaveToast(true)

      setShowInactivateModal(false)
      setInactivateReason("")
      setOrgToInactivate(null)

      loadOrganizations()

      // Atualizar org selecionada se for a mesma
      if (selectedOrg?.id === org.id) {
        setSelectedOrg({
          ...selectedOrg,
          status: inactivate ? "inativo" : "ativo",
          motivoInativacao: inactivate ? reason || "Sem motivo especificado" : undefined,
          dataInativacao: inactivate ? new Date().toISOString() : undefined,
        })
      }
    } catch (error: any) {
      setSaveToastMessage(error.message || "Erro ao alterar status")
      setSaveToastType("error")
      setShowSaveToast(true)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getInitials = (name: string) => {
    if (!name || name.trim() === "") return "U"
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getAvatarColor = (index: number) => {
    const colors = [
      themeConfig.primaryColor,
      themeConfig.accentColor,
      "#6366f1",
      "#8b5cf6",
      "#ec4899",
      "#10b981",
    ]
    return colors[index % colors.length]
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName || !newOrgSubdomain || subdomainStatus !== "available") return

    setIsSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.from("organizacoes").insert({
        nome: newOrgName,
        subdomain: newOrgSubdomain.toLowerCase(),
        status: "ativo",
      })

      if (error) throw error

      setMessage({ type: "success", text: "Organização criada com sucesso!" })
      setNewOrgName("")
      setNewOrgSubdomain("")
      loadOrganizations()
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Erro ao criar organização" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminOrgId || !newAdminName || !newAdminEmail || !newAdminPassword) return
    if (newAdminPassword.length < 6) {
      setPasswordError("Senha deve ter no mínimo 6 caracteres")
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const newUser = {
        nome: newAdminName,
        email: newAdminEmail,
        perfil: "ADMIN",
        ativo: true,
        organizacao_id: newAdminOrgId,
        password: newAdminPassword,
      }

      const result = await createNewUser(newUser as any, newAdminOrgId)
      if (typeof result === "string") throw new Error(result)

      setMessage({ type: "success", text: "Administrador criado com sucesso!" })
      setNewAdminName("")
      setNewAdminEmail("")
      setNewAdminPassword("")
      setNewAdminOrgId("")
      loadOrganizations()
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Erro ao criar administrador" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setSaveToastMessage("Arquivo muito grande. Máximo 2MB")
      setSaveToastType("error")
      setShowSaveToast(true)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setLogoPreview(result)
      setThemeConfig((prev) => ({ ...prev, logoUrl: result }))
      updateFavicon(result)
    }
    reader.readAsDataURL(file)
  }

  const handleIllustrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setSaveToastMessage("Arquivo muito grande. Máximo 5MB")
      setSaveToastType("error")
      setShowSaveToast(true)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setIllustrationPreview(result)
      setThemeConfig((prev) => ({ ...prev, loginIllustrationUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleVideoUrlChange = (url: string) => {
    setVideoPreview(url)
    setThemeConfig((prev) => ({ ...prev, loginVideoUrl: url }))
  }

  const handleSplashVideoUrlChange = (url: string) => {
    setSplashVideoPreview(url)
    setThemeConfig((prev) => ({ ...prev, splashVideoUrl: url }))
  }

  const handleSaveCustomization = async () => {
    setIsSaving(true)
    try {
      const result = await saveConsoleConfig(themeConfig)
      if (result.success) {
        applyConsoleTheme(themeConfig)
        setSaveToastMessage("Configurações salvas com sucesso!")
        setSaveToastType("success")
      } else {
        setSaveToastMessage(result.error || "Erro ao salvar")
        setSaveToastType("error")
      }
    } catch (error: any) {
      setSaveToastMessage(error.message || "Erro ao salvar configurações")
      setSaveToastType("error")
    } finally {
      setIsSaving(false)
      setShowSaveToast(true)
      setTimeout(() => setShowSaveToast(false), 4000)
    }
  }

  const handleResetCustomization = () => {
    setThemeConfig(DEFAULT_CONSOLE_CONFIG)
    setLogoPreview(DEFAULT_CONSOLE_CONFIG.logoUrl)
    setIllustrationPreview("")
    setVideoPreview("")
    setSplashVideoPreview("")
    updateFavicon(DEFAULT_CONSOLE_CONFIG.logoUrl)
  }

  // ============================================================
  // RENDER FUNCTIONS
  // ============================================================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bem-vindo(a), {currentUser.nome?.split(" ")[0]}</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie suas organizações e configurações do sistema</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de Organizações", value: stats.totalOrgs, icon: Building2 },
          { label: "Organizações Ativas", value: stats.activeOrgs, icon: Activity },
          { label: "Total de Usuários", value: stats.totalUsers, icon: Users },
          { label: "Total de Empresas", value: stats.totalCompanies, icon: Briefcase },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${themeConfig.primaryColor}15` }}>
                <stat.icon className="w-5 h-5" style={{ color: themeConfig.primaryColor }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveView("create-org")}
            className="flex items-center gap-3 p-4 border-2 border-dashed rounded-lg hover:border-solid transition-all text-left group"
            style={{ borderColor: themeConfig.primaryColor }}
          >
            <div
              className="p-2 rounded-lg group-hover:scale-110 transition-transform"
              style={{ backgroundColor: themeConfig.primaryColor }}
            >
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Nova Organização</p>
              <p className="text-xs text-slate-500">Criar novo tenant</p>
            </div>
          </button>

          <button
            onClick={() => setActiveView("create-admin")}
            className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-lg hover:border-solid hover:border-slate-300 transition-all text-left group"
          >
            <div className="p-2 bg-slate-100 rounded-lg group-hover:scale-110 transition-transform">
              <UserPlus className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Criar Admin</p>
              <p className="text-xs text-slate-500">Novo administrador</p>
            </div>
          </button>

          <button
            onClick={() => setActiveView("theme-builder")}
            className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-lg hover:border-solid hover:border-slate-300 transition-all text-left group"
          >
            <div className="p-2 bg-slate-100 rounded-lg group-hover:scale-110 transition-transform">
              <Palette className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Personalização</p>
              <p className="text-xs text-slate-500">Configurar aparência</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Organizations */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-medium text-slate-900">Organizações Recentes</h2>
          <button
            onClick={() => setActiveView("organizations")}
            className="text-sm hover:underline"
            style={{ color: themeConfig.primaryColor }}
          >
            Ver todas
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {organizations.slice(0, 5).map((org, index) => (
            <div
              key={org.id}
              className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
              onClick={() => {
                setSelectedOrg(org)
                setActiveView("org-details")
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(index) }}
                >
                  {org.logo ? (
                    <img
                      src={org.logo || "/placeholder.svg"}
                      alt={org.name}
                      className="w-full h-full object-contain p-1 rounded"
                    />
                  ) : (
                    getInitials(org.name)
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-500">{org.subdomain}.autocontroller.ai</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                    org.status === "ativo" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${org.status === "ativo" ? "bg-green-500" : "bg-red-500"}`}
                  ></span>
                  {org.status === "ativo" ? "Ativo" : "Inativo"}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderOrganizations = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Organizações</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie todas as organizações do sistema</p>
        </div>
        <button
          onClick={() => setActiveView("create-org")}
          className="px-4 py-2 text-white rounded text-sm font-medium flex items-center gap-2 hover:opacity-90"
          style={{ backgroundColor: themeConfig.primaryColor }}
        >
          <PlusCircle className="w-4 h-4" />
          Nova Organização
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar pelo nome"
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": themeConfig.accentColor } as any}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-slate-500">Visualização:</span>
            <div className="flex border border-slate-200 rounded overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-slate-100" : "hover:bg-slate-50"}`}
              >
                <Grid3X3 className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-slate-100" : "hover:bg-slate-50"}`}
              >
                <List className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Usuários
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrgs.map((org, index) => (
                <tr
                  key={org.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setSelectedOrg(org)
                    setActiveView("org-details")
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                        style={{ backgroundColor: getAvatarColor(index) }}
                      >
                        {org.logo ? (
                          <img
                            src={org.logo || "/placeholder.svg"}
                            alt={org.name}
                            className="w-full h-full object-contain p-1.5 rounded-full"
                          />
                        ) : (
                          getInitials(org.name)
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{org.name}</p>
                        <p className="text-xs text-slate-500">{org.subdomain}.autocontroller.ai</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                      <Building2 className="w-3 h-3" />
                      Organização
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{org.userCount}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(org.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                        org.status === "ativo" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${org.status === "ativo" ? "bg-green-500" : "bg-red-500"}`}
                      ></span>
                      {org.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => e.stopPropagation()} className="p-1 text-slate-400 hover:text-slate-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-sm text-slate-500">Linhas por página: 50</span>
            <span className="text-sm text-slate-500">
              1-{filteredOrgs.length} de {filteredOrgs.length}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrgs.map((org, index) => (
            <div
              key={org.id}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => {
                setSelectedOrg(org)
                setActiveView("org-details")
              }}
            >
              <div className="h-24 flex items-center justify-center" style={{ backgroundColor: getAvatarColor(index) }}>
                {org.logo ? (
                  <img
                    src={org.logo || "/placeholder.svg"}
                    alt={org.name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">{getInitials(org.name)}</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">{org.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {org.subdomain ? `${org.subdomain}.autocontroller.ai` : "Sem subdomínio"}
                    </p>
                  </div>
                  {org.status === "inativo" && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">Inativo</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {org.userCount}
                  </span>
                  <span>{formatDate(org.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderOrgDetails = () => {
    if (!selectedOrg) return null

    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveView("organizations")}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Organizações
        </button>

        {/* Header Card */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="h-16" style={{ backgroundColor: themeConfig.primaryColor }} />
          <div className="px-6 py-6 flex items-end gap-6 -mt-8">
            <div
              className="w-24 h-24 rounded-lg flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg flex-shrink-0"
              style={{ backgroundColor: themeConfig.primaryColor }}
            >
              {selectedOrg.logo ? (
                <img
                  src={selectedOrg.logo || "/placeholder.svg"}
                  alt={selectedOrg.name}
                  className="w-full h-full object-contain p-2 rounded-lg"
                />
              ) : (
                getInitials(selectedOrg.name)
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{selectedOrg.name}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedOrg.status === "ativo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedOrg.status === "ativo" ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1 mb-1">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="font-mono text-slate-700">{selectedOrg.subdomain}.autocontroller.ai</span>
                <button
                  onClick={() => navigator.clipboard.writeText(`${selectedOrg.subdomain}.autocontroller.ai`)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                  title="Copiar domínio"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
              {selectedOrg.motivoInativacao && selectedOrg.status === "inativo" && (
                <p className="text-xs text-red-600 mt-2">Motivo: {selectedOrg.motivoInativacao}</p>
              )}
            </div>
            <div className="flex items-center gap-2 pb-2 flex-wrap justify-end gap-y-2">
              <a
                href={`https://${selectedOrg.subdomain}.autocontroller.ai`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border rounded text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors whitespace-nowrap"
                style={{ borderColor: themeConfig.primaryColor, color: themeConfig.primaryColor }}
              >
                <ExternalLink className="w-4 h-4" />
                Acessar
              </a>
              {selectedOrg.status === "ativo" ? (
                <button
                  onClick={() => {
                    setOrgToInactivate(selectedOrg)
                    setShowInactivateModal(true)
                  }}
                  className="px-4 py-2 border border-orange-300 text-orange-700 rounded text-sm font-medium flex items-center gap-2 hover:bg-orange-50 transition-colors whitespace-nowrap"
                >
                  <PowerOff className="w-4 h-4" />
                  Inativar
                </button>
              ) : (
                <button
                  onClick={() => handleToggleOrgStatus(selectedOrg, false)}
                  className="px-4 py-2 border border-green-300 text-green-700 rounded text-sm font-medium flex items-center gap-2 hover:bg-green-50 transition-colors whitespace-nowrap"
                >
                  <Power className="w-4 h-4" />
                  Reativar
                </button>
              )}
              <button className="px-4 py-2 border border-red-300 text-red-700 rounded text-sm font-medium flex items-center gap-2 hover:bg-red-50 transition-colors whitespace-nowrap">
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Usuários</p>
                <p className="text-xl font-semibold text-slate-900">{selectedOrg.userCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Empresas</p>
                <p className="text-xl font-semibold text-slate-900">{selectedOrg.companyCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Criado em</p>
                <p className="text-xl font-semibold text-slate-900">{formatDate(selectedOrg.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderCreateOrg = () => (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => setActiveView("organizations")}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h1 className="text-xl font-semibold text-slate-900">Nova Organização</h1>
        <p className="text-sm text-slate-500 mt-1">Crie um novo tenant para o sistema</p>
      </div>

      <form onSubmit={handleCreateOrg} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da Organização *</label>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": themeConfig.accentColor } as any}
              placeholder="Ex: Grupo Viamar"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subdomínio *</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newOrgSubdomain}
                  onChange={(e) => setNewOrgSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": themeConfig.accentColor } as any}
                  placeholder="viamargrupo"
                  required
                />
                {subdomainStatus !== "idle" && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {subdomainStatus === "checking" && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                    {subdomainStatus === "available" && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {subdomainStatus === "taken" && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                )}
              </div>
              <span className="text-sm text-slate-500">.autocontroller.ai</span>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded flex items-center gap-2 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView("organizations")}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || subdomainStatus === "taken"}
            className="px-4 py-2 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:opacity-90"
            style={{ backgroundColor: themeConfig.primaryColor }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            Criar Organização
          </button>
        </div>
      </form>
    </div>
  )

  const renderCreateAdmin = () => (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => setActiveView("dashboard")}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h1 className="text-xl font-semibold text-slate-900">Criar Administrador</h1>
        <p className="text-sm text-slate-500 mt-1">Adicione um novo admin para uma organização</p>
      </div>

      <form onSubmit={handleCreateAdmin} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Organização *</label>
            <select
              value={newAdminOrgId}
              onChange={(e) => setNewAdminOrgId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": themeConfig.accentColor } as any}
              required
            >
              <option value="">Selecione uma organização</option>
              {organizations
                .filter((org) => org.status === "ativo")
                .map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo *</label>
            <input
              type="text"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": themeConfig.accentColor } as any}
              placeholder="Nome do administrador"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail *</label>
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": themeConfig.accentColor } as any}
              placeholder="admin@empresa.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha Inicial *</label>
            <input
              type="password"
              value={newAdminPassword}
              onChange={(e) => {
                setNewAdminPassword(e.target.value)
                setPasswordError(e.target.value.length > 0 && e.target.value.length < 6 ? "Mínimo 6 caracteres" : "")
              }}
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                passwordError ? "border-red-300" : "border-slate-300"
              }`}
              style={{ "--tw-ring-color": themeConfig.accentColor } as any}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
            {passwordError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {passwordError}
              </p>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded flex items-center gap-2 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView("dashboard")}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 text-white rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:opacity-90"
            style={{ backgroundColor: themeConfig.primaryColor }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Criar Administrador
          </button>
        </div>
      </form>
    </div>
  )

  const renderThemeBuilder = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Personalização Visual</h1>
          <p className="text-sm text-slate-500">Configure a aparência do console administrativo</p>
        </div>
        <button
          onClick={() => setShowFullPreview(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: themeConfig.primaryColor }}
        >
          <ExternalLink className="w-4 h-4" />
          Ver em tela cheia
        </button>
      </div>

      {/* Preview Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Preview</h2>
        <div className="flex gap-6 h-96">
          {/* Left - Logo and Company Name */}
          <div
            className="w-64 bg-gradient-to-b rounded-lg p-6 flex flex-col items-center justify-center text-white"
            style={{
              backgroundImage: `linear-gradient(135deg, ${themeConfig.primaryColor} 0%, ${themeConfig.accentColor} 100%)`,
            }}
          >
            {logoPreview ? (
              <img src={logoPreview || "/placeholder.svg"} alt="Logo" className="h-20 w-20 object-contain mb-4" />
            ) : (
              <div className="h-20 w-20 bg-white rounded-lg flex items-center justify-center text-slate-900 font-bold mb-4">
                AC
              </div>
            )}
            <span className="text-white font-medium text-sm">{themeConfig.companyName}</span>
          </div>

          {/* Right - Mini Login Preview */}
          <div className="flex-1 bg-white rounded-lg p-4 flex items-center justify-center overflow-hidden">
            {videoPreview ? (
              <video className="w-full h-full object-cover" autoPlay loop muted>
                <source src={videoPreview} type="video/mp4" />
                Seu navegador não suporta vídeos.
              </video>
            ) : illustrationPreview ? (
              <img
                src={illustrationPreview || "/placeholder.svg"}
                alt="Ilustração"
                className="max-h-48 object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <ImageIcon className="w-12 h-12" />
                <span className="text-sm">Nenhuma ilustração configurada</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Identity Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <h2 className="font-medium text-slate-900">Identidade Visual</h2>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Logo do Console</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img
                src={logoPreview || "/placeholder.svg"}
                alt="Logo"
                className="h-16 w-16 object-contain border rounded-lg p-2"
              />
            ) : (
              <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div>
              <label
                className="px-4 py-2 text-white rounded text-sm font-medium cursor-pointer inline-flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: themeConfig.primaryColor }}
              >
                <Upload className="w-4 h-4" />
                Escolher arquivo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              <p className="text-xs text-slate-500 mt-2">PNG ou JPG, max 2MB, recomendado 80×80px</p>
              {logoPreview && logoPreview !== DEFAULT_CONSOLE_CONFIG.logoUrl && (
                <button
                  onClick={() => {
                    setLogoPreview(DEFAULT_CONSOLE_CONFIG.logoUrl)
                    setThemeConfig((prev) => ({ ...prev, logoUrl: DEFAULT_CONSOLE_CONFIG.logoUrl }))
                  }}
                  className="text-xs text-red-500 hover:underline mt-1"
                >
                  Remover logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da Empresa</label>
          <input
            type="text"
            value={themeConfig.companyName}
            onChange={(e) => setThemeConfig((prev) => ({ ...prev, companyName: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": themeConfig.accentColor } as any}
          />
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tagline</label>
          <input
            type="text"
            value={themeConfig.tagline}
            onChange={(e) => setThemeConfig((prev) => ({ ...prev, tagline: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": themeConfig.accentColor } as any}
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cor Primária</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={themeConfig.primaryColor}
                onChange={(e) => setThemeConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                className="h-10 w-10 rounded border-0 cursor-pointer"
              />
              <input
                type="text"
                value={themeConfig.primaryColor}
                onChange={(e) => setThemeConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cor de Fundo</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={themeConfig.backgroundColor}
                onChange={(e) => setThemeConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                className="h-10 w-10 rounded border-0 cursor-pointer"
              />
              <input
                type="text"
                value={themeConfig.backgroundColor}
                onChange={(e) => setThemeConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cor de Destaque</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={themeConfig.accentColor}
                onChange={(e) => setThemeConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                className="h-10 w-10 rounded border-0 cursor-pointer"
              />
              <input
                type="text"
                value={themeConfig.accentColor}
                onChange={(e) => setThemeConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* Illustration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Ilustração da Tela de Login</label>
          <div className="flex items-start gap-4">
            {illustrationPreview ? (
              <img
                src={illustrationPreview || "/placeholder.svg"}
                alt="Ilustração"
                className="h-24 w-32 object-contain border rounded-lg"
              />
            ) : (
              <div className="h-24 w-32 bg-slate-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
            )}
            <div>
              <label className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm font-medium cursor-pointer inline-flex items-center gap-2 hover:bg-slate-50">
                <Upload className="w-4 h-4" />
                Escolher ilustração
                <input type="file" accept="image/*" onChange={handleIllustrationUpload} className="hidden" />
              </label>
              <p className="text-xs text-slate-500 mt-2">PNG ou JPG, max 5MB. Dimensão recomendada: 600×800px</p>
              {illustrationPreview && (
                <button
                  onClick={() => {
                    setIllustrationPreview("")
                    setThemeConfig((prev) => ({ ...prev, loginIllustrationUrl: "" }))
                  }}
                  className="text-xs text-red-500 hover:underline mt-1"
                >
                  Remover ilustração (usar padrão)
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <span className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Vídeo da Tela de Login (opcional)
            </span>
          </label>
          <input
            type="url"
            value={videoPreview}
            onChange={(e) => handleVideoUrlChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": themeConfig.accentColor } as any}
            placeholder="https://exemplo.com/video.mp4"
          />
          <p className="text-xs text-slate-500 mt-2">
            URL de um vídeo MP4 que será exibido em loop na tela de login. Se preenchido, substitui a ilustração.
          </p>
          {videoPreview && (
            <button onClick={() => handleVideoUrlChange("")} className="text-xs text-red-500 hover:underline mt-1">
              Remover vídeo
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <span className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Vídeo da Tela de Carregamento (Splash Screen)
            </span>
          </label>
          <input
            type="url"
            value={splashVideoPreview}
            onChange={(e) => handleSplashVideoUrlChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": themeConfig.accentColor } as any}
            placeholder="https://exemplo.com/logo-animado.mp4"
          />
          <p className="text-xs text-slate-500 mt-2">
            URL de um vídeo MP4/WebM com animação do logo. Será exibido na tela de carregamento inicial (splash screen) enquanto o app carrega.
          </p>
          {splashVideoPreview && (
            <div className="mt-3 flex items-center gap-4">
              <video
                src={splashVideoPreview}
                autoPlay
                loop
                muted
                playsInline
                className="w-32 h-32 object-contain bg-white rounded border border-slate-200"
              />
              <button onClick={() => handleSplashVideoUrlChange("")} className="text-xs text-red-500 hover:underline">
                Remover vídeo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleResetCustomization}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50"
        >
          Restaurar Padrão
        </button>
        <button
          onClick={handleSaveCustomization}
          disabled={isSaving}
          className="px-4 py-2 text-white rounded text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: themeConfig.primaryColor }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Salvar Alterações
        </button>
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Configurações</h1>
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <p className="text-slate-500">Configurações do sistema em desenvolvimento...</p>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return renderDashboard()
      case "organizations":
        return renderOrganizations()
      case "org-details":
        return renderOrgDetails()
      case "create-org":
        return renderCreateOrg()
      case "create-admin":
        return renderCreateAdmin()
      case "theme-builder":
        return renderThemeBuilder()
      case "settings":
        return renderSettings()
      default:
        return renderDashboard()
    }
  }

  // ============================================================
  // MAIN RETURN
  // ============================================================

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {/* Sidebar unificado no modo flat */}
      <UnifiedSidebar
        items={sidebarItems}
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        logo={logoPreview}
        companyName={themeConfig.companyName}
        primaryColor={themeConfig.primaryColor}
        secondaryColor={themeConfig.accentColor}
        mode="sections"
        panelTitle={themeConfig.companyName}
        showHomeButton={false}
        iconBarColor="#1e3a5f"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with fixed height of 14 (56px) to align with sidebar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Console</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-900">
              {(() => {
                for (const item of sidebarItems) {
                  if (item.id === activeView) return item.label
                  if (item.children) {
                    const child = item.children.find(c => c.id === activeView)
                    if (child) return child.label
                  }
                }
                return "Dashboard"
              })()}
            </span>
          </div>

          <div ref={searchRef} className="flex-1 max-w-xl mx-8 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Procurar conteúdo"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  performSearch(e.target.value)
                }}
                onFocus={() => {
                  setShowSearchDropdown(true)
                  performSearch(searchTerm)
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white"
                style={{ "--tw-ring-color": themeConfig.accentColor } as any}
              />
            </div>

            {/* Search Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-2 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {searchTerm ? "Resultados" : "Sugestões"}
                  </span>
                </div>
                {searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={result.action}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left"
                      >
                        <div className="p-1.5 rounded" style={{ backgroundColor: `${themeConfig.primaryColor}15` }}>
                          <result.icon className="w-4 h-4" style={{ color: themeConfig.primaryColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{result.title}</p>
                          <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500">Nenhum resultado encontrado</div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions - removed notification dot */}
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full relative">
              <Bell className="w-5 h-5" />
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
              style={{ backgroundColor: themeConfig.primaryColor }}
              title={currentUser.nome || "Usuário"}
            >
              {getInitials(currentUser.nome || "")}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeConfig.primaryColor }} />
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>

      {showInactivateModal && orgToInactivate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <PowerOff className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Inativar Organização</h3>
                <p className="text-sm text-slate-500">{orgToInactivate.name}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Ao inativar esta organização, os usuários não poderão mais acessar o sistema. Você pode reativar a
              qualquer momento.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo da inativação (opcional)</label>
              <textarea
                value={inactivateReason}
                onChange={(e) => setInactivateReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                style={{ "--tw-ring-color": themeConfig.accentColor } as any}
                rows={3}
                placeholder="Ex: Inadimplência, solicitação do cliente..."
              />
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  setShowInactivateModal(false)
                  setInactivateReason("")
                  setOrgToInactivate(null)
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleToggleOrgStatus(orgToInactivate, true, inactivateReason)}
                disabled={isSaving}
                className="px-4 py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />}
                Inativar Organização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Feedback */}
      {showSaveToast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
            saveToastType === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}
        >
          {saveToastType === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className={`text-sm ${saveToastType === "success" ? "text-green-700" : "text-red-700"}`}>
            {saveToastMessage}
          </span>
          <button onClick={() => setShowSaveToast(false)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
          <div className="max-w-screen-lg max-h-screen-lg bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-lg text-slate-900">Preview em tela cheia</h3>
              <button onClick={() => setShowFullPreview(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* Render similar to the mini preview but larger */}
              <div className="flex gap-6">
                {/* Mini Sidebar Preview */}
                <div
                  className="w-64 h-80 rounded-lg p-5 flex flex-col items-center"
                  style={{ backgroundColor: themeConfig.primaryColor }}
                >
                  {logoPreview ? (
                    <img src={logoPreview || "/placeholder.svg"} alt="Logo" className="h-16 w-16 object-contain mb-4" />
                  ) : (
                    <div className="h-16 w-16 bg-white/20 rounded mb-4 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <span className="text-white font-medium text-lg">{themeConfig.companyName}</span>
                </div>

                {/* Mini Login Preview */}
                <div className="flex-1 bg-white rounded-lg p-5 flex items-center justify-center">
                  {videoPreview ? (
                    <video className="w-full h-full object-cover" autoPlay loop muted>
                      <source src={videoPreview} type="video/mp4" />
                      Seu navegador não suporta vídeos.
                    </video>
                  ) : illustrationPreview ? (
                    <img
                      src={illustrationPreview || "/placeholder.svg"}
                      alt="Ilustração"
                      className="max-h-72 object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <ImageIcon className="w-16 h-16" />
                      <span className="text-md">Formulário de Login</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  )
}

export default SuperAdminDashboard
