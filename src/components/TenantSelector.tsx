"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { EconomicGroup } from "../types"
import { ChevronDown, Building2 } from "lucide-react"

interface TenantSelectorProps {
  tenants: EconomicGroup[]
  currentTenant: EconomicGroup | null
  onTenantChange: (tenant: EconomicGroup) => void
  isLoading?: boolean
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({ tenants, currentTenant, onTenantChange, isLoading = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isDev, setIsDev] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hostname = window.location.hostname
    const devMode =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.includes("vusercontent.net") ||
      hostname.includes("replit.dev") ||
      hostname.includes("replit.app") ||
      hostname.includes("repl.co")
    setIsDev(devMode)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!isDev) return null

  const handleSelectTenant = (tenant: EconomicGroup) => {
    // Save selection to localStorage
    if (tenant.subdomain) {
      localStorage.setItem("dev_tenant_subdomain", tenant.subdomain)
    }

    // Update URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    if (tenant.subdomain) {
      urlParams.set("tenant", tenant.subdomain)
    } else {
      urlParams.delete("tenant")
    }

    const newUrl = urlParams.toString()
    const separator = newUrl ? "?" : ""
    window.location.href = `${window.location.pathname}${separator}${newUrl}`

    onTenantChange(tenant)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary hover:bg-slate-50 transition-colors text-sm font-medium"
        title="Selecionar tenant (dev mode)"
      >
        <span className="truncate max-w-[150px]">{currentTenant?.name || "Selecionar Tenant"}</span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-secondary overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-2 bg-slate-50 border-b border-secondary">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tenants Disponíveis</p>
          </div>

          {/* Tenant List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-6 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Carregando tenants...</p>
              </div>
            ) : tenants.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nenhum tenant encontrado</p>
                <p className="text-xs text-slate-400 mt-1">Verifique a conexao com o banco de dados</p>
              </div>
            ) : (
              tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                    currentTenant?.id === tenant.id ? "bg-blue-100" : ""
                  }`}
                >
                  {/* Logo or Initial */}
                  <div className="flex-shrink-0 w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                    {tenant.logo ? (
                      <img
                        src={tenant.logo || "/placeholder.svg"}
                        alt={tenant.name}
                        className="w-full h-full object-contain rounded"
                      />
                    ) : (
                      tenant.name?.[0]?.toUpperCase() || "?"
                    )}
                  </div>

                  {/* Tenant Info */}
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{tenant.name}</p>
                    {tenant.subdomain && (
                      <p className="text-xs text-slate-500 truncate">{tenant.subdomain}.autocontroller.ai</p>
                    )}
                  </div>

                  {/* Checkmark for active tenant */}
                  {currentTenant?.id === tenant.id && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Dev Mode Footer */}
          <div className="px-4 py-2 bg-amber-50 border-t border-secondary">
            <p className="text-xs text-amber-700">💡 Dev mode: Alterar tenants sem logout</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default TenantSelector
