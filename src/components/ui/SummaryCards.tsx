import React from "react"

interface SummaryCard {
  label: string
  value: string | number
  variant?: "default" | "success" | "warning" | "error" | "info" | "primary"
  icon?: React.ReactNode
}

interface SummaryCardsProps {
  cards: SummaryCard[]
  columns?: 2 | 3 | 4 | 5
}

export function SummaryCards({ cards, columns = 4 }: SummaryCardsProps) {
  const gridClasses = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
  }

  return (
    <div className={`summary-cards grid ${gridClasses[columns]} gap-4`}>
      {cards.map((card, index) => (
        <SummaryCardItem key={index} {...card} />
      ))}
    </div>
  )
}

function SummaryCardItem({ label, value, variant = "default", icon }: SummaryCard) {
  const variantClasses = {
    default: "summary-card-default",
    success: "summary-card-success",
    warning: "summary-card-warning",
    error: "summary-card-error",
    info: "summary-card-info",
    primary: "summary-card-primary",
  }

  return (
    <div className={`summary-card ${variantClasses[variant]}`}>
      <span className="summary-card-label">{label}</span>
      <div className="summary-card-value-row">
        {icon && <span className="summary-card-icon">{icon}</span>}
        <span className="summary-card-value">{value}</span>
      </div>
    </div>
  )
}
