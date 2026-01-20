"use client"

import type React from "react"
import { Layers, GitBranch, Target, BookOpen, LayoutGrid, FileSpreadsheet, Scale } from "lucide-react"
import DashboardCard from "./ui/DashboardCard"

interface ParametrosApuracaoViewProps {
  onNavigateToCostCenters: () => void
  onNavigateToDreChartOfAccounts: () => void
  onNavigateToAccountMapping: () => void
  onNavigateToBenchmarks: () => void
  onNavigateToChartOfAccounts: () => void
  onNavigateToBalanceSheetAccounts: () => void
}

const ParametrosApuracaoView: React.FC<ParametrosApuracaoViewProps> = ({
  onNavigateToCostCenters,
  onNavigateToDreChartOfAccounts,
  onNavigateToAccountMapping,
  onNavigateToBenchmarks,
  onNavigateToChartOfAccounts,
  onNavigateToBalanceSheetAccounts,
}) => {
  return (
    <main className="flex-grow flex flex-col h-full overflow-y-auto bg-white">
      <div className="w-full p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Parâmetros de Apuração</h1>
          <p className="text-slate-500 text-lg">Configure os parâmetros para análise e apuração de resultados.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            icon={Layers}
            title="Centro de Resultado"
            description="Gerencie departamentos e centros de resultado para segmentação da análise financeira."
            onClick={onNavigateToCostCenters}
          />

          <DashboardCard
            icon={BookOpen}
            title="Plano de Contas Contábil"
            description="Visualize o plano de contas contábil importado do ERP com códigos e naturezas."
            onClick={onNavigateToChartOfAccounts}
          />

          <DashboardCard
            icon={Scale}
            title="Plano de Contas Patrimonial"
            description="Gerencie as contas do balanço patrimonial e seus mapeamentos contábeis."
            onClick={onNavigateToBalanceSheetAccounts}
          />

          <DashboardCard
            icon={LayoutGrid}
            title="Plano DRE"
            description="Configure a estrutura do Demonstrativo de Resultado do Exercício com contas gerenciais."
            onClick={onNavigateToDreChartOfAccounts}
          />

          <DashboardCard
            icon={GitBranch}
            title="Mapeamentos DRE"
            description="Configure o mapeamento das contas contábeis para as contas gerenciais da DRE."
            onClick={onNavigateToAccountMapping}
          />

          <DashboardCard
            icon={Target}
            title="Benchmark"
            description="Defina metas e indicadores de referência para análise comparativa de desempenho."
            onClick={onNavigateToBenchmarks}
          />
        </div>
      </div>
    </main>
  )
}

export default ParametrosApuracaoView
