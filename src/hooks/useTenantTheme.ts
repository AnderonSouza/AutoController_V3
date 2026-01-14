"use client"

import { useState, useEffect } from "react"
import type { EconomicGroup } from "../types"
import { getSubdomainFromUrl, getTenantBySubdomain } from "../utils/tenant"
import { applyThemeToDocument } from "../utils/theme"

interface UseTenantThemeResult {
  tenant: EconomicGroup | null
  isLoading: boolean
  error: string | null
  subdomain: string | null
}

/**
 * Hook que carrega automaticamente o tema do tenant baseado no subdomínio da URL
 * Usado na tela de login para carregar o tema antes do usuário autenticar
 */
export function useTenantTheme(): UseTenantThemeResult {
  const [tenant, setTenant] = useState<EconomicGroup | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subdomain, setSubdomain] = useState<string | null>(null)

  useEffect(() => {
    async function loadTenantTheme() {
      try {
        setIsLoading(true)
        setError(null)

        // Extrair subdomínio da URL
        const currentSubdomain = getSubdomainFromUrl()
        setSubdomain(currentSubdomain)

        if (!currentSubdomain) {
          // Sem subdomínio, usar tema padrão
          setTenant(null)
          setIsLoading(false)
          return
        }

        // Buscar dados do tenant pelo subdomínio
        const tenantData = await getTenantBySubdomain(currentSubdomain)

        if (!tenantData) {
          setError(`Organização "${currentSubdomain}" não encontrada`)
          setTenant(null)
          setIsLoading(false)
          return
        }

        setTenant(tenantData)

        // Aplicar tema do tenant
        applyThemeToDocument(tenantData)
      } catch (err) {
        console.error("Erro ao carregar tema do tenant:", err)
        setError("Erro ao carregar configurações da organização")
      } finally {
        setIsLoading(false)
      }
    }

    loadTenantTheme()
  }, [])

  return { tenant, isLoading, error, subdomain }
}
