"use client"

import React, { useState, useMemo } from 'react'
import { useControllerAnalysis, ControllerAlert } from '../hooks/useControllerAnalysis'
import { generateFinancialInsight } from '../utils/ai'
import type { Company, Brand, Department, DreAccount, BudgetAssumption, BudgetAssumptionValue } from '../types'

const MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']

interface ControllerDashboardViewProps {
  tenantId: string | null
  companies: Company[]
  brands: Brand[]
  departments: Department[]
  dreAccounts: DreAccount[]
  budgetAssumptions: BudgetAssumption[]
  budgetValues: BudgetAssumptionValue[]
  onNavigate?: (view: string) => void
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

const formatPercent = (value: number): string => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

const StatusBadge: React.FC<{ status: 'critical' | 'warning' | 'ok' }> = ({ status }) => {
  const config = {
    critical: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🟡' },
    ok: { bg: 'bg-green-100', text: 'text-green-700', icon: '🟢' }
  }
  const c = config[status]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>{c.icon}</span>
}

const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'stable' }> = ({ trend }) => {
  if (trend === 'up') return <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
  if (trend === 'down') return <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
  return <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>
}

const SummaryCard: React.FC<{ title: string; value: string | number; subtitle?: string; color: string; icon: React.ReactNode }> = ({ title, value, subtitle, color, icon }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100').replace('700', '100')}`}>
        {icon}
      </div>
    </div>
  </div>
)

const AlertRow: React.FC<{ alert: ControllerAlert; onClick: () => void }> = ({ alert, onClick }) => (
  <tr className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={onClick}>
    <td className="px-4 py-3">
      <StatusBadge status={alert.status} />
    </td>
    <td className="px-4 py-3">
      <div className="font-medium text-slate-800">{alert.accountName}</div>
      <div className="text-xs text-slate-500">{alert.department}</div>
    </td>
    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(alert.realValue)}</td>
    <td className="px-4 py-3 text-right font-mono text-sm text-slate-500">{formatCurrency(alert.budgetValue)}</td>
    <td className="px-4 py-3 text-right">
      <span className={`font-mono text-sm font-medium ${alert.variationVsBudget > 0 ? 'text-red-600' : 'text-green-600'}`}>
        {formatPercent(alert.variationVsBudget)}
      </span>
    </td>
    <td className="px-4 py-3 text-center">
      <TrendIcon trend={alert.trend} />
    </td>
  </tr>
)

const ControllerDashboardView: React.FC<ControllerDashboardViewProps> = ({
  tenantId,
  companies,
  brands,
  departments,
  dreAccounts,
  budgetAssumptions,
  budgetValues,
  onNavigate
}) => {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentDate.getMonth() > 0 ? currentDate.getMonth() - 1 : 11])
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<ControllerAlert | null>(null)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)

  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i), [currentDate])

  const { summary, alerts, topCritical, topWarning, isLoading, error, aiContext } = useControllerAnalysis(
    tenantId,
    selectedYear,
    selectedMonth,
    selectedBrandId,
    companies,
    brands,
    departments,
    dreAccounts,
    budgetAssumptions,
    budgetValues
  )

  const displayedAlerts = useMemo(() => {
    if (showAllAlerts) return alerts
    return [...topCritical, ...topWarning].slice(0, 10)
  }, [alerts, topCritical, topWarning, showAllAlerts])

  const handleGenerateInsight = async () => {
    setIsLoadingAI(true)
    try {
      const insight = await generateFinancialInsight(
        'Analise os resultados do período e identifique os principais pontos de atenção. Forneça recomendações específicas para melhorar a performance.',
        {
          store: selectedBrandId ? brands.find(b => b.id === selectedBrandId)?.name || 'Consolidado' : 'Consolidado',
          period: `${selectedMonth}/${selectedYear}`,
          data: aiContext,
          view: 'Controller Dashboard',
          department: 'Consolidado'
        },
        []
      )
      setAiInsight(insight)
    } catch (err) {
      console.error('Error generating AI insight:', err)
      setAiInsight('Não foi possível gerar a análise no momento. Tente novamente.')
    } finally {
      setIsLoadingAI(false)
    }
  }

  return (
    <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
      <div className="w-full flex flex-col h-full">
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Painel do Controller</h1>
              <p className="text-sm text-slate-500 mt-1">Análise automática de resultados e alertas</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedBrandId || ''}
                onChange={(e) => setSelectedBrandId(e.target.value || null)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todas as Marcas</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  title="Itens Críticos"
                  value={summary.criticalCount}
                  subtitle="Requer ação imediata"
                  color="text-red-600"
                  icon={<svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                />
                <SummaryCard
                  title="Itens em Atenção"
                  value={summary.warningCount}
                  subtitle="Monitorar evolução"
                  color="text-amber-600"
                  icon={<svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <SummaryCard
                  title="Itens OK"
                  value={summary.okCount}
                  subtitle="Dentro do esperado"
                  color="text-green-600"
                  icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <SummaryCard
                  title="Receita vs Orçamento"
                  value={formatPercent(summary.revenueVsBudget)}
                  subtitle="Variação consolidada"
                  color={summary.revenueVsBudget >= 0 ? 'text-green-600' : 'text-red-600'}
                  icon={<svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                />
              </div>

              <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">💡</span>
                      <h3 className="text-lg font-bold">Insight do Luca (IA)</h3>
                    </div>
                    {aiInsight ? (
                      <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{aiInsight}</div>
                    ) : (
                      <p className="text-slate-300 text-sm">Clique no botão para gerar uma análise inteligente dos seus resultados.</p>
                    )}
                  </div>
                  <button
                    onClick={handleGenerateInsight}
                    disabled={isLoadingAI}
                    className="ml-4 px-4 py-2 bg-white text-slate-800 rounded-lg font-medium text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                  >
                    {isLoadingAI ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                        Analisando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Gerar Análise
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">Itens que Requerem Atenção</h3>
                  <button
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    {showAllAlerts ? 'Mostrar principais' : `Ver todos (${alerts.length})`}
                  </button>
                </div>
                {displayedAlerts.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="font-medium">Nenhum alerta encontrado</p>
                    <p className="text-sm mt-1">Todos os indicadores estão dentro do esperado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase w-16">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Conta / Departamento</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Realizado</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Orçado</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Var. %</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase w-16">Tend.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedAlerts.map(alert => (
                          <AlertRow key={alert.id} alert={alert} onClick={() => setSelectedAlert(alert)} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedAlert.status} />
                <div>
                  <h3 className="font-bold text-slate-800">{selectedAlert.accountName}</h3>
                  <p className="text-sm text-slate-500">{selectedAlert.department}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase font-bold">Realizado</p>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(selectedAlert.realValue)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase font-bold">Orçado</p>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(selectedAlert.budgetValue)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">vs Orçamento</p>
                  <p className={`text-lg font-bold ${selectedAlert.variationVsBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(selectedAlert.variationVsBudget)}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">vs Mês Anterior</p>
                  <p className={`text-lg font-bold ${selectedAlert.variationVsPreviousMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(selectedAlert.variationVsPreviousMonth)}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">vs Mesmo Mês Ano Ant.</p>
                  <p className={`text-lg font-bold ${selectedAlert.variationVsSameMonthLastYear >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(selectedAlert.variationVsSameMonthLastYear)}</p>
                </div>
              </div>
              {selectedAlert.companyBreakdown && selectedAlert.companyBreakdown.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2">Detalhamento por Loja</h4>
                  <div className="space-y-2">
                    {selectedAlert.companyBreakdown.map((cb, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                        <span className="text-sm font-medium text-slate-700">{cb.companyName}</span>
                        <span className="text-sm font-mono font-medium text-slate-800">{formatCurrency(cb.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default ControllerDashboardView
