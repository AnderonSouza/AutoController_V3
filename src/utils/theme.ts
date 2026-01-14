import type { EconomicGroup } from "../types"

export const applyThemeToDocument = (group: EconomicGroup) => {
  if (!group) return

  try {
    localStorage.setItem("active_theme_config", JSON.stringify(group))
  } catch (e) {
    console.warn("Could not persist theme to localStorage:", e)
  }
}

export const loadPersistedTheme = (): void => {
  try {
    const stored = localStorage.getItem("active_theme_config")
    if (stored) {
      const theme = JSON.parse(stored) as EconomicGroup
      applyThemeToDocument(theme)
    }
  } catch (e) {
    console.warn("Could not load persisted theme:", e)
  }
}

export const clearPersistedTheme = (): void => {
  try {
    localStorage.removeItem("active_theme_config")
  } catch (e) {
    console.warn("Could not clear persisted theme:", e)
  }
}
