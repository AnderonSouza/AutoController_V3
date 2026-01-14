"use client"

import type React from "react"
import { useState, useMemo } from "react"
import type { User, EconomicGroup, Brand, Company, UserRole, Department, TicketDepartment } from "../types"
import MultiSelectCheckboxGroup from "./MultiSelectCheckboxGroup"

interface UserEditModalProps {
  user: User
  onClose: () => void
  onSave: (user: User) => void
  onDelete: (userId: string) => void
  economicGroups: EconomicGroup[]
  brands: Brand[]
  companies: Company[]
  departments: Department[]
}

const ROLES: UserRole[] = ["ADMIN", "Gestor", "Analista", "Leitor", "Suporte", "Operacional"]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  Gestor: "Gestor",
  Analista: "Analista",
  Leitor: "Leitor",
  Suporte: "Suporte",
  Operacional: "Operacional",
}

const REPORT_OPTIONS = [
  { id: "DRE", label: "DRE (Demonstrativo de Resultados)" },
  { id: "CASH_FLOW", label: "Fluxo de Caixa" },
  { id: "BUDGET", label: "Orçamento" },
  { id: "QUERIES", label: "Consultas Analíticas" },
]

const ACTION_OPTIONS = [
  { id: "UPLOAD", label: "Importar Arquivos (Excel)" },
  { id: "MANUAL_ENTRIES", label: "Lançamentos Manuais (Ajustes de Caixa / Contábeis)" },
  { id: "MANAGE_USERS", label: "Gerenciar Usuários" },
  { id: "SETTINGS", label: "Configurações do Sistema" },
]

const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "Uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "Uma letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "Um número", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "Um caractere especial (!@#$%)", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

const UserEditModal: React.FC<UserEditModalProps> = ({
  user: initialUser,
  onClose,
  onSave,
  onDelete,
  economicGroups,
  brands,
  companies,
  departments,
}) => {
  const [user, setUser] = useState<User>(() => {
    const u = JSON.parse(JSON.stringify(initialUser))
    if (!u.permissions) u.permissions = {}
    if (!Array.isArray(u.permissions.economicGroups)) u.permissions.economicGroups = []
    if (!Array.isArray(u.permissions.brands)) u.permissions.brands = []
    if (!Array.isArray(u.permissions.stores)) u.permissions.stores = []
    if (!Array.isArray(u.permissions.departments)) u.permissions.departments = []
    if (!Array.isArray(u.permissions.reportAccess)) u.permissions.reportAccess = []
    if (!Array.isArray(u.permissions.actionAccess)) u.permissions.actionAccess = []
    return u
  })

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [activeTab, setActiveTab] = useState<"profile_scope" | "permissions">("profile_scope")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNewUser = initialUser.id.startsWith("new_")
  const isAdminRole = user.role === "ADMIN" || user.role === "Administrador"

  const passwordValidation = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      passed: req.test(password),
    }))
  }, [password])

  const isPasswordValid = useMemo(() => {
    if (!isNewUser && !password) return true // Senha opcional para edição
    return passwordValidation.every((v) => v.passed)
  }, [isNewUser, password, passwordValidation])

  const passwordsMatch = !password || password === confirmPassword

  const handleFieldChange = (field: keyof User, value: any) => {
    let processedValue = value
    if (field === "email" && typeof value === "string") processedValue = value.toLowerCase().trim()
    const newUser = { ...user, [field]: processedValue }
    if (field === "role" && (value === "ADMIN" || value === "Administrador")) {
      newUser.permissions = {
        ...newUser.permissions,
        economicGroups: ["*"],
        brands: ["*"],
        stores: ["*"],
        departments: ["*"],
        reportAccess: REPORT_OPTIONS.map((r) => r.id),
        actionAccess: ACTION_OPTIONS.map((a) => a.id),
      }
    }
    setUser(newUser)
  }

  const handlePermissionChange = (level: keyof User["permissions"], selectedIds: string[] | ["*"]) => {
    setUser((prev) => {
      const newPermissions = { ...prev.permissions, [level]: selectedIds }
      return { ...prev, permissions: newPermissions }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validações
    if (isNewUser && !password) {
      setError("Senha é obrigatória para novos usuários")
      return
    }

    if (password && !isPasswordValid) {
      setError("A senha não atende aos requisitos de segurança")
      return
    }

    if (password && !passwordsMatch) {
      setError("As senhas não coincidem")
      return
    }

    if (!user.tenantId && economicGroups.length > 0) {
      user.tenantId = economicGroups[0].id
    }

    setIsSaving(true)
    try {
      const userToSave = { ...user }
      if (password) userToSave.password = password.trim()
      await onSave(userToSave)
      onClose()
    } catch (err: any) {
      setError(err.message || "Erro ao salvar usuário")
    } finally {
      setIsSaving(false)
    }
  }

  const filteredBrands = useMemo(() => {
    if (user.permissions.economicGroups.includes("*")) return brands
    const selectedGroupIds = new Set(user.permissions.economicGroups)
    return brands.filter((b) => {
      const groupId = b.economicGroupId || (b as any).grupo_economico_id
      return selectedGroupIds.has(groupId)
    })
  }, [user.permissions.economicGroups, brands])

  const filteredCompanies = useMemo(() => {
    if (user.permissions.brands.includes("*")) return companies
    const selectedBrandIds = new Set(user.permissions.brands)
    return companies.filter((c) => {
      const brandId = c.brandId || (c as any).marca_id
      return selectedBrandIds.has(brandId)
    })
  }, [user.permissions.brands, companies])

  const inputClass =
    "block w-full px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
  const labelClass = "block text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider"

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 max-h-[95vh] animate-scaleIn">
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {isNewUser ? "Adicionar Novo Usuário" : "Editar Perfil do Usuário"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Configure acessos e escopo de visibilidade.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("profile_scope")}
                className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "profile_scope" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Perfil & Escopo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("permissions")}
                className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === "permissions" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Permissões
              </button>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden bg-slate-50/20">
          <div className="flex-grow overflow-y-auto p-8">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            {activeTab === "profile_scope" && (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-12 gap-6">
                  <div className="col-span-6">
                    <label className={labelClass}>Nome Completo</label>
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-6">
                    <label className={labelClass}>E-mail (Login)</label>
                    <input
                      type="email"
                      value={user.email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>

                  <div className="col-span-12">
                    <label className={labelClass}>
                      Grupo Econômico <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={user.tenantId || ""}
                      onChange={(e) => handleFieldChange("tenantId", e.target.value)}
                      required
                      className={inputClass}
                    >
                      <option value="">Selecione um grupo econômico</option>
                      {economicGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                      Define a organização à qual este usuário pertence. Obrigatório para carregamento de dados.
                    </p>
                  </div>

                  <div className="col-span-4">
                    <label className={labelClass}>Perfil de Acesso</label>
                    <select
                      value={user.role}
                      onChange={(e) => handleFieldChange("role", e.target.value as UserRole)}
                      className={inputClass}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role] || role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {user.role === "Suporte" && (
                    <div className="col-span-4">
                      <label className={labelClass}>Departamento de Suporte</label>
                      <select
                        value={user.supportDepartment || ""}
                        onChange={(e) => handleFieldChange("supportDepartment", e.target.value as TicketDepartment)}
                        className={inputClass}
                        required
                      >
                        <option value="">Selecione...</option>
                        <option value="IT">TI (Tecnologia da Informação)</option>
                        <option value="CONTROLLERSHIP">Controladoria</option>
                      </select>
                    </div>
                  )}

                  <div className={user.role === "Suporte" ? "col-span-4" : "col-span-4"}>
                    <label className={labelClass}>Status</label>
                    <div className="flex items-center h-10">
                      <button
                        type="button"
                        onClick={() => handleFieldChange("status", user.status === "ativo" ? "inativo" : "ativo")}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${user.status === "ativo" ? "bg-emerald-500" : "bg-slate-300"}`}
                      >
                        <span
                          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${user.status === "ativo" ? "translate-x-6" : "translate-x-1"}`}
                        />
                      </button>
                      <span className="ml-3 text-sm font-bold text-slate-700 uppercase tracking-tight">
                        {user.status}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-6">
                    <label className={labelClass}>Senha {isNewUser ? "" : "(Deixe em branco para manter)"}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      required={isNewUser}
                      placeholder={isNewUser ? "Digite a senha" : "••••••••"}
                    />
                  </div>
                  <div className="col-span-6">
                    <label className={labelClass}>Confirme a senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`${inputClass} ${password && !passwordsMatch ? "border-red-500" : ""}`}
                      placeholder="Confirme a senha"
                    />
                    {password && !passwordsMatch && (
                      <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                    )}
                  </div>

                  {password && (
                    <div className="col-span-12">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Requisitos de senha:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {passwordValidation.map((req) => (
                            <div
                              key={req.id}
                              className={`flex items-center text-xs ${req.passed ? "text-emerald-600" : "text-slate-400"}`}
                            >
                              <span
                                className={`w-4 h-4 mr-2 rounded-full flex items-center justify-center ${req.passed ? "bg-emerald-100" : "bg-slate-200"}`}
                              >
                                {req.passed ? "✓" : "○"}
                              </span>
                              {req.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">
                    Escopo de Dados (Visibilidade)
                  </h3>
                  <div
                    className={`grid grid-cols-1 md:grid-cols-4 gap-6 ${isAdminRole ? "opacity-40 grayscale pointer-events-none" : ""}`}
                  >
                    <MultiSelectCheckboxGroup
                      label="Grupos Econômicos"
                      options={economicGroups}
                      selectedValues={user.permissions.economicGroups}
                      onChange={(v) => handlePermissionChange("economicGroups", v)}
                      isDisabled={isAdminRole}
                      emptyMessage="Nenhum grupo disponível"
                    />
                    <MultiSelectCheckboxGroup
                      label="Marcas"
                      options={filteredBrands}
                      selectedValues={user.permissions.brands}
                      onChange={(v) => handlePermissionChange("brands", v)}
                      isDisabled={isAdminRole}
                      emptyMessage="Selecione um grupo econômico primeiro"
                    />
                    <MultiSelectCheckboxGroup
                      label="Lojas (Empresas)"
                      options={filteredCompanies}
                      selectedValues={user.permissions.stores}
                      onChange={(v) => handlePermissionChange("stores", v)}
                      isDisabled={isAdminRole}
                      emptyMessage="Selecione uma marca primeiro"
                    />
                    <MultiSelectCheckboxGroup
                      label="Departamentos"
                      options={departments.map((d) => ({ id: d.id, name: d.name }))}
                      selectedValues={user.permissions.departments}
                      onChange={(v) => handlePermissionChange("departments", v)}
                      isDisabled={isAdminRole}
                      emptyMessage="Nenhum departamento disponível"
                    />
                  </div>
                </div>
              </div>
            )}
            {activeTab === "permissions" && (
              <div className="grid grid-cols-2 gap-8 h-full animate-fadeIn">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Módulos Ativos</h3>
                  <div className="space-y-2">
                    {REPORT_OPTIONS.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="custom-checkbox w-5 h-5 mr-3"
                          checked={user.permissions.reportAccess.includes(r.id) || isAdminRole}
                          disabled={isAdminRole}
                          onChange={(e) => {
                            const newAccess = e.target.checked
                              ? [...user.permissions.reportAccess, r.id]
                              : user.permissions.reportAccess.filter((id: string) => id !== r.id)
                            handlePermissionChange("reportAccess", newAccess)
                          }}
                        />
                        <span className="text-sm font-bold text-slate-700">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Ações Administrativas</h3>
                  <div className="space-y-2">
                    {ACTION_OPTIONS.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="custom-checkbox w-5 h-5 mr-3"
                          checked={user.permissions.actionAccess.includes(a.id) || isAdminRole}
                          disabled={isAdminRole}
                          onChange={(e) => {
                            const newAccess = e.target.checked
                              ? [...user.permissions.actionAccess, a.id]
                              : user.permissions.actionAccess.filter((id: string) => id !== a.id)
                            handlePermissionChange("actionAccess", newAccess)
                          }}
                        />
                        <span className="text-sm font-bold text-slate-700">{a.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || (password && (!isPasswordValid || !passwordsMatch))}
              className="px-10 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-lg hover:brightness-110 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Salvando..." : "Salvar Usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserEditModal
