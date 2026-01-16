import React from "react"
import { ChevronDown, ChevronUp, Search } from "lucide-react"

interface FilterBarProps {
  children: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  actions?: React.ReactNode
}

export function FilterBar({
  children,
  collapsible = false,
  defaultCollapsed = false,
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  actions,
}: FilterBarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  return (
    <div className="filter-bar">
      <div className="filter-bar-header">
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="filter-toggle"
          >
            {isCollapsed ? (
              <>
                <span>Mostrar filtros</span>
                <ChevronDown className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Ocultar filtros</span>
                <ChevronUp className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        {onSearchChange && (
          <div className="filter-search">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="filter-search-input"
            />
          </div>
        )}

        {actions && <div className="filter-actions">{actions}</div>}
      </div>

      {(!collapsible || !isCollapsed) && (
        <div className="filter-bar-content">
          {children}
        </div>
      )}
    </div>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Selecionar...",
  className = "",
}: FilterSelectProps) {
  return (
    <div className={`filter-select-group ${className}`}>
      <label className="filter-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="filter-select"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
