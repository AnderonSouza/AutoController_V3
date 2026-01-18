"use client"

import React, { useState, useMemo, useEffect } from "react"
import { ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Brand, Company, ReportTemplate, ReportLine, FinancialAccount, AccountCostCenterMapping } from "@/types"
import { useBalanceSheetCalculation } from "./useBalanceSheetCalculation"
import { MONTHS } from "../constants"
import Tabs from "./Tabs"
import PeriodSelector from "./PeriodSelector"
import StyledSelect from "./StyledSelect"

interface SelectedPeriod {
  years: number[]
  months: string[]
}

interface MonthlyBalanceEntry {
  id?: string
  empresaId: string
  contaContabilId: string
  ano: number
  mes: string
  valor: number
}

interface BalanceSheetViewProps {
  brands: Brand[]
  companies: Company[]
  reportTemplate: ReportTemplate | null
  reportLines: ReportLine[]
  accountMappings: AccountCostCenterMapping[]
  monthlyBalances: MonthlyBalanceEntry[]
  selectedPeriod: SelectedPeriod
  onPeriodChange: (period: SelectedPeriod) => void
  isLoading?: boolean
}

const MONTH_ABBREV: Record<string, string> = {
  "Janeiro": "Jan", "Fevereiro": "Fev", "Março": "Mar", "Abril": "Abr",
  "Maio": "Mai", "Junho": "Jun", "Julho": "Jul", "Agosto": "Ago",
  "Setembro": "Set", "Outubro": "Out", "Novembro": "Nov", "Dezembro": "Dez"
}

export default function BalanceSheetView({
  brands,
  companies,
  reportTemplate,
  reportLines,
  accountMappings,
  monthlyBalances,
  selectedPeriod,
  onPeriodChange,
  isLoading = false
}: BalanceSheetViewProps) {
  const [activeTab, setActiveTab] = useState<string>("Consolidado")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showVerticalAnalysis, setShowVerticalAnalysis] = useState(false)
  const [showHorizontalAnalysis, setShowHorizontalAnalysis] = useState(false)
  const { calculateBalanceSheet } = useBalanceSheetCalculation()

  const tabs = useMemo(() => {
    const tabList = ["Consolidado"]
    brands.forEach(brand => {
      if (brand.name && !tabList.includes(brand.name)) {
        tabList.push(brand.name)
      }
    })
    return tabList
  }, [brands])

  const filteredCompanyIds = useMemo(() => {
    if (activeTab === "Consolidado") {
      return companies.map(c => c.id)
    }
    const selectedBrand = brands.find(b => b.name === activeTab)
    if (!selectedBrand) return []
    return companies.filter(c => c.brandId === selectedBrand.id).map(c => c.id)
  }, [activeTab, brands, companies])

  const balanceSheetData = useMemo(() => {
    if (!reportTemplate || reportLines.length === 0) return []
    
    return calculateBalanceSheet(
      reportTemplate,
      reportLines,
      monthlyBalances,
      accountMappings,
      selectedPeriod,
      filteredCompanyIds
    )
  }, [reportTemplate, reportLines, monthlyBalances, accountMappings, selectedPeriod, filteredCompanyIds, calculateBalanceSheet])

  const selectedYear = selectedPeriod.years[0] || new Date().getFullYear()
  const selectedMonths = selectedPeriod.months.length > 0 
    ? selectedPeriod.months 
    : MONTHS.slice(0, new Date().getMonth() + 1)

  const toggleRow = (accountId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const renderRow = (account: FinancialAccount, level: number = 0): React.JSX.Element[] => {
    const hasChildren = account.children && account.children.length > 0
    const isExpanded = expandedRows.has(account.id)
    const yearData = account.monthlyData?.[selectedYear] || {}

    const total = selectedMonths.reduce((sum, month) => {
      return sum + (yearData[month]?.balancete || 0)
    }, 0)

    const rows: React.JSX.Element[] = []

    rows.push(
      <tr 
        key={account.id}
        className={cn(
          "border-b border-slate-100 hover:bg-slate-50 transition-colors",
          account.isTotal && "bg-blue-50 font-bold",
          account.isSubTotal && "bg-slate-50 font-semibold"
        )}
      >
        <td 
          className={cn(
            "py-2 px-3 sticky left-0 bg-inherit",
            hasChildren && "cursor-pointer"
          )}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => hasChildren && toggleRow(account.id)}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate">{account.name}</span>
          </div>
        </td>
        {selectedMonths.map(month => {
          const value = yearData[month]?.balancete || 0
          return (
            <td key={month} className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
              {value !== 0 ? formatCurrency(value) : "-"}
            </td>
          )
        })}
        <td className={cn(
          "py-2 px-3 text-right font-semibold tabular-nums whitespace-nowrap",
          account.isTotal ? "bg-blue-100" : "bg-slate-100"
        )}>
          {total !== 0 ? formatCurrency(total) : "-"}
        </td>
      </tr>
    )

    if (hasChildren && isExpanded) {
      account.children!.forEach(child => {
        rows.push(...renderRow(child, level + 1))
      })
    }

    return rows
  }

  useEffect(() => {
    if (balanceSheetData.length > 0) {
      const topLevelIds = balanceSheetData.map(a => a.id)
      setExpandedRows(new Set(topLevelIds))
    }
  }, [balanceSheetData.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const startYear = 2022
  const availableYears = Array.from({ length: currentYear - startYear + 2 }, (_, i) => currentYear + 1 - i)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <StyledSelect 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value)}
            containerClassName="w-44"
            className="h-10 text-sm py-0 pl-3 pr-8 border-[var(--color-border)] bg-white shadow-sm rounded-lg"
          >
            {tabs.map(tab => (
              <option key={tab} value={tab}>{tab === "Consolidado" ? "Todas as Marcas" : tab}</option>
            ))}
          </StyledSelect>

          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={onPeriodChange}
            availableYears={availableYears}
            className="h-10 text-sm py-0 pl-3 pr-8 border-[var(--color-border)] bg-white shadow-sm rounded-lg"
          />
        </div>

        <div className="flex items-center gap-5 bg-white px-4 py-2 rounded-lg border border-[var(--color-border)] shadow-sm h-10">
          <div className="flex items-center gap-2">
            <label htmlFor="bs-vertical-toggle" className="text-xs font-bold text-[var(--color-text-secondary)] cursor-pointer whitespace-nowrap">Anál. Vert.</label>
            <button
              id="bs-vertical-toggle"
              role="switch"
              aria-checked={showVerticalAnalysis}
              onClick={() => setShowVerticalAnalysis(!showVerticalAnalysis)}
              className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none ${showVerticalAnalysis ? 'bg-[var(--color-primary)]' : 'bg-slate-300'}`}
            >
              <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${showVerticalAnalysis ? 'translate-x-4.5' : 'translate-x-0.5'}`}/>
            </button>
          </div>
          <div className="w-px h-4 bg-[var(--color-border-light)]"></div>
          <div className="flex items-center gap-2">
            <label htmlFor="bs-horizontal-toggle" className="text-xs font-bold text-[var(--color-text-secondary)] cursor-pointer whitespace-nowrap">Anál. Horiz.</label>
            <button
              id="bs-horizontal-toggle"
              role="switch"
              aria-checked={showHorizontalAnalysis}
              onClick={() => setShowHorizontalAnalysis(!showHorizontalAnalysis)}
              className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none ${showHorizontalAnalysis ? 'bg-[var(--color-primary)]' : 'bg-slate-300'}`}
            >
              <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${showHorizontalAnalysis ? 'translate-x-4.5' : 'translate-x-0.5'}`}/>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col bg-white border-t border-slate-200 overflow-hidden">

        <div className="flex-grow overflow-auto">
          {reportLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <FileSpreadsheet className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma estrutura de relatório configurada</p>
              <p className="text-sm">Configure as linhas do modelo Balanço Patrimonial para visualizar os dados</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-100 min-w-[300px]">
                    Conta
                  </th>
                  {selectedMonths.map(month => (
                    <th key={month} className="py-3 px-3 text-right font-semibold text-slate-700 min-w-[100px]">
                      {MONTH_ABBREV[month] || month.substring(0, 3)}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right font-semibold text-slate-700 min-w-[120px] bg-slate-200">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {balanceSheetData.map(account => renderRow(account, 0))}
              </tbody>
            </table>
          )}
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  )
}
