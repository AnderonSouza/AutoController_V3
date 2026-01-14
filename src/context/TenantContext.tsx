"use client"

import React, { createContext, useContext, type ReactNode } from "react"

interface TenantContextValue {
  effectiveTenantId: string | null
  selectedEconomicGroupId: string | null
  setSelectedEconomicGroupId: (id: string | null) => void
  availableTenants: Array<{ id: string; name: string; subdomain: string | null }>
  currentSubdomain: string | null
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined)

interface TenantProviderProps {
  children: ReactNode
  value: TenantContextValue
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children, value }) => {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export const useTenant = (): TenantContextValue => {
  const context = useContext(TenantContext)
  if (context === undefined) {
    console.warn("useTenant must be used within a TenantProvider, returning defaults")
    return {
      effectiveTenantId: null,
      selectedEconomicGroupId: null,
      setSelectedEconomicGroupId: () => {},
      availableTenants: [],
      currentSubdomain: null,
    }
  }
  return context
}
