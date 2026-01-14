"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import type { FinancialAccount } from "../types"
import FileImportModal, { ImportFieldDefinition } from "./FileImportModal"
import { Upload } from "lucide-react"

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
    <main className="flex-grow p-4 sm:p-6 lg:p-8 flex flex-col h-full overflow-hidden" style={{ backgroundColor: "var(--color-bg-app)" }}>
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <button
            onClick={onNavigateBack}
            className="text-sm text-slate-600 hover:text-slate-800 font-semibold flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Voltar para Parâmetros de Apuração
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 flex flex-col flex-grow overflow-hidden">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h1 className="text-2xl font-bold text-slate-800">Plano de Contas (Contábil)</h1>
            <div className="flex items-center gap-3">
              {onImportAccounts && (
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg text-sm hover:bg-primary-hover shadow-sm transition-colors flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar Excel
                </button>
              )}
              <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                Total: {safeAccounts.length.toLocaleString("pt-BR")} contas
              </span>
            </div>
          </div>

          <div className="my-4 shrink-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <svg
                  className="h-5 w-5 text-slate-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por código, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-colors"
              />
            </div>
          </div>

          <div className="overflow-auto border border-slate-200 rounded-lg flex-grow" onScroll={handleScroll}>
            <table className="min-w-full">
              <thead className="bg-slate-50 sticky top-0 shadow-sm">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Código Contábil
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                    Tipo
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                    Natureza
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayedAccounts.length > 0 ? (
                  displayedAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-sm text-slate-700 whitespace-nowrap font-mono">
                        {account.reducedCode || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-sm text-slate-800">{account.name || "-"}</td>
                      <td className="py-2.5 px-4 text-sm text-slate-500 text-center">{account.accountType || "-"}</td>
                      <td className="py-2.5 px-4 text-sm text-slate-500 text-center">{account.nature || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-500">
                      {safeAccounts.length > 0
                        ? `Nenhum resultado encontrado para "${searchTerm}".`
                        : "Nenhum plano de contas carregado. Clique em 'Importar Excel' para carregar."}
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
    </main>
  )
}

export default ChartOfAccountsView
