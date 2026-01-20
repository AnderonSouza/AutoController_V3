"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { TrialBalanceEntry } from "../types"
import { getAuditEntries } from "../utils/db"
import { useTenant } from "../context/TenantContext"

interface AccountingEntriesViewProps {
  onNavigateBack: () => void
}

const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num)) return "-"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num)
}

const formatCurrency = formatNumber

const AccountingEntriesView: React.FC<AccountingEntriesViewProps> = ({ onNavigateBack }) => {
  const { effectiveTenantId } = useTenant()
  const tenantId = effectiveTenantId || null

  // State for Data
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(1)

  // State for Filters
  const currentYear = new Date().getFullYear()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterYear, setFilterYear] = useState<number>(currentYear)

  // Constants
  const PAGE_SIZE = 100

  // Fetch Data Effect
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const result = await getAuditEntries(
          filterYear,
          [], // months
          [], // companies
          page,
          PAGE_SIZE,
          searchTerm,
          tenantId, // Novo parâmetro
        )

        const data = result.data as TrialBalanceEntry[]
        const total = result.total

        if (page === 1) {
          setEntries(data)
        } else {
          setEntries((prev) => [...prev, ...data])
        }
        setTotalRows(total)
      } catch (error) {
        console.error("Failed to load accounting entries:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce search slightly
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [page, searchTerm, filterYear, tenantId])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, filterYear])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 100 && !isLoading && entries.length < totalRows) {
      setPage((prev) => prev + 1)
    }
  }

  const headers = [
    "Empresa",
    "CNPJ",
    "Cód. ERP",
    "Data",
    "ID Conta",
    "Descrição Conta",
    "Sigla CR",
    "Descrição CR",
    "Natureza",
    "Valor",
  ]

  return (
    <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
      <div className="w-full flex flex-col h-full">
        <div className="flex flex-col overflow-hidden flex-grow p-6">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h1 className="text-2xl font-bold text-gray-800">Lançamentos Contábeis Importados</h1>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Exibindo {entries.length} de {totalRows.toLocaleString()} registros
            </span>
          </div>

          <div className="my-4 shrink-0 flex gap-4">
            <div className="w-32">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="block w-full py-2 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por conta, descrição ou CR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="overflow-auto border rounded-lg flex-grow relative" onScroll={handleScroll}>
            <table className="min-w-full sticky-header-table">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.length > 0
                  ? entries.map((entry, index) => {
                      // Safe Date Formatting
                      let formattedData = `${entry.month}/${entry.year}`
                      if (entry.data) {
                        const parts = String(entry.data).split("-")
                        if (parts.length === 3) {
                          formattedData = `${parts[2]}/${parts[1]}/${parts[0]}`
                        }
                      }

                      return (
                        <tr key={entry.id || index} className="hover:bg-gray-50 transition-colors">
                          {/* Fix: Accessing properties correctly on TrialBalanceEntry */}
                          <td className="py-2 px-4 text-sm text-gray-600 whitespace-nowrap">
                            {entry.empresa || entry.store || "-"}
                          </td>
                          <td className="py-2 px-4 text-xs text-gray-500 whitespace-nowrap font-mono">
                            {entry.companyCnpj || "-"}
                          </td>
                          <td className="py-2 px-4 text-sm text-gray-600 whitespace-nowrap font-mono">
                            {entry.companyErpCode || "-"}
                          </td>
                          <td className="py-2 px-4 text-sm text-gray-600 whitespace-nowrap">{formattedData}</td>
                          <td className="py-2 px-4 text-sm text-gray-800 font-mono font-medium whitespace-nowrap bg-slate-50/50">
                            {entry.idconta}
                          </td>
                          <td
                            className="py-2 px-4 text-sm text-gray-800 whitespace-nowrap max-w-xs truncate"
                            title={entry.descricaoconta}
                          >
                            {entry.descricaoconta}
                          </td>
                          <td className="py-2 px-4 text-sm text-gray-800 font-medium whitespace-nowrap">
                            {entry.siglacr}
                          </td>
                          <td
                            className="py-2 px-4 text-sm text-gray-800 whitespace-nowrap max-w-xs truncate"
                            title={entry.descricaocr}
                          >
                            {entry.descricaocr}
                          </td>
                          <td className="py-2 px-4 text-sm text-gray-600 whitespace-nowrap text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${entry.natureza === "D" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
                            >
                              {entry.natureza}
                            </span>
                          </td>
                          <td
                            className={`py-2 px-4 text-sm font-semibold text-right whitespace-nowrap ${entry.natureza === "C" ? "text-green-700" : "text-red-600"}`}
                          >
                            {formatCurrency(entry.valor)}
                          </td>
                        </tr>
                      )
                    })
                  : !isLoading && (
                      <tr>
                        <td colSpan={headers.length} className="text-center py-12 text-gray-500">
                          {entries.length === 0 ? `Nenhum resultado encontrado.` : ""}
                        </td>
                      </tr>
                    )}
                {isLoading && (
                  <tr>
                    <td
                      colSpan={headers.length}
                      className="text-center py-4 text-xs text-slate-500 bg-slate-50 font-medium animate-pulse"
                    >
                      Carregando dados...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

export default AccountingEntriesView
