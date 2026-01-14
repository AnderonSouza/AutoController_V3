import type { FinancialAccount, MonthlyData, Company, Brand, EconomicGroup, User } from "./types"

export const MONTHS = [
  "HISTORICO",
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
]
export const CALENDAR_MONTHS = MONTHS.slice(1)

export const TABS = [
  "Veículos Novos",
  "PCD Atacado",
  "Frotista",
  "Consórcio",
  "Veic Usados",
  "Outlet",
  "Peças",
  "Peças Web",
  "Peças Atacado",
  "Peças Seguradora",
  "SG",
  "SC",
  "ADM e Dir",
  "FIN e N.O.",
]

// Biblioteca de Ícones SVG (Paths)
export const ICON_LIBRARY: Record<string, string> = {
  "chart-bar":
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  "currency-dollar":
    "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  cash: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  table: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  calculator:
    "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  users:
    "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  cog: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  adjustments:
    "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 000-4m0 4a2 2 0 110 4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  "document-text":
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  briefcase:
    "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  cube: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  collection:
    "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  "clipboard-check":
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  presentation: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
  database:
    "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
  template:
    "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
  lightning: "M13 10V3L4 14h7v7l9-11h-7z",
  sparkles: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  check: "M5 13l4 4L19 7",
  "paint-brush":
    "M4 12a8 8 0 018-8c4.418 0 8 3.582 8 8a8.01 8.01 0 01-2.926 6.183 1 1 0 00-.324.755v.062a3 3 0 01-3 3 3 3 0 01-3-3v-.53a3 3 0 00-.9-2.12l-1.65-1.65a3 3 0 01-.88-2.12V12z M7.5 12.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M11.5 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M15.5 11.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M12 15.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  palette:
    "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  sliders:
    "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 000-4m0 4a2 2 0 110 4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  "table-cells": "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z M4 10h16 M4 14h16 M10 4v16",
}

export const INITIAL_ECONOMIC_GROUPS: EconomicGroup[] = []
export const INITIAL_BRANDS: Brand[] = []
export const INITIAL_COMPANIES: Company[] = []
export const INITIAL_USERS: User[] = []

export const FONT_OPTIONS = [
  { name: "Source Sans Pro (Padrão)", value: "'Source Sans Pro', sans-serif" },
  { name: "Poppins", value: "'Poppins', sans-serif" },
  { name: "Inter", value: "'Inter', sans-serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Lato", value: "'Lato', sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
  { name: "Nunito", value: "'Nunito', sans-serif" },
  { name: "Raleway", value: "'Raleway', sans-serif" },
  { name: "Merriweather (Serif)", value: "'Merriweather', serif" },
  { name: "Playfair Display (Serif)", value: "'Playfair Display', serif" },
]

export const createEmptyMonthlyDataForYear = (): { [month: string]: MonthlyData } => {
  const monthlyData: { [month: string]: MonthlyData } = {}
  MONTHS.forEach((month) => {
    monthlyData[month] = {
      balancete: 0,
      transfGerencial: 0,
      ajusteContabil: 0,
      cgGerencial: 0,
      cg: 0,
      orcado: 0,
      orcadoPremissas: 0,
      orcadoHistorico: 0,
      orcadoManual: 0,
      orcadoImportado: 0,
    }
  })
  return monthlyData
}

export const createEmptyYearlyData = (years: number[]): { [year: number]: { [month: string]: MonthlyData } } => {
  const data: { [year: number]: { [month: string]: MonthlyData } } = {}
  for (const year of years) {
    data[year] = createEmptyMonthlyDataForYear()
  }
  return data
}

// Estrutura esvaziada para forçar o uso do DYNAMIC_REPORT
export const initialFinancialData: FinancialAccount[] = []
export const initialCashFlowData: FinancialAccount[] = []
