"use client"

import React, { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FinancialAccount, Brand } from "@/types"
import Tabs from "./Tabs"
import PeriodSelector from "./PeriodSelector"
import StyledSelect from "./StyledSelect"

interface SelectedPeriod {
  years: number[]
  months: string[]
}

interface ToggleConfig {
  id: string
  label: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  color?: string
}

interface FinancialReportLayoutProps {
  data: FinancialAccount[]
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
  selectedPeriod: SelectedPeriod
  onPeriodChange: (period: SelectedPeriod) => void
  displayMonths: string[]
  toggles?: ToggleConfig[]
  showBrandFilter?: boolean
  brands?: Brand[]
  currentBrand?: string
  onBrandChange?: (brand: string) => void
  showStoreFilter?: boolean
  storeOptions?: { label: string; value: string }[]
  currentStore?: string
  onStoreChange?: (store: string) => void
  isLoading?: boolean
  emptyMessage?: string
  emptySubMessage?: string
  showMonthYear?: boolean
}

const MONTH_ABBREV: Record<string, string> = {
  "Janeiro": "Jan", "Fevereiro": "Fev", "Março": "Mar", "Abril": "Abr",
  "Maio": "Mai", "Junho": "Jun", "Julho": "Jul", "Agosto": "Ago",
  "Setembro": "Set", "Outubro": "Out", "Novembro": "Nov", "Dezembro": "Dez"
}

export default function FinancialReportLayout({
  data,
  tabs,
  activeTab,
  onTabChange,
  selectedPeriod,
  onPeriodChange,
  displayMonths,
  toggles = [],
  showBrandFilter = true,
  brands = [],
  currentBrand = "Todas as Marcas",
  onBrandChange,
  showStoreFilter = false,
  storeOptions = [],
  currentStore = "Consolidado",
  onStoreChange,
  isLoading = false,
  emptyMessage = "Nenhum dado disponível",
  emptySubMessage = "Configure os dados para visualizar o relatório",
  showMonthYear = false
}: FinancialReportLayoutProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const currentYear = new Date().getFullYear()
  const startYear = 2025
  const availableYears = Array.from({ length: currentYear - startYear + 2 }, (_, i) => currentYear + 1 - i)
  const selectedYear = selectedPeriod.years[0] || currentYear

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

    const total = displayMonths.reduce((sum, month) => {
      return sum + (yearData[month]?.balancete || 0)
    }, 0)

    const rows: React.JSX.Element[] = []

    const rowStyle: React.CSSProperties = account.isTotal
      ? { backgroundColor: "var(--color-table-total-bg, #f5f3ff)" }
      : account.isSubTotal
        ? { backgroundColor: "var(--color-table-subtotal-bg, #f8fafc)" }
        : {}

    rows.push(
      <tr
        key={account.id}
        style={rowStyle}
        className={cn(
          "border-b border-slate-100 hover:brightness-95 transition-colors",
          account.isTotal && "font-bold",
          account.isSubTotal && "font-semibold"
        )}
      >
        <td 
          className={cn(
            "py-2 px-3 sticky left-0",
            hasChildren && "cursor-pointer"
          )}
          style={{ paddingLeft: `${12 + level * 20}px`, backgroundColor: "inherit" }}
          onClick={() => hasChildren && toggleRow(account.id)}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate">{account.name}</span>
          </div>
        </td>
        {displayMonths.map(month => {
          const value = yearData[month]?.balancete || 0
          return (
            <td key={month} className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
              {value !== 0 ? formatCurrency(value) : "-"}
            </td>
          )
        })}
        <td 
          className="py-2 px-3 text-right font-semibold tabular-nums whitespace-nowrap"
          style={{ backgroundColor: account.isTotal ? "var(--color-table-total-bg, #ede9fe)" : "var(--color-table-subtotal-bg, #f1f5f9)" }}
        >
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
    if (data.length > 0) {
      const topLevelIds = data.map(a => a.id)
      setExpandedRows(new Set(topLevelIds))
    }
  }, [data.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    )
  }

  const selectClassName = "h-10 text-sm py-0 pl-3 pr-8 border-[var(--color-border)] bg-white shadow-sm rounded-lg"

  return (
    <div className="flex flex-col h-full overflow-hidden p-4">
      <div className="flex-grow flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-3 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {showBrandFilter && brands.length > 0 && onBrandChange && (
              <StyledSelect 
                value={currentBrand} 
                onChange={(e) => onBrandChange(e.target.value)}
                containerClassName="w-44"
                className={selectClassName}
              >
                <option value="Todas as Marcas">Todas as Marcas</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.name}>{brand.name}</option>
                ))}
              </StyledSelect>
            )}

            {showStoreFilter && storeOptions.length > 0 && onStoreChange && (
              <StyledSelect 
                value={currentStore} 
                onChange={(e) => onStoreChange(e.target.value)}
                containerClassName="w-48"
                className={selectClassName}
              >
                {storeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </StyledSelect>
            )}

            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={onPeriodChange}
              availableYears={availableYears}
              className={selectClassName}
            />
          </div>

          {toggles.length > 0 && (
            <div className="flex items-center gap-5 bg-white px-4 py-2 rounded-lg border border-[var(--color-border)] shadow-sm h-10">
              {toggles.map((toggle, index) => (
                <React.Fragment key={toggle.id}>
                  {index > 0 && <div className="w-px h-4 bg-[var(--color-border-light)]"></div>}
                  <div className="flex items-center gap-2">
                    <label 
                      htmlFor={toggle.id} 
                      className="text-xs font-bold text-[var(--color-text-secondary)] cursor-pointer whitespace-nowrap"
                    >
                      {toggle.label}
                    </label>
                    <button
                      id={toggle.id}
                      role="switch"
                      aria-checked={toggle.enabled}
                      onClick={() => toggle.onChange(!toggle.enabled)}
                      className={cn(
                        "relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none",
                        toggle.enabled ? (toggle.color || 'bg-[var(--color-primary)]') : 'bg-slate-300'
                      )}
                    >
                      <span className={cn(
                        "inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform",
                        toggle.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                      )}/>
                    </button>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="flex-grow overflow-auto">
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <FileSpreadsheet className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{emptyMessage}</p>
              <p className="text-sm">{emptySubMessage}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: "var(--color-table-header-bg, #f8fafc)", color: "var(--color-table-header-text, #1e293b)" }}>
                <tr className="text-xs font-bold tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 text-left font-semibold sticky left-0 min-w-[300px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" style={{ backgroundColor: "var(--color-table-header-bg, #f8fafc)" }}>
                    Conta
                  </th>
                  {displayMonths.map(month => (
                    <th key={month} className="py-3 px-3 text-right font-semibold min-w-[100px]">
                      {showMonthYear 
                        ? `${(MONTH_ABBREV[month] || month.substring(0, 3)).toUpperCase()}/${selectedYear}`
                        : MONTH_ABBREV[month] || month.substring(0, 3)
                      }
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right font-semibold min-w-[120px]" style={{ backgroundColor: "var(--color-table-header-bg, #e2e8f0)" }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map(account => renderRow(account, 0))}
              </tbody>
            </table>
          )}
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={onTabChange} />
      </div>
    </div>
  )
}
