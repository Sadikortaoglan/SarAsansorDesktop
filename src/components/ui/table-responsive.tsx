import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
  mobileLabel?: string // Label for mobile card view
  mobilePriority?: number // Higher priority shows first on mobile
  hideOnMobile?: boolean // Hide this column on mobile
}

interface TableResponsiveProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string | number
  emptyMessage?: string
  className?: string
  cardClassName?: string
}

export function TableResponsive<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'Veri bulunamadı',
  className,
  cardClassName,
}: TableResponsiveProps<T>) {
  const isDesktop = useIsDesktop()

  // Sort columns by mobile priority, higher first
  const mobileColumns = columns
    .filter((col) => !col.hideOnMobile)
    .sort((a, b) => (b.mobilePriority || 0) - (a.mobilePriority || 0))

  if (isDesktop) {
    return (
      <div className={cn('rounded-lg border bg-card shadow-sm overflow-hidden', className)}>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b-2 border-indigo-200">
              {columns.map((column) => (
                <TableHead key={column.key} className="font-semibold text-indigo-900">{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item, index) => (
                <TableRow 
                  key={keyExtractor(item)}
                  className={cn(
                    'transition-colors duration-150',
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                    'hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-teal-50/50 hover:shadow-sm'
                  )}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className="py-3">
                      {column.render
                        ? column.render(item)
                        : item[column.key] ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Mobile card view
  return (
    <div className={cn('space-y-3', className)}>
      {data.length > 0 ? (
        data.map((item) => {
          // Separate action columns from regular columns
          const actionColumns = mobileColumns.filter((col) => col.key === 'actions')
          const regularColumns = mobileColumns.filter((col) => col.key !== 'actions')

          return (
            <Card key={keyExtractor(item)} className={cardClassName}>
              <CardContent className="p-4 space-y-3">
                {regularColumns.map((column) => {
                  const value = column.render
                    ? column.render(item)
                    : item[column.key] ?? '-'
                  const label = column.mobileLabel || column.header

                  return (
                    <div key={column.key} className="flex flex-col space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      <div className="text-sm">{value}</div>
                    </div>
                  )
                })}
                {actionColumns.length > 0 && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    {actionColumns.map((column) => {
                      const value = column.render ? column.render(item) : null
                      return <div key={column.key}>{value}</div>
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
