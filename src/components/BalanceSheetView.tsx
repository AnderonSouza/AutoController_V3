"use client"

import React, { useState, useMemo } from "react"
import type { Brand, Company, ReportTemplate, ReportLine, AccountCostCenterMapping } from "@/types"
import { useBalanceSheetCalculation } from "./useBalanceSheetCalculation"
import { MONTHS } from "../constants"
import FinancialReportLayout from "./FinancialReportLayout"

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

  const selectedMonths = selectedPeriod.months.length > 0 
    ? selectedPeriod.months 
    : MONTHS.slice(0, new Date().getMonth() + 1)

  const toggles = [
    {
      id: "bs-vertical-toggle",
      label: "Anál. Vert.",
      enabled: showVerticalAnalysis,
      onChange: setShowVerticalAnalysis
    },
    {
      id: "bs-horizontal-toggle",
      label: "Anál. Horiz.",
      enabled: showHorizontalAnalysis,
      onChange: setShowHorizontalAnalysis
    }
  ]

  return (
    <FinancialReportLayout
      data={balanceSheetData}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      selectedPeriod={selectedPeriod}
      onPeriodChange={onPeriodChange}
      displayMonths={selectedMonths}
      toggles={toggles}
      showBrandFilter={true}
      brands={brands}
      currentBrand={activeTab === "Consolidado" ? "Todas as Marcas" : activeTab}
      onBrandChange={(brand) => setActiveTab(brand === "Todas as Marcas" ? "Consolidado" : brand)}
      isLoading={isLoading}
      emptyMessage="Nenhuma estrutura de relatório configurada"
      emptySubMessage="Configure as linhas do modelo Balanço Patrimonial para visualizar os dados"
    />
  )
}
