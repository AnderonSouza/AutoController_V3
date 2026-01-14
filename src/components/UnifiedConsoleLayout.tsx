"use client"

import type React from "react"
import { useState } from "react"
import { ChevronLeft, LogOut, HelpCircle, Bell, Menu, Home, Settings, Users, Building2 } from "lucide-react"
import type { User, View, EconomicGroup } from "../types"

interface UnifiedConsoleLayoutProps {
  children: React.ReactNode
  currentUser: User | null
  onLogout: () => void
  isSuperAdmin: boolean
  isAdminConsole: boolean
  currentView: View
  onNavigate?: (view: View) => void
  activeGroup?: EconomicGroup | null
  tenantInfo?: {
    name: string
    logo?: string | null
  } | null
}

const UnifiedConsoleLayout: React.FC<UnifiedConsoleLayoutProps> = ({
  children,
  currentUser,
  onLogout,
  isSuperAdmin,
  isAdminConsole,
  currentView,
  onNavigate,
  activeGroup,
  tenantInfo,
}) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["admin"])

  const logo = tenantInfo?.logo || activeGroup?.logo
  const title = isAdminConsole ? "Console Administrativo" : tenantInfo?.name || activeGroup?.name || "AutoController"
  const breadcrumb = isAdminConsole
    ? ["Console", currentView === "SuperAdmin" ? "Início" : currentView]
    : [title, currentView]

  const initials =
    currentUser?.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "US"

  const adminMenuItems = [
    { id: "SuperAdmin" as View, label: "Início", icon: Home },
    { id: "Organizations" as View, label: "Organizações", icon: Building2 },
    { id: "Users" as View, label: "Usuários", icon: Users },
    { id: "Settings" as View, label: "Configurações", icon: Settings },
  ]

  const tenantMenuItems = [
    { id: "Dashboard" as View, label: "Dashboard", icon: Home },
    { id: "Companies" as View, label: "Empresas", icon: Building2 },
    { id: "Accounting" as View, label: "Contabilidade", icon: Building2 },
    { id: "Reports" as View, label: "Relatórios", icon: Building2 },
    { id: "Settings" as View, label: "Configurações", icon: Settings },
  ]

  const menuItems = isAdminConsole || isSuperAdmin ? adminMenuItems : tenantMenuItems

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) => (prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]))
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      {/* SIDEBAR - Minimalista + Colapsável */}
      <aside
        className={`
          bg-white border-r border-slate-200 flex flex-col transition-all duration-300
          ${sidebarExpanded ? "w-60" : "w-16"}
        `}
      >
        {/* Logo/Brand */}
        <div className="flex-shrink-0 h-16 px-4 flex items-center border-b border-slate-200">
          {logo ? (
            <img
              src={logo || "/placeholder.svg"}
              alt={title}
              className={`h-8 w-auto object-contain ${sidebarExpanded ? "" : "w-8 h-8"}`}
            />
          ) : (
            <div
              className={`flex items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 ${
                sidebarExpanded ? "w-10 h-10 text-lg" : "w-8 h-8 text-sm"
              }`}
            >
              {title.charAt(0)}
            </div>
          )}
          {sidebarExpanded && <span className="ml-3 font-bold text-slate-900 truncate text-sm">{title}</span>}
        </div>

        {/* Navigation - Renderizar menu itens dinamicamente */}
        <nav className="flex-1 overflow-y-auto p-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon
            const isActive = currentView === item.id

            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                  ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}
                `}
                title={item.label}
              >
                <IconComponent size={18} className="flex-shrink-0" />
                {sidebarExpanded && <span className="text-sm font-medium truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 p-2">
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
            title={sidebarExpanded ? "Recolher" : "Expandir"}
          >
            <ChevronLeft size={18} className={`transition-transform ${sidebarExpanded ? "" : "rotate-180"}`} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUserMenuOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors lg:hidden"
            >
              <Menu size={18} />
            </button>
            <nav className="hidden sm:flex items-center gap-1 text-sm text-slate-600">
              {breadcrumb.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  {index > 0 && <span className="text-slate-300">/</span>}
                  <span className={index === breadcrumb.length - 1 ? "font-medium text-slate-900" : ""}>{item}</span>
                </div>
              ))}
            </nav>
          </div>

          {/* Right: Actions + User */}
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600" title="Ajuda">
              <HelpCircle size={18} />
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 relative"
              title="Notificações"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </button>

            {/* User Menu */}
            <div className="relative ml-2">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-900 text-white hover:ring-2 hover:ring-slate-300 transition-all"
              >
                {initials}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 text-sm">
                    <p className="font-medium text-slate-900">{currentUser?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors border-t border-slate-100"
                  >
                    <LogOut size={16} />
                    Fazer logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

export default UnifiedConsoleLayout
