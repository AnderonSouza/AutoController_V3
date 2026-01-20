"use client"

import type React from "react"
import { Building2, Tag } from "lucide-react"
import DashboardCard from "./ui/DashboardCard"

interface OrganizationalStructureViewProps {
  onNavigateToCompanies: () => void
  onNavigateToBrands: () => void
}

const OrganizationalStructureView: React.FC<OrganizationalStructureViewProps> = ({
  onNavigateToCompanies,
  onNavigateToBrands,
}) => {
  return (
    <main className="flex-grow flex flex-col h-full overflow-y-auto bg-white">
      <div className="w-full p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Estrutura Organizacional</h1>
          <p className="text-slate-500 text-lg">Gerencie as empresas e marcas da sua organização.</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard
              icon={Building2}
              title="Empresas"
              description="Cadastre e gerencie as lojas do grupo com CNPJ e código ERP para garantir a importação correta dos dados."
              onClick={onNavigateToCompanies}
            />

            <DashboardCard
              icon={Tag}
              title="Marcas"
              description="Organize as empresas por marca/bandeira para facilitar a análise consolidada e comparativa de resultados."
              onClick={onNavigateToBrands}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

export default OrganizationalStructureView
