"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import type { FinancialAccount } from "../types"
import FileImportModal, { ImportFieldDefinition } from "./FileImportModal"
import { Upload, ChevronLeft, Search, FileText } from "lucide-react"

interface AccountImportRow {
  codigo_contabil: string
  nome: string
  tipo?: string
  natureza?: string
}

interface ChartOfAccountsViewProps {
  accounts: FinancialAccount[]
  onNavigateBack: () => void
  onImportAccounts?: (rows: AccountImportRow[]) => Promise<void>
}

const ChartOfAccountsView: React.FC<ChartOfAccountsViewProps> = ({ 
  accounts, 
  onNavigateBack,
  onImportAccounts,
}) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [visibleCount, setVisibleCount] = useState(100)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const BATCH_SIZE = 100

  const safeAccounts = accounts || []

  useEffect(() => {
    setVisibleCount(BATCH_SIZE)
  }, [searchTerm])

  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) {
      return safeAccounts
    }
    const lowercasedFilter = searchTerm.toLowerCase()
    return safeAccounts.filter((account) => {
      return (
        account.reducedCode?.toLowerCase().includes(lowercasedFilter) ||
        account.name?.toLowerCase().includes(lowercasedFilter) ||
        account.accountType?.toLowerCase().includes(lowercasedFilter) ||
        account.nature?.toLowerCase().includes(lowercasedFilter)
      )
    })
  }, [safeAccounts, searchTerm])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (visibleCount < filteredAccounts.length) {
        setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredAccounts.length))
      }
    }
  }

  const displayedAccounts = filteredAccounts.slice(0, visibleCount)

  const importFields: ImportFieldDefinition[] = [
    { key: "codigo_contabil", label: "Código Contábil", required: true, description: "Código da conta no plano contábil" },
    { key: "nome", label: "Nome/Descrição", required: true, description: "Descrição da conta" },
    { key: "tipo", label: "Tipo", required: false, description: "Tipo da conta (A=Analítica, S=Sintética)" },
    { key: "natureza", label: "Natureza", required: false, description: "Natureza da conta (D=Devedora, C=Credora)" },
  ]

  const handleImport = async (data: AccountImportRow[]) => {
    if (onImportAccounts) {
      await onImportAccounts(data)
    }
    setIsImportModalOpen(false)
  }

  return (
    <div className="page-container">
      <button onClick={onNavigateBack} className="back-button">
        <ChevronLeft className="w-4 h-4" />
        Voltar para Parâmetros de Apuração
      </button>

      <div className="content-card">
        <div className="card-header">
          <div className="header-text">
            <h1 className="card-title">Plano de Contas (Contábil)</h1>
          </div>
          <div className="header-actions">
            {onImportAccounts && (
              <button onClick={() => setIsImportModalOpen(true)} className="btn btn-primary">
                <Upload className="w-4 h-4" />
                Importar Excel
              </button>
            )}
            <span className="badge badge-neutral">
              Total: {safeAccounts.length.toLocaleString("pt-BR")} contas
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="px-6 py-4 border-b border-[var(--color-border-light)]">
            <div className="filter-search max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-search-input"
              />
            </div>
          </div>

          <div className="data-table-wrapper" style={{ border: 'none', borderRadius: 0, maxHeight: 'calc(100vh - 320px)' }} onScroll={handleScroll}>
            <table className="data-table">
              <thead className="sticky-header">
                <tr>
                  <th className="text-left">Código Contábil</th>
                  <th className="text-left">Descrição</th>
                  <th className="text-center" style={{ width: '100px' }}>Tipo</th>
                  <th className="text-center" style={{ width: '100px' }}>Natureza</th>
                </tr>
              </thead>
              <tbody>
                {displayedAccounts.length > 0 ? (
                  displayedAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="font-mono text-[var(--color-text-secondary)]">
                        {account.reducedCode || "-"}
                      </td>
                      <td>{account.name || "-"}</td>
                      <td className="text-center text-[var(--color-text-muted)]">{account.accountType || "-"}</td>
                      <td className="text-center text-[var(--color-text-muted)]">{account.nature || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="table-empty">
                        <FileText className="w-12 h-12 text-slate-300" />
                        <span>
                          {safeAccounts.length > 0
                            ? `Nenhum resultado encontrado para "${searchTerm}".`
                            : "Nenhum plano de contas carregado. Clique em 'Importar Excel' para carregar."}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
                {visibleCount < filteredAccounts.length && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-xs text-slate-400 bg-slate-50/50 animate-pulse">
                      Carregando mais contas...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FileImportModal
        title="Importar Plano de Contas"
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        fields={importFields}
      />
    </div>
  )
}

export default ChartOfAccountsView
