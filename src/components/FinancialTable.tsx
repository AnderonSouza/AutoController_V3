"use client"

import React, { useMemo, useState, useCallback } from "react"
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react"
import type { FinancialAccount, MonthlyData, UserRole, Benchmark } from "../types"
import { CALENDAR_MONTHS } from "../constants"

const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num) || num === 0) return "-"
  return new Intl.NumberFormat("pt-BR").format(Math.round(num))
}

const formatPercentage = (num: number | undefined): string => {
  if (num === undefined || num === null || !isFinite(num)) return "-"
  return num.toFixed(1) + "%"
}

const getNumberClass = (num: number | undefined) => {
  if (num === undefined || num === null || num === 0) return "text-slate-400"
  return num < 0 ? "text-red-600" : "text-slate-800"
}

const calculateEffectiveResult = (data: MonthlyData): number => {
  return (
    (data.balancete || 0) +
    (data.transfGerencial || 0) +
    (data.ajusteContabil || 0) +
    (data.cgGerencial || 0) +
    (data.cg || 0)
  )
}

interface FinancialTableRowProps {
  account: FinancialAccount
  level: number
  onDataChange: (accountId: string, year: number, month: string, field: "orcado" | "cg", value: number) => void
  isBudgetMode: boolean
  showCalculationDetails: boolean
  showVerticalAnalysis: boolean
  showHorizontalAnalysis: boolean
  showBenchmark: boolean
  benchmarks: Benchmark[]
  selectedPeriod: { years: number[]; months: string[] }
  displayPeriods: { year: number; month: string }[]
  verticalAnalysisBaseMap: Map<string, number>
  expandedRows: Set<string>
  onToggleExpand: (id: string) => void
}

const sumMonthlyDataForPeriod = (
  account: FinancialAccount,
  years: number[],
  months: string[],
  displayPeriods: { year: number; month: string }[],
): MonthlyData => {
  const total: MonthlyData = {
    balancete: 0,
    transfGerencial: 0,
    ajusteContabil: 0,
    cgGerencial: 0,
    cg: 0,
    orcado: 0,
    orcadoPremissas: 0,
    orcadoHistorico: 0,
    orcadoManual: 0,
    orcadoImportado: 0,
  }
  const allowedPeriods = new Set(displayPeriods.map((p) => `${p.year}-${p.month}`))

  for (const year of years) {
    if (account.monthlyData[year]) {
      for (const month of months) {
        if (allowedPeriods.has(`${year}-${month}`)) {
          const data = account.monthlyData[year][month]
          if (data) {
            total.balancete += data.balancete || 0
            total.transfGerencial = (total.transfGerencial || 0) + (data.transfGerencial || 0)
            total.ajusteContabil = (total.ajusteContabil || 0) + (data.ajusteContabil || 0)
            total.cgGerencial = (total.cgGerencial || 0) + (data.cgGerencial || 0)
            total.cg = (total.cg || 0) + (data.cg || 0)
            total.orcado = (total.orcado || 0) + (data.orcado || 0)
          }
        }
      }
    }
  }
  return total
}

const FinancialTableRow: React.FC<FinancialTableRowProps> = ({
  account,
  level,
  onDataChange,
  isBudgetMode,
  showCalculationDetails,
  showVerticalAnalysis,
  showHorizontalAnalysis,
  showBenchmark,
  benchmarks,
  selectedPeriod,
  displayPeriods,
  verticalAnalysisBaseMap,
  expandedRows,
  onToggleExpand,
}) => {
  const isTotal = account.isTotal
  const isSubTotal = account.isSubTotal
  const hasChildren = account.children && account.children.length > 0
  const isExpanded = expandedRows.has(account.id)

  // Dynamic Styles from Theme Variables
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

  const benchmark = useMemo(() => {
    return benchmarks.find((b) => b.dreAccountId === account.id)
  }, [benchmarks, account.id])

  const renderBenchmarkValue = () => {
    if (!benchmark) return "-"
    if (benchmark.type === "percentage") return `${benchmark.value}%`
    if (benchmark.type === "currency")
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(
        benchmark.value,
      )
    return benchmark.value
  }

  const rowContent = (
    <tr style={rowStyle} className="border-b border-slate-100 transition-colors hover:brightness-95">
      {/* Name Column - Sticky */}
      <td
        style={{ paddingLeft, backgroundColor: "inherit", color: "inherit" }}
        className={`py-3 px-4 text-sm whitespace-nowrap sticky left-0 z-20 ${nameCellClasses} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r-4 border-slate-200 ${hasChildren ? "cursor-pointer select-none" : ""}`}
        onClick={hasChildren ? () => onToggleExpand(account.id) : undefined}
      >
        <div className="flex items-center gap-1">
          {hasChildren && (
            isExpanded 
              ? <ChevronDown className="w-4 h-4 flex-shrink-0 text-slate-500" /> 
              : <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-500" />
          )}
          {!hasChildren && <span className="w-4" />}
          <span>{account.name}</span>
        </div>
      </td>
      {displayPeriods.map(({ year, month }, index) => {
        const data = account.monthlyData[year]?.[month]
        const effectiveResult = data ? calculateEffectiveResult(data) : 0

        const verticalAnalysisBaseValue = verticalAnalysisBaseMap.get(`${year}-${month}`) || 0
        const verticalAnalysis = verticalAnalysisBaseValue
          ? (effectiveResult / verticalAnalysisBaseValue) * 100
          : undefined

        let horizontalAnalysis: number | undefined = undefined
        if (index > 0) {
          const prevPeriod = displayPeriods[index - 1]
          const prevData = account.monthlyData[prevPeriod.year]?.[prevPeriod.month]
          const prevEffectiveResult = prevData ? calculateEffectiveResult(prevData) : 0
          if (prevEffectiveResult !== 0) {
            horizontalAnalysis = (effectiveResult / prevEffectiveResult - 1) * 100
          }
        }

        const isLastColumnBenchmark = showBenchmark
        const isLastColumnBudget = !isLastColumnBenchmark && isBudgetMode
        const isLastColumnHorizontal = !isLastColumnBenchmark && !isLastColumnBudget && showHorizontalAnalysis
        const isLastColumnVertical =
          !isLastColumnBenchmark && !isLastColumnBudget && !isLastColumnHorizontal && showVerticalAnalysis
        const isLastColumnRealized =
          !isLastColumnBenchmark && !isLastColumnBudget && !isLastColumnHorizontal && !isLastColumnVertical

        const separatorClass = "border-r border-slate-200"

        return (
          <React.Fragment key={`${account.id}-${year}-${month}`}>
            {showCalculationDetails && (
              <>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(data?.balancete)}`}>
                  {formatNumber(data?.balancete)}
                </td>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(data?.transfGerencial)}`}>
                  {formatNumber(data?.transfGerencial)}
                </td>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(data?.ajusteContabil)}`}>
                  {formatNumber(data?.ajusteContabil)}
                </td>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(data?.cgGerencial)}`}>
                  {formatNumber(data?.cgGerencial)}
                </td>
              </>
            )}
            {/* Result Cell */}
            <td
              className={`p-3 text-right text-sm whitespace-nowrap ${valueCellFont} ${getNumberClass(effectiveResult)} ${isLastColumnRealized ? separatorClass : ""}`}
            >
              {formatNumber(effectiveResult)}
            </td>
            {showVerticalAnalysis && (
              <td
                className={`p-3 text-right text-xs whitespace-nowrap text-slate-500 ${isLastColumnVertical ? separatorClass : ""}`}
              >
                {formatPercentage(verticalAnalysis)}
              </td>
            )}
            {showHorizontalAnalysis && (
              <td
                className={`p-3 text-right text-xs whitespace-nowrap ${getNumberClass(horizontalAnalysis)} ${isLastColumnHorizontal ? separatorClass : ""}`}
              >
                {formatPercentage(horizontalAnalysis)}
              </td>
            )}
            {isBudgetMode && (
              <td
                className={`p-3 text-right text-sm whitespace-nowrap bg-yellow-50/30 ${getNumberClass(data?.orcado)} ${isLastColumnBudget ? separatorClass : ""}`}
              >
                {formatNumber(data?.orcado)}
              </td>
            )}
            {showBenchmark && (
              <td
                className={`p-3 text-right text-sm whitespace-nowrap text-blue-600 ${isLastColumnBenchmark ? separatorClass : ""}`}
              >
                {renderBenchmarkValue()}
              </td>
            )}
          </React.Fragment>
        )
      })}
      {/* TOTAL Column */}
      {(() => {
        const totalData = sumMonthlyDataForPeriod(account, selectedPeriod.years, selectedPeriod.months, displayPeriods)
        const totalResult = calculateEffectiveResult(totalData)
        const totalVerticalAnalysisBase = verticalAnalysisBaseMap.get("TOTAL") || 0
        const totalVerticalAnalysis = totalVerticalAnalysisBase
          ? (totalResult / totalVerticalAnalysisBase) * 100
          : undefined
        return (
          <React.Fragment key={`${account.id}-TOTAL`}>
            {showCalculationDetails && (
              <>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(totalData.balancete)}`}>
                  {formatNumber(totalData.balancete)}
                </td>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(totalData.transfGerencial)}`}>
                  {formatNumber(totalData.transfGerencial)}
                </td>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(totalData.ajusteContabil)}`}>
                  {formatNumber(totalData.ajusteContabil)}
                </td>
                <td className={`p-3 text-right text-sm whitespace-nowrap ${getNumberClass(totalData.cgGerencial)}`}>
                  {formatNumber(totalData.cgGerencial)}
                </td>
              </>
            )}
            {/* Total Column */}
            <td
              className={`p-3 text-right text-sm whitespace-nowrap ${valueCellFont} ${getNumberClass(totalResult)} border-l border-slate-200`}
              style={{ backgroundColor: "rgba(0,0,0,0.02)" }}
            >
              {formatNumber(totalResult)}
            </td>
            {showVerticalAnalysis && (
              <td className={`p-3 text-right text-xs whitespace-nowrap text-slate-500`}>
                {formatPercentage(totalVerticalAnalysis)}
              </td>
            )}
            {showHorizontalAnalysis && <td className={`p-3 text-right text-xs whitespace-nowrap`}>-</td>}

            {isBudgetMode && (
              <td
                className={`p-3 text-right text-sm whitespace-nowrap bg-yellow-50/30 ${getNumberClass(totalData.orcado)}`}
              >
                {formatNumber(totalData.orcado)}
              </td>
            )}
            {showBenchmark && (
              <td className={`p-3 text-right text-sm whitespace-nowrap text-blue-600`}>{renderBenchmarkValue()}</td>
            )}
          </React.Fragment>
        )
      })()}
    </tr>
  )

  const childrenContent =
    isExpanded && account.children &&
    account.children.map((child) => (
      <FinancialTableRow
        key={child.id}
        account={child}
        level={level + 1}
        onDataChange={onDataChange}
        isBudgetMode={isBudgetMode}
        showCalculationDetails={showCalculationDetails}
        showVerticalAnalysis={showVerticalAnalysis}
        showHorizontalAnalysis={showHorizontalAnalysis}
        showBenchmark={showBenchmark}
        benchmarks={benchmarks}
        selectedPeriod={selectedPeriod}
        displayPeriods={displayPeriods}
        verticalAnalysisBaseMap={verticalAnalysisBaseMap}
        expandedRows={expandedRows}
        onToggleExpand={onToggleExpand}
      />
    ))

  return (
    <>
      {rowContent}
      {childrenContent}
    </>
  )
}

interface FinancialTableProps {
  data: FinancialAccount[]
  onDataChange: (accountId: string, year: number, month: string, field: "orcado" | "cg", value: number) => void
  isBudgetMode: boolean
  showCalculationDetails: boolean
  showVerticalAnalysis: boolean
  showHorizontalAnalysis: boolean
  showBenchmark?: boolean
  benchmarks?: Benchmark[]
  activeTab: string
  selectedPeriod: { years: number[]; months: string[] }
  userRole?: UserRole
  closingConfig?: { lastClosedYear: number; lastClosedMonth: string }
}

const hasAnyValue = (account: FinancialAccount): boolean => {
  for (const year of Object.keys(account.monthlyData)) {
    const yearData = account.monthlyData[Number(year)]
    if (yearData) {
      for (const month of Object.keys(yearData)) {
        const data = yearData[month]
        if (data) {
          const effectiveResult = calculateEffectiveResult(data)
          if (effectiveResult !== 0) return true
          if (data.orcado && data.orcado !== 0) return true
        }
      }
    }
  }
  if (account.children) {
    for (const child of account.children) {
      if (hasAnyValue(child)) return true
    }
  }
  return false
}

const filterAccountsWithValues = (accounts: FinancialAccount[]): FinancialAccount[] => {
  return accounts
    .filter(account => {
      if (account.isTotal || account.isSubTotal) return true
      return hasAnyValue(account)
    })
    .map(account => ({
      ...account,
      children: account.children ? filterAccountsWithValues(account.children) : undefined
    }))
}

const FinancialTable: React.FC<FinancialTableProps> = ({
  data,
  onDataChange,
  isBudgetMode,
  showCalculationDetails,
  showVerticalAnalysis,
  showHorizontalAnalysis,
  showBenchmark = false,
  benchmarks = [],
  activeTab,
  selectedPeriod,
  userRole,
  closingConfig,
}) => {
  const filteredData = useMemo(() => filterAccountsWithValues(data), [data])
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => {
    const allIds = new Set<string>()
    const collectIds = (accounts: FinancialAccount[]) => {
      accounts.forEach(acc => {
        allIds.add(acc.id)
        if (acc.children) collectIds(acc.children)
      })
    }
    collectIds(data)
    return allIds
  })

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const displayPeriods = useMemo(() => {
    let periods = selectedPeriod.years
      .flatMap((year) => selectedPeriod.months.map((month) => ({ year, month })))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return CALENDAR_MONTHS.indexOf(a.month) - CALENDAR_MONTHS.indexOf(b.month)
      })

    // --- VISIBILITY LOCKING LOGIC ---
    if (userRole && closingConfig && (userRole === "Analista" || userRole === "Leitor")) {
      const { lastClosedYear, lastClosedMonth } = closingConfig

      if (lastClosedYear && lastClosedMonth) {
        const lastClosedMonthIndex = CALENDAR_MONTHS.indexOf(lastClosedMonth)

        periods = periods.filter((p) => {
          if (p.year < lastClosedYear) return true // Past years OK
          if (p.year > lastClosedYear) return false // Future years Blocked
          // Same year, check month index
          return CALENDAR_MONTHS.indexOf(p.month) <= lastClosedMonthIndex
        })
      }
    }
    return periods
  }, [selectedPeriod, userRole, closingConfig])

  const verticalAnalysisBaseMap = useMemo(() => {
    const map = new Map<string, number>()

    // 1. Find the designated base account (from AV Config Flag)
    let baseAccount: FinancialAccount | undefined

    // Depth-first search for the flag
    const findBase = (nodes: FinancialAccount[]) => {
      for (const node of nodes) {
        if (node.isVerticalAnalysisBase) {
          baseAccount = node
          return
        }
        if (node.children) findBase(node.children)
      }
    }
    findBase(data)

    // 2. Fallback to hardcoded '3.5' or first total if no flag found (Backward compatibility)
    if (!baseAccount) {
      baseAccount = data.find((acc) => acc.id === "3.5") || data.find((acc) => acc.isTotal)
    }

    if (!baseAccount) return map

    // 3. Populate Map
    displayPeriods.forEach(({ year, month }) => {
      const monthData = baseAccount!.monthlyData[year]?.[month]
      if (monthData) {
        map.set(`${year}-${month}`, calculateEffectiveResult(monthData))
      }
    })
    const totalData = sumMonthlyDataForPeriod(baseAccount, selectedPeriod.years, selectedPeriod.months, displayPeriods)
    map.set("TOTAL", calculateEffectiveResult(totalData))

    return map
  }, [data, displayPeriods, selectedPeriod])

  // Use Theme Variables for Header
  const headerStyle: React.CSSProperties = {
    backgroundColor: "var(--color-table-header-bg, #f8fafc)",
    color: "var(--color-table-header-text, #1e293b)",
  }

  return (
    <div className="overflow-auto h-full bg-white flex flex-col">
      <table className="w-max min-w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-[400px]" />
          {[...displayPeriods, { year: 0, month: "TOTAL" }].map(({ year, month }) => (
            <React.Fragment key={`col-${year}-${month}`}>
              {showCalculationDetails && (
                <>
                  <col className="w-32" />
                  <col className="w-32" />
                  <col className="w-32" />
                  <col className="w-32" />
                </>
              )}
              <col className="w-32" />
              {showVerticalAnalysis && <col className="w-16" />}
              {showHorizontalAnalysis && <col className="w-16" />}
              {isBudgetMode && <col className="w-32" />}
              {showBenchmark && <col className="w-24" />}
            </React.Fragment>
          ))}
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
            {[...displayPeriods, { year: 0, month: "TOTAL" }].map(({ year, month }) => {
              const detailCols = showCalculationDetails ? 4 : 0
              const analysisCols = (showVerticalAnalysis ? 1 : 0) + (showHorizontalAnalysis ? 1 : 0)
              const budgetCol = isBudgetMode ? 1 : 0
              const benchmarkCol = showBenchmark ? 1 : 0
              const colSpan = detailCols + 1 + analysisCols + budgetCol + benchmarkCol
              return (
                <th
                  key={`${year}-${month}`}
                  colSpan={colSpan}
                  style={headerStyle}
                  className={`p-4 text-center uppercase border-r border-slate-200`}
                >
                  {month === "TOTAL" ? "TOTAL" : `${month.substring(0, 3)}/${year}`}
                </th>
              )
            })}
          </tr>
          <tr className="text-[10px] font-bold border-b border-slate-200" style={headerStyle}>
            {[...displayPeriods, { year: 0, month: "TOTAL" }].map(({ year, month }) => {
              const separatorClass = "border-r border-slate-200"

              const isLastColumnBenchmark = showBenchmark
              const isLastColumnBudget = !isLastColumnBenchmark && isBudgetMode
              const isLastColumnHorizontal = !isLastColumnBenchmark && !isLastColumnBudget && showHorizontalAnalysis
              const isLastColumnVertical =
                !isLastColumnBenchmark && !isLastColumnBudget && !isLastColumnHorizontal && showVerticalAnalysis
              const isLastColumnRealized =
                !isLastColumnBenchmark && !isLastColumnBudget && !isLastColumnHorizontal && !isLastColumnVertical

              return (
                <React.Fragment key={`subhead-${year}-${month}`}>
                  {showCalculationDetails && (
                    <>
                      <th style={headerStyle} className={`py-3 px-1 text-center border-r border-slate-100`}>
                        Balancete
                      </th>
                      <th style={headerStyle} className={`py-3 px-1 text-center border-r border-slate-100`}>
                        Transf.
                      </th>
                      <th style={headerStyle} className={`py-3 px-1 text-center border-r border-slate-100`}>
                        Ajustes Cont.
                      </th>
                      <th style={headerStyle} className={`py-3 px-1 text-center border-r border-slate-100`}>
                        Ajustes Cx
                      </th>
                    </>
                  )}
                  <th
                    style={{ ...headerStyle, backgroundColor: "rgba(0,0,0,0.03)" }}
                    className={`py-3 px-1 text-center ${isLastColumnRealized ? separatorClass : "border-r border-slate-100"}`}
                  >
                    Realizado
                  </th>
                  {showVerticalAnalysis && (
                    <th
                      style={headerStyle}
                      className={`py-3 px-1 text-center uppercase ${isLastColumnVertical ? separatorClass : "border-r border-slate-100"}`}
                    >
                      % V
                    </th>
                  )}
                  {showHorizontalAnalysis && (
                    <th
                      style={headerStyle}
                      className={`py-3 px-1 text-center uppercase ${isLastColumnHorizontal ? separatorClass : "border-r border-slate-100"}`}
                    >
                      % H
                    </th>
                  )}
                  {isBudgetMode && (
                    <th
                      style={headerStyle}
                      className={`py-3 px-1 text-center uppercase ${isLastColumnBudget ? separatorClass : "border-r border-slate-100"}`}
                    >
                      Orçado
                    </th>
                  )}
                  {showBenchmark && (
                    <th
                      style={headerStyle}
                      className={`py-3 px-1 text-center uppercase ${isLastColumnBenchmark ? separatorClass : "border-r border-slate-100"}`}
                    >
                      Benchmark
                    </th>
                  )}
                </React.Fragment>
              )
            })}
          </tr>
        </thead>
        <tbody className="bg-white">
          {filteredData.map((account) => (
            <FinancialTableRow
              key={account.id}
              account={account}
              level={0}
              onDataChange={onDataChange}
              isBudgetMode={isBudgetMode}
              showCalculationDetails={showCalculationDetails}
              showVerticalAnalysis={showVerticalAnalysis}
              showHorizontalAnalysis={showHorizontalAnalysis}
              showBenchmark={showBenchmark}
              benchmarks={benchmarks}
              selectedPeriod={selectedPeriod}
              displayPeriods={displayPeriods}
              verticalAnalysisBaseMap={verticalAnalysisBaseMap}
              expandedRows={expandedRows}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default FinancialTable
