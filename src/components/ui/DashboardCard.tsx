"use client"

import type React from "react"
import type { LucideIcon } from "lucide-react"

interface DashboardCardProps {
  icon: LucideIcon
  title: string
  description: string
  onClick?: () => void
  children?: React.ReactNode
  disabled?: boolean
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  children,
  disabled = false,
}) => {
  const isClickable = onClick && !disabled
  const isInteractive = (onClick || children) && !disabled

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`
        bg-white p-4 rounded-xl border border-slate-200 shadow-sm 
        flex flex-col justify-between group relative overflow-hidden h-full
        transition-all duration-300
        ${isInteractive ? "hover:shadow-xl hover:-translate-y-1" : ""}
        ${isClickable ? "cursor-pointer" : ""}
        ${disabled ? "opacity-60" : ""}
      `}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary-50 border border-slate-100 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            <Icon className="h-6 w-6" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-lg font-bold text-slate-800 group-hover:text-primary transition-colors mb-2">
          {title}
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          {description}
        </p>
      </div>
      {children && (
        <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-50">
          {children}
        </div>
      )}
      {isClickable && !children && (
        <div className="mt-auto pt-4 border-t border-slate-100">
          <span className="inline-flex items-center text-sm font-medium text-primary">
            Acessar
            <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      )}
    </div>
  )
}

export default DashboardCard
