"use client"

import React, { useMemo, useState } from "react"
import type { FinancialAccount, UserRole } from "../types"
import EditableCell from "./EditableCell"
import { CALENDAR_MONTHS } from "../constants"

const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num) || num === 0) return "-"
  return new Intl.NumberFormat("pt-BR").format(Math.round(num))
}

const getNumberClass = (num: number | undefined) => {
  if (num === undefined || num === null || num === 0) return "text-slate-400"
  return num < 0 ? "text-red-600" : "text-slate-800"
}

interface BudgetTableRowProps {
  account: FinancialAccount
  level: number
  onDataChange: (accountId: string, year: number, month: string, field: "orcadoManual", value: number) => void
  displayPeriods: { year: number; month: string }[]
  pendingChanges: Record<string, number>
  showDetails: boolean
  showVerticalAnalysis: boolean
  showHorizontalAnalysis: boolean
  showBenchmark: boolean
  totalReceita: number
}

const BudgetTableRow: React.FC<BudgetTableRowProps> = ({
  account,
  level,
  onDataChange,
  displayPeriods,
  pendingChanges,
  showDetails,
  showVerticalAnalysis,
  showHorizontalAnalysis,
  showBenchmark,
  totalReceita,
}) => {
  const isTotal = account.isTotal
  const isSubTotal = account.isSubTotal

  // Use CSS Variables for Theme Support
  let rowStyle: React.CSSProperties = {
    backgroundColor: "var(--color-table-row-bg, #ffffff)",
    color: "var(--color-text-main, #1e293b)",
  }
  let nameCellClasses = "font-normal"
  let valueCellFont = "font-normal"

  if (isTotal) {
    rowStyle = {
      backgroundColor: "var(--color-table-total-bg, #f5f3ff)",
      color: "var(--color-text-main, #1e293b)",
    }
    nameCellClasses = "font-bold"
    valueCellFont = "font-bold"
  } else if (isSubTotal) {
    rowStyle = {
      backgroundColor: "var(--color-table-subtotal-bg, #f8fafc)",
      color: "var(--color-text-main, #1e293b)",
    }
    nameCellClasses = "font-semibold"
    valueCellFont = "font-semibold"
  }

  const effectiveLevel = level + (account.levelAdjustment || 0)
  const paddingLeft = `${1 + effectiveLevel * 1.5}rem`

  const rowContent = (
    <tr style={rowStyle} className="border-b border-slate-100 transition-colors hover:brightness-95">
      {/* Sticky Name Column */}
      <td
        style={{ paddingLeft, backgroundColor: "inherit", color: "inherit" }}
        className={`py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20 ${nameCellClasses} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r-4 border-slate-200`}
      >
        {account.name}
      </td>

      {displayPeriods.map(({ year, month }, index) => {
        const data = account.monthlyData[year]?.[month]
        const premissas = data?.orcadoPremissas || 0
        const historico = data?.orcadoHistorico || 0
        const manual = data?.orcadoManual || 0
        const importado = data?.orcadoImportado || 0
        const total = data?.orcado || 0

        const changeKey = `${account.id}-${year}-${month}`
        const isPending = pendingChanges.hasOwnProperty(changeKey)

        const separatorClass = "border-r border-slate-200"

        const verticalPct = totalReceita && total ? ((total / totalReceita) * 100).toFixed(1) : '-';
        const prevYearData = account.monthlyData[year - 1]?.[month];
        const prevTotal = prevYearData?.orcado || 0;
        const horizontalPct = prevTotal && total ? (((total - prevTotal) / Math.abs(prevTotal)) * 100).toFixed(1) : '-';

        return (
          <React.Fragment key={`${account.id}-${year}-${month}`}>
            {showDetails && (
              <>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(premissas)} ${valueCellFont}`}>
                  {formatNumber(premissas)}
                </td>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(historico)} ${valueCellFont}`}>
                  {formatNumber(historico)}
                </td>
                {/* Manual - Input Cell */}
                <td
                  className={`p-0 text-right text-sm whitespace-nowrap relative transition-colors ${isTotal || isSubTotal ? "" : "hover:bg-yellow-50/20"} ${isPending ? "bg-yellow-50" : ""}`}
                >
                  <div className="h-full w-full p-2">
                    <EditableCell
                      value={manual}
                      onChange={(newValue) => onDataChange(account.id, year, month, "orcadoManual", newValue)}
                      disabled={isTotal || isSubTotal}
                      className={`w-full text-right bg-transparent outline-none ${valueCellFont} ${isTotal || isSubTotal ? "text-slate-400" : "text-slate-700"} ${isPending ? "font-bold text-yellow-700" : !isTotal && !isSubTotal && manual !== 0 ? "bg-yellow-50/20 rounded" : ""}`}
                    />
                  </div>
                </td>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(importado)} ${valueCellFont}`}>
                  {formatNumber(importado)}
                </td>
              </>
            )}
            {/* Total Column */}
            <td
              className={`p-3 text-right text-sm whitespace-nowrap ${valueCellFont} ${getNumberClass(total)} ${separatorClass}`}
              style={{ backgroundColor: "rgba(0,0,0,0.02)" }}
            >
              {formatNumber(total)}
            </td>
            {showVerticalAnalysis && (
              <td className={`p-2 text-right text-xs whitespace-nowrap ${valueCellFont} text-blue-700`}>
                {verticalPct !== '-' ? `${verticalPct}%` : '-'}
              </td>
            )}
            {showHorizontalAnalysis && (
              <td className={`p-2 text-right text-xs whitespace-nowrap ${valueCellFont} ${Number(horizontalPct) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {horizontalPct !== '-' ? `${Number(horizontalPct) >= 0 ? '+' : ''}${horizontalPct}%` : '-'}
              </td>
            )}
          </React.Fragment>
        )
      })}
    </tr>
  )

  const childrenContent =
    account.children &&
    account.children.map((child) => (
      <BudgetTableRow
        key={child.id}
        account={child}
        level={level + 1}
        onDataChange={onDataChange}
        displayPeriods={displayPeriods}
        pendingChanges={pendingChanges}
        showDetails={showDetails}
        showVerticalAnalysis={showVerticalAnalysis}
        showHorizontalAnalysis={showHorizontalAnalysis}
        showBenchmark={showBenchmark}
        totalReceita={totalReceita}
      />
    ))

  if (isTotal || isSubTotal) {
    return (
      <>
        {childrenContent}
        {rowContent}
      </>
    )
  }

  return (
    <>
      {rowContent}
      {childrenContent}
    </>
  )
}

interface BudgetTableProps {
  data: FinancialAccount[]
  onDataChange: (
    accountId: string,
    year: number,
    month: string,
    field: "orcadoManual",
    value: number,
    persist?: boolean,
  ) => void
  onSaveBatch?: (changes: any[]) => Promise<void>
  onDiscardChanges?: () => void
  activeTab: string
  selectedPeriod: { years: number[]; months: string[] }
  userRole?: UserRole
  closingConfig?: { lastClosedYear: number; lastClosedMonth: string }
  showDetails?: boolean
  showVerticalAnalysis?: boolean
  showHorizontalAnalysis?: boolean
  showBenchmark?: boolean
}

const BudgetTable: React.FC<BudgetTableProps> = ({
  data,
  onDataChange,
  onSaveBatch,
  onDiscardChanges,
  activeTab,
  selectedPeriod,
  userRole,
  closingConfig,
  showDetails = true,
  showVerticalAnalysis = false,
  showHorizontalAnalysis = false,
  showBenchmark = false,
}) => {
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)

  const displayPeriods = useMemo(() => {
    const periods = selectedPeriod.years
      .flatMap((year) => selectedPeriod.months.map((month) => ({ year, month })))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return CALENDAR_MONTHS.indexOf(a.month) - CALENDAR_MONTHS.indexOf(b.month)
      })
    return periods
  }, [selectedPeriod])

  const handleValueChange = (accountId: string, year: number, month: string, field: "orcadoManual", value: number) => {
    const key = `${accountId}-${year}-${month}`
    setPendingChanges((prev) => ({ ...prev, [key]: value }))
    onDataChange(accountId, year, month, field, value, false)
  }

  const handleSave = async () => {
    if (!onSaveBatch) return
    setIsSaving(true)
    const changesArray = Object.entries(pendingChanges).map(([key, value]) => {
      const [accountId, yearStr, month] = key.split("-")
      return { accountId, year: Number.parseInt(yearStr), month, value }
    })
    await onSaveBatch(changesArray)
    setPendingChanges({})
    setIsSaving(false)
  }

  const handleDiscard = () => {
    if (confirm("Deseja descartar todas as alterações não salvas?")) {
      setPendingChanges({})
    }
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0

  // Calculate total receita for vertical analysis (first account is usually "Receita Bruta" or similar)
  const totalReceita = useMemo(() => {
    const receitaAccount = data.find(acc => 
      acc.name.toLowerCase().includes('receita bruta') || 
      acc.name.toLowerCase().includes('receita total') ||
      acc.isTotal
    );
    if (!receitaAccount) return 0;
    
    let total = 0;
    displayPeriods.forEach(({ year, month }) => {
      const monthData = receitaAccount.monthlyData[year]?.[month];
      total += monthData?.orcado || 0;
    });
    return total;
  }, [data, displayPeriods]);

  // Header Style from Theme
  const headerStyle: React.CSSProperties = {
    backgroundColor: "var(--color-table-header-bg, #f8fafc)",
    color: "var(--color-table-header-text, #1e293b)",
  }

  return (
    <div className="relative h-full flex flex-col bg-white">
      <div className="flex-grow overflow-auto">
        <table className="w-max min-w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-[400px]" />
            {displayPeriods.map(({ year, month }) => (
              <React.Fragment key={`col-${year}-${month}`}>
                {showDetails && (
                  <>
                    <col className="w-28" />
                    <col className="w-28" />
                    <col className="w-28" />
                    <col className="w-28" />
                  </>
                )}
                <col className="w-28" />
                {showVerticalAnalysis && <col className="w-20" />}
                {showHorizontalAnalysis && <col className="w-20" />}
              </React.Fragment>
            ))}
            {showBenchmark && <col className="w-28" />}
          </colgroup>
          <thead className="sticky top-0 z-30 shadow-sm">
            <tr style={headerStyle} className="text-xs font-bold tracking-wider border-b border-slate-200">
              {/* Main Header Cell */}
              <th
                rowSpan={2}
                style={headerStyle}
                className="p-4 text-left sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r-4 border-slate-200"
              >
                {activeTab}
              </th>
              {displayPeriods.map(({ year, month }) => {
                const colSpan = (showDetails ? 4 : 0) + 1 + (showVerticalAnalysis ? 1 : 0) + (showHorizontalAnalysis ? 1 : 0);
                return (
                  <th
                    key={`${year}-${month}`}
                    colSpan={colSpan}
                    style={headerStyle}
                    className="p-4 text-center uppercase border-r border-slate-200"
                  >
                    {month === "TOTAL" ? "TOTAL" : `${month.substring(0, 3)}/${year}`}
                  </th>
                );
              })}
              {showBenchmark && (
                <th rowSpan={2} style={headerStyle} className="p-4 text-center border-r border-slate-200">
                  Benchmark
                </th>
              )}
            </tr>
            <tr className="text-[10px] font-bold border-b border-slate-200" style={headerStyle}>
              {displayPeriods.map(({ year, month }) => (
                <React.Fragment key={`subhead-${year}-${month}`}>
                  {showDetails && (
                    <>
                      <th style={headerStyle} className="py-3 px-1 text-center border-r border-slate-100">
                        Premissas
                      </th>
                      <th style={headerStyle} className="py-3 px-1 text-center border-r border-slate-100">
                        Histórico
                      </th>
                      <th
                        style={headerStyle}
                        className="py-3 px-1 text-center border-r border-slate-100 bg-yellow-50/20 text-yellow-800"
                      >
                        Manual
                      </th>
                      <th style={headerStyle} className="py-3 px-1 text-center border-r border-slate-100">
                        Importado
                      </th>
                    </>
                  )}
                  <th
                    style={{ ...headerStyle, backgroundColor: "rgba(0,0,0,0.03)" }}
                    className="py-3 px-1 text-center border-r border-slate-200 text-slate-900"
                  >
                    Total
                  </th>
                  {showVerticalAnalysis && (
                    <th style={headerStyle} className="py-3 px-1 text-center border-r border-slate-100 text-blue-700 bg-blue-50/50">
                      AV%
                    </th>
                  )}
                  {showHorizontalAnalysis && (
                    <th style={headerStyle} className="py-3 px-1 text-center border-r border-slate-100 text-purple-700 bg-purple-50/50">
                      AH%
                    </th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {data.map((account) => (
              <BudgetTableRow
                key={account.id}
                account={account}
                level={0}
                onDataChange={handleValueChange}
                displayPeriods={displayPeriods}
                pendingChanges={pendingChanges}
                showDetails={showDetails}
                showVerticalAnalysis={showVerticalAnalysis}
                showHorizontalAnalysis={showHorizontalAnalysis}
                showBenchmark={showBenchmark}
                totalReceita={totalReceita}
              />
            ))}
          </tbody>
        </table>
      </div>

      {hasPendingChanges && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-fadeIn border border-slate-700">
          <span className="text-sm font-medium">{Object.keys(pendingChanges).length} alteração(ões) pendente(s)</span>
          <div className="flex gap-3">
            <button
              onClick={handleDiscard}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-bold bg-primary text-white rounded-full hover:bg-primary-hover shadow-lg transition-all transform hover:scale-105 flex items-center"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BudgetTable
