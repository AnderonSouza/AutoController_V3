"use client"

import type React from "react"
import { useState } from "react"
import UnifiedSidebar, { type SidebarItem } from "./UnifiedSidebar"
import UnifiedHeader from "./UnifiedHeader"
import { Loader2 } from "lucide-react"

interface UnifiedLayoutProps {
  sidebarItems: SidebarItem[]
  activeView: string
  onNavigate: (viewId: string) => void
  onLogout: () => void
  logo?: string
  companyName?: string
  primaryColor?: string
  secondaryColor?: string
  userRole?: string
  userName?: string
  userInitials?: string
  breadcrumbPrefix?: string
  currentPageTitle: string
  isLoading?: boolean
  children: React.ReactNode
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

export default function UnifiedLayout({
  sidebarItems,
  activeView,
  onNavigate,
  onLogout,
  logo,
  companyName = "AutoController",
  primaryColor = "#0f172a",
  secondaryColor = "#3b82f6",
  userRole,
  userName = "",
  userInitials = "",
  breadcrumbPrefix = "AutoController",
  currentPageTitle,
  isLoading = false,
  children,
  onHelp,
  onNotifications,
  notificationCount = 0,
  showSearch = false,
  searchPlaceholder,
  onSearch,
  searchResults,
}: UnifiedLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--color-bg-app)' }}>
      <UnifiedSidebar
        items={sidebarItems}
        activeView={activeView}
        onNavigate={onNavigate}
        onLogout={onLogout}
        logo={logo}
        companyName={companyName}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        userRole={userRole}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <UnifiedHeader
          breadcrumbPrefix={breadcrumbPrefix}
          currentPageTitle={currentPageTitle}
          userName={userName}
          userInitials={userInitials}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          onHelp={onHelp}
          onNotifications={onNotifications}
          notificationCount={notificationCount}
          showSearch={showSearch}
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          searchResults={searchResults}
        />

        <main className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--color-bg-app)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
