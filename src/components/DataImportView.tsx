"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { CALENDAR_MONTHS } from "../constants"
import StyledSelect from "./StyledSelect"
import type { Brand, Company } from "../types"
import { getCadastroTenant, deleteEntriesInBatches, BatchDeleteProgress } from "../utils/db"
import { useTenant } from "../context/TenantContext"
import AccountingEntryImportModal from "./AccountingEntryImportModal"
import MonthlyBalanceImportModal from "./MonthlyBalanceImportModal"
import DashboardCard from "./ui/DashboardCard"
import { FileBarChart, Files, Calculator } from "lucide-react"

interface DataImportViewProps {
  onUploadAccountingEntriesClick?: () => void
  onNavigateToAccountingEntries?: () => void
  onNavigateToMonthlyBalances?: () => void
  onDeleteEntries?: (year: number, month: string, brandId?: string, companyId?: string) => Promise<void>
  isLoading?: boolean
  brands?: Brand[]
  companies?: Company[]
  mode?: "all" | "accounting" | "budget"
  onNavigateBack?: () => void
  tenantId?: string | null
}

const DeleteConfirmationModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  summary: string
  isLoading: boolean
  progress?: BatchDeleteProgress | null
}> = ({ isOpen, onClose, onConfirm, summary, isLoading, progress }) => {
  if (!isOpen) return null

  const progressPercentage = progress && progress.total > 0 
    ? Math.round((progress.deleted / progress.total) * 100) 
    : 0

  const getStatusText = () => {
    if (!progress) return null
    switch (progress.status) {
      case 'counting': return 'Contando registros...'
      case 'deleting': return `Excluindo lote ${progress.currentBatch}...`
      case 'completed': return 'Exclusão concluída!'
      case 'error': return `Erro: ${progress.error}`
      default: return null
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 transform transition-all scale-100">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Exclusão?</h3>
          <div className="text-sm text-slate-600 mb-6">
            <p className="mb-2">Você está solicitando a exclusão dos lançamentos {summary}.</p>
            <p className="font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 mt-3">
              Esta ação é irreversível e removerá permanentemente os dados do banco de dados.
            </p>
          </div>
          
          {isLoading && progress && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{getStatusText()}</span>
                <span>{progress.deleted.toLocaleString()} / {progress.total.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div 
                  className="bg-red-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">{progressPercentage}% concluído</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg shadow-red-200 transition-all flex items-center disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Excluindo...
              </>
            ) : (
              "Sim, Excluir Tudo"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const DataImportView: React.FC<DataImportViewProps> = ({
  onUploadAccountingEntriesClick,
  onNavigateToAccountingEntries,
  onNavigateToMonthlyBalances,
  onDeleteEntries: propOnDeleteEntries,
  isLoading: propIsLoading,
  brands: propBrands,
  companies: propCompanies,
  mode = "all",
}) => {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(CALENDAR_MONTHS[0])
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [deleteSource, setDeleteSource] = useState<"lancamentos" | "saldos">("lancamentos")

  const [localBrands, setLocalBrands] = useState<Brand[]>(propBrands || [])
  const [localCompanies, setLocalCompanies] = useState<Company[]>(propCompanies || [])
  const [isLocalLoading, setIsLocalLoading] = useState(false)

  // Modals
  const [isAccountingImportModalOpen, setIsAccountingImportModalOpen] = useState(false)
  const [isMonthlyBalanceModalOpen, setIsMonthlyBalanceModalOpen] = useState(false)

  useEffect(() => {
    setLocalBrands(propBrands || [])
  }, [propBrands])
  useEffect(() => {
    setLocalCompanies(propCompanies || [])
  }, [propCompanies])

  const { effectiveTenantId } = useTenant()
  const tenantId = effectiveTenantId || null

  useEffect(() => {
    const loadMissingData = async () => {
      if (!tenantId) return
      
      if (!propBrands || propBrands.length === 0) {
        try {
          const fetchedBrands = await getCadastroTenant("brands", tenantId) as Brand[]
          if (fetchedBrands && fetchedBrands.length > 0) {
            setLocalBrands(fetchedBrands)
          }
        } catch (error) {
          console.error("Failed to fallback load brands", error)
        }
      }
      if (!propCompanies || propCompanies.length === 0) {
        try {
          const fetchedCompanies = await getCadastroTenant("companies", tenantId) as Company[]
          if (fetchedCompanies && fetchedCompanies.length > 0) {
            setLocalCompanies(fetchedCompanies)
          }
        } catch (error) {
          console.error("Failed to fallback load companies", error)
        }
      }
    }
    if (!propBrands || !propCompanies || propBrands.length === 0 || propCompanies.length === 0) {
      loadMissingData()
    }
  }, [propBrands?.length, propCompanies?.length, tenantId])

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<BatchDeleteProgress | null>(null)

  const filteredCompanies = useMemo(() => {
    if (!selectedBrandId) return localCompanies
    return localCompanies.filter((c) => c.brandId === selectedBrandId)
  }, [localCompanies, selectedBrandId])

  const handleBrandChange = (val: string) => {
    setSelectedBrandId(val)
    setSelectedCompanyId("")
  }

  const getDeleteSummary = () => {
    let msg = `dos registros de ${deleteSource === "lancamentos" ? "Lançamentos Contábeis" : "Balancetes Mensais"} de ${selectedMonth}/${selectedYear}`
    if (selectedCompanyId) {
      const companyName = localCompanies.find((c) => c.id === selectedCompanyId)?.name
      msg += ` da loja "${companyName}"`
    } else if (selectedBrandId) {
      const brandName = localBrands.find((b) => b.id === selectedBrandId)?.name
      msg += ` de todas as lojas da marca "${brandName}"`
    } else {
      msg += ` de TODAS as empresas`
    }
    return msg
  }

  // Custom Delete Logic with batch processing
  const handleConfirmDelete = async () => {
    if (!tenantId) {
      alert("Tenant não identificado.")
      return
    }
    
    setIsLocalLoading(true)
    setDeleteProgress(null)

    try {
      const table = deleteSource === "lancamentos" ? "lancamentos_contabeis" : "saldos_mensais"
      
      let companyNames: string[] | undefined
      let companyIds: string[] | undefined

      if (selectedCompanyId) {
        if (deleteSource === "lancamentos") {
          const company = localCompanies.find((c) => c.id === selectedCompanyId)
          if (company) companyNames = [company.name]
        } else {
          companyIds = [selectedCompanyId]
        }
      } else if (selectedBrandId) {
        const brandCompanies = localCompanies.filter((c) => c.brandId === selectedBrandId)
        if (brandCompanies.length > 0) {
          if (deleteSource === "lancamentos") {
            companyNames = brandCompanies.map((c) => c.name)
          } else {
            companyIds = brandCompanies.map((c) => c.id)
          }
        }
      }

      const result = await deleteEntriesInBatches({
        table,
        tenantId,
        year: selectedYear,
        month: selectedMonth,
        companyNames,
        companyIds,
        batchSize: 5000,
        onProgress: (progress) => setDeleteProgress(progress)
      })

      if (result.success) {
        alert(`${result.deletedCount.toLocaleString()} registros excluídos com sucesso!`)
        setIsDeleteModalOpen(false)
      } else {
        alert(`Erro durante a exclusão: ${result.error}. ${result.deletedCount} registros foram excluídos antes do erro.`)
      }
    } catch (e: any) {
      console.error(e)
      alert(`Erro ao excluir registros: ${e.message || "Erro desconhecido"}`)
    } finally {
      setIsLocalLoading(false)
      setDeleteProgress(null)
    }
  }

  const showAccounting = mode === "all" || mode === "accounting"
  const showBudget = mode === "all" || mode === "budget"

  const title =
    mode === "budget"
      ? "Importação de Orçamento"
      : mode === "accounting"
        ? "Importação de Dados Contábeis"
        : "Importação de Dados"

  const description =
    mode === "budget"
      ? "Carregue os valores orçados para o período."
      : mode === "accounting"
        ? "Carregue os balancetes e dados realizados."
        : "Selecione a fonte de dados para carregar no sistema."

  // Unified Action Button
  const ActionButton = ({ onClick, disabled, icon, label, primary = false }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
            px-4 py-2 text-xs font-bold rounded-lg flex items-center transition-all duration-200
            ${
              primary
                ? "bg-primary text-on-primary shadow-sm hover:bg-primary-hover"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
        `}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  )

  return (
    <main className="flex-grow flex flex-col h-full overflow-y-auto bg-white">
      <div className="w-full p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">{title}</h1>
          <p className="text-slate-500 text-lg">{description}</p>
        </div>

        <div className="space-y-6">
          {/* Import Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showAccounting && (
              <>
                {/* Card 1: Lançamentos Detalhados */}
                <DashboardCard
                  icon={FileBarChart}
                  title="Lançamentos Contábeis"
                  description="Importe o arquivo de balancete detalhado (Razão) com lançamentos linha a linha."
                >
                  <ActionButton
                    onClick={() => setIsAccountingImportModalOpen(true)}
                    disabled={propIsLoading}
                    primary
                    label="Importar"
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                    }
                  />
                  <ActionButton onClick={onNavigateToAccountingEntries} disabled={propIsLoading} label="Visualizar" />
                </DashboardCard>

                {/* Card 2: Balancetes Mensais (Colunas) */}
                <DashboardCard
                  icon={Files}
                  title="Balancetes Mensais"
                  description="Importe arquivos com múltiplas colunas de saldo (uma coluna por mês)."
                >
                  <ActionButton
                    onClick={() => setIsMonthlyBalanceModalOpen(true)}
                    disabled={propIsLoading}
                    primary
                    label="Importar"
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                    }
                  />
                  <ActionButton onClick={onNavigateToMonthlyBalances} disabled={propIsLoading} label="Visualizar" />
                </DashboardCard>
              </>
            )}

            {showBudget && (
              <div className="bg-white border border-slate-200 border-dashed flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-all hover:shadow-lg h-64 md:col-span-2">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-700">Orçamento (Em breve)</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                  A importação de orçamento via Excel estará disponível na próxima atualização.
                </p>
              </div>
            )}
          </div>

          {/* Cleaning Section */}
          {showAccounting && (
            <div className="bg-white border border-red-100 rounded-xl overflow-hidden shadow-sm mt-8">
              <div className="bg-red-50/50 px-6 py-4 border-b border-red-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-red-200/50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Exclusão de Dados</h2>
                  <p className="text-sm text-slate-500">
                    Ferramenta administrativa para excluir registros processados incorretamente.
                  </p>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500">Fonte de Dados</label>
                    <StyledSelect
                      value={deleteSource}
                      onChange={(e) => setDeleteSource(e.target.value as any)}
                      className="bg-white border-slate-300 w-full py-2.5 pl-4 pr-10 text-sm font-medium h-11"
                      containerClassName="w-full"
                    >
                      <option value="lancamentos">Lançamentos Contábeis</option>
                      <option value="saldos">Balancetes Mensais</option>
                    </StyledSelect>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500">Ano</label>
                    <StyledSelect
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-white border-slate-300 w-full py-2.5 pl-4 pr-10 text-sm font-medium h-11"
                      containerClassName="w-full"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500">Mês</label>
                    <StyledSelect
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-white border-slate-300 w-full py-2.5 pl-4 pr-10 text-sm font-medium h-11"
                      containerClassName="w-full"
                    >
                      {CALENDAR_MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500">Marca (Opcional)</label>
                    <StyledSelect
                      value={selectedBrandId}
                      onChange={(e) => handleBrandChange(e.target.value)}
                      className="bg-white border-slate-300 w-full py-2.5 pl-4 pr-10 text-sm font-medium h-11"
                      containerClassName="w-full"
                    >
                      <option value="">Todas as Marcas</option>
                      {localBrands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500">Loja (Opcional)</label>
                    <StyledSelect
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="bg-white border-slate-300 w-full py-2.5 pl-4 pr-10 text-sm font-medium h-11"
                      containerClassName="w-full"
                    >
                      <option value="">Todas as Lojas</option>
                      {filteredCompanies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nickname || c.name}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>
                </div>

                <div className="pt-6 border-t border-red-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-3 max-w-2xl">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-red-600 mt-0.5 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-red-800 leading-relaxed">
                      <strong>Atenção:</strong> Esta ferramenta remove permanentemente os registros importados.
                      Verifique os filtros antes de confirmar.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    disabled={propIsLoading || isLocalLoading}
                    className="h-[42px] px-6 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 transition-all shadow-sm flex items-center justify-center gap-2 group whitespace-nowrap"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Excluir registros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        summary={getDeleteSummary()}
        isLoading={isLocalLoading || propIsLoading || false}
        progress={deleteProgress}
      />

      <AccountingEntryImportModal
        isOpen={isAccountingImportModalOpen}
        onClose={() => setIsAccountingImportModalOpen(false)}
        onSuccess={() => {
          setIsAccountingImportModalOpen(false)
          alert("Importação realizada com sucesso!")
        }}
        tenantId={tenantId || ''}
      />

      <MonthlyBalanceImportModal
        isOpen={isMonthlyBalanceModalOpen}
        onClose={() => setIsMonthlyBalanceModalOpen(false)}
        companies={localCompanies}
        onSuccess={() => {
          setIsMonthlyBalanceModalOpen(false)
          alert("Importação de balancetes concluída!")
        }}
        tenantId={tenantId || ''}
      />
    </main>
  )
}

export default DataImportView
