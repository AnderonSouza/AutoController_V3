import React from "react"
import { FileText } from "lucide-react"

export interface Column<T> {
  key: string
  header: string
  width?: string
  align?: "left" | "center" | "right"
  sortable?: boolean
  render?: (value: any, row: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor?: (row: T, index: number) => string | number
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  isLoading?: boolean
  onRowClick?: (row: T, index: number) => void
  rowClassName?: (row: T, index: number) => string
  stickyHeader?: boolean
  compact?: boolean
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor = (_, index) => index,
  emptyMessage = "Nenhum registro encontrado.",
  emptyIcon,
  isLoading = false,
  onRowClick,
  rowClassName,
  stickyHeader = false,
  compact = false,
}: DataTableProps<T>) {
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }

  if (isLoading) {
    return (
      <div className="table-loading">
        <div className="loading-spinner" />
        <span>Carregando...</span>
      </div>
    )
  }

  return (
    <div className="data-table-wrapper">
      <table className={`data-table ${compact ? "compact" : ""}`}>
        <thead className={stickyHeader ? "sticky-header" : ""}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={alignClasses[col.align || "left"]}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="table-empty">
                  {emptyIcon || <FileText className="w-12 h-12 text-slate-300" />}
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                onClick={() => onRowClick?.(row, index)}
                className={`${onRowClick ? "clickable" : ""} ${rowClassName?.(row, index) || ""}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={alignClasses[col.align || "left"]}
                  >
                    {col.render
                      ? col.render(row[col.key], row, index)
                      : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
