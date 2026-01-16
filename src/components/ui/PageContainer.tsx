import React from "react"
import { ChevronLeft } from "lucide-react"

interface PageContainerProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  backLabel?: string
  onBack?: () => void
  actions?: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
}

export function PageContainer({
  children,
  title,
  subtitle,
  backLabel,
  onBack,
  actions,
  className = "",
  maxWidth = "full",
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-5xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    full: "max-w-full",
  }

  return (
    <div className={`page-container ${className}`}>
      {onBack && (
        <button
          onClick={onBack}
          className="back-button"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel || "Voltar"}
        </button>
      )}

      <div className={`content-card ${maxWidthClasses[maxWidth]}`}>
        {(title || actions) && (
          <div className="card-header">
            <div className="header-text">
              {title && <h1 className="card-title">{title}</h1>}
              {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="header-actions">{actions}</div>}
          </div>
        )}

        <div className="card-body">
          {children}
        </div>
      </div>
    </div>
  )
}
