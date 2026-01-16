"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Building2,
  FileText,
  Calculator,
  Settings,
  Users,
  BarChart3,
  Database,
  BookOpen,
  Target,
  FileSpreadsheet,
  FolderTree,
  Layers,
  ArrowRightLeft,
  FileInput,
  TrendingUp,
  ClipboardList,
  Calendar,
  Lock,
  HelpCircle,
  Shield,
  X,
  ChevronLeft,
  Phone,
  Code,
  Home,
} from "lucide-react"
import type { View, EconomicGroup, User, ReportTemplate } from "../types"

interface SidebarProps {
  activeView: View
  onNavigate: (view: View) => void
  activeGroup: EconomicGroup | null
  user: User | null
  isOpen?: boolean
  onToggle?: () => void
  reportTemplates?: ReportTemplate[]
  currentReportId?: string
  onOpenITSupport?: () => void
  onOpenFinanceSupport?: () => void
}

interface MenuItem {
  id: View
  label: string
  icon: React.ReactNode
  roles?: string[]
}

interface MenuSection {
  id: string
  label: string
  icon: React.ReactNode
  children: MenuItem[]
}

export default function Sidebar({
  activeView,
  onNavigate,
  activeGroup,
  user,
  isOpen = true,
  onToggle,
  reportTemplates,
  currentReportId,
  onOpenITSupport,
  onOpenFinanceSupport,
}: SidebarProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const isSuperAdmin = user?.role === "SUPER_ADMIN"
  const isAdmin = user?.role === "ADMIN" || isSuperAdmin

  useEffect(() => {
    const section = menuSections.find(s => 
      s.children.some(child => child.id === activeView)
    )
    if (section && !activeSection) {
      setActiveSection(section.id)
    }
  }, [activeView])

  // Build analysis menu items dynamically from report templates
  const analysisChildren: MenuItem[] = []
  
  // Add items from report templates (DRE, Fluxo de Caixa, etc.)
  if (reportTemplates && reportTemplates.length > 0) {
    // Sort by orderIndex if available
    const sortedTemplates = [...reportTemplates].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    
    sortedTemplates.forEach(template => {
      if (!template.isActive) return // Skip inactive templates
      
      const templateName = template.name || ''
      const templateType = template.type
      
      // Map template type to View ID and icon
      if (templateType === "DRE") {
        analysisChildren.push({
          id: "DRE" as View,
          label: templateName,
          icon: <BarChart3 size={18} strokeWidth={1.5} />,
        })
      } else if (templateType === "CASH_FLOW") {
        analysisChildren.push({
          id: "CASH_FLOW" as View,
          label: templateName,
          icon: <TrendingUp size={18} strokeWidth={1.5} />,
        })
      } else if (templateType === "BALANCE_SHEET") {
        analysisChildren.push({
          id: "BALANCE_SHEET" as View,
          label: templateName,
          icon: <FileSpreadsheet size={18} strokeWidth={1.5} />,
        })
      }
    })
  }
  
  // Always add Razão Contábil as it has its own dedicated functionality
  analysisChildren.push({
    id: "RAZAO_CONTABIL" as View,
    label: "Razão Contábil",
    icon: <BookOpen size={18} strokeWidth={1.5} />,
  })

  const menuSections: MenuSection[] = [
    {
      id: "analises",
      label: "Análises",
      icon: <BarChart3 size={24} strokeWidth={1.5} />,
      children: analysisChildren,
    },
    {
      id: "orcamento",
      label: "Orçamento",
      icon: <ClipboardList size={24} strokeWidth={1.5} />,
      children: [
        { id: "BUDGET_PLANNING", label: "Painel Orçamentário", icon: <Target size={18} strokeWidth={1.5} /> },
        { id: "BUDGET_ASSUMPTIONS", label: "Premissas", icon: <FileText size={18} strokeWidth={1.5} /> },
        { id: "BUDGET_IMPORT", label: "Dados do Orçamento", icon: <Database size={18} strokeWidth={1.5} /> },
      ],
    },
    {
      id: "dados_contabeis",
      label: "Dados",
      icon: <Calculator size={24} strokeWidth={1.5} />,
      children: [
        { id: "DATA_IMPORT", label: "Carregar Realizado", icon: <FileInput size={18} strokeWidth={1.5} /> },
        { id: "MANAGEMENT_TRANSFERS", label: "Transferências", icon: <ArrowRightLeft size={18} strokeWidth={1.5} /> },
        { id: "CG_ENTRIES", label: "Ajustes de Caixa", icon: <TrendingUp size={18} strokeWidth={1.5} /> },
        { id: "ACCOUNTING_ADJUSTMENTS", label: "Ajustes Contábeis", icon: <ArrowRightLeft size={18} strokeWidth={1.5} /> },
        { id: "QUERIES", label: "Monitor de Erros", icon: <Database size={18} strokeWidth={1.5} /> },
      ],
    },
    {
      id: "fechamento",
      label: "Fechamento",
      icon: <Lock size={24} strokeWidth={1.5} />,
      children: [
        { id: "CLOSING_SCHEDULE", label: "Cronograma", icon: <Calendar size={18} strokeWidth={1.5} /> },
        { id: "CLOSING_LOCK", label: "Bloqueio de Período", icon: <Lock size={18} strokeWidth={1.5} /> },
      ],
    },
    {
      id: "administracao",
      label: "Admin",
      icon: <Building2 size={24} strokeWidth={1.5} />,
      children: [
        { id: "COMPANIES", label: "Estrutura Organizacional", icon: <Building2 size={18} strokeWidth={1.5} /> },
        { id: "COST_CENTERS", label: "Parâmetros de Apuração", icon: <Layers size={18} strokeWidth={1.5} /> },
        { id: "REPORT_TEMPLATES", label: "Modelos de Demonstrações", icon: <FileSpreadsheet size={18} strokeWidth={1.5} /> },
      ],
    },
    {
      id: "sistema",
      label: "Sistema",
      icon: <Settings size={24} strokeWidth={1.5} />,
      children: [
        { id: "SYSTEM_SETTINGS", label: "Aparência", icon: <Settings size={18} strokeWidth={1.5} /> },
        { id: "USER_MANAGEMENT", label: "Usuários", icon: <Users size={18} strokeWidth={1.5} />, roles: ["ADMIN", "SUPER_ADMIN"] },
      ],
    },
  ]

  const canAccessItem = (item: MenuItem) => {
    if (!item.roles) return true
    if (isSuperAdmin) return true
    return item.roles.includes(user?.role || "")
  }

  const handleSectionClick = (sectionId: string) => {
    if (activeSection === sectionId && isPanelOpen) {
      setIsPanelOpen(false)
      setActiveSection(null)
    } else {
      setActiveSection(sectionId)
      setIsPanelOpen(true)
    }
  }

  const handleItemClick = (itemId: View) => {
    onNavigate(itemId)
    if (window.innerWidth < 768) {
      setIsPanelOpen(false)
      onToggle?.()
    }
  }

  const activeMenuSection = menuSections.find(s => s.id === activeSection)
  const logo = activeGroup?.logo || (activeGroup?.interfaceConfig as Record<string, unknown>)?.logo as string | undefined
  const primaryColor = activeGroup?.primarycolor || activeGroup?.interfaceConfig?.primaryColor || "#6366f1"

  return (
    <>
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[72px]
          flex flex-col items-center
          bg-slate-900 text-slate-300
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <div className="flex-shrink-0 w-full h-16 flex items-center justify-center border-b border-slate-700/50">
          {logo ? (
            <img src={logo || "/placeholder.svg"} alt="Logo" className="h-8 w-8 object-contain rounded" />
          ) : (
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {(activeGroup?.name || "AC").substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            onNavigate("DRE")
            setActiveSection(null)
            setIsPanelOpen(false)
          }}
          className={`
            w-full py-3 flex flex-col items-center gap-1
            transition-all duration-200 group
            ${activeView === "DRE" && !activeSection ? "bg-slate-800 text-white" : "hover:bg-slate-800/50"}
          `}
        >
          <Home size={22} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-medium">Início</span>
        </button>

        <nav className="flex-1 w-full overflow-y-auto py-2">
          {menuSections.map((section) => {
            const isActive = activeSection === section.id
            const hasActiveChild = section.children.some(child => child.id === activeView)
            
            return (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={`
                  w-full py-3 flex flex-col items-center gap-1
                  transition-all duration-200 group relative
                  ${isActive ? "bg-slate-800 text-white" : hasActiveChild ? "text-white" : "hover:bg-slate-800/50"}
                `}
              >
                {isActive && (
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
                <div className="group-hover:scale-110 transition-transform">
                  {section.icon}
                </div>
                <span className="text-[10px] font-medium text-center px-1 leading-tight">
                  {section.label}
                </span>
              </button>
            )
          })}
        </nav>

        {isSuperAdmin && (
          <button
            onClick={() => {
              onNavigate("SuperAdmin" as View)
              setActiveSection(null)
              setIsPanelOpen(false)
            }}
            className={`
              w-full py-3 flex flex-col items-center gap-1
              transition-all duration-200 group border-t border-slate-700/50
              ${activeView === "SuperAdmin" ? "bg-slate-800 text-white" : "hover:bg-slate-800/50"}
            `}
          >
            <Shield size={22} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium">Gestão</span>
          </button>
        )}

        <div className="flex-shrink-0 w-full border-t border-slate-700/50 py-2 space-y-1">
          <button
            onClick={onOpenITSupport}
            className="w-full py-2 flex flex-col items-center gap-1 hover:bg-slate-800/50 transition-all group"
          >
            <Code size={20} strokeWidth={1.5} className="text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-medium">Suporte TI</span>
          </button>
          <button
            onClick={onOpenFinanceSupport}
            className="w-full py-2 flex flex-col items-center gap-1 hover:bg-slate-800/50 transition-all group"
          >
            <Phone size={20} strokeWidth={1.5} className="text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-medium">Controller</span>
          </button>
        </div>

        <button onClick={onToggle} className="md:hidden w-full p-3 border-t border-slate-700/50 hover:bg-slate-800/50">
          <X size={20} className="mx-auto" />
        </button>
      </aside>

      <div
        className={`
          fixed top-0 z-40 h-screen w-64 bg-white border-r border-slate-200
          shadow-xl transition-all duration-300 ease-in-out
          ${isPanelOpen && activeMenuSection ? "left-[72px] opacity-100" : "left-[72px] opacity-0 pointer-events-none -translate-x-4"}
        `}
      >
        {activeMenuSection && (
          <>
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">{activeMenuSection.label}</h2>
              <button 
                onClick={() => {
                  setIsPanelOpen(false)
                  setActiveSection(null)
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={18} className="text-slate-500" />
              </button>
            </div>
            
            <nav className="p-3 space-y-1">
              {activeMenuSection.children.filter(canAccessItem).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                    transition-all duration-200
                    ${activeView === item.id 
                      ? "bg-slate-100 text-slate-900 font-medium" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <span className={activeView === item.id ? "text-slate-700" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-500 text-center">
                {activeGroup?.name || "AutoController"}
              </div>
            </div>
          </>
        )}
      </div>

      {isPanelOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => {
            setIsPanelOpen(false)
            setActiveSection(null)
          }}
        />
      )}
    </>
  )
}
