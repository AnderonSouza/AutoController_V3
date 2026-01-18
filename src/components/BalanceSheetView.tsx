"use client"

import { useState, useMemo } from "react"
import { ChevronDown, ChevronRight, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Brand, Company, BalanceSheetAccount, AccountCostCenterMapping } from "@/types"

interface SelectedPeriod {
  years: number[]
  months: string[]
}

interface MonthlyBalance {
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
  balanceSheetAccounts: BalanceSheetAccount[]
  accountMappings: AccountCostCenterMapping[]
  monthlyBalances: MonthlyBalance[]
  selectedPeriod: SelectedPeriod
  onPeriodChange: (period: SelectedPeriod) => void
  isLoading?: boolean
}

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
]

const MONTH_ABBREV: Record<string, string> = {
  "JANEIRO": "Jan", "FEVEREIRO": "Fev", "MARÇO": "Mar", "ABRIL": "Abr",
  "MAIO": "Mai", "JUNHO": "Jun", "JULHO": "Jul", "AGOSTO": "Ago",
  "SETEMBRO": "Set", "OUTUBRO": "Out", "NOVEMBRO": "Nov", "DEZEMBRO": "Dez"
}

export default function BalanceSheetView({
  brands,
  companies,
  balanceSheetAccounts,
  accountMappings,
  monthlyBalances,
  selectedPeriod,
  onPeriodChange,
  isLoading = false
}: BalanceSheetViewProps) {
  const [activeTab, setActiveTab] = useState<string>("Consolidado")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const tabs = useMemo(() => {
    const tabList = ["Consolidado"]
    brands.forEach(brand => {
      if (brand.name && !tabList.includes(brand.name)) {
        tabList.push(brand.name)
      }
    })
    return tabList
  }, [brands])

  const filteredCompanies = useMemo(() => {
    if (activeTab === "Consolidado") {
      return companies
    }
    const selectedBrand = brands.find(b => b.name === activeTab)
    if (!selectedBrand) return []
    return companies.filter(c => c.brandId === selectedBrand.id)
  }, [activeTab, brands, companies])

  const balanceData = useMemo(() => {
    const selectedYear = selectedPeriod.years[0] || new Date().getFullYear()
    const selectedMonths = selectedPeriod.months.length > 0 
      ? selectedPeriod.months.map(m => m.toUpperCase())
      : MONTHS.slice(0, new Date().getMonth() + 1)

    const companyIds = new Set(filteredCompanies.map(c => c.id))

    const relevantBalances = monthlyBalances.filter(b => 
      b.ano === selectedYear &&
      selectedMonths.includes(b.mes) &&
      companyIds.has(b.empresaId)
    )

    const accountBalanceMap = new Map<string, Map<string, number>>()

    relevantBalances.forEach(balance => {
      const mapping = accountMappings.find(m => m.contaContabilId === balance.contaContabilId)
      if (!mapping?.contaBalancoId) return

      if (!accountBalanceMap.has(mapping.contaBalancoId)) {
        accountBalanceMap.set(mapping.contaBalancoId, new Map())
      }
      
      const monthMap = accountBalanceMap.get(mapping.contaBalancoId)!
      const currentValue = monthMap.get(balance.mes) || 0
      monthMap.set(balance.mes, currentValue + balance.valor)
    })

    return { accountBalanceMap, selectedMonths, selectedYear }
  }, [filteredCompanies, monthlyBalances, accountMappings, selectedPeriod])

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

  const renderAccountRow = (account: BalanceSheetAccount, level: number = 0) => {
    const monthData = balanceData.accountBalanceMap.get(account.id)
    const hasData = monthData && monthData.size > 0
    const isExpanded = expandedRows.has(account.id)

    const total = hasData 
      ? Array.from(monthData.values()).reduce((sum, val) => sum + val, 0)
      : 0

    return (
      <tr 
        key={account.id}
        className={cn(
          "border-b border-slate-100 hover:bg-slate-50 transition-colors",
          level === 0 && "bg-slate-50 font-semibold"
        )}
      >
        <td 
          className="py-2 px-3 sticky left-0 bg-inherit cursor-pointer"
          style={{ paddingLeft: `${12 + level * 16}px` }}
          onClick={() => toggleRow(account.id)}
        >
          <div className="flex items-center gap-2">
            {level === 0 ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : null}
            <span className="truncate">{account.name}</span>
          </div>
        </td>
        {balanceData.selectedMonths.map(month => {
          const value = monthData?.get(month) || 0
          return (
            <td key={month} className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
              {value !== 0 ? formatCurrency(value) : "-"}
            </td>
          )
        })}
        <td className="py-2 px-3 text-right font-semibold tabular-nums whitespace-nowrap bg-slate-100">
          {total !== 0 ? formatCurrency(total) : "-"}
        </td>
      </tr>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-4">
      <div className="flex-grow flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Balanço Patrimonial</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Período: {balanceData.selectedYear}</span>
            <span>|</span>
            <span>{balanceData.selectedMonths.length} meses</span>
          </div>
        </div>

        <div className="flex-grow overflow-auto">
          {balanceSheetAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Building2 className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma conta patrimonial cadastrada</p>
              <p className="text-sm">Configure o plano de contas do balanço para visualizar os dados</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-100 min-w-[250px]">
                    Conta
                  </th>
                  {balanceData.selectedMonths.map(month => (
                    <th key={month} className="py-3 px-3 text-right font-semibold text-slate-700 min-w-[100px]">
                      {MONTH_ABBREV[month] || month}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right font-semibold text-slate-700 min-w-[120px] bg-slate-200">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {balanceSheetAccounts.map(account => renderAccountRow(account, 0))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-1 py-1">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
