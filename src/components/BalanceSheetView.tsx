"use client"

import React, { useState, useMemo } from "react"
import type { Brand, Company, ReportTemplate, ReportLine, AccountCostCenterMapping, UserRole, Benchmark } from "@/types"
import { useBalanceSheetCalculation } from "./useBalanceSheetCalculation"
import { MONTHS } from "../constants"
import FinancialTable from "./FinancialTable"
import Toolbar from "./Toolbar"
import Tabs from "./Tabs"

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
  userRole?: UserRole
  benchmarks?: Benchmark[]
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
  isLoading = false,
  userRole,
  benchmarks = []
}: BalanceSheetViewProps) {
  const [activeTab, setActiveTab] = useState<string>("Consolidado")
  const [currentBrand, setCurrentBrand] = useState<string>("Todas as Marcas")
  const [currentStore, setCurrentStore] = useState<string>("Consolidado")
  const [isBudgetMode, setIsBudgetMode] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showVertical, setShowVertical] = useState(false)
  const [showHorizontal, setShowHorizontal] = useState(false)
  const [showBenchmark, setShowBenchmark] = useState(false)

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
      monthlyBalances as any,
      accountMappings as any,
      selectedPeriod,
      filteredCompanyIds
    )
  }, [reportTemplate, reportLines, monthlyBalances, accountMappings, selectedPeriod, filteredCompanyIds, calculateBalanceSheet])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    )
  }

  if (!reportTemplate || reportLines.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden p-4">
        <div className="flex-grow flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <p className="text-lg font-medium">Nenhuma estrutura de relatório configurada</p>
              <p className="text-sm">Configure as linhas do modelo Balanço Patrimonial para visualizar os dados</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-2">
      <div className="flex-grow flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <Toolbar
          storeOptions={[{ label: "Consolidado", value: "Consolidado" }]}
          currentStore={currentStore}
          onStoreChange={setCurrentStore}
          brands={brands}
          currentBrand={currentBrand}
          onBrandChange={setCurrentBrand}
          selectedPeriod={selectedPeriod}
          onPeriodChange={onPeriodChange}
          isBudgetMode={isBudgetMode}
          onBudgetModeChange={setIsBudgetMode}
          showCalculationDetails={showDetails}
          onShowCalculationDetailsChange={setShowDetails}
          showVerticalAnalysis={showVertical}
          onShowVerticalAnalysisChange={setShowVertical}
          showHorizontalAnalysis={showHorizontal}
          onShowHorizontalAnalysisChange={setShowHorizontal}
          showBenchmark={showBenchmark}
          onShowBenchmarkChange={setShowBenchmark}
          isLoading={isLoading}
          hideStoreFilter={true}
        />
        <div className="flex-grow overflow-auto bg-white">
          <FinancialTable
            data={balanceSheetData}
            onDataChange={() => {}}
            isBudgetMode={isBudgetMode}
            showCalculationDetails={showDetails}
            showVerticalAnalysis={showVertical}
            showHorizontalAnalysis={showHorizontal}
            showBenchmark={showBenchmark}
            benchmarks={benchmarks.filter(b => b.brandId === 'all' || brands.find(brand => brand.id === b.brandId && brand.name === currentBrand))}
            activeTab={activeTab}
            selectedPeriod={selectedPeriod}
            userRole={userRole}
          />
        </div>
        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  )
}
