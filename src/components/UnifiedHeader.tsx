"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Search,
  ChevronRight,
  HelpCircle,
  Bell,
} from "lucide-react"

interface UnifiedHeaderProps {
  breadcrumbPrefix?: string
  currentPageTitle: string
  userName?: string
  userInitials?: string
  primaryColor?: string
  secondaryColor?: string
  onHelp?: () => void
  onNotifications?: () => void
  notificationCount?: number
  showSearch?: boolean
  searchPlaceholder?: string
  onSearch?: (term: string) => void
  searchResults?: Array<{
    id: string
    type: string
    title: string
    subtitle: string
    icon: React.ElementType
    action: () => void
  }>
}

export default function UnifiedHeader({
  breadcrumbPrefix = "AutoController",
  currentPageTitle,
  userName = "",
  userInitials = "",
  primaryColor = "#0f172a",
  secondaryColor = "#3b82f6",
  onHelp,
  onNotifications,
  notificationCount = 0,
  showSearch = true,
  searchPlaceholder = "Procurar conteúdo",
  onSearch,
  searchResults = [],
}: UnifiedHeaderProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    onSearch?.(value)
  }

  const getInitials = (name: string) => {
    if (userInitials) return userInitials
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">{breadcrumbPrefix}</span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-900">{currentPageTitle}</span>
      </div>

      {showSearch && (
        <div ref={searchRef} className="flex-1 max-w-xl mx-8 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => {
                setShowSearchDropdown(true)
                onSearch?.(searchTerm)
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50 focus:bg-white"
              style={{ "--tw-ring-color": secondaryColor } as React.CSSProperties}
            />
          </div>

          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-2 border-b border-slate-100">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {searchTerm ? "Resultados" : "Sugestões"}
                </span>
              </div>
              <div className="py-1">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      result.action()
                      setShowSearchDropdown(false)
                      setSearchTerm("")
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left"
                  >
                    <div className="p-1.5 rounded" style={{ backgroundColor: `${primaryColor}15` }}>
                      <result.icon className="w-4 h-4" style={{ color: primaryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{result.title}</p>
                      <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {onHelp && (
          <button
            onClick={onHelp}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        )}
        {onNotifications && (
          <button
            onClick={onNotifications}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full relative"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs text-white rounded-full"
                style={{ backgroundColor: secondaryColor }}
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
        )}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
          style={{ backgroundColor: primaryColor }}
          title={userName}
        >
          {getInitials(userName)}
        </div>
      </div>
    </header>
  )
}
