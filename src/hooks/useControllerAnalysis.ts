"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { supabase } from "../utils/supabaseClient"
import type { Company, Brand, Department, DreAccount, BudgetAssumption, BudgetAssumptionValue } from "../types"

export interface ControllerAlert {
  id: string
  accountName: string
  accountCode?: string
  department: string
  status: 'critical' | 'warning' | 'ok'
  realValue: number
  budgetValue: number
  previousMonthValue: number
  sameMonthLastYearValue: number
  benchmarkValue?: number
  variationVsBudget: number
  variationVsPreviousMonth: number
  variationVsSameMonthLastYear: number
  variationVsBenchmark?: number
  trend: 'up' | 'down' | 'stable'
  companyBreakdown?: { companyName: string; value: number; variation: number }[]
}

export interface ControllerSummary {
  criticalCount: number
  warningCount: number
  okCount: number
  totalAccounts: number
  overallHealth: 'critical' | 'warning' | 'ok'
  revenueVsBudget: number
  marginVsBudget: number
  expensesVsBudget: number
}

export interface ControllerAnalysisResult {
  summary: ControllerSummary
  alerts: ControllerAlert[]
  topCritical: ControllerAlert[]
  topWarning: ControllerAlert[]
  isLoading: boolean
  error: string | null
  aiContext: any
}

interface AggregatedData {
  accountName: string
  department: string
  companyId: string
  value: number
}

const MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']

const getPreviousMonth = (year: number, month: string): { year: number; month: string } => {
  const monthIndex = MONTHS.indexOf(month)
  if (monthIndex === 0) {
    return { year: year - 1, month: MONTHS[11] }
  }
  return { year, month: MONTHS[monthIndex - 1] }
}

export interface AlertThresholds {
  warningThreshold: number
  criticalThreshold: number
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  warningThreshold: 5,
  criticalThreshold: 15
}

export interface BudgetMapping {
  id: string
  premissaId: string
  contaDreId?: string
  indicadorId?: string
  departamentoId?: string
  tipoDestino?: string
}

export const useControllerAnalysis = (
  tenantId: string | null,
  year: number,
  month: string,
  brandId: string | null,
  companies: Company[],
  brands: Brand[],
  departments: Department[],
  dreAccounts: DreAccount[],
  budgetAssumptions: BudgetAssumption[],
  budgetValues: BudgetAssumptionValue[],
  budgetMappings?: BudgetMapping[],
  thresholds?: AlertThresholds
): ControllerAnalysisResult => {
  const { warningThreshold, criticalThreshold } = thresholds || DEFAULT_THRESHOLDS
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentMonthData, setCurrentMonthData] = useState<AggregatedData[]>([])
  const [previousMonthData, setPreviousMonthData] = useState<AggregatedData[]>([])
  const [sameMonthLastYearData, setSameMonthLastYearData] = useState<AggregatedData[]>([])
  const [benchmarks, setBenchmarks] = useState<any[]>([])

  const effectiveCompanies = useMemo(() => {
    let filtered = companies.filter(c => c.tipo === 'efetiva' || !c.tipo)
    if (brandId && brandId !== 'all') {
      filtered = filtered.filter(c => c.brandId === brandId)
    }
    return filtered
  }, [companies, brandId])

  const fetchAggregatedData = useCallback(async (targetYear: number, targetMonth: string): Promise<AggregatedData[]> => {
    if (!tenantId || effectiveCompanies.length === 0) return []

    const companyNames = effectiveCompanies.map(c => c.nickname || c.name)

    const { data, error } = await supabase
      .from('lancamentos_contabeis')
      .select('conta_dre, departamento, loja, valor')
      .eq('organizacao_id', tenantId)
      .eq('ano', targetYear)
      .eq('mes', targetMonth)
      .in('loja', companyNames)

    if (error) {
      console.error('Error fetching lancamentos:', error)
      return []
    }

    const aggregated: AggregatedData[] = []
    const grouped = new Map<string, number>()

    for (const row of data || []) {
      const key = `${row.conta_dre}|${row.departamento || 'GERAL'}|${row.loja}`
      const company = effectiveCompanies.find(c => (c.nickname || c.name) === row.loja)
      grouped.set(key, (grouped.get(key) || 0) + (row.valor || 0))
    }

    grouped.forEach((value, key) => {
      const [accountName, department, companyName] = key.split('|')
      const company = effectiveCompanies.find(c => (c.nickname || c.name) === companyName)
      aggregated.push({
        accountName,
        department,
        companyId: company?.id || '',
        value
      })
    })

    return aggregated
  }, [tenantId, effectiveCompanies])

  const fetchBenchmarks = useCallback(async () => {
    if (!tenantId) return []

    const { data, error } = await supabase
      .from('benchmarks')
      .select('*')
      .eq('organizacao_id', tenantId)

    if (error) {
      console.error('Error fetching benchmarks:', error)
      return []
    }

    return data || []
  }, [tenantId])

  useEffect(() => {
    const loadData = async () => {
      if (!tenantId || !year || !month) return

      setIsLoading(true)
      setError(null)

      try {
        const prev = getPreviousMonth(year, month)
        
        const [current, previous, lastYear, benchmarkData] = await Promise.all([
          fetchAggregatedData(year, month),
          fetchAggregatedData(prev.year, prev.month),
          fetchAggregatedData(year - 1, month),
          fetchBenchmarks()
        ])

        setCurrentMonthData(current)
        setPreviousMonthData(previous)
        setSameMonthLastYearData(lastYear)
        setBenchmarks(benchmarkData)
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [tenantId, year, month, brandId, fetchAggregatedData, fetchBenchmarks])

  const alerts = useMemo((): ControllerAlert[] => {
    if (currentMonthData.length === 0) return []

    const alertMap = new Map<string, ControllerAlert>()

    const groupedCurrent = new Map<string, number>()
    const groupedPrevious = new Map<string, number>()
    const groupedLastYear = new Map<string, number>()
    const companyBreakdown = new Map<string, { companyName: string; value: number }[]>()

    currentMonthData.forEach(d => {
      const key = `${d.accountName}|${d.department}`
      groupedCurrent.set(key, (groupedCurrent.get(key) || 0) + d.value)
      
      const company = effectiveCompanies.find(c => c.id === d.companyId)
      if (company) {
        const breakdown = companyBreakdown.get(key) || []
        breakdown.push({ companyName: company.nickname || company.name, value: d.value })
        companyBreakdown.set(key, breakdown)
      }
    })

    previousMonthData.forEach(d => {
      const key = `${d.accountName}|${d.department}`
      groupedPrevious.set(key, (groupedPrevious.get(key) || 0) + d.value)
    })

    sameMonthLastYearData.forEach(d => {
      const key = `${d.accountName}|${d.department}`
      groupedLastYear.set(key, (groupedLastYear.get(key) || 0) + d.value)
    })

    groupedCurrent.forEach((realValue, key) => {
      const [accountName, department] = key.split('|')
      const previousValue = groupedPrevious.get(key) || 0
      const lastYearValue = groupedLastYear.get(key) || 0
      
      const dreAccount = dreAccounts.find(a => a.name === accountName)
      const mappingsForAccount = budgetMappings?.filter(m => 
        m.contaDreId === dreAccount?.id || 
        m.tipoDestino === 'conta_dre' && dreAccounts.find(acc => acc.id === m.contaDreId)?.name === accountName
      ) || []
      
      let budgetValue = 0
      if (mappingsForAccount.length > 0) {
        const premissaIds = mappingsForAccount.map(m => m.premissaId)
        budgetValue = budgetValues
          .filter(bv => premissaIds.includes(bv.assumptionId) && bv.month === month && bv.year === year)
          .reduce((sum, bv) => sum + (bv.value || 0), 0)
      } else {
        budgetValue = budgetValues
          .filter(bv => {
            const assumption = budgetAssumptions.find(a => a.id === bv.assumptionId)
            return assumption?.name === accountName && bv.month === month && bv.year === year
          })
          .reduce((sum, bv) => sum + (bv.value || 0), 0)
      }

      const benchmark = benchmarks.find(b => b.conta_nome === accountName)
      const benchmarkValue = benchmark?.valor

      const variationVsBudget = budgetValue !== 0 ? ((realValue - budgetValue) / Math.abs(budgetValue)) * 100 : 0
      const variationVsPreviousMonth = previousValue !== 0 ? ((realValue - previousValue) / Math.abs(previousValue)) * 100 : 0
      const variationVsSameMonthLastYear = lastYearValue !== 0 ? ((realValue - lastYearValue) / Math.abs(lastYearValue)) * 100 : 0
      const variationVsBenchmark = benchmarkValue ? ((realValue - benchmarkValue) / Math.abs(benchmarkValue)) * 100 : undefined

      const isExpense = accountName.toLowerCase().includes('despesa') || accountName.toLowerCase().includes('custo')
      const mainVariation = variationVsBudget
      
      let status: 'critical' | 'warning' | 'ok' = 'ok'
      if (isExpense) {
        if (mainVariation > criticalThreshold) status = 'critical'
        else if (mainVariation > warningThreshold) status = 'warning'
      } else {
        if (mainVariation < -criticalThreshold) status = 'critical'
        else if (mainVariation < -warningThreshold) status = 'warning'
      }

      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (variationVsPreviousMonth > 3) trend = 'up'
      else if (variationVsPreviousMonth < -3) trend = 'down'

      const breakdown = companyBreakdown.get(key) || []

      alertMap.set(key, {
        id: key,
        accountName,
        department,
        status,
        realValue,
        budgetValue,
        previousMonthValue: previousValue,
        sameMonthLastYearValue: lastYearValue,
        benchmarkValue,
        variationVsBudget,
        variationVsPreviousMonth,
        variationVsSameMonthLastYear,
        variationVsBenchmark,
        trend,
        companyBreakdown: breakdown.map(b => ({
          ...b,
          variation: previousValue !== 0 ? ((b.value - previousValue) / Math.abs(previousValue)) * 100 : 0
        }))
      })
    })

    return Array.from(alertMap.values()).sort((a, b) => {
      const statusOrder = { critical: 0, warning: 1, ok: 2 }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return Math.abs(b.variationVsBudget) - Math.abs(a.variationVsBudget)
    })
  }, [currentMonthData, previousMonthData, sameMonthLastYearData, benchmarks, budgetAssumptions, budgetValues, budgetMappings, dreAccounts, effectiveCompanies, month, year, warningThreshold, criticalThreshold])

  const summary = useMemo((): ControllerSummary => {
    const criticalCount = alerts.filter(a => a.status === 'critical').length
    const warningCount = alerts.filter(a => a.status === 'warning').length
    const okCount = alerts.filter(a => a.status === 'ok').length
    const totalAccounts = alerts.length

    let overallHealth: 'critical' | 'warning' | 'ok' = 'ok'
    if (criticalCount > 0) overallHealth = 'critical'
    else if (warningCount > 3) overallHealth = 'warning'

    const revenueAlerts = alerts.filter(a => a.accountName.toLowerCase().includes('receita'))
    const revenueVsBudget = revenueAlerts.length > 0
      ? revenueAlerts.reduce((sum, a) => sum + a.variationVsBudget, 0) / revenueAlerts.length
      : 0

    const marginAlerts = alerts.filter(a => a.accountName.toLowerCase().includes('margem') || a.accountName.toLowerCase().includes('lucro'))
    const marginVsBudget = marginAlerts.length > 0
      ? marginAlerts.reduce((sum, a) => sum + a.variationVsBudget, 0) / marginAlerts.length
      : 0

    const expenseAlerts = alerts.filter(a => a.accountName.toLowerCase().includes('despesa'))
    const expensesVsBudget = expenseAlerts.length > 0
      ? expenseAlerts.reduce((sum, a) => sum + a.variationVsBudget, 0) / expenseAlerts.length
      : 0

    return {
      criticalCount,
      warningCount,
      okCount,
      totalAccounts,
      overallHealth,
      revenueVsBudget,
      marginVsBudget,
      expensesVsBudget
    }
  }, [alerts])

  const topCritical = useMemo(() => alerts.filter(a => a.status === 'critical').slice(0, 5), [alerts])
  const topWarning = useMemo(() => alerts.filter(a => a.status === 'warning').slice(0, 5), [alerts])

  const aiContext = useMemo(() => ({
    period: `${month}/${year}`,
    summary,
    topCritical: topCritical.map(a => ({
      account: a.accountName,
      department: a.department,
      real: a.realValue,
      budget: a.budgetValue,
      variation: a.variationVsBudget
    })),
    topWarning: topWarning.map(a => ({
      account: a.accountName,
      department: a.department,
      real: a.realValue,
      budget: a.budgetValue,
      variation: a.variationVsBudget
    }))
  }), [month, year, summary, topCritical, topWarning])

  return {
    summary,
    alerts,
    topCritical,
    topWarning,
    isLoading,
    error,
    aiContext
  }
}
