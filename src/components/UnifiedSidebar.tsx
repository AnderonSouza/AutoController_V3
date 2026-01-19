"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  ChevronLeft,
  LogOut,
  Building2,
  Home,
  type LucideIcon,
} from "lucide-react"

export interface SidebarItem {
  id: string
  icon: LucideIcon
  label: string
  badge?: number
  children?: SidebarItem[]
  roles?: string[]
  containerColor?: string
}

export type SidebarMode = "sections" | "flat"

interface UnifiedSidebarProps {
  items: SidebarItem[]
  activeView: string
  onNavigate: (viewId: string) => void
  onLogout: () => void
  logo?: string
  companyName?: string
  primaryColor?: string
  secondaryColor?: string
  userRole?: string
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  mode?: SidebarMode
  panelTitle?: string
  showHomeButton?: boolean
  iconBarColor?: string
}

export default function UnifiedSidebar({
  items,
  activeView,
  onNavigate,
  onLogout,
  logo,
  companyName = "AutoController",
  primaryColor = "#6366f1",
  secondaryColor = "#3b82f6",
  userRole,
  expanded: controlledExpanded,
  onExpandedChange,
  mode = "sections",
  panelTitle,
  showHomeButton = true,
  iconBarColor,
}: UnifiedSidebarProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const isFlat = mode === "flat"
  const effectivePanelTitle = panelTitle || (isFlat ? companyName : undefined)

  // Handle controlled expansion
  useEffect(() => {
    if (controlledExpanded !== undefined) {
      setIsPanelOpen(controlledExpanded)
    }
  }, [controlledExpanded])

  // Auto-open panel in flat mode when there's an active view
  useEffect(() => {
    if (isFlat && activeView && !isPanelOpen) {
      updatePanelState(true)
    }
  }, [isFlat, activeView, isPanelOpen])

  useEffect(() => {
    if (isFlat) return
    const section = items.find(item => 
      item.children?.some(child => child.id === activeView)
    )
    if (section && !activeSection) {
      setActiveSection(section.id)
    }
  }, [activeView, items, isFlat])

  const filterItemsByRole = (itemList: SidebarItem[]): SidebarItem[] => {
    return itemList.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true
      if (!userRole) return false
      return item.roles.includes(userRole)
    })
  }

  const updatePanelState = (open: boolean) => {
    setIsPanelOpen(open)
    onExpandedChange?.(open)
  }

  const handleSectionClick = (sectionId: string) => {
    if (isFlat) {
      onNavigate(sectionId)
      updatePanelState(true)
      return
    }
    
    const section = items.find(i => i.id === sectionId)
    
    if (!section?.children?.length) {
      onNavigate(sectionId)
      setActiveSection(null)
      updatePanelState(false)
      return
    }
    
    if (activeSection === sectionId && isPanelOpen) {
      updatePanelState(false)
      setActiveSection(null)
    } else {
      setActiveSection(sectionId)
      updatePanelState(true)
    }
  }

  const handleItemClick = (itemId: string) => {
    onNavigate(itemId)
    if (window.innerWidth < 768) {
      updatePanelState(false)
    }
  }

  const handleHomeClick = () => {
    const firstItem = items[0]
    if (firstItem?.children?.length) {
      onNavigate(firstItem.children[0].id)
    } else if (firstItem) {
      onNavigate(firstItem.id)
    }
    setActiveSection(null)
    updatePanelState(false)
  }

  const activeMenuSection = items.find(s => s.id === activeSection)
  const filteredItems = filterItemsByRole(items)

  return (
    <div className="flex h-full">
      <aside 
        className="w-[72px] flex flex-col items-center flex-shrink-0"
        style={{ 
          backgroundColor: iconBarColor || 'var(--color-sidebar-icon-bar, #1e3a5f)',
          color: 'var(--color-sidebar-text, #e2e8f0)'
        }}
      >
        <div className="flex-shrink-0 w-full h-20 flex items-center justify-center border-b border-white/10 py-3">
          {logo ? (
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg p-2">
              <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
            </div>
          ) : (
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-base bg-white shadow-lg"
              style={{ color: primaryColor }}
            >
              {companyName.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {showHomeButton && (
          <button
            onClick={handleHomeClick}
            className={`
              w-full py-3 flex flex-col items-center gap-1
              transition-all duration-200 group
              ${!activeSection && !isFlat ? "bg-white/15 text-white" : "hover:bg-white/10"}
              ${isFlat && !activeView ? "bg-white/15 text-white" : ""}
            `}
          >
            <Home size={22} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium">Início</span>
          </button>
        )}

        <nav className="flex-1 w-full overflow-y-auto py-1">
          {filteredItems.map((section) => {
            const isActive = isFlat ? activeView === section.id : activeSection === section.id
            const hasActiveChild = !isFlat && section.children?.some(child => child.id === activeView)
            const Icon = section.icon
            const hasContainerColor = !!section.containerColor
            
            return (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={`
                  w-full py-3 flex flex-col items-center gap-1
                  transition-all duration-200 group relative
                  ${hasContainerColor ? "" : (isActive ? "bg-white/15 text-white" : hasActiveChild ? "text-white" : "hover:bg-white/10")}
                `}
                style={hasContainerColor ? { 
                  backgroundColor: isActive ? section.containerColor : `${section.containerColor}99`,
                  color: 'white'
                } : undefined}
              >
                {isActive && !hasContainerColor && (
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
                <div className="group-hover:scale-110 transition-transform">
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-medium text-center px-1 leading-tight max-w-full truncate">
                  {section.label}
                </span>
                {section.badge !== undefined && section.badge > 0 && (
                  <span 
                    className="absolute top-2 right-3 w-4 h-4 text-[9px] text-white rounded-full flex items-center justify-center"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    {section.badge > 9 ? "9+" : section.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex-shrink-0 w-full border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full py-3 flex flex-col items-center gap-1 hover:text-red-400 hover:bg-white/10 transition-all group"
            style={{ color: 'var(--color-sidebar-text, #cbd5e1)' }}
          >
            <LogOut size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium">Sair</span>
          </button>
        </div>
      </aside>

      <div
        className={`
          h-full bg-white border-r border-slate-200
          shadow-lg transition-all duration-300 ease-in-out overflow-hidden
          ${isFlat ? (isPanelOpen ? "w-56 opacity-100" : "w-0 opacity-0") : (isPanelOpen && activeMenuSection ? "w-56 opacity-100" : "w-0 opacity-0")}
        `}
      >
        {isFlat ? (
          <div className="w-56 h-full flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 flex-shrink-0">
              <h2 className="font-semibold text-slate-800 truncate">{effectivePanelTitle}</h2>
              <button 
                onClick={() => updatePanelState(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <ChevronLeft size={18} className="text-slate-500" />
              </button>
            </div>
            
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {filteredItems.map((item) => {
                const ItemIcon = item.icon
                return (
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
                      <ItemIcon size={18} strokeWidth={1.5} />
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span 
                        className="px-1.5 py-0.5 text-xs text-white rounded-full"
                        style={{ backgroundColor: secondaryColor }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-500 text-center truncate">
                {companyName}
              </div>
            </div>
          </div>
        ) : activeMenuSection && (
          <div className="w-56 h-full flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 flex-shrink-0">
              <h2 className="font-semibold text-slate-800 truncate">{activeMenuSection.label}</h2>
              <button 
                onClick={() => {
                  updatePanelState(false)
                  setActiveSection(null)
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <ChevronLeft size={18} className="text-slate-500" />
              </button>
            </div>
            
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {filterItemsByRole(activeMenuSection.children || []).map((item) => {
                const ItemIcon = item.icon
                return (
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
                      <ItemIcon size={18} strokeWidth={1.5} />
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span 
                        className="px-1.5 py-0.5 text-xs text-white rounded-full"
                        style={{ backgroundColor: secondaryColor }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-500 text-center truncate">
                {companyName}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
