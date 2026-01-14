"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { EconomicGroup } from "../types"
import { Info, AlertTriangle, AlertCircle, CheckCircle, Link as LinkIcon, Calendar, X, Image, Film } from "lucide-react"

interface SystemSettingsViewProps {
  onNavigateBack: () => void
  economicGroups: EconomicGroup[]
  onSaveEconomicGroups: (updatedGroups: EconomicGroup[]) => Promise<void>
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

type AnnouncementType = "info" | "warning" | "error" | "success"

interface LoginAnnouncement {
  enabled: boolean
  type: AnnouncementType
  text: string
  linkEnabled: boolean
  linkText: string
  linkUrl: string
  startDate: string
  endDate: string
}

const ANNOUNCEMENT_TYPES: { value: AnnouncementType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "info", label: "Informações", icon: <Info className="w-4 h-4" />, color: "#3b82f6" },
  { value: "warning", label: "Aviso", icon: <AlertTriangle className="w-4 h-4" />, color: "#f59e0b" },
  { value: "error", label: "Erro", icon: <AlertCircle className="w-4 h-4" />, color: "#ef4444" },
  { value: "success", label: "Resolvido", icon: <CheckCircle className="w-4 h-4" />, color: "#22c55e" },
]

const ImageUploader: React.FC<{
  label: string
  value: string | undefined
  onChange: (file: File | null) => void
  description: string
  bgColor?: string
}> = ({ label, value, onChange, description, bgColor = "#f8fafc" }) => (
  <div className="mb-4">
    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">{label}</label>
    <div
      className="relative group w-full h-24 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50/50 transition-colors cursor-pointer"
      style={{ backgroundColor: bgColor }}
    >
      {value ? (
        <img
          src={value}
          alt="Preview"
          className="w-full h-full object-contain p-2"
        />
      ) : (
        <div className="text-center p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mx-auto text-slate-400 mb-1 group-hover:text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs text-slate-500 font-medium group-hover:text-blue-500">Clique para carregar</span>
        </div>
      )}
      <input
        type="file"
        className="absolute inset-0 opacity-0 cursor-pointer"
        accept="image/*"
        onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
      />
      {value && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onChange(null)
          }}
          className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-full shadow-sm transition-colors z-20"
          title="Remover imagem"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
    <p className="text-[10px] text-slate-400 mt-1.5">{description}</p>
  </div>
)

const AccordionSection: React.FC<{
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}> = ({ title, isOpen, onToggle, children }) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden mb-3 shadow-sm">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
    >
      <span className="font-bold text-sm text-slate-700 uppercase tracking-wide">{title}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && <div className="p-4 border-t border-slate-100 animate-fadeIn bg-white">{children}</div>}
  </div>
)

const AnnouncementPreview: React.FC<{ announcement: LoginAnnouncement }> = ({ announcement }) => {
  if (!announcement.enabled || !announcement.text) return null
  
  const typeConfig = ANNOUNCEMENT_TYPES.find(t => t.value === announcement.type) || ANNOUNCEMENT_TYPES[0]
  
  const now = new Date()
  const startDate = announcement.startDate ? new Date(announcement.startDate) : null
  const endDate = announcement.endDate ? new Date(announcement.endDate) : null
  
  const isExpired = endDate && now > endDate
  const notStarted = startDate && now < startDate
  
  if (isExpired || notStarted) return null
  
  return (
    <div 
      className="flex items-center gap-3 px-4 py-3 text-sm"
      style={{ backgroundColor: `${typeConfig.color}15`, borderLeft: `4px solid ${typeConfig.color}` }}
    >
      <span style={{ color: typeConfig.color }}>{typeConfig.icon}</span>
      <span className="flex-1 text-slate-700">{announcement.text}</span>
      {announcement.linkEnabled && announcement.linkText && announcement.linkUrl && (
        <a 
          href={announcement.linkUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-medium hover:underline"
          style={{ color: typeConfig.color }}
        >
          {announcement.linkText}
          <LinkIcon className="w-3 h-3" />
        </a>
      )}
      <button className="text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ConsoleConfig {
  logoUrl?: string
  companyName?: string
}

export default function SystemSettingsView({
  onNavigateBack,
  economicGroups,
  onSaveEconomicGroups,
}: SystemSettingsViewProps) {
  const [editableGroup, setEditableGroup] = useState<EconomicGroup | null>(null)
  const [openSection, setOpenSection] = useState<string>("identity")
  const [isSaving, setIsSaving] = useState(false)
  const [consoleConfig, setConsoleConfig] = useState<ConsoleConfig | null>(null)
  const [announcement, setAnnouncement] = useState<LoginAnnouncement>({
    enabled: false,
    type: "info",
    text: "",
    linkEnabled: false,
    linkText: "",
    linkUrl: "",
    startDate: "",
    endDate: "",
  })

  useEffect(() => {
    const loadConsoleConfig = async () => {
      try {
        const { supabase } = await import("../utils/supabaseClient")
        const { data } = await supabase.from("console_config").select("logo_url, company_name").single()
        if (data) {
          setConsoleConfig({ logoUrl: data.logo_url, companyName: data.company_name })
        }
      } catch (e) {
        console.log("[v0] Could not load console_config for preview")
      }
    }
    loadConsoleConfig()
  }, [])

  useEffect(() => {
    if (economicGroups.length > 0) {
      const group = economicGroups[0]
      setEditableGroup(group)
      
      if (group.loginAnnouncement) {
        setAnnouncement(group.loginAnnouncement as LoginAnnouncement)
      }
    }
  }, [economicGroups])

  const handleChange = (field: keyof EconomicGroup, value: any) => {
    if (!editableGroup) return
    setEditableGroup({ ...editableGroup, [field]: value })
  }

  const handleAnnouncementChange = (field: keyof LoginAnnouncement, value: any) => {
    setAnnouncement({ ...announcement, [field]: value })
  }

  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSave = async () => {
    if (!editableGroup) return
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const groupToSave = {
        ...editableGroup,
        loginAnnouncement: announcement,
      }

      console.log("[v0] SystemSettingsView - Saving group:", {
        id: groupToSave.id,
        name: groupToSave.name,
        hasLogo: !!groupToSave.logo,
        hasLogoDark: !!groupToSave.logoDark,
        announcement: groupToSave.loginAnnouncement,
      })

      await onSaveEconomicGroups([groupToSave])
      
      console.log("[v0] SystemSettingsView - Save completed successfully")
      setSaveMessage({ type: "success", text: "Configurações salvas com sucesso!" })
      
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error("[v0] SystemSettingsView - Erro ao salvar configurações:", error)
      setSaveMessage({ type: "error", text: "Ocorreu um erro ao salvar as configurações." })
    } finally {
      setIsSaving(false)
    }
  }

  if (!editableGroup) {
    return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>
  }

  const isAnnouncementExpired = announcement.endDate && new Date() > new Date(announcement.endDate)

  return (
    <div className="flex h-full bg-slate-100">
      {/* Left Panel - Editor */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-gradient-to-r from-slate-50 to-white">
          <button
            onClick={onNavigateBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Voltar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-slate-800">Configurações da Organização</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {/* Seção 1: Identidade */}
          <AccordionSection
            title="1. Identidade"
            isOpen={openSection === "identity"}
            onToggle={() => setOpenSection(openSection === "identity" ? "" : "identity")}
          >
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Nome da Organização
              </label>
              <input
                type="text"
                value={editableGroup.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <ImageUploader
              label="Logo (Fundo Claro)"
              value={editableGroup.logo}
              onChange={async (file) => handleChange("logo", file ? await fileToBase64(file) : "")}
              description="Logo para uso em fundos brancos ou claros (sidebar, cabeçalho)."
              bgColor="#ffffff"
            />

            <ImageUploader
              label="Logo (Fundo Escuro)"
              value={editableGroup.logoDark}
              onChange={async (file) => handleChange("logoDark", file ? await fileToBase64(file) : "")}
              description="Logo para uso em fundos escuros (versão clara/branca do logo)."
              bgColor="#1e293b"
            />
          </AccordionSection>

          {/* Seção 2: Anúncios da Tela de Login */}
          <AccordionSection
            title="2. Anúncios"
            isOpen={openSection === "announcements"}
            onToggle={() => setOpenSection(openSection === "announcements" ? "" : "announcements")}
          >
            <p className="text-xs text-slate-500 mb-4">
              Use um banner de anúncio para comunicar informações importantes a todos os usuários na tela de login.
            </p>

            {/* Tipo de Banner */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Estilo do Banner
              </label>
              <div className="flex gap-2 flex-wrap">
                {ANNOUNCEMENT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      announcement.type === type.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="announcementType"
                      value={type.value}
                      checked={announcement.type === type.value}
                      onChange={(e) => handleAnnouncementChange("type", e.target.value)}
                      className="sr-only"
                    />
                    <span style={{ color: type.color }}>{type.icon}</span>
                    <span className="text-xs font-medium text-slate-700">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Texto do Anúncio */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Texto
              </label>
              <textarea
                value={announcement.text}
                onChange={(e) => handleAnnouncementChange("text", e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={2}
                maxLength={255}
                placeholder="Digite a mensagem do anúncio..."
              />
              <p className="text-[10px] text-slate-400 mt-1 text-right">{announcement.text.length} / 255</p>
            </div>

            {/* Toggle de Link */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={announcement.linkEnabled}
                    onChange={(e) => handleAnnouncementChange("linkEnabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                </div>
                <span className="text-xs font-medium text-slate-700">Adicionar um link ao banner</span>
              </label>
            </div>

            {/* Campos de Link */}
            {announcement.linkEnabled && (
              <div className="space-y-3 mb-4 p-3 bg-slate-50 rounded-lg">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                    Texto do link
                  </label>
                  <input
                    type="text"
                    value={announcement.linkText}
                    onChange={(e) => handleAnnouncementChange("linkText", e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Acesse o Portal..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                    URL de link
                  </label>
                  <input
                    type="url"
                    value={announcement.linkUrl}
                    onChange={(e) => handleAnnouncementChange("linkUrl", e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Data de início
                </label>
                <input
                  type="date"
                  value={announcement.startDate}
                  onChange={(e) => handleAnnouncementChange("startDate", e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Data de término
                </label>
                <input
                  type="date"
                  value={announcement.endDate}
                  onChange={(e) => handleAnnouncementChange("endDate", e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {isAnnouncementExpired && (
              <p className="text-xs text-red-500 mb-4">
                A data de término expirou e o banner está oculto.
              </p>
            )}

            {/* Toggle de Ativação */}
            <div className="pt-3 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={announcement.enabled}
                    onChange={(e) => handleAnnouncementChange("enabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase">Ativar Anúncio</span>
              </label>
            </div>

            {/* Preview do Anúncio */}
            {announcement.enabled && announcement.text && (
              <div className="mt-4">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Pré-visualizar
                </label>
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <AnnouncementPreview announcement={announcement} />
                </div>
              </div>
            )}
          </AccordionSection>

          {/* Background da Tela de Login */}
          <AccordionSection
            title="Background da Tela de Login"
            isOpen={openSection === "background"}
            onToggle={() => setOpenSection(openSection === "background" ? "" : "background")}
          >
            <p className="text-xs text-slate-500 mb-4">
              Personalize o fundo da tela de login com uma imagem ou vídeo da sua organização.
            </p>

            {/* Tipo de Background */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Tipo de Background
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleChange("loginBackgroundType", "image")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    editableGroup.loginBackgroundType === "image"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Image className="w-4 h-4" />
                  <span className="text-sm font-medium">Imagem</span>
                </button>
                <button
                  onClick={() => handleChange("loginBackgroundType", "video")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    editableGroup.loginBackgroundType === "video"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Film className="w-4 h-4" />
                  <span className="text-sm font-medium">Vídeo</span>
                </button>
              </div>
            </div>

            {/* URL do Background */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                URL do {editableGroup.loginBackgroundType === "video" ? "Vídeo" : "Imagem"}
              </label>
              <input
                type="url"
                value={editableGroup.loginBackgroundUrl || ""}
                onChange={(e) => handleChange("loginBackgroundUrl", e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder={editableGroup.loginBackgroundType === "video" ? "https://exemplo.com/video.mp4" : "https://exemplo.com/imagem.jpg"}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {editableGroup.loginBackgroundType === "video" 
                  ? "Use um vídeo MP4 de até 10MB para melhor performance" 
                  : "Use uma imagem de alta qualidade (1920x1080 recomendado)"}
              </p>
            </div>

            {/* Preview do Background */}
            {editableGroup.loginBackgroundUrl && (
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Pré-visualização
                </label>
                <div className="rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                  {editableGroup.loginBackgroundType === "video" ? (
                    <video
                      src={editableGroup.loginBackgroundUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={editableGroup.loginBackgroundUrl}
                      alt="Background preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Botão para limpar */}
            {editableGroup.loginBackgroundUrl && (
              <button
                onClick={() => {
                  handleChange("loginBackgroundUrl", "")
                  handleChange("loginBackgroundType", undefined)
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Remover background
              </button>
            )}
          </AccordionSection>
        </div>

        <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white space-y-3">
          {saveMessage && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
                saveMessage.type === "success"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              {saveMessage.type === "success" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {saveMessage.text}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary font-semibold rounded-xl hover:bg-primary-hover transition-all disabled:opacity-50 shadow-lg"
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Salvando...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Login Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Pré-visualização da Tela de Login</span>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-slate-200/50">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden h-full" style={{ minHeight: "500px" }}>
            {/* Preview da Tela de Login Real */}
            <div className="h-full flex flex-col">
              {/* Header - Sempre AutoController com fundo branco */}
              <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {consoleConfig?.logoUrl ? (
                    <img src={consoleConfig.logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
                  ) : (
                    <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-[#1e3a5f] text-sm font-bold">AC</span>
                    </div>
                  )}
                  <span className="text-gray-900 font-bold text-base">{consoleConfig?.companyName || "AutoController"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 border border-gray-200 rounded text-gray-700 text-xs font-medium">
                    {editableGroup.name || "Selecionar Tenant"} ▼
                  </div>
                </div>
              </div>

              {/* Anúncio */}
              {announcement.enabled && announcement.text && !isAnnouncementExpired && (
                <AnnouncementPreview announcement={announcement} />
              )}

              {/* Conteúdo Principal */}
              <div className="flex-1 flex min-h-0">
                {/* Lado esquerdo - Formulário */}
                <div className="w-1/2 flex flex-col bg-white">
                  <div className="flex-1 flex items-center justify-center px-8">
                    <div className="w-full max-w-sm">
                      {/* Logo da organização */}
                      {editableGroup.logo && (
                        <div className="mb-6 text-center">
                          <div className="inline-flex items-center justify-center p-5 rounded-xl bg-[#1e3a5f] transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer">
                            <img 
                              src={editableGroup.logoDark || editableGroup.logo} 
                              alt={editableGroup.name}
                              className={`h-12 w-auto object-contain ${!editableGroup.logoDark ? 'brightness-0 invert' : ''}`}
                            />
                          </div>
                          <p className="text-slate-600 mt-3 text-sm">Acesse seu ambiente</p>
                        </div>
                      )}

                      {!editableGroup.logo && (
                        <div className="mb-6 text-center">
                          <h1 className="text-2xl font-bold text-slate-900">{editableGroup.name || "Login"}</h1>
                          <p className="text-slate-600 mt-1 text-sm">Acesse seu ambiente</p>
                        </div>
                      )}

                      {/* Campos do formulário (mock) */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-medium text-slate-700 mb-1 block">E-mail</label>
                          <div className="h-10 bg-slate-100 rounded-lg border border-slate-200"></div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700 mb-1 block">Senha</label>
                          <div className="h-10 bg-slate-100 rounded-lg border border-slate-200"></div>
                        </div>
                        <div className="h-10 bg-[#1e3a5f] rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lado direito - Background customizado ou padrão */}
                <div className="w-1/2 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                  {editableGroup.loginBackgroundUrl && editableGroup.loginBackgroundType === "video" ? (
                    <video
                      key={editableGroup.loginBackgroundUrl}
                      src={editableGroup.loginBackgroundUrl}
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                      onError={(e) => console.log("[v0] Video load error:", e)}
                    />
                  ) : editableGroup.loginBackgroundUrl && editableGroup.loginBackgroundType === "image" ? (
                    <img
                      key={editableGroup.loginBackgroundUrl}
                      src={editableGroup.loginBackgroundUrl}
                      alt="Login background"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => console.log("[v0] Image load error:", e)}
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <div className="w-16 h-16 mx-auto bg-[#1e3a5f] rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-3">
                        AC
                      </div>
                      <p className="text-sm font-medium text-slate-600">AutoController</p>
                      <p className="text-xs text-slate-400">Plataforma de Gestão Financeira</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
