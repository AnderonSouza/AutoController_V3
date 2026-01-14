"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { User } from "../types"
import { supabase } from "../utils/supabaseClient"
import { createNewUser } from "../utils/db"

interface SuperAdminViewProps {
  currentUser: User
  onNavigateToOrg: (orgId: string) => void
}

interface OrgStats {
  id: string
  name: string
  subdomain: string | null
  logo: string | null
  userCount: number
  companyCount: number
  createdAt: string
}

const SuperAdminView: React.FC<SuperAdminViewProps> = ({ currentUser, onNavigateToOrg }) => {
  const [organizations, setOrganizations] = useState<OrgStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"orgs" | "create-org" | "create-admin">("orgs")
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)

  // Form states
  const [newOrgName, setNewOrgName] = useState("")
  const [newOrgSubdomain, setNewOrgSubdomain] = useState("")
  const [newAdminName, setNewAdminName] = useState("")
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [newAdminOrgId, setNewAdminOrgId] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    setIsLoading(true)
    try {
      // Buscar todas as organizações (SUPER_ADMIN bypassa RLS)
      const { data: orgs, error: orgsError } = await supabase
        .from("organizacoes")
        .select("id, nome, subdomain, logo, criado_em")
        .order("nome")

      if (orgsError) throw orgsError

      // Para cada org, buscar contagem de usuários e empresas
      const orgsWithStats: OrgStats[] = await Promise.all(
        (orgs || []).map(async (org) => {
          const { count: userCount } = await supabase
            .from("usuarios")
            .select("*", { count: "exact", head: true })
            .eq("organizacao_id", org.id)

          const { count: companyCount } = await supabase
            .from("empresas")
            .select("*", { count: "exact", head: true })
            .eq("organizacao_id", org.id)

          return {
            id: org.id,
            name: org.nome,
            subdomain: org.subdomain,
            logo: org.logo,
            userCount: userCount || 0,
            companyCount: companyCount || 0,
            createdAt: org.criado_em,
          }
        }),
      )

      setOrganizations(orgsWithStats)
    } catch (error) {
      console.error("Erro ao carregar organizações:", error)
      setMessage({ type: "error", text: "Erro ao carregar organizações" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) {
      setMessage({ type: "error", text: "Nome da organização é obrigatório" })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from("organizacoes")
        .insert({
          nome: newOrgName.trim(),
          subdomain: newOrgSubdomain.trim().toLowerCase() || null,
          config_interface: {
            font: "'Source Sans Pro', sans-serif",
            primaryColor: "#142a94",
            secondaryColor: "#000000",
            backgroundColor: "#ffffff",
            textColor: "#000000",
          },
        })
        .select()
        .single()

      if (error) throw error

      setMessage({ type: "success", text: `Organização "${newOrgName}" criada com sucesso!` })
      setNewOrgName("")
      setNewOrgSubdomain("")
      loadOrganizations()
      setActiveTab("orgs")
    } catch (error: any) {
      console.error("Erro ao criar organização:", error)
      if (error.code === "23505") {
        setMessage({ type: "error", text: "Este subdomínio já está em uso" })
      } else {
        setMessage({ type: "error", text: "Erro ao criar organização" })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword || !newAdminOrgId) {
      setMessage({ type: "error", text: "Preencha todos os campos" })
      return
    }

    if (newAdminPassword.length < 6) {
      setMessage({ type: "error", text: "Senha deve ter no mínimo 6 caracteres" })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        email_confirm: true,
      })

      if (authError) {
        // Se não tiver permissão de admin, usar signUp normal
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: newAdminEmail.trim(),
          password: newAdminPassword,
        })

        if (signUpError) throw signUpError

        // Criar registro na tabela usuarios
        await createNewUser({
          id: signUpData.user?.id,
          name: newAdminName.trim(),
          email: newAdminEmail.trim(),
          role: "ADMIN",
          status: "ativo",
          tenantId: newAdminOrgId,
          permissions: { all: true },
        })
      } else {
        // Criar registro na tabela usuarios
        await createNewUser({
          id: authData.user?.id,
          name: newAdminName.trim(),
          email: newAdminEmail.trim(),
          role: "ADMIN",
          status: "ativo",
          tenantId: newAdminOrgId,
          permissions: { all: true },
        })
      }

      setMessage({ type: "success", text: `Administrador "${newAdminName}" criado com sucesso!` })
      setNewAdminName("")
      setNewAdminEmail("")
      setNewAdminPassword("")
      setNewAdminOrgId("")
      loadOrganizations()
      setActiveTab("orgs")
    } catch (error: any) {
      console.error("Erro ao criar administrador:", error)
      setMessage({ type: "error", text: error.message || "Erro ao criar administrador" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOrg = async (orgId: string, orgName: string) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a organização "${orgName}"? Esta ação é irreversível e excluirá todos os dados relacionados.`,
      )
    ) {
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.from("organizacoes").delete().eq("id", orgId)

      if (error) throw error

      setMessage({ type: "success", text: `Organização "${orgName}" excluída com sucesso` })
      loadOrganizations()
    } catch (error) {
      console.error("Erro ao excluir organização:", error)
      setMessage({ type: "error", text: "Erro ao excluir organização. Verifique se não há dados vinculados." })
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel do Super Administrador</h1>
        <p className="text-gray-600">Gerencie todas as organizações e seus administradores</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("orgs")}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === "orgs" ? "text-primary border-b-2 border-primary" : "text-gray-600 hover:text-gray-900"}`}
        >
          Organizações ({organizations.length})
        </button>
        <button
          onClick={() => setActiveTab("create-org")}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === "create-org" ? "text-primary border-b-2 border-primary" : "text-gray-600 hover:text-gray-900"}`}
        >
          + Nova Organização
        </button>
        <button
          onClick={() => setActiveTab("create-admin")}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === "create-admin" ? "text-primary border-b-2 border-primary" : "text-gray-600 hover:text-gray-900"}`}
        >
          + Novo Administrador
        </button>
      </div>

      {/* Content */}
      {activeTab === "orgs" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Carregando organizações...</div>
          ) : organizations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">Nenhuma organização cadastrada</p>
              <button
                onClick={() => setActiveTab("create-org")}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Criar primeira organização
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Organização
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Subdomínio
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Usuários
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Empresas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {org.logo ? (
                          <img
                            src={org.logo || "/placeholder.svg"}
                            alt={org.name}
                            className="w-10 h-10 rounded-lg object-contain bg-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {org.subdomain ? (
                        <a
                          href={`https://${org.subdomain}.autocontroller.ai`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {org.subdomain}.autocontroller.ai
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">Não configurado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {org.userCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-medium">
                        {org.companyCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(org.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onNavigateToOrg(org.id)}
                          className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Acessar
                        </button>
                        <button
                          onClick={() => {
                            setNewAdminOrgId(org.id)
                            setActiveTab("create-admin")
                          }}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          + Admin
                        </button>
                        <button
                          onClick={() => handleDeleteOrg(org.id, org.name)}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          disabled={isSaving}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "create-org" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-xl font-semibold mb-6">Nova Organização</h2>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Organização *</label>
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Ex: Grupo Viamar"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subdomínio</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={newOrgSubdomain}
                  onChange={(e) => setNewOrgSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="viamargrupo"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                  .autocontroller.ai
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Deixe em branco para configurar depois</p>
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Criando..." : "Criar Organização"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "create-admin" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-xl font-semibold mb-6">Novo Administrador de Organização</h2>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organização *</label>
              <select
                value={newAdminOrgId}
                onChange={(e) => setNewAdminOrgId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="">Selecione uma organização</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
              <input
                type="text"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Nome do administrador"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@empresa.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
              <input
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
                minLength={6}
              />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Criando..." : "Criar Administrador"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6">
          <div className="text-3xl font-bold text-primary">{organizations.length}</div>
          <div className="text-gray-600">Organizações</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl p-6">
          <div className="text-3xl font-bold text-blue-600">
            {organizations.reduce((acc, org) => acc + org.userCount, 0)}
          </div>
          <div className="text-gray-600">Usuários Total</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-6">
          <div className="text-3xl font-bold text-green-600">
            {organizations.reduce((acc, org) => acc + org.companyCount, 0)}
          </div>
          <div className="text-gray-600">Empresas Total</div>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminView
