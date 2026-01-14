"use client"

import { useEffect, useState } from "react"

export function ConsoleSwitcher() {
  const [showButton, setShowButton] = useState(false)
  const [isConsole, setIsConsole] = useState(false)

  useEffect(() => {
    // Mostrar botão apenas em desenvolvimento
    const isDev =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.includes("vusercontent.net")

    setShowButton(isDev)

    // Verificar se já é console
    const urlParams = new URLSearchParams(window.location.search)
    setIsConsole(urlParams.get("console") === "true")
  }, [])

  if (!showButton) return null

  const handleToggleConsole = () => {
    const urlParams = new URLSearchParams(window.location.search)

    if (isConsole) {
      // Remover parâmetro console
      urlParams.delete("console")
    } else {
      // Adicionar parâmetro console
      urlParams.set("console", "true")
    }

    const newUrl = urlParams.toString()
    const separator = newUrl ? "?" : ""
    window.location.href = `${window.location.pathname}${separator}${newUrl}`
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleToggleConsole}
        className="px-4 py-2 rounded bg-primary text-on-primary text-sm font-medium hover:bg-primary-hover transition-colors shadow-lg"
        title={isConsole ? "Voltar para login normal" : "Ir para console administrativo"}
      >
        {isConsole ? "← Sair do Console" : "→ Ir para Console"}
      </button>
    </div>
  )
}
