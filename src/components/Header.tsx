"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { User } from "../types"
import TenantSelector from "./TenantSelector"
import type { EconomicGroup } from "../types" // Assuming EconomicGroup is defined in a types file

interface HeaderProps {
  title: string
  store: string
  department?: string
  showContext?: boolean
  onToggleSidebar: () => void
  brandLogo?: string
  groupLogo?: string
  user: User | null
  onLogout: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onOpenNotifications?: (createMode?: boolean) => void
  onNewActivity?: () => void
  unreadNotificationCount?: number
  onHelp?: () => void
  onOpenLuca?: () => void
  availableTenants?: EconomicGroup[]
  currentTenant?: EconomicGroup | null
  onTenantChange?: (tenant: EconomicGroup) => void
}

const Header: React.FC<HeaderProps> = ({
  title,
  store,
  department,
  showContext = false,
  onToggleSidebar,
  user,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  onOpenNotifications,
  unreadNotificationCount = 0,
  onHelp,
  groupLogo,
  onOpenLuca,
  availableTenants,
  currentTenant,
  onTenantChange,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [userMenuRef])

  if (!user) return null

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <header
      className="px-6 py-3 shrink-0 transition-colors duration-300 z-[100] relative border-b border-secondary h-16 flex items-center justify-between"
      style={{ backgroundColor: "var(--color-header-bg)", color: "var(--color-header-text)" }}
    >
      <div className="flex-grow flex items-center gap-4 mr-4 overflow-hidden h-full">
        {groupLogo && (
          <div className="flex-shrink-0 h-10 w-auto flex items-center">
            <img src={groupLogo || "/placeholder.svg"} alt="Logo" className="h-full w-auto object-contain" />
          </div>
        )}
        <div className="flex flex-col justify-center overflow-hidden">
          {showContext && !isCollapsed && (
            <h2 className="text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate opacity-60">{store}</h2>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold leading-tight truncate">{title}</h1>
            {showContext && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-0.5 rounded-full hover:bg-black/10 transition-colors shrink-0 opacity-60 hover:opacity-100"
              >
                {isCollapsed ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
            )}
          </div>
          {showContext && !isCollapsed && department && (
            <p className="text-xs font-medium mt-0.5 truncate opacity-80">{department}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {availableTenants && availableTenants.length > 0 && onTenantChange && (
          <TenantSelector
            tenants={availableTenants}
            currentTenant={currentTenant || null}
            onTenantChange={onTenantChange}
          />
        )}

        {onOpenLuca && (
          <button
            onClick={onOpenLuca}
            className="p-2 rounded-full transition-colors opacity-70 hover:opacity-100 hover:bg-black/5"
            title="Luca (CFO Virtual)"
            style={{ color: "var(--color-primary)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </button>
        )}

        <button
          onClick={onHelp}
          className="p-2 rounded-full transition-colors opacity-70 hover:opacity-100 hover:bg-black/5"
          title="Ajuda"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {onOpenNotifications && (
          <button
            onClick={() => onOpenNotifications(false)}
            className="relative p-2 rounded-full transition-colors opacity-70 hover:opacity-100 hover:bg-black/5"
            title="Notificações"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            )}
          </button>
        )}

        <div className="relative ml-1" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 border-secondary hover:ring-2 hover:ring-primary transition-all shadow-sm"
            style={{ backgroundColor: "var(--color-primary)", color: "#ffffff" }}
          >
            {initials}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-secondary overflow-hidden animate-fadeIn z-[9999]">
              <div className="p-5 border-b border-slate-100 flex flex-col items-center text-center bg-slate-50/50">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-md"
                  style={{ backgroundColor: "var(--color-primary)", color: "#ffffff" }}
                >
                  {initials}
                </div>
                <h3 className="font-bold text-slate-800">{user.name}</h3>
                <p className="text-xs text-slate-500 break-all">{user.email}</p>
              </div>
              <div className="border-t border-slate-100 p-2 bg-slate-50/30">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Fazer logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
