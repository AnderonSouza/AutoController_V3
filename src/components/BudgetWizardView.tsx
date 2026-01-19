"use client"

import React, { useState, useEffect, useMemo } from "react"
import type { RegraOrcamento, TipoConta, TipoIndice, OrcamentoGerado } from "../types"
import {
  fetchRegrasOrcamento,
  saveRegraOrcamento,
  deleteRegraOrcamento,
  fetchContasDRE,
  fetchLinhasTotalizadoras,
  fetchIndicesEconomicos,
  fetchHistoricoContas,
  fetchTotalLinhaDRE,
} from "../utils/db"
import StyledSelect from "./StyledSelect"

interface BudgetWizardViewProps {
  tenantId: string
  onNavigateBack: () => void
  onApplyBudget?: (orcamentos: OrcamentoGerado[]) => void
}

type WizardStep = "classificar" | "configurar" | "gerar"

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

const formatPercent = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100)
}

const BudgetWizardView: React.FC<BudgetWizardViewProps> = ({
  tenantId,
  onNavigateBack,
  onApplyBudget,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>("classificar")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [regras, setRegras] = useState<RegraOrcamento[]>([])
  const [contasDRE, setContasDRE] = useState<{ id: string; nome: string; codigo?: string }[]>([])
  const [linhasTotalizadoras, setLinhasTotalizadoras] = useState<{ id: string; nome: string }[]>([])
  const [indices, setIndices] = useState<{ tipo: TipoIndice; valor: number }[]>([])

  const [selectedConta, setSelectedConta] = useState<string>("")
  const [editingRegra, setEditingRegra] = useState<Partial<RegraOrcamento> | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showOnlyPending, setShowOnlyPending] = useState(false)

  const [anoOrcamento, setAnoOrcamento] = useState(new Date().getFullYear() + 1)
  const [orcamentosGerados, setOrcamentosGerados] = useState<OrcamentoGerado[]>([])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [regrasData, contasData, linhasData, indicesData] = await Promise.all([
          fetchRegrasOrcamento(tenantId),
          fetchContasDRE(tenantId),
          fetchLinhasTotalizadoras(tenantId),
          fetchIndicesEconomicos(tenantId),
        ])
        setRegras(regrasData)
        setContasDRE(contasData)
        setLinhasTotalizadoras(linhasData)
        
        const indicesAgrupados = indicesData.reduce((acc, idx) => {
          if (!acc.find(i => i.tipo === idx.tipo)) {
            acc.push({ tipo: idx.tipo, valor: idx.valor })
          }
          return acc
        }, [] as { tipo: TipoIndice; valor: number }[])
        setIndices(indicesAgrupados)
      } catch (err) {
        console.error("Erro ao carregar dados:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [tenantId])

  const contasSemRegra = useMemo(() => {
    const idsComRegra = new Set(regras.map(r => r.contaDreId))
    return contasDRE.filter(c => !idsComRegra.has(c.id))
  }, [contasDRE, regras])

  const regrasPorTipo = useMemo(() => ({
    fixa: regras.filter(r => r.tipoConta === "fixa"),
    variavel: regras.filter(r => r.tipoConta === "variavel"),
    manual: regras.filter(r => r.tipoConta === "manual"),
  }), [regras])

  const contasComStatus = useMemo(() => {
    const regraMap = new Map(regras.map(r => [r.contaDreId, r.tipoConta]))
    return contasDRE.map(c => ({
      ...c,
      status: regraMap.get(c.id) || null,
    }))
  }, [contasDRE, regras])

  const contasFiltradas = useMemo(() => {
    let filtered = contasComStatus
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.nome.toLowerCase().includes(term) || 
        (c.codigo && c.codigo.toLowerCase().includes(term))
      )
    }
    
    if (showOnlyPending) {
      filtered = filtered.filter(c => !c.status)
    }
    
    return filtered
  }, [contasComStatus, searchTerm, showOnlyPending])

  const handleAddRegra = (tipoConta: TipoConta) => {
    if (!selectedConta) return
    const conta = contasDRE.find(c => c.id === selectedConta)
    if (!conta) return

    setEditingRegra({
      contaDreId: conta.id,
      contaDreNome: conta.nome,
      tipoConta,
      periodoBaseMeses: 6,
      usarPercentualHistorico: true,
      ativo: true,
    })
    setSelectedConta("")
  }

  const handleSaveRegra = async () => {
    if (!editingRegra) return
    setIsSaving(true)
    try {
      const saved = await saveRegraOrcamento({
        ...editingRegra,
        organizacaoId: tenantId,
      } as RegraOrcamento)
      
      setRegras(prev => {
        const idx = prev.findIndex(r => r.id === saved.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = saved
          return updated
        }
        return [...prev, saved]
      })
      setEditingRegra(null)
    } catch (err) {
      console.error("Erro ao salvar regra:", err)
      alert("Erro ao salvar regra")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRegra = async (id: string) => {
    if (!confirm("Deseja remover esta regra?")) return
    try {
      await deleteRegraOrcamento(id)
      setRegras(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error("Erro ao excluir regra:", err)
    }
  }

  const [isGenerating, setIsGenerating] = useState(false)
  const [historicosCache, setHistoricosCache] = useState<Record<string, number>>({})

  const handleGerarOrcamento = async () => {
    setIsGenerating(true)
    const orcamentos: OrcamentoGerado[] = []
    const historicosFetched: Record<string, number> = {}
    const totaisLinhaFetched: Record<string, number> = {}

    try {
      for (const regra of regras) {
        let mediaHistorica = 0
        let valorReferenciaLinha = 0
        
        if (regra.tipoConta === "fixa") {
          const cacheKey = `fixa_${regra.contaDreId}_${regra.periodoBaseMeses}`
          if (historicosFetched[cacheKey] !== undefined) {
            mediaHistorica = historicosFetched[cacheKey]
          } else {
            try {
              const historico = await fetchHistoricoContas(tenantId, regra.contaDreId, regra.periodoBaseMeses)
              if (historico.length > 0) {
                const soma = historico.reduce((acc, h) => acc + Math.abs(h.valor), 0)
                mediaHistorica = soma / historico.length
              }
              historicosFetched[cacheKey] = mediaHistorica
            } catch (err) {
              console.error("Erro ao buscar histórico:", err)
              mediaHistorica = 0
            }
          }
        } else if (regra.tipoConta === "variavel" && regra.linhaReferenciaId) {
          const cacheKey = `variavel_${regra.linhaReferenciaId}`
          if (totaisLinhaFetched[cacheKey] !== undefined) {
            valorReferenciaLinha = totaisLinhaFetched[cacheKey]
          } else {
            try {
              valorReferenciaLinha = await fetchTotalLinhaDRE(tenantId, regra.linhaReferenciaId, 12)
              totaisLinhaFetched[cacheKey] = valorReferenciaLinha
            } catch (err) {
              console.error("Erro ao buscar total linha:", err)
              valorReferenciaLinha = 0
            }
          }
        }

        for (const mes of MESES) {
          let valorCalculado = 0
          let baseCalculo = ""
          const detalhes: OrcamentoGerado["detalhes"] = {}

          if (regra.tipoConta === "fixa") {
            const indiceCorrecao = regra.percentualCorrecao || 0
            
            if (mediaHistorica > 0) {
              valorCalculado = mediaHistorica * (1 + indiceCorrecao / 100)
              baseCalculo = `Média ${regra.periodoBaseMeses}m (${formatCurrency(mediaHistorica)}) + ${indiceCorrecao}%`
            } else {
              valorCalculado = 0
              baseCalculo = `Sem histórico disponível`
            }
            detalhes.mediaHistorica = mediaHistorica
            detalhes.indiceCorrecao = indiceCorrecao
          } else if (regra.tipoConta === "variavel") {
            const percentual = regra.percentualSobreLinha || 0
            
            if (percentual > 0 && valorReferenciaLinha > 0) {
              valorCalculado = valorReferenciaLinha * (percentual / 100)
              baseCalculo = `${percentual}% s/ ${regra.linhaReferenciaNome || "Base"} (${formatCurrency(valorReferenciaLinha)}/mês)`
            } else if (percentual > 0) {
              baseCalculo = `${percentual}% s/ ${regra.linhaReferenciaNome || "Base"} (sem dados)`
              valorCalculado = 0
            } else {
              baseCalculo = `Percentual não definido`
              valorCalculado = 0
            }
            detalhes.percentualAplicado = percentual
            detalhes.valorReferencia = valorReferenciaLinha
          } else if (regra.tipoConta === "manual") {
            baseCalculo = "Entrada manual (preencher na tabela)"
            valorCalculado = 0
          }

          orcamentos.push({
            contaDreId: regra.contaDreId,
            contaDreNome: regra.contaDreNome || "",
            tipoConta: regra.tipoConta,
            ano: anoOrcamento,
            mes,
            valorCalculado,
            baseCalculo,
            detalhes,
          })
        }
      }

      setHistoricosCache(historicosFetched)
      setOrcamentosGerados(orcamentos)
    } catch (err) {
      console.error("Erro ao gerar orçamento:", err)
      alert("Erro ao gerar orçamento. Verifique os dados.")
    } finally {
      setIsGenerating(false)
    }
  }

  const steps: { key: WizardStep; label: string; number: number }[] = [
    { key: "classificar", label: "Classificar Contas", number: 1 },
    { key: "configurar", label: "Configurar Regras", number: 2 },
    { key: "gerar", label: "Gerar Orçamento", number: 3 },
  ]

  const inputClasses = "w-full bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"

  if (isLoading) {
    return (
      <main className="flex-grow flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-app)" }}>
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6" style={{ color: "var(--color-primary)" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-600">Carregando...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-grow flex flex-col h-full overflow-hidden" style={{ backgroundColor: "var(--color-bg-app)" }}>
      <div className="bg-white px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {steps.map((step, idx) => (
              <button
                key={step.key}
                onClick={() => setCurrentStep(step.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  currentStep === step.key
                    ? "text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
                style={currentStep === step.key ? { backgroundColor: "var(--color-primary)" } : {}}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === step.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {step.number}
                </span>
                <span className="text-sm font-medium">{step.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={onNavigateBack}
            className="text-sm text-slate-500 hover:text-slate-800 font-semibold flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Voltar
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 lg:p-8">
        {currentStep === "classificar" && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">Classificar Contas de Despesa</h2>
              <p className="text-sm text-slate-500 mt-1">
                Arraste ou selecione as contas para classificá-las como Fixa, Variável ou Manual
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-grow">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar conta por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showOnlyPending}
                    onChange={(e) => setShowOnlyPending(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Apenas pendentes
                </label>
              </div>

              <div className="flex items-center gap-3 mb-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Fixa
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Variável
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Manual
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> Pendente
                </span>
                <span className="ml-auto text-slate-400">
                  {contasFiltradas.length} de {contasDRE.length} contas | {contasSemRegra.length} pendentes
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                {contasFiltradas.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">
                    {searchTerm ? "Nenhuma conta encontrada com este termo" : "Nenhuma conta disponível"}
                  </div>
                ) : (
                  contasFiltradas.map(conta => {
                    const isSelected = selectedConta === conta.id
                    const statusColors: Record<string, string> = {
                      fixa: "bg-blue-100 border-blue-300 text-blue-800",
                      variavel: "bg-green-100 border-green-300 text-green-800",
                      manual: "bg-yellow-100 border-yellow-300 text-yellow-800",
                    }
                    const dotColors: Record<string, string> = {
                      fixa: "bg-blue-500",
                      variavel: "bg-green-500",
                      manual: "bg-yellow-500",
                    }
                    
                    return (
                      <div
                        key={conta.id}
                        onClick={() => !conta.status && setSelectedConta(isSelected ? "" : conta.id)}
                        className={`flex items-center justify-between px-3 py-2.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition ${
                          conta.status 
                            ? "bg-slate-50 cursor-default opacity-70" 
                            : isSelected 
                              ? "bg-primary/10" 
                              : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-grow min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${conta.status ? dotColors[conta.status] : "bg-slate-300"}`}></span>
                          <span className="text-sm text-slate-700 truncate">
                            {conta.codigo && <span className="text-slate-400 mr-1">{conta.codigo}</span>}
                            {conta.nome}
                          </span>
                        </div>
                        {conta.status ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[conta.status]}`}>
                            {conta.status === "fixa" ? "Fixa" : conta.status === "variavel" ? "Variável" : "Manual"}
                          </span>
                        ) : isSelected ? (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAddRegra("fixa") }}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 transition"
                            >
                              Fixa
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAddRegra("variavel") }}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-green-500 text-white hover:bg-green-600 transition"
                            >
                              Variável
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAddRegra("manual") }}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-yellow-500 text-white hover:bg-yellow-600 transition"
                            >
                              Manual
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Clique para classificar</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Despesas Fixas ({regrasPorTipo.fixa.length})
                </h3>
                <p className="text-xs text-blue-600 mb-4">Média histórica + índice de correção</p>
                <div className="space-y-2">
                  {regrasPorTipo.fixa.map(regra => (
                    <div key={regra.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                      <span className="text-sm text-slate-700 truncate flex-grow">{regra.contaDreNome}</span>
                      <button
                        onClick={() => handleDeleteRegra(regra.id)}
                        className="ml-2 text-slate-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {regrasPorTipo.fixa.length === 0 && (
                    <p className="text-sm text-blue-400 italic text-center py-4">Nenhuma conta classificada</p>
                  )}
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Despesas Variáveis ({regrasPorTipo.variavel.length})
                </h3>
                <p className="text-xs text-green-600 mb-4">Percentual sobre linha totalizadora</p>
                <div className="space-y-2">
                  {regrasPorTipo.variavel.map(regra => (
                    <div key={regra.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                      <span className="text-sm text-slate-700 truncate flex-grow">{regra.contaDreNome}</span>
                      <button
                        onClick={() => handleDeleteRegra(regra.id)}
                        className="ml-2 text-slate-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {regrasPorTipo.variavel.length === 0 && (
                    <p className="text-sm text-green-400 italic text-center py-4">Nenhuma conta classificada</p>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Manual ({regrasPorTipo.manual.length})
                </h3>
                <p className="text-xs text-yellow-600 mb-4">Entrada direta pelo usuário</p>
                <div className="space-y-2">
                  {regrasPorTipo.manual.map(regra => (
                    <div key={regra.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                      <span className="text-sm text-slate-700 truncate flex-grow">{regra.contaDreNome}</span>
                      <button
                        onClick={() => handleDeleteRegra(regra.id)}
                        className="ml-2 text-slate-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {regrasPorTipo.manual.length === 0 && (
                    <p className="text-sm text-yellow-400 italic text-center py-4">Nenhuma conta classificada</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setCurrentStep("configurar")}
                disabled={regras.length === 0}
                className="px-6 py-2.5 text-white font-semibold rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                Próximo: Configurar Regras
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {currentStep === "configurar" && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">Configurar Regras de Cálculo</h2>
              <p className="text-sm text-slate-500 mt-1">
                Defina os parâmetros para cálculo automático de cada despesa
              </p>
            </div>

            {regrasPorTipo.fixa.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Despesas Fixas
                </h3>
                <div className="space-y-4">
                  {regrasPorTipo.fixa.map(regra => (
                    <div key={regra.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-slate-800">{regra.contaDreNome}</h4>
                          <p className="text-xs text-slate-500">Cálculo: Média histórica + correção</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Período Base</label>
                          <StyledSelect
                            value={regra.periodoBaseMeses.toString()}
                            onChange={(e) => {
                              const updated = { ...regra, periodoBaseMeses: parseInt(e.target.value) }
                              saveRegraOrcamento({ ...updated, organizacaoId: tenantId })
                              setRegras(prev => prev.map(r => r.id === regra.id ? updated : r))
                            }}
                            containerClassName="w-full"
                          >
                            <option value="3">Últimos 3 meses</option>
                            <option value="6">Últimos 6 meses</option>
                            <option value="12">Últimos 12 meses</option>
                          </StyledSelect>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Índice de Correção</label>
                          <StyledSelect
                            value={regra.indiceCorrecao || "PERCENTUAL"}
                            onChange={(e) => {
                              const updated = { ...regra, indiceCorrecao: e.target.value as TipoIndice }
                              saveRegraOrcamento({ ...updated, organizacaoId: tenantId })
                              setRegras(prev => prev.map(r => r.id === regra.id ? updated : r))
                            }}
                            containerClassName="w-full"
                          >
                            <option value="IPCA">IPCA</option>
                            <option value="IGP-M">IGP-M</option>
                            <option value="SELIC">SELIC</option>
                            <option value="PERCENTUAL">Percentual Fixo</option>
                          </StyledSelect>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">% Correção</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={regra.percentualCorrecao || ""}
                              onChange={(e) => {
                                const updated = { ...regra, percentualCorrecao: parseFloat(e.target.value) || 0 }
                                saveRegraOrcamento({ ...updated, organizacaoId: tenantId })
                                setRegras(prev => prev.map(r => r.id === regra.id ? updated : r))
                              }}
                              className={inputClasses}
                              placeholder="5.0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>Cálculo:</strong> Média dos últimos {regra.periodoBaseMeses} meses × (1 + {regra.percentualCorrecao || 0}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {regrasPorTipo.variavel.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Despesas Variáveis
                </h3>
                <div className="space-y-4">
                  {regrasPorTipo.variavel.map(regra => (
                    <div key={regra.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-slate-800">{regra.contaDreNome}</h4>
                          <p className="text-xs text-slate-500">Cálculo: Percentual sobre base</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Base de Cálculo (Linha Totalizadora)</label>
                          <StyledSelect
                            value={regra.linhaReferenciaId || ""}
                            onChange={(e) => {
                              const linha = linhasTotalizadoras.find(l => l.id === e.target.value)
                              const updated = { 
                                ...regra, 
                                linhaReferenciaId: e.target.value,
                                linhaReferenciaNome: linha?.nome || ""
                              }
                              saveRegraOrcamento({ ...updated, organizacaoId: tenantId })
                              setRegras(prev => prev.map(r => r.id === regra.id ? updated : r))
                            }}
                            containerClassName="w-full"
                          >
                            <option value="">Selecione a linha base...</option>
                            {linhasTotalizadoras.map(linha => (
                              <option key={linha.id} value={linha.id}>{linha.nome}</option>
                            ))}
                          </StyledSelect>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Percentual</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={regra.percentualSobreLinha || ""}
                              onChange={(e) => {
                                const updated = { ...regra, percentualSobreLinha: parseFloat(e.target.value) || 0 }
                                saveRegraOrcamento({ ...updated, organizacaoId: tenantId })
                                setRegras(prev => prev.map(r => r.id === regra.id ? updated : r))
                              }}
                              className={inputClasses}
                              placeholder="2.5"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">
                          <strong>Cálculo:</strong> {regra.linhaReferenciaNome || "Base"} × {regra.percentualSobreLinha || 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep("classificar")}
                className="px-6 py-2.5 text-slate-600 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <button
                onClick={async () => {
                  setCurrentStep("gerar")
                  await handleGerarOrcamento()
                }}
                disabled={isGenerating}
                className="px-6 py-2.5 text-white font-semibold rounded-lg shadow-md hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {isGenerating ? "Calculando..." : "Próximo: Gerar Orçamento"}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {currentStep === "gerar" && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Orçamento Gerado</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Revise os valores calculados antes de aplicar
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-600">Ano:</label>
                <StyledSelect
                  value={anoOrcamento.toString()}
                  onChange={(e) => setAnoOrcamento(parseInt(e.target.value))}
                  containerClassName="w-32"
                >
                  {[2025, 2026, 2027].map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </StyledSelect>
                <button
                  onClick={handleGerarOrcamento}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {isGenerating ? "Calculando..." : "Recalcular"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-left text-xs font-bold text-slate-600 uppercase">Conta</th>
                      <th className="p-4 text-center text-xs font-bold text-slate-600 uppercase">Tipo</th>
                      <th className="p-4 text-center text-xs font-bold text-slate-600 uppercase">Base de Cálculo</th>
                      {MESES.slice(0, 6).map(mes => (
                        <th key={mes} className="p-3 text-right text-xs font-bold text-slate-600 uppercase">
                          {mes.substring(0, 3)}
                        </th>
                      ))}
                      <th className="p-4 text-right text-xs font-bold text-slate-600 uppercase bg-slate-100">Total 1S</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set(orcamentosGerados.map(o => o.contaDreId))].map(contaId => {
                      const orcamentosConta = orcamentosGerados.filter(o => o.contaDreId === contaId)
                      const primeiro = orcamentosConta[0]
                      const totalSemestre = orcamentosConta
                        .filter(o => MESES.indexOf(o.mes) < 6)
                        .reduce((sum, o) => sum + o.valorCalculado, 0)

                      return (
                        <tr key={contaId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4 text-sm font-medium text-slate-800">{primeiro?.contaDreNome}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              primeiro?.tipoConta === "fixa" ? "bg-blue-100 text-blue-700" :
                              primeiro?.tipoConta === "variavel" ? "bg-green-100 text-green-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {primeiro?.tipoConta === "fixa" ? "Fixa" : primeiro?.tipoConta === "variavel" ? "Variável" : "Manual"}
                            </span>
                          </td>
                          <td className="p-4 text-center text-xs text-slate-500">{primeiro?.baseCalculo}</td>
                          {MESES.slice(0, 6).map(mes => {
                            const orc = orcamentosConta.find(o => o.mes === mes)
                            return (
                              <td key={mes} className="p-3 text-right text-sm text-slate-700">
                                {orc ? formatCurrency(orc.valorCalculado) : "-"}
                              </td>
                            )
                          })}
                          <td className="p-4 text-right text-sm font-semibold text-slate-800 bg-slate-50">
                            {formatCurrency(totalSemestre)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={3} className="p-4 text-sm text-slate-800">TOTAL</td>
                      {MESES.slice(0, 6).map(mes => {
                        const totalMes = orcamentosGerados
                          .filter(o => o.mes === mes)
                          .reduce((sum, o) => sum + o.valorCalculado, 0)
                        return (
                          <td key={mes} className="p-3 text-right text-sm text-slate-800">
                            {formatCurrency(totalMes)}
                          </td>
                        )
                      })}
                      <td className="p-4 text-right text-sm text-slate-900 bg-slate-200">
                        {formatCurrency(
                          orcamentosGerados
                            .filter(o => MESES.indexOf(o.mes) < 6)
                            .reduce((sum, o) => sum + o.valorCalculado, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep("configurar")}
                className="px-6 py-2.5 text-slate-600 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <button
                onClick={() => {
                  if (onApplyBudget) {
                    onApplyBudget(orcamentosGerados)
                  }
                  alert("Orçamento aplicado com sucesso!")
                }}
                disabled={orcamentosGerados.length === 0}
                className="px-6 py-2.5 text-white font-semibold rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Aplicar Orçamento
              </button>
            </div>
          </div>
        )}
      </div>

      {editingRegra && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Configurar Regra</h3>
            <p className="text-sm text-slate-600 mb-4">
              <strong>{editingRegra.contaDreNome}</strong> será classificada como{" "}
              <span className={`font-semibold ${
                editingRegra.tipoConta === "fixa" ? "text-blue-600" :
                editingRegra.tipoConta === "variavel" ? "text-green-600" : "text-yellow-600"
              }`}>
                {editingRegra.tipoConta === "fixa" ? "Despesa Fixa" :
                 editingRegra.tipoConta === "variavel" ? "Despesa Variável" : "Manual"}
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingRegra(null)}
                className="px-4 py-2 text-slate-600 font-medium rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRegra}
                disabled={isSaving}
                className="px-4 py-2 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {isSaving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default BudgetWizardView
